import sharp from "sharp";

export interface ProcessedImage {
  original: Buffer;
  thumbnail: Buffer;
}

/**
 * Resize and optimize an uploaded image, producing a full-size JPEG and a thumbnail buffer.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const [original, thumbnail] = await Promise.all([
    sharp(input)
      .rotate() // auto-rotate from EXIF orientation before resizing
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer(),

    sharp(input)
      .rotate()
      .resize(400, 400, { fit: "cover" })
      .jpeg({ quality: 75 })
      .toBuffer(),
  ]);

  return { original, thumbnail };
}
