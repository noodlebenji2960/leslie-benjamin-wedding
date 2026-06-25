import { useState } from "react";
import type { SSEImageRecord } from "./useSSE";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

// Max dimension and file size to target before uploading.
// The server limit is 10 MB; we target 8 MB to leave headroom.
const MAX_DIMENSION = 2000;
const TARGET_SIZE_BYTES = 8 * 1024 * 1024;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;

async function compressImage(file: File): Promise<File> {
  // Only compress raster images; leave GIFs as-is (canvas kills animation)
  if (file.type === "image/gif" || file.size <= TARGET_SIZE_BYTES) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until we're under the target size
      const tryQuality = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("Canvas compression failed")); return; }
            if (blob.size <= TARGET_SIZE_BYTES || quality <= MIN_QUALITY) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              tryQuality(Math.max(quality - 0.1, MIN_QUALITY));
            }
          },
          "image/jpeg",
          quality
        );
      };

      tryQuality(INITIAL_QUALITY);
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); }; // fallback: send original
    img.src = objectUrl;
  });
}

type UploadStatus = "idle" | "staging" | "uploading" | "success" | "error";

interface UploadOptions {
  uploaderName?: string;
  visitorId?: string;
  onProgress?: (percent: number) => void;
}

interface UseImageUploadResult {
  status: UploadStatus;
  errorMessage: string | null;
  upload: (file: File, options?: UploadOptions) => Promise<SSEImageRecord | null>;
  reset: () => void;
}

class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super("Too many requests. Please wait before trying again.");
  }
}

function uploadViaXhr(
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<SSEImageRecord> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as SSEImageRecord);
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else if (xhr.status === 429) {
        const data = JSON.parse(xhr.responseText || "{}") as { retryAfterSeconds?: number };
        const retryAfterHeader = Number(xhr.getResponseHeader("Retry-After"));
        reject(new RateLimitError(data.retryAfterSeconds ?? (retryAfterHeader || 60)));
      } else {
        const data = JSON.parse(xhr.responseText || "{}") as { error?: string };
        reject(new Error(data.error ?? `Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed. Please try again."));

    xhr.send(formData);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_RATE_LIMIT_RETRIES = 1;

async function uploadWithRateLimitRetry(
  formData: FormData,
  options?: UploadOptions,
): Promise<SSEImageRecord> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await uploadViaXhr(formData, options?.onProgress);
    } catch (err) {
      if (!(err instanceof RateLimitError) || attempt >= MAX_RATE_LIMIT_RETRIES) throw err;
      options?.onProgress?.(0);
      await delay(err.retryAfterSeconds * 1000);
    }
  }
}

export function useImageUpload(): UseImageUploadResult {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const upload = async (file: File, options?: UploadOptions): Promise<SSEImageRecord | null> => {
    setStatus("staging");
    setErrorMessage(null);

    const compressed = await compressImage(file);

    const formData = new FormData();
    formData.append("file", compressed);
    if (options?.uploaderName?.trim()) {
      formData.append("uploaderName", options.uploaderName.trim());
    }
    if (options?.visitorId?.trim()) {
      formData.append("uploaderVisitorId", options.visitorId.trim());
    }

    setStatus("uploading");

    try {
      const image = await uploadWithRateLimitRetry(formData, options);
      setStatus("success");
      return image;
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
      return null;
    }
  };

  const reset = () => {
    setStatus("idle");
    setErrorMessage(null);
  };

  return { status, errorMessage, upload, reset };
}
