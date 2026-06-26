import sharp from "sharp";

export async function makeJpegBuffer(width = 20, height = 20): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: "red" },
  })
    .jpeg()
    .toBuffer();
}

export async function makePngBuffer(width = 20, height = 20): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: "blue" },
  })
    .png()
    .toBuffer();
}
