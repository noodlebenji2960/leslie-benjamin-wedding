import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import type { Readable } from "stream";

const AWS_REGION = process.env.AWS_REGION || "eu-west-3";
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "";
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;

export const s3 = new S3Client({ region: AWS_REGION });

export function publicUrl(key: string): string {
  if (CLOUDFRONT_URL) return `${CLOUDFRONT_URL}/${key}`;
  return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

export async function uploadBufferToS3(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    },
  });
  await upload.done();
  return publicUrl(key);
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }));
}

export async function getObjectStream(key: string): Promise<Readable | null> {
  try {
    const result = await s3.send(
      new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }),
    );
    return (result.Body as Readable) ?? null;
  } catch {
    return null;
  }
}

export async function checkS3Reachable(): Promise<boolean> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET_NAME }));
    return true;
  } catch {
    return false;
  }
}
