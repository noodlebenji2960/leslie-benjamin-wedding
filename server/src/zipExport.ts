import path from "path";
import type { Response } from "express";
import archiver from "archiver";
import { getObjectStream } from "./s3.js";
import type { ImageRecord } from "./types.js";

/**
 * Streams the given images as a zip directly to the response.
 * Filenames are deduplicated as "<uploaderName or date> (n).jpg" on collision.
 */
export async function streamImagesAsZip(
  images: ImageRecord[],
  res: Response,
  zipFilename: string,
): Promise<void> {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.on("error", (err) => { throw err; });
  archive.pipe(res);

  const usedNames = new Set<string>();
  for (const img of images) {
    const stream = await getObjectStream(`uploads/${img.filename}`);
    if (!stream) continue;
    const date = new Date(img.uploadedAt).toISOString().slice(0, 10);
    const ext = path.extname(img.filename) || ".jpg";
    let label = `${img.uploaderName ? `${img.uploaderName} - ${date}` : date}${ext}`;
    let suffix = 1;
    while (usedNames.has(label)) {
      label = `${img.uploaderName ? `${img.uploaderName} - ${date}` : date} (${suffix++})${ext}`;
    }
    usedNames.add(label);
    archive.append(stream, { name: label });
  }

  await archive.finalize();
}
