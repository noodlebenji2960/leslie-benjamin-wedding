import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";

import mongoose from "mongoose";
import { database } from "./db.js";
import { processImage } from "./imageProcessor.js";
import { uploadBufferToS3, checkS3Reachable } from "./s3.js";
import { sseManager } from "./sseManager.js";
import { adminRouter } from "./admin.js";
import { asyncRoute } from "./asyncRoute.js";
import { streamImagesAsZip } from "./zipExport.js";
import type { ImageRecord, GalleryResponse } from "./types.js";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760", 10);
const MAX_UPLOADER_NAME_LENGTH = 100;

export const app = express();

// Fly.io terminates TLS at its edge and forwards plain HTTP to this process,
// so without trusting the proxy, req.secure is always false and
// express-session silently refuses to set a `secure` cookie — breaking admin
// login entirely in production.
app.set("trust proxy", 1);

// ── Security ────────────────────────────────────────────────────────────────

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "https://*.amazonaws.com", "https://*.cloudfront.net"],
      },
    },
  }),
);

app.disable("x-powered-by");

// ── CORS ────────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin === CLIENT_URL);
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }),
);

// ── Body parsing ────────────────────────────────────────────────────────────

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false }));

// ── Session ────────────────────────────────────────────────────────────────

const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-in-production";

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000,
    },
  }),
);

// ── Admin ───────────────────────────────────────────────────────────────────

app.use("/admin", adminRouter);

// ── Rate limits ─────────────────────────────────────────────────────────────

const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Magic bytes ─────────────────────────────────────────────────────────────

const IMAGE_SIGNATURES: Record<string, Buffer[]> = {
  "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  "image/gif": [Buffer.from("GIF87a"), Buffer.from("GIF89a")],
};

function hasValidMagicBytes(buf: Buffer, mimetype: string): boolean {
  if (mimetype === "image/webp") {
    return (
      buf.subarray(0, 4).equals(Buffer.from("RIFF")) &&
      buf.subarray(8, 12).equals(Buffer.from("WEBP"))
    );
  }

  const sigs = IMAGE_SIGNATURES[mimetype];
  return sigs?.some((sig) => buf.subarray(0, sig.length).equals(sig)) ?? false;
}

// ── Upload ──────────────────────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 2,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Invalid file type"));
    } else {
      cb(null, true);
    }
  },
});

// ── Service toggles ──────────────────────────────────────────────────────────

const requireGalleryApiEnabled = asyncRoute(async (_req, res, next) => {
  const { galleryApiDisabled } = await database.getServiceFlags();
  if (galleryApiDisabled) {
    res.status(503).json({ error: "The gallery is temporarily unavailable." });
    return;
  }
  next();
});

const requireUploadsEnabled = asyncRoute(async (_req, res, next) => {
  const { uploadsDisabled, galleryApiDisabled } = await database.getServiceFlags();
  if (uploadsDisabled || galleryApiDisabled) {
    res.status(503).json({ error: "Uploads are temporarily disabled." });
    return;
  }
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────

app.get(
  "/gallery",
  readLimiter,
  requireGalleryApiEnabled,
  asyncRoute(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const cursor = (req.query.cursor as string) || undefined;

    const { images, nextCursor, total } = await database.getImages(
      limit,
      cursor,
    );
    res.json({ images, nextCursor, total } as GalleryResponse);
  }),
);

const MAX_DOWNLOAD_IDS = 200;

app.post(
  "/download",
  readLimiter,
  requireGalleryApiEnabled,
  asyncRoute(async (req, res) => {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
      res.status(400).json({ error: "ids must be a non-empty array of strings" });
      return;
    }

    const cleanIds = ids
      .map((id) => id.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64))
      .filter(Boolean)
      .slice(0, MAX_DOWNLOAD_IDS);

    const { images } = await database.getImagesByIds(cleanIds);
    await streamImagesAsZip(images, res, "wedding-photos.zip");
  }),
);

app.post(
  "/upload",
  uploadLimiter,
  requireUploadsEnabled,
  upload.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file" });
      return;
    }

    if (!hasValidMagicBytes(req.file.buffer, req.file.mimetype)) {
      res.status(400).json({ error: "Invalid file content" });
      return;
    }

    const uploaderName =
      typeof req.body.uploaderName === "string"
        ? req.body.uploaderName.trim().slice(0, MAX_UPLOADER_NAME_LENGTH) ||
          null
        : null;

    const uploaderVisitorId =
      typeof req.body.uploaderVisitorId === "string"
        ? req.body.uploaderVisitorId
            .replace(/[^a-zA-Z0-9_\-]/g, "")
            .slice(0, 64) || null
        : null;

    const imageId = uuidv4();
    const filename = `${imageId}.jpg`;
    const thumbnailFilename = `${imageId}-thumb.jpg`;

    const { original, thumbnail } = await processImage(req.file.buffer);

    const [url, thumbnailUrl] = await Promise.all([
      uploadBufferToS3(`uploads/${filename}`, original, "image/jpeg"),
      uploadBufferToS3(`uploads/${thumbnailFilename}`, thumbnail, "image/jpeg"),
    ]);

    const image: ImageRecord = {
      id: imageId,
      url,
      thumbnailUrl,
      uploaderName,
      uploadedAt: new Date().toISOString(),
      filename,
      fileSize: original.length,
      uploaderVisitorId,
      uploaderIp: req.socket.remoteAddress ?? null,
      uploaderUserAgent: req.headers["user-agent"]?.slice(0, 256) ?? null,
    };

    await database.addImage(image);

    if (uploaderVisitorId) {
      await database.upsertVisitor({
        visitorId: uploaderVisitorId,
        name: uploaderName,
        ip: image.uploaderIp,
        userAgent: image.uploaderUserAgent,
        imageId,
      });
    }

    sseManager.broadcastNewImage(image);

    res.status(201).json(image);
  }),
);

