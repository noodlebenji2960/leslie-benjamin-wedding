import { useCallback, useRef } from "react";

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  loading,
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();

      if (!node || !hasMore) {
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasMore && !loading) {
            onLoadMore();
          }
        },
        {
          rootMargin: "400px 0px",
          threshold: 0,
        },
      );

      observerRef.current.observe(node);
    },
    [hasMore, loading, onLoadMore],
  );

  return sentinelRef;
}
