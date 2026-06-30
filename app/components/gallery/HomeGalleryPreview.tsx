// app/components/gallery/HomeGalleryPreview.tsx
import Carousel from "@/components/Carousel";
import { useBuildLink } from "@/hooks/useBuildLink";
import type { SSEImageRecord } from "@/hooks/useSSE";

interface HomeGalleryPreviewProps {
  images: SSEImageRecord[];
}

export function HomeGalleryPreview({ images }: HomeGalleryPreviewProps) {
  const { buildLink } = useBuildLink();
  const imageIdByThumbnail = new Map(
    images.map((img) => [img.thumbnailUrl, img.id]),
  );

  return (
    <div className="home-gallery-preview">
      <Carousel
        photos={images.map((img) => img.thumbnailUrl)}
        getGalleryLink={(photoUrl) => {
          const id = imageIdByThumbnail.get(photoUrl);
          return id ? `${buildLink("/gallery")}?photo=${id}` : null;
        }}
      />
    </div>
  );
}