// ── SSE ─────────────────────────────────────────────────────────────────────

app.get("/events", readLimiter, requireGalleryApiEnabled, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(":connected\n\n");

  const cleanup = sseManager.add(res);
  req.on("close", () => {
    cleanup();
    res.end();
  });
});

// ── CONFIG (single source of truth) ─────────────────────────────────────────

const CONFIG = {
  REACTION_GROUPS: [
    {
      key: "love",
      label: "Love",
      icon: "💖",
      emojis: ["❤️", "🤍", "💞", "💓", "😍", "🥹", "😭"],
    },
    {
      key: "celebration",
      label: "Celebrate",
      icon: "🎉",
      emojis: ["🎉", "🥂", "🍾", "🍻", "👏", "🙌", "🔥", "✨"],
    },
    {
      key: "wedding",
      label: "Wedding",
      icon: "💍",
      emojis: ["💍", "👰‍♀️", "🤵‍♂️", "💐", "👩‍❤️‍👨"],
    },
    {
      key: "food",
      label: "Food & Drinks",
      icon: "🍽️",
      emojis: ["🍽️", "🍰", "🧁", "🍕", "🍷"],
    },
    {
      key: "fun",
      label: "Fun",
      icon: "💃",
      emojis: ["😂", "😆", "😎", "😉", "👀", "💃", "🕺"],
    },
  ] as const,
  maxUploadSize: MAX_FILE_SIZE,
  maxUploaderNameLength: MAX_UPLOADER_NAME_LENGTH,
};

const EMOJI_SET: Set<string> = new Set(CONFIG.REACTION_GROUPS.flatMap((group) => group.emojis));

// ── REACTIONS ───────────────────────────────────────────────────────────────

app.post(
  "/react",
  readLimiter,
  requireGalleryApiEnabled,
  asyncRoute(async (req, res) => {
    const { imageId, visitorId, uploaderName, emoji } = req.body;

    if (
      typeof imageId !== "string" ||
      typeof visitorId !== "string" ||
      typeof uploaderName !== "string" ||
      typeof emoji !== "string" ||
      !uploaderName.trim() ||
      !EMOJI_SET.has(emoji)
    ) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const cleanImageId = imageId.replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 64);
    const cleanVisitorId = visitorId
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .slice(0, 64);
    const cleanUploaderName = uploaderName.trim().slice(0, MAX_UPLOADER_NAME_LENGTH);

    await database.upsertVisitor({
      visitorId: cleanVisitorId,
      name: cleanUploaderName,
      ip: req.socket.remoteAddress ?? null,
      userAgent: req.headers["user-agent"]?.slice(0, 256) ?? null,
    });

    const { reactions, previousEmoji } = await database.setReaction(
      cleanImageId,
      cleanVisitorId,
      emoji,
    );

    if (previousEmoji !== emoji) {
      sseManager.broadcastReaction(cleanImageId, reactions);
    }

    res.json({ reactions, previousEmoji });
  }),
);

// ── CONFIG endpoint ─────────────────────────────────────────────────────────

app.get("/config", (_req, res) => {
  res.json({
    REACTION_GROUPS: CONFIG.REACTION_GROUPS,
    maxUploadSize: CONFIG.maxUploadSize,
    maxUploaderNameLength: CONFIG.maxUploaderNameLength,
  });
});

// ── Reactions per image ─────────────────────────────────────────────────────

app.get(
  "/reactions/:imageId",
  readLimiter,
  requireGalleryApiEnabled,
  asyncRoute(async (req, res) => {
    const imageId = req.params.imageId
      .replace(/[^a-zA-Z0-9\-]/g, "")
      .slice(0, 64);

    const details = await database.getReactionDetails(imageId);
    res.json(details);
  }),
);

// ── Health ──────────────────────────────────────────────────────────────────

app.get("/health", async (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const s3Reachable = await checkS3Reachable();
  const ok = dbConnected && s3Reachable;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    db: dbConnected ? "connected" : "disconnected",
    s3Reachable,
    timestamp: new Date().toISOString(),
  });
});

// ── 404 ─────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Error handler ───────────────────────────────────────────────────────────

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  const isClientError =
    err instanceof multer.MulterError ||
    (err instanceof Error && err.message.includes("Invalid"));

  res.status(isClientError ? 400 : 500).json({
    error:
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Internal server error",
  });
});
