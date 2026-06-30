// app/hooks/useGalleryPreviewImages.ts
import { useEffect, useState } from "react";
import type { SSEImageRecord } from "@/hooks/useSSE";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export const MIN_GALLERY_PREVIEW_PHOTOS = 8;

export function useGalleryPreviewImages() {
  const [images, setImages] = useState<SSEImageRecord[] | null>(null);

  useEffect(() => {
    // TEMP DEV MOCK — remove before committing. Stubs 20 local placeholder
    // images so the homepage gallery preview can be visually verified
    // without writing to the production gallery DB/S3 bucket.
    if (import.meta.env.DEV) {
      const mockModules: Record<string, string> = import.meta.glob(
        "/public/images/carousel/*.{jpg,jpeg,png,webp,avif,svg}",
        { eager: true, query: "?url", import: "default" },
      );
      const mockUrls = Object.values(mockModules).slice(0, 20);
      setImages(
        mockUrls.map((url, i) => ({
          id: `mock-${i}`,
          url,
          thumbnailUrl: url,
          uploaderName: "Test Guest",
          uploadedAt: new Date().toISOString(),
          filename: `mock-${i}.jpg`,
          fileSize: 0,
        })),
      );
      return;
    }

    if (!API_BASE) return;

    let cancelled = false;

    fetch(`${API_BASE}/gallery?limit=24`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setImages(data?.images ?? []);
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return images;
}
