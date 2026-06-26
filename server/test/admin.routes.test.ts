import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";

const mockDb = {
  getAdminAuth: vi.fn(async () => ({
    passwordHash: null as string | null,
    otpHash: null as string | null,
    otpExpiresAt: null as Date | null,
    otpAttempts: 0,
    uploadsDisabled: false,
    galleryApiDisabled: false,
  })),
  setAdminOtp: vi.fn(async () => {}),
  incrementAdminOtpAttempts: vi.fn(async () => 1),
  setAdminPassword: vi.fn(async () => {}),
  deleteImage: vi.fn(async () => ({ filename: "a.jpg", thumbnailFilename: "a-thumb.jpg" })),
  updateImageName: vi.fn(async () => true),
  deleteAllImages: vi.fn(async () => [{ filename: "a.jpg", thumbnailFilename: "a-thumb.jpg" }]),
  getServiceFlags: vi.fn(async () => ({ uploadsDisabled: false, galleryApiDisabled: false })),
  setServiceFlag: vi.fn(async (flag: string, value: boolean) => ({
    uploadsDisabled: flag === "uploadsDisabled" ? value : false,
    galleryApiDisabled: flag === "galleryApiDisabled" ? value : false,
  })),
  deleteReaction: vi.fn(async () => ({})),
  clearReactions: vi.fn(async () => ({})),
  setReactionNameOverride: vi.fn(async () => {}),
  getImages: vi.fn(async () => ({ images: [], nextCursor: null, total: 0 })),
};

vi.mock("../src/db.js", () => ({ database: mockDb }));
vi.mock("../src/s3.js", () => ({
  uploadBufferToS3: vi.fn(async () => "https://example.com/img.jpg"),
  checkS3Reachable: vi.fn(async () => true),
  getObjectStream: vi.fn(async () => null),
  deleteFromS3: vi.fn(async () => {}),
}));
vi.mock("../src/sseManager.js", () => ({
  sseManager: {
    broadcastNewImage: vi.fn(),
    broadcastReaction: vi.fn(),
    broadcastDeleteImage: vi.fn(),
    broadcastUpdateImage: vi.fn(),
    broadcastClearAll: vi.fn(),
    add: vi.fn(() => () => {}),
  },
}));

const sendAdminOtpEmail = vi.fn(async () => {});
vi.mock("../src/email.js", () => ({ sendAdminOtpEmail }));

// Rate limiting is tested in isolation (rateLimit.test.ts) — mock it out here so
// the many sequential requests in this file don't trip real in-memory thresholds.
vi.mock("express-rate-limit", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const { app } = await import("../src/app.js");

const ORIGINAL_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_PASSWORD = "fallback-password";
  mockDb.getAdminAuth.mockResolvedValue({
    passwordHash: null,
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
    uploadsDisabled: false,
    galleryApiDisabled: false,
  });
});

