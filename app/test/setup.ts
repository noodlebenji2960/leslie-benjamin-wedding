import "@testing-library/jest-dom";

// Hooks like useSSE/useImageUpload read this at call time via import.meta.env;
// without it set, API_BASE is "" and they silently no-op instead of running.
if (!import.meta.env.VITE_API_BASE_URL) {
  import.meta.env.VITE_API_BASE_URL = "http://localhost:3001";
}

// jsdom doesn't implement ResizeObserver — several components (e.g.
// UploadButton's staged-file preview sizing) use it in a layout effect.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom doesn't implement IntersectionObserver either — used by
// useInfiniteScroll's sentinel.
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds = [];
  } as unknown as typeof IntersectionObserver;
}
