import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mockDb = {
  getServiceFlags: vi.fn(async () => ({ uploadsDisabled: false, galleryApiDisabled: false })),
  getImages: vi.fn(async () => ({ images: [], nextCursor: null, total: 0 })),
  getImagesByIds: vi.fn(async () => ({ images: [] })),
  addImage: vi.fn(async () => {}),
  upsertVisitor: vi.fn(async () => {}),
  setReaction: vi.fn(async () => ({ reactions: {}, previousEmoji: null })),
  getReactionDetails: vi.fn(async () => []),
};

vi.mock("../src/db.js", () => ({ database: mockDb }));
vi.mock("../src/s3.js", () => ({
  uploadBufferToS3: vi.fn(async (key: string) => `https://bucket.s3.example.com/${key}`),
  checkS3Reachable: vi.fn(async () => true),
  getObjectStream: vi.fn(async () => null),
  deleteFromS3: vi.fn(async () => {}),
}));
vi.mock("express-rate-limit", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
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

const { app } = await import("../src/app.js");
const { makeJpegBuffer, makePngBuffer } = await import("./helpers.js");

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.getServiceFlags.mockResolvedValue({ uploadsDisabled: false, galleryApiDisabled: false });
});

describe("GET /health", () => {
  it("reports degraded when the DB isn't connected", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.db).toBe("disconnected");
    expect(res.body.s3Reachable).toBe(true);
    expect(res.body.status).toBe("degraded");
  });
});

describe("GET /config", () => {
  it("exposes the reaction groups and upload limits", async () => {
    const res = await request(app).get("/config");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.REACTION_GROUPS)).toBe(true);
    expect(res.body.REACTION_GROUPS.length).toBeGreaterThan(0);
    expect(typeof res.body.maxUploadSize).toBe("number");
    expect(typeof res.body.maxUploaderNameLength).toBe("number");
  });
});

describe("GET /gallery", () => {
  it("returns the paginated image list from the database", async () => {
    mockDb.getImages.mockResolvedValueOnce({
      images: [{ id: "abc", url: "u", thumbnailUrl: "t" }],
      nextCursor: "2026-01-01T00:00:00.000Z",
      total: 5,
    });

    const res = await request(app).get("/gallery?limit=10");
    expect(res.status).toBe(200);
    expect(res.body.images).toHaveLength(1);
    expect(res.body.total).toBe(5);
    expect(mockDb.getImages).toHaveBeenCalledWith(10, undefined);
  });

  it("forwards the cursor query param", async () => {
    await request(app).get("/gallery?limit=5&cursor=2026-01-01T00:00:00.000Z");
    expect(mockDb.getImages).toHaveBeenCalledWith(5, "2026-01-01T00:00:00.000Z");
  });

  it("caps the limit at 100 even if a larger value is requested", async () => {
    await request(app).get("/gallery?limit=99999");
    expect(mockDb.getImages).toHaveBeenCalledWith(100, undefined);
  });

  it("defaults to 50 when limit is missing or invalid", async () => {
    await request(app).get("/gallery");
    expect(mockDb.getImages).toHaveBeenCalledWith(50, undefined);
  });

  it("returns 503 when the gallery API is disabled", async () => {
    mockDb.getServiceFlags.mockResolvedValueOnce({ uploadsDisabled: false, galleryApiDisabled: true });
    const res = await request(app).get("/gallery");
    expect(res.status).toBe(503);
  });
});

