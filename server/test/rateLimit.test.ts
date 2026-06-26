import { describe, it, expect, vi } from "vitest";
import request from "supertest";

const mockDb = {
  getServiceFlags: vi.fn(async () => ({ uploadsDisabled: false, galleryApiDisabled: false })),
  getImages: vi.fn(async () => ({ images: [], nextCursor: null, total: 0 })),
  getAdminAuth: vi.fn(async () => ({
    passwordHash: null,
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
    uploadsDisabled: false,
    galleryApiDisabled: false,
  })),
};

vi.mock("../src/db.js", () => ({ database: mockDb }));
vi.mock("../src/s3.js", () => ({
  uploadBufferToS3: vi.fn(async () => "https://example.com/img.jpg"),
  checkS3Reachable: vi.fn(async () => true),
  getObjectStream: vi.fn(async () => null),
  deleteFromS3: vi.fn(async () => {}),
}));
vi.mock("../src/sseManager.js", () => ({
  sseManager: { broadcastNewImage: vi.fn(), add: vi.fn(() => () => {}) },
}));

// This file deliberately does NOT mock express-rate-limit — it tests the real thing.
const { app } = await import("../src/app.js");

describe("/gallery read rate limit (200 per 15 min)", () => {
  it("allows requests under the limit", async () => {
    const res = await request(app).get("/gallery");
    expect(res.status).toBe(200);
    expect(res.headers["ratelimit-limit"]).toBe("200");
  });
});

describe("/admin/api/login rate limit (10 per 15 min)", () => {
  it("returns 429 once the limit is exceeded for one IP", async () => {
    process.env.ADMIN_PASSWORD = "fallback-password";

    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await request(app).post("/admin/api/login").send({ password: "wrong" });
      lastStatus = res.status;
    }

    expect(lastStatus).toBe(429);
  });
});
