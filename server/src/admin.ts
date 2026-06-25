import { Router, static as serveStatic } from "express";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { database } from "./db.js";
import { deleteFromS3 } from "./s3.js";
import { sseManager } from "./sseManager.js";
import { sendAdminOtpEmail } from "./email.js";
import { asyncRoute } from "./asyncRoute.js";
import { streamImagesAsZip } from "./zipExport.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reset requests, please try again later." },
});

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

declare module "express-session" {
  interface SessionData {
    adminAuthenticated?: boolean;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_DIR = path.resolve(__dirname, "../admin");

export const adminRouter = Router();

// ── Auth middleware ───────────────────────────────────────────────────────────

function requireAuth(req: Request, res: Response, next: () => void) {
  if (req.session.adminAuthenticated) return next();
  res.status(401).json({ error: "Unauthorized" });
}

// ── Serve SPA static files (admin.js, etc.) ───────────────────────────────────

adminRouter.use(serveStatic(ADMIN_DIR));

// ── Serve SPA index for / ─────────────────────────────────────────────────────

adminRouter.get("/", (_req, res) => {
  res.sendFile(path.join(ADMIN_DIR, "index.html"));
});

// ── Auth API ──────────────────────────────────────────────────────────────────

adminRouter.get("/api/check", requireAuth, (_req, res) => {
  res.json({ ok: true });
});

adminRouter.post("/api/login", loginLimiter, asyncRoute(async (req, res) => {
  const { password } = req.body as { password?: string };
  if (typeof password !== "string" || !password) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }

  const auth = await database.getAdminAuth();
  let ok: boolean;

  if (auth.passwordHash) {
    ok = await bcrypt.compare(password, auth.passwordHash);
  } else {
    const adminPassword = process.env.ADMIN_PASSWORD || "";
    if (!adminPassword) {
      res.status(503).json({ error: "Admin password not configured." });
      return;
    }
    ok = password === adminPassword;
  }

  if (ok) {
    req.session.adminAuthenticated = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: "Incorrect password." });
  }
}));

adminRouter.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ── Password reset via emailed OTP ─────────────────────────────────────────────

adminRouter.post("/api/forgot-password", forgotPasswordLimiter, asyncRoute(async (_req, res) => {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await database.setAdminOtp(otpHash, expiresAt);

  try {
    await sendAdminOtpEmail(otp);
  } catch (err) {
    res.status(503).json({ error: err instanceof Error ? err.message : "Failed to send email." });
    return;
  }

  res.json({ ok: true });
}));

adminRouter.post("/api/reset-password", loginLimiter, asyncRoute(async (req, res) => {
  const { otp, newPassword } = req.body as { otp?: string; newPassword?: string };

  if (typeof otp !== "string" || typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "Invalid request. Password must be at least 8 characters." });
    return;
  }

  const auth = await database.getAdminAuth();

  if (!auth.otpHash || !auth.otpExpiresAt || auth.otpExpiresAt < new Date()) {
    res.status(400).json({ error: "No active reset code. Please request a new one." });
    return;
  }

  if (auth.otpAttempts >= MAX_OTP_ATTEMPTS) {
    res.status(429).json({ error: "Too many incorrect attempts. Please request a new code." });
    return;
  }

  const otpValid = await bcrypt.compare(otp, auth.otpHash);
  if (!otpValid) {
    await database.incrementAdminOtpAttempts();
    res.status(401).json({ error: "Incorrect code." });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await database.setAdminPassword(passwordHash);

  res.json({ ok: true });
}));

// ── Image management API ──────────────────────────────────────────────────────

adminRouter.post("/api/delete/:id", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const deleted = await database.deleteImage(id);
  if (deleted) {
    await Promise.all(
      [deleted.filename, deleted.thumbnailFilename].map((filename) =>
        deleteFromS3(`uploads/${filename}`),
      ),
    );
    sseManager.broadcastDeleteImage(id);
  }
  res.json({ ok: true });
}));

adminRouter.post("/api/update/:id", requireAuth, asyncRoute(async (req, res) => {
  const { id } = req.params;
  const { uploaderName } = req.body as { uploaderName?: string };
  const name = uploaderName?.trim() || null;
  await database.updateImageName(id, name);
  sseManager.broadcastUpdateImage(id, name);
  res.json({ ok: true });
}));

adminRouter.post("/api/delete-all", requireAuth, asyncRoute(async (_req, res) => {
  const deleted = await database.deleteAllImages();
  await Promise.all(
    deleted.flatMap(({ filename, thumbnailFilename }) => [
      deleteFromS3(`uploads/${filename}`),
      deleteFromS3(`uploads/${thumbnailFilename}`),
    ]),
  );
  sseManager.broadcastClearAll();
  res.json({ ok: true, deletedCount: deleted.length });
}));

// ── Service status ─────────────────────────────────────────────────────────────

adminRouter.get("/api/service-status", requireAuth, asyncRoute(async (_req, res) => {
  const flags = await database.getServiceFlags();
  res.json({ ok: true, ...flags });
}));

adminRouter.post("/api/service/uploads/:state", requireAuth, asyncRoute(async (req, res) => {
  const { state } = req.params;
  if (state !== "on" && state !== "off") {
    res.status(400).json({ error: "Invalid state." });
    return;
  }
  const flags = await database.setServiceFlag("uploadsDisabled", state === "off");
  res.json({ ok: true, ...flags });
}));

adminRouter.post("/api/service/gallery/:state", requireAuth, asyncRoute(async (req, res) => {
  const { state } = req.params;
  if (state !== "on" && state !== "off") {
    res.status(400).json({ error: "Invalid state." });
    return;
  }
  const flags = await database.setServiceFlag("galleryApiDisabled", state === "off");
  res.json({ ok: true, ...flags });
}));

// ── Reaction management API ───────────────────────────────────────────────────

adminRouter.post("/api/reactions/delete/:imageId/:emoji", requireAuth, asyncRoute(async (req, res) => {
  const { imageId, emoji } = req.params;
  const reactions = await database.deleteReaction(imageId, decodeURIComponent(emoji));
  sseManager.broadcastReaction(imageId, reactions);
  res.json({ ok: true, reactions });
}));

adminRouter.post("/api/reactions/clear/:imageId", requireAuth, asyncRoute(async (req, res) => {
  const { imageId } = req.params;
  const reactions = await database.clearReactions(imageId);
  sseManager.broadcastReaction(imageId, reactions);
  res.json({ ok: true, reactions });
}));

adminRouter.post("/api/reactions/rename/:imageId/:visitorId", requireAuth, asyncRoute(async (req, res) => {
  const { imageId, visitorId } = req.params;
  const { name } = req.body as { name?: string };
  const trimmed = typeof name === "string" ? name.trim().slice(0, 100) || null : null;
  await database.setReactionNameOverride(imageId, visitorId, trimmed);
  res.json({ ok: true });
}));

// ── Download all ──────────────────────────────────────────────────────────────

adminRouter.get("/download", requireAuth, asyncRoute(async (_req, res) => {
  const { images } = await database.getImages(1000);
  await streamImagesAsZip(images, res, "wedding-photos.zip");
}));
