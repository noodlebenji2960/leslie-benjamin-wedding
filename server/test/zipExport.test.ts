import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "stream";
import type { ImageRecord } from "../src/types.js";

const appendedNames: string[] = [];
const finalizeSpy = vi.fn(async () => {});

vi.mock("archiver", () => ({
  default: () => ({
    on: vi.fn(),
    pipe: vi.fn(),
    append: vi.fn((_stream: unknown, opts: { name: string }) => {
      appendedNames.push(opts.name);
    }),
    finalize: finalizeSpy,
  }),
}));

const getObjectStream = vi.fn(async (_key: string) => new Readable({ read() {} }));
vi.mock("../src/s3.js", () => ({ getObjectStream }));

const { streamImagesAsZip } = await import("../src/zipExport.js");

function makeImage(overrides: Partial<ImageRecord> = {}): ImageRecord {
  return {
    id: "id-1",
    url: "https://example.com/x.jpg",
    thumbnailUrl: "https://example.com/x-thumb.jpg",
    uploaderName: null,
    uploadedAt: "2026-06-25T12:00:00.000Z",
    filename: "id-1.jpg",
    fileSize: 100,
    uploaderVisitorId: null,
    ...overrides,
  } as ImageRecord;
}

function fakeResponse() {
  return { setHeader: vi.fn() } as unknown as import("express").Response;
}

beforeEach(() => {
  appendedNames.length = 0;
  finalizeSpy.mockClear();
  getObjectStream.mockClear();
});

describe("streamImagesAsZip", () => {
  it("sets the zip content-type and attachment filename headers", async () => {
    const res = fakeResponse();
    await streamImagesAsZip([], res, "wedding-photos.zip");

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/zip");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="wedding-photos.zip"',
    );
  });

  it("names a single image by uploader and date", async () => {
    const img = makeImage({ uploaderName: "Ben", uploadedAt: "2026-06-25T12:00:00.000Z" });
    await streamImagesAsZip([img], fakeResponse(), "x.zip");

    expect(appendedNames).toEqual(["Ben - 2026-06-25.jpg"]);
  });

  it("falls back to just the date when there's no uploader name", async () => {
    const img = makeImage({ uploaderName: null, uploadedAt: "2026-06-25T12:00:00.000Z" });
    await streamImagesAsZip([img], fakeResponse(), "x.zip");

    expect(appendedNames).toEqual(["2026-06-25.jpg"]);
  });

  it("deduplicates filenames that collide by appending (1), (2), ...", async () => {
    const images = [
      makeImage({ id: "1", uploaderName: "Ben", filename: "1.jpg" }),
      makeImage({ id: "2", uploaderName: "Ben", filename: "2.jpg" }),
      makeImage({ id: "3", uploaderName: "Ben", filename: "3.jpg" }),
    ];

    await streamImagesAsZip(images, fakeResponse(), "x.zip");

    expect(appendedNames).toEqual([
      "Ben - 2026-06-25.jpg",
      "Ben - 2026-06-25 (1).jpg",
      "Ben - 2026-06-25 (2).jpg",
    ]);
  });

  it("preserves the file extension from the stored filename", async () => {
    const img = makeImage({ filename: "abc.png", uploaderName: "Ben" });
    await streamImagesAsZip([img], fakeResponse(), "x.zip");

    expect(appendedNames[0]).toMatch(/\.png$/);
  });

  it("skips images whose S3 object can't be retrieved", async () => {
    getObjectStream.mockResolvedValueOnce(null);
    const img = makeImage();

    await streamImagesAsZip([img], fakeResponse(), "x.zip");

    expect(appendedNames).toEqual([]);
  });

  it("always calls finalize, even with an empty image list", async () => {
    await streamImagesAsZip([], fakeResponse(), "x.zip");
    expect(finalizeSpy).toHaveBeenCalledTimes(1);
  });
});
