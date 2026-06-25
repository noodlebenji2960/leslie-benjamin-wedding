import { useEffect, useRef, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export interface SSEImageRecord {
  id: string;
  url: string;
  thumbnailUrl: string;
  uploaderName: string | null;
  uploadedAt: string;
  filename: string;
  fileSize: number;
  reactions?: Record<string, number>;
}

export function useSSE(
  onNewImage: (image: SSEImageRecord) => void,
  onDeleteImage?: (id: string) => void,
  onUpdateImage?: (id: string, uploaderName: string | null) => void,
  onReactImage?: (id: string, reactions: Record<string, number>) => void,
  onClearAll?: () => void,
) {
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onNewImageRef = useRef(onNewImage);
  onNewImageRef.current = onNewImage;
  const onDeleteImageRef = useRef(onDeleteImage);
  onDeleteImageRef.current = onDeleteImage;
  const onUpdateImageRef = useRef(onUpdateImage);
  onUpdateImageRef.current = onUpdateImage;
  const onReactImageRef = useRef(onReactImage);
  onReactImageRef.current = onReactImage;
  const onClearAllRef = useRef(onClearAll);
  onClearAllRef.current = onClearAll;

  const connect = useCallback(() => {
    if (!API_BASE) return;
    if (esRef.current) esRef.current.close();

    const es = new EventSource(`${API_BASE}/events`);
    esRef.current = es;

    es.addEventListener("new-image", (e) => {
      try {
        const image: SSEImageRecord = JSON.parse(e.data);
        onNewImageRef.current(image);
      } catch {
        // malformed event — ignore
      }
    });

    es.addEventListener("delete-image", (e) => {
      try {
        const { id } = JSON.parse(e.data) as { id: string };
        onDeleteImageRef.current?.(id);
      } catch {
        // malformed event — ignore
      }
    });

    es.addEventListener("update-image", (e) => {
      try {
        const { id, uploaderName } = JSON.parse(e.data) as { id: string; uploaderName: string | null };
        onUpdateImageRef.current?.(id, uploaderName);
      } catch {
        // malformed event — ignore
      }
    });

    es.addEventListener("react-image", (e) => {
      try {
        const { id, reactions } = JSON.parse(e.data) as { id: string; reactions: Record<string, number> };
        onReactImageRef.current?.(id, reactions);
      } catch {
        // malformed event — ignore
      }
    });

    es.addEventListener("clear-all", () => {
      onClearAllRef.current?.();
    });

    es.onerror = () => {
      es.close();
      reconnectTimer.current = setTimeout(connect, 5_000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      clearTimeout(reconnectTimer.current);
    };
  }, [connect]);
}