afterAll(() => {
  if (ORIGINAL_ADMIN_PASSWORD === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = ORIGINAL_ADMIN_PASSWORD;
});

describe("Admin auth", () => {
  it("GET /admin/api/check returns 401 when not logged in", async () => {
    const res = await request(app).get("/admin/api/check");
    expect(res.status).toBe(401);
  });

  it("POST /admin/api/login rejects a missing password", async () => {
    const res = await request(app).post("/admin/api/login").send({});
    expect(res.status).toBe(401);
  });

  it("POST /admin/api/login falls back to ADMIN_PASSWORD when no hash override is set", async () => {
    const agent = request.agent(app);
    const res = await agent.post("/admin/api/login").send({ password: "fallback-password" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const check = await agent.get("/admin/api/check");
    expect(check.status).toBe(200);
  });

  it("rejects the wrong fallback password", async () => {
    const res = await request(app).post("/admin/api/login").send({ password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("503s if no ADMIN_PASSWORD is configured and no override exists", async () => {
    delete process.env.ADMIN_PASSWORD;
    const res = await request(app).post("/admin/api/login").send({ password: "anything" });
    expect(res.status).toBe(503);
    process.env.ADMIN_PASSWORD = "fallback-password";
  });

  it("uses the bcrypt hash override instead of the env var when one is set", async () => {
    const hash = await bcrypt.hash("real-password", 4);
    mockDb.getAdminAuth.mockResolvedValue({
      passwordHash: hash,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      uploadsDisabled: false,
      galleryApiDisabled: false,
    });

    const wrongAttempt = await request(app)
      .post("/admin/api/login")
      .send({ password: "fallback-password" }); // matches env var, not the hash
    expect(wrongAttempt.status).toBe(401);

    const agent = request.agent(app);
    const rightAttempt = await agent.post("/admin/api/login").send({ password: "real-password" });
    expect(rightAttempt.status).toBe(200);
  });

  it("POST /admin/api/logout destroys the session", async () => {
    const agent = request.agent(app);
    await agent.post("/admin/api/login").send({ password: "fallback-password" });
    await agent.post("/admin/api/logout");

    const check = await agent.get("/admin/api/check");
    expect(check.status).toBe(401);
  });
});

describe("Admin image management (requires auth)", () => {
  async function loggedInAgent() {
    const agent = request.agent(app);
    await agent.post("/admin/api/login").send({ password: "fallback-password" });
    return agent;
  }

  it("rejects delete/update/delete-all without a session", async () => {
    const del = await request(app).post("/admin/api/delete/img-1");
    expect(del.status).toBe(401);

    const update = await request(app).post("/admin/api/update/img-1").send({ uploaderName: "X" });
    expect(update.status).toBe(401);

    const all = await request(app).post("/admin/api/delete-all");
    expect(all.status).toBe(401);
  });

  it("deletes an image and its S3 objects when authenticated", async () => {
    const agent = await loggedInAgent();
    const res = await agent.post("/admin/api/delete/img-1");
    expect(res.status).toBe(200);
    expect(mockDb.deleteImage).toHaveBeenCalledWith("img-1");
  });

  it("does not broadcast a delete event if the image didn't exist", async () => {
    mockDb.deleteImage.mockResolvedValueOnce(null);
    const agent = await loggedInAgent();
    const res = await agent.post("/admin/api/delete/missing");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("updates the uploader name, trimming and nulling empty values", async () => {
    const agent = await loggedInAgent();
    const res = await agent.post("/admin/api/update/img-1").send({ uploaderName: "  New Name  " });
    expect(res.status).toBe(200);
    expect(mockDb.updateImageName).toHaveBeenCalledWith("img-1", "New Name");
  });

  it("nulls the uploader name when given an empty string", async () => {
    const agent = await loggedInAgent();
    await agent.post("/admin/api/update/img-1").send({ uploaderName: "   " });
    expect(mockDb.updateImageName).toHaveBeenCalledWith("img-1", null);
  });

  it("deletes all images and reports the count", async () => {
    const agent = await loggedInAgent();
    const res = await agent.post("/admin/api/delete-all");
    expect(res.status).toBe(200);
    expect(res.body.deletedCount).toBe(1);
  });
});

describe("Admin service toggles (requires auth)", () => {
  async function loggedInAgent() {
    const agent = request.agent(app);
    await agent.post("/admin/api/login").send({ password: "fallback-password" });
    return agent;
  }

  it("rejects an invalid state value", async () => {
    const agent = await loggedInAgent();
    const res = await agent.post("/admin/api/service/uploads/maybe");
    expect(res.status).toBe(400);
  });

  it("toggles uploads off and on", async () => {
    const agent = await loggedInAgent();
    const off = await agent.post("/admin/api/service/uploads/off");
    expect(off.status).toBe(200);
    expect(mockDb.setServiceFlag).toHaveBeenCalledWith("uploadsDisabled", true);

    const on = await agent.post("/admin/api/service/uploads/on");
    expect(mockDb.setServiceFlag).toHaveBeenCalledWith("uploadsDisabled", false);
  });

  it("toggles the gallery API off and on", async () => {
    const agent = await loggedInAgent();
    await agent.post("/admin/api/service/gallery/off");
    expect(mockDb.setServiceFlag).toHaveBeenCalledWith("galleryApiDisabled", true);
  });

  it("requires auth for service-status", async () => {
    const res = await request(app).get("/admin/api/service-status");
    expect(res.status).toBe(401);
  });
});

describe("Admin reaction management (requires auth)", () => {
  async function loggedInAgent() {
    const agent = request.agent(app);
    await agent.post("/admin/api/login").send({ password: "fallback-password" });
    return agent;
  }

  it("deletes a single reaction emoji from an image", async () => {
    const agent = await loggedInAgent();
    const res = await agent.post("/admin/api/reactions/delete/img-1/" + encodeURIComponent("❤️"));
    expect(res.status).toBe(200);
    expect(mockDb.deleteReaction).toHaveBeenCalledWith("img-1", "❤️");
  });

  it("clears all reactions from an image", async () => {
    const agent = await loggedInAgent();
    const res = await agent.post("/admin/api/reactions/clear/img-1");
    expect(res.status).toBe(200);
    expect(mockDb.clearReactions).toHaveBeenCalledWith("img-1");
  });

  it("renames a reactor's display name, trimming and nulling empty values", async () => {
    const agent = await loggedInAgent();
    const res = await agent
      .post("/admin/api/reactions/rename/img-1/visitor-1")
      .send({ name: "  New Name  " });
    expect(res.status).toBe(200);
    expect(mockDb.setReactionNameOverride).toHaveBeenCalledWith("img-1", "visitor-1", "New Name");
  });
});

describe("Admin password reset via OTP", () => {
  it("forgot-password sends an OTP email and stores its hash", async () => {
    const res = await request(app).post("/admin/api/forgot-password");
    expect(res.status).toBe(200);
    expect(mockDb.setAdminOtp).toHaveBeenCalledTimes(1);
    expect(sendAdminOtpEmail).toHaveBeenCalledTimes(1);
  });

  it("forgot-password returns 503 if sending the email fails", async () => {
    sendAdminOtpEmail.mockRejectedValueOnce(new Error("Resend is down"));
    const res = await request(app).post("/admin/api/forgot-password");
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/resend is down/i);
  });

  it("reset-password rejects a short new password", async () => {
    const res = await request(app)
      .post("/admin/api/reset-password")
      .send({ otp: "123456", newPassword: "short" });
    expect(res.status).toBe(400);
  });

  it("reset-password rejects when there's no active OTP", async () => {
    const res = await request(app)
      .post("/admin/api/reset-password")
      .send({ otp: "123456", newPassword: "longenough1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no active reset code/i);
  });

  it("reset-password rejects an expired OTP", async () => {
    mockDb.getAdminAuth.mockResolvedValueOnce({
      passwordHash: null,
      otpHash: await bcrypt.hash("123456", 4),
      otpExpiresAt: new Date(Date.now() - 1000),
      otpAttempts: 0,
      uploadsDisabled: false,
      galleryApiDisabled: false,
    });

    const res = await request(app)
      .post("/admin/api/reset-password")
      .send({ otp: "123456", newPassword: "longenough1" });
    expect(res.status).toBe(400);
  });

  it("reset-password rejects after too many OTP attempts", async () => {
    mockDb.getAdminAuth.mockResolvedValueOnce({
      passwordHash: null,
      otpHash: await bcrypt.hash("123456", 4),
      otpExpiresAt: new Date(Date.now() + 60_000),
      otpAttempts: 5,
      uploadsDisabled: false,
      galleryApiDisabled: false,
    });

    const res = await request(app)
      .post("/admin/api/reset-password")
      .send({ otp: "123456", newPassword: "longenough1" });
    expect(res.status).toBe(429);
  });

  it("reset-password rejects an incorrect OTP and increments the attempt counter", async () => {
    mockDb.getAdminAuth.mockResolvedValueOnce({
      passwordHash: null,
      otpHash: await bcrypt.hash("123456", 4),
      otpExpiresAt: new Date(Date.now() + 60_000),
      otpAttempts: 0,
      uploadsDisabled: false,
      galleryApiDisabled: false,
    });

    const res = await request(app)
      .post("/admin/api/reset-password")
      .send({ otp: "000000", newPassword: "longenough1" });
    expect(res.status).toBe(401);
    expect(mockDb.incrementAdminOtpAttempts).toHaveBeenCalledTimes(1);
  });

  it("reset-password succeeds with the correct OTP and sets a new password hash", async () => {
    mockDb.getAdminAuth.mockResolvedValueOnce({
      passwordHash: null,
      otpHash: await bcrypt.hash("123456", 4),
      otpExpiresAt: new Date(Date.now() + 60_000),
      otpAttempts: 0,
      uploadsDisabled: false,
      galleryApiDisabled: false,
    });

    const res = await request(app)
      .post("/admin/api/reset-password")
      .send({ otp: "123456", newPassword: "longenough1" });
    expect(res.status).toBe(200);
    expect(mockDb.setAdminPassword).toHaveBeenCalledTimes(1);
  });
});

describe("Admin zip download (requires auth)", () => {
  it("rejects without a session", async () => {
    const res = await request(app).get("/admin/download");
    expect(res.status).toBe(401);
  });

  it("streams a zip when authenticated", async () => {
    const agent = request.agent(app);
    await agent.post("/admin/api/login").send({ password: "fallback-password" });

    const res = await agent.get("/admin/download");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/zip");
  });
});
