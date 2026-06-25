export interface ImageRecord {
  id: string;
  url: string;
  thumbnailUrl: string;
  uploaderName: string | null;
  uploadedAt: string;
  filename: string;
  fileSize: number;
  uploaderIp: string | null;
  uploaderVisitorId: string | null;
  uploaderUserAgent: string | null;
  reactions?: Record<string, number>;
}

export interface GalleryResponse {
  images: ImageRecord[];
  nextCursor: string | null;
  total: number;
}
