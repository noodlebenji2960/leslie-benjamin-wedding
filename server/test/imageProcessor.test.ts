import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { processImage } from "../src/imageProcessor.js";

async function makeJpegWithOrientation(
  width: number,
  height: number,
  orientation: number,
): Promise<Buffer> {
  const base = await sharp({
    create: { width, height, channels: 3, background: "red" },
  })
    .jpeg()
    .toBuffer();

  // withMetadata({ orientation }) writes the EXIF Orientation tag without
  // physically rotating the pixels — exactly how phone cameras store it.
  return sharp(base).withMetadata({ orientation }).jpeg().toBuffer();
}

describe("processImage", () => {
  it("bakes in EXIF orientation instead of ignoring it", async () => {
    // Orientation 6 = rotate 90° CW to display correctly: a 200x100 source
    // should come out as 100x200 once the rotation is applied.
    const input = await makeJpegWithOrientation(200, 100, 6);

    const { original } = await processImage(input);
    const meta = await sharp(original).metadata();

    expect(meta.width).toBe(100);
    expect(meta.height).toBe(200);
    // The orientation tag should be consumed/stripped, not carried over.
    expect(meta.orientation).toBeUndefined();
  });

  it("leaves normally-oriented images untouched in aspect ratio", async () => {
    const input = await makeJpegWithOrientation(200, 100, 1); // orientation 1 = normal
    const { original } = await processImage(input);
    const meta = await sharp(original).metadata();

    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });

  it("resizes the original down to fit within 2000x2000", async () => {
    const input = await sharp({
      create: { width: 3000, height: 1500, channels: 3, background: "blue" },
    })
      .jpeg()
      .toBuffer();

    const { original } = await processImage(input);
    const meta = await sharp(original).metadata();

    expect(meta.width).toBeLessThanOrEqual(2000);
    expect(meta.height).toBeLessThanOrEqual(2000);
  });

  it("never upscales an image smaller than the target dimensions", async () => {
    const input = await sharp({
      create: { width: 50, height: 50, channels: 3, background: "green" },
    })
      .jpeg()
      .toBuffer();

    const { original } = await processImage(input);
    const meta = await sharp(original).metadata();

    expect(meta.width).toBe(50);
    expect(meta.height).toBe(50);
  });

  it("produces a 400x400 cropped thumbnail regardless of source aspect ratio", async () => {
    const input = await sharp({
      create: { width: 1200, height: 600, channels: 3, background: "yellow" },
    })
      .jpeg()
      .toBuffer();

    const { thumbnail } = await processImage(input);
    const meta = await sharp(thumbnail).metadata();

    expect(meta.width).toBe(400);
    expect(meta.height).toBe(400);
  });

  it("outputs JPEG for both original and thumbnail even when the input is PNG", async () => {
    const input = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();

    const { original, thumbnail } = await processImage(input);
    const originalMeta = await sharp(original).metadata();
    const thumbMeta = await sharp(thumbnail).metadata();

    expect(originalMeta.format).toBe("jpeg");
    expect(thumbMeta.format).toBe("jpeg");
  });
});