describe("POST /upload", () => {
  it("rejects a request with no file", async () => {
    const res = await request(app).post("/upload").field("uploaderName", "Ben");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  it("rejects a file whose content doesn't match its declared type", async () => {
    const fakeJpeg = Buffer.from("this is not actually a jpeg");
    const res = await request(app)
      .post("/upload")
      .attach("file", fakeJpeg, { filename: "photo.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid file content/i);
  });

  it("accepts a real JPEG, uploads it, and broadcasts the new image", async () => {
    const jpeg = await makeJpegBuffer();
    const res = await request(app)
      .post("/upload")
      .field("uploaderName", "  Ben  ")
      .field("uploaderVisitorId", "visitor_123")
      .attach("file", jpeg, { filename: "photo.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(201);
    expect(res.body.uploaderName).toBe("Ben");
    expect(res.body.uploaderVisitorId).toBe("visitor_123");
    expect(res.body.url).toMatch(/^https:\/\//);
    expect(res.body.thumbnailUrl).toMatch(/^https:\/\//);
    expect(mockDb.addImage).toHaveBeenCalledTimes(1);
    expect(mockDb.upsertVisitor).toHaveBeenCalledTimes(1);
  });

  it("accepts a real PNG too", async () => {
    const png = await makePngBuffer();
    const res = await request(app)
      .post("/upload")
      .field("uploaderName", "Ana")
      .attach("file", png, { filename: "photo.png", contentType: "image/png" });

    expect(res.status).toBe(201);
  });

  it("never calls upsertVisitor when no visitorId is provided", async () => {
    const jpeg = await makeJpegBuffer();
    await request(app)
      .post("/upload")
      .field("uploaderName", "Ben")
      .attach("file", jpeg, { filename: "photo.jpg", contentType: "image/jpeg" });

    expect(mockDb.upsertVisitor).not.toHaveBeenCalled();
  });

  it("strips uploaderIp/uploaderUserAgent expectations are not part of the public response shape", async () => {
    const jpeg = await makeJpegBuffer();
    const res = await request(app)
      .post("/upload")
      .field("uploaderName", "Ben")
      .attach("file", jpeg, { filename: "photo.jpg", contentType: "image/jpeg" });

    // The route itself returns the full ImageRecord it builds (including IP/UA) —
    // the privacy guarantee lives in getImages()'s .select() exclusion, tested separately.
    // This test just locks in today's upload response shape so a regression is visible.
    expect(Object.keys(res.body).sort()).toEqual(
      [
        "fileSize",
        "filename",
        "id",
        "thumbnailUrl",
        "uploadedAt",
        "uploaderIp",
        "uploaderName",
        "uploaderUserAgent",
        "uploaderVisitorId",
        "url",
      ].sort(),
    );
  });

  it("returns 503 when uploads are disabled", async () => {
    mockDb.getServiceFlags.mockResolvedValueOnce({ uploadsDisabled: true, galleryApiDisabled: false });
    const jpeg = await makeJpegBuffer();
    const res = await request(app)
      .post("/upload")
      .field("uploaderName", "Ben")
      .attach("file", jpeg, { filename: "photo.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(503);
  });

  it("returns 503 when the gallery API is disabled, even if uploads alone are enabled", async () => {
    mockDb.getServiceFlags.mockResolvedValueOnce({ uploadsDisabled: false, galleryApiDisabled: true });
    const jpeg = await makeJpegBuffer();
    const res = await request(app)
      .post("/upload")
      .field("uploaderName", "Ben")
      .attach("file", jpeg, { filename: "photo.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(503);
  });
});

describe("POST /download", () => {
  it("rejects a missing or empty ids array", async () => {
    const res1 = await request(app).post("/download").send({});
    expect(res1.status).toBe(400);

    const res2 = await request(app).post("/download").send({ ids: [] });
    expect(res2.status).toBe(400);
  });

  it("rejects a non-array ids field", async () => {
    const res = await request(app).post("/download").send({ ids: "not-an-array" });
    expect(res.status).toBe(400);
  });

  it("rejects an array containing non-string entries", async () => {
    const res = await request(app).post("/download").send({ ids: ["abc", 123] });
    expect(res.status).toBe(400);
  });

  it("sanitizes ids and caps the request at 200", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `id-${i}!!!`);
    mockDb.getImagesByIds.mockResolvedValueOnce({ images: [] });

    await request(app).post("/download").send({ ids });

    const passedIds = mockDb.getImagesByIds.mock.calls[0][0] as string[];
    expect(passedIds.length).toBe(200);
    expect(passedIds[0]).toBe("id-0"); // special characters stripped
  });
});

describe("POST /react", () => {
  const validBody = {
    imageId: "img-1",
    visitorId: "visitor-1",
    uploaderName: "Ben",
    emoji: "❤️",
  };

  it("rejects an emoji that isn't in the configured set", async () => {
    const res = await request(app).post("/react").send({ ...validBody, emoji: "🚀" });
    expect(res.status).toBe(400);
  });

  it("rejects a missing uploaderName", async () => {
    const res = await request(app).post("/react").send({ ...validBody, uploaderName: "" });
    expect(res.status).toBe(400);
  });

  it("rejects non-string fields", async () => {
    const res = await request(app).post("/react").send({ ...validBody, visitorId: 42 });
    expect(res.status).toBe(400);
  });

  it("upserts the visitor and sets the reaction on success", async () => {
    mockDb.setReaction.mockResolvedValueOnce({ reactions: { "❤️": 1 }, previousEmoji: null });

    const res = await request(app).post("/react").send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.reactions).toEqual({ "❤️": 1 });
    expect(mockDb.upsertVisitor).toHaveBeenCalledWith(
      expect.objectContaining({ visitorId: "visitor-1", name: "Ben" }),
    );
    expect(mockDb.setReaction).toHaveBeenCalledWith("img-1", "visitor-1", "❤️");
  });

  it("sanitizes imageId and visitorId before passing them to the database", async () => {
    await request(app)
      .post("/react")
      .send({ ...validBody, imageId: "img-1<script>", visitorId: "visitor-1; DROP" });

    expect(mockDb.setReaction).toHaveBeenCalledWith("img-1script", "visitor-1DROP", "❤️");
  });
});

describe("GET /reactions/:imageId", () => {
  it("returns the reaction details for an image", async () => {
    mockDb.getReactionDetails.mockResolvedValueOnce([
      { emoji: "❤️", name: "Ben", visitorId: "v1" },
    ]);

    const res = await request(app).get("/reactions/img-1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Ben");
  });
});

describe("404 handler", () => {
  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/this-route-does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });
});
