import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("publicUrl", () => {
  it("builds a raw S3 URL when no CloudFront URL is configured", async () => {
    delete process.env.CLOUDFRONT_URL;
    process.env.AWS_REGION = "eu-west-3";
    process.env.S3_BUCKET_NAME = "my-bucket";

    const { publicUrl } = await import("../src/s3.js");
    expect(publicUrl("uploads/abc.jpg")).toBe(
      "https://my-bucket.s3.eu-west-3.amazonaws.com/uploads/abc.jpg",
    );
  });

  it("prefers the CloudFront URL when one is configured", async () => {
    process.env.CLOUDFRONT_URL = "https://d123.cloudfront.net";
    process.env.AWS_REGION = "eu-west-3";
    process.env.S3_BUCKET_NAME = "my-bucket";

    const { publicUrl } = await import("../src/s3.js");
    expect(publicUrl("uploads/abc.jpg")).toBe(
      "https://d123.cloudfront.net/uploads/abc.jpg",
    );
  });

  it("defaults to eu-west-3 when AWS_REGION is unset", async () => {
    delete process.env.CLOUDFRONT_URL;
    delete process.env.AWS_REGION;
    process.env.S3_BUCKET_NAME = "my-bucket";

    const { publicUrl } = await import("../src/s3.js");
    expect(publicUrl("uploads/abc.jpg")).toContain(".s3.eu-west-3.amazonaws.com/");
  });
});
