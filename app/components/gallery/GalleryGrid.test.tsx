import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import { GalleryGrid } from "./GalleryGrid";
import type { SSEImageRecord } from "@/hooks/useSSE";

function makeImage(overrides: Partial<SSEImageRecord> = {}): SSEImageRecord {
  return {
    id: "img-1",
    url: "https://example.com/img-1.jpg",
    thumbnailUrl: "https://example.com/img-1-thumb.jpg",
    uploaderName: "Ben",
    uploadedAt: "2026-06-25T12:00:00.000Z",
    filename: "img-1.jpg",
    fileSize: 100,
    ...overrides,
  };
}

const CONFIG = {
  REACTION_GROUPS: [{ key: "love", label: "Love", icon: "💖", emojis: ["❤️"] }],
  maxUploadSize: 10_000_000,
  maxUploaderNameLength: 100,
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/config")) return { ok: true, json: async () => CONFIG };
      if (url.includes("/reactions/")) return { ok: true, json: async () => [] };
      throw new Error(`Unexpected fetch in test: ${url}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GalleryGrid — loading and empty states", () => {
  it("shows skeleton placeholders while loading with no images yet", () => {
    const { container } = renderWithProviders(<GalleryGrid images={[]} loading />);
    expect(container.querySelectorAll(".gallery-grid__skeleton").length).toBeGreaterThan(0);
  });

  it("shows an empty state once loading has finished with no images", () => {
    renderWithProviders(<GalleryGrid images={[]} loading={false} />);
    expect(screen.getByText(/no photos yet/i)).toBeInTheDocument();
  });
});

describe("GalleryGrid — grid rendering", () => {
  it("renders one item per image with its thumbnail and uploader name", () => {
    const images = [makeImage({ id: "a", uploaderName: "ben" }), makeImage({ id: "b", uploaderName: null })];
    const { container } = renderWithProviders(<GalleryGrid images={images} />);

    const thumbs = container.querySelectorAll(".gallery-grid__thumb");
    expect(thumbs).toHaveLength(2);
    expect(screen.getByText(/uploaded by ben/i)).toBeInTheDocument();
  });

  it("shows reaction counts when an image has reactions", () => {
    const images = [makeImage({ reactions: { "❤️": 3 } })];
    renderWithProviders(<GalleryGrid images={images} />);
    expect(screen.getByText(/❤️ 3/)).toBeInTheDocument();
  });

  it("shows the load-more button only when hasMore is true", () => {
    const images = [makeImage()];
    const { rerender } = renderWithProviders(
      <GalleryGrid images={images} hasMore={false} onLoadMore={vi.fn()} />,
    );
    expect(screen.queryByText(/load more/i)).not.toBeInTheDocument();

    rerender(<GalleryGrid images={images} hasMore onLoadMore={vi.fn()} />);
    expect(screen.getByText(/load more/i)).toBeInTheDocument();
  });

  it("calls onLoadMore when the load-more button is clicked", () => {
    const onLoadMore = vi.fn();
    const images = [makeImage()];
    renderWithProviders(<GalleryGrid images={images} hasMore onLoadMore={onLoadMore} />);

    fireEvent.click(screen.getByText(/load more/i));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});

describe("GalleryGrid — lightbox", () => {
  it("opens the lightbox on a plain click and shows the full-size image", () => {
    const images = [makeImage({ id: "a" }), makeImage({ id: "b" })];
    const { container } = renderWithProviders(<GalleryGrid images={images} />);

    const items = container.querySelectorAll(".gallery-grid__item");
    fireEvent.click(items[0]);

    expect(document.querySelector(".gallery-lightbox")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("closes the lightbox via the close button", () => {
    const images = [makeImage()];
    const { container } = renderWithProviders(<GalleryGrid images={images} />);
    fireEvent.click(container.querySelector(".gallery-grid__item")!);
    expect(document.querySelector(".gallery-lightbox")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close"));

    expect(document.querySelector(".gallery-lightbox")).not.toBeInTheDocument();
  });

  it("closes the lightbox on Escape", () => {
    const images = [makeImage()];
    const { container } = renderWithProviders(<GalleryGrid images={images} />);
    fireEvent.click(container.querySelector(".gallery-grid__item")!);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(document.querySelector(".gallery-lightbox")).not.toBeInTheDocument();
  });

  it("navigates to the next image on ArrowRight and updates the counter", () => {
    const images = [makeImage({ id: "a" }), makeImage({ id: "b" })];
    const { container } = renderWithProviders(<GalleryGrid images={images} />);
    fireEvent.click(container.querySelector(".gallery-grid__item")!);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("does not navigate past the last image", () => {
    const images = [makeImage({ id: "a" })];
    const { container } = renderWithProviders(<GalleryGrid images={images} />);
    fireEvent.click(container.querySelector(".gallery-grid__item")!);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  it("hides the previous-nav button on the first image and the next-nav button on the last", () => {
    const images = [makeImage({ id: "a" }), makeImage({ id: "b" })];
    const { container } = renderWithProviders(<GalleryGrid images={images} />);
    fireEvent.click(container.querySelector(".gallery-grid__item")!);

    expect(screen.queryByLabelText("Previous")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Next")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Next"));

    expect(screen.getByLabelText("Previous")).toBeInTheDocument();
    expect(screen.queryByLabelText("Next")).not.toBeInTheDocument();
  });

  it("closes the lightbox automatically if the open image is removed from the array", () => {
    const images = [makeImage({ id: "a" }), makeImage({ id: "b" })];
    const { container, rerender } = renderWithProviders(<GalleryGrid images={images} />);
    fireEvent.click(container.querySelectorAll(".gallery-grid__item")[0]);
    expect(document.querySelector(".gallery-lightbox")).toBeInTheDocument();

    rerender(<GalleryGrid images={[images[1]]} />);

    expect(document.querySelector(".gallery-lightbox")).not.toBeInTheDocument();
  });
});

describe("GalleryGrid — selection and download", () => {
  it("shows 'Download all' when nothing is selected", () => {
    renderWithProviders(<GalleryGrid images={[makeImage()]} />);
    expect(screen.getByText(/download all/i)).toBeInTheDocument();
  });

  it("selecting an image switches the toolbar to selection mode with a count", () => {
    const images = [makeImage({ id: "a" }), makeImage({ id: "b" })];
    const { container } = renderWithProviders(<GalleryGrid images={images} />);

    const checks = container.querySelectorAll(".gallery-grid__check");
    fireEvent.click(checks[0]);

    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
    expect(screen.getByText(/download selected/i)).toBeInTheDocument();
  });

  it("select all selects every image and updates the count", () => {
    const images = [makeImage({ id: "a" }), makeImage({ id: "b" }), makeImage({ id: "c" })];
    const { container } = renderWithProviders(<GalleryGrid images={images} />);
    fireEvent.click(container.querySelectorAll(".gallery-grid__check")[0]);

    fireEvent.click(screen.getByText(/select all/i));

    expect(screen.getByText(/3 selected/i)).toBeInTheDocument();
  });

  it("cancel clears the selection and returns to the default toolbar", () => {
    const images = [makeImage({ id: "a" })];
    const { container } = renderWithProviders(<GalleryGrid images={images} />);
    fireEvent.click(container.querySelector(".gallery-grid__check")!);
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/cancel/i));

    expect(screen.getByText(/download all/i)).toBeInTheDocument();
  });

  it("clicking a selected item while in selection mode toggles it instead of opening the lightbox", () => {
    const images = [makeImage({ id: "a" })];
    const { container } = renderWithProviders(<GalleryGrid images={images} />);
    fireEvent.click(container.querySelector(".gallery-grid__check")!);

    fireEvent.click(container.querySelector(".gallery-grid__item")!);

    expect(document.querySelector(".gallery-lightbox")).not.toBeInTheDocument();
    expect(screen.getByText(/download all/i)).toBeInTheDocument(); // back to 0 selected
  });

  it("downloads the selection by POSTing the selected ids and triggering a file save", async () => {
    const images = [makeImage({ id: "a" }), makeImage({ id: "b" })];
    const blob = new Blob(["zip"], { type: "application/zip" });
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url.includes("/config")) return { ok: true, json: async () => CONFIG };
      if (url.includes("/download")) return { ok: true, blob: async () => blob };
      return { ok: true, json: async () => [] };
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:fake"), revokeObjectURL: vi.fn() });

    const { container } = renderWithProviders(<GalleryGrid images={images} />);
    fireEvent.click(container.querySelector(".gallery-grid__check")!);

    fireEvent.click(screen.getByText(/download selected/i));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/download"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const call = fetchMock.mock.calls.find(([url]) => (url as string).includes("/download"))!;
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.ids).toEqual(["a"]);
  });

  it("shows an error toast if the download request fails", async () => {
    const images = [makeImage({ id: "a" })];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/config")) return { ok: true, json: async () => CONFIG };
        if (url.includes("/download")) return { ok: false };
        return { ok: true, json: async () => [] };
      }),
    );

    renderWithProviders(<GalleryGrid images={images} />);
    fireEvent.click(screen.getByText(/download all/i));

    await waitFor(() => expect(screen.getByText(/download failed/i)).toBeInTheDocument());
  });
});

describe("GalleryGrid — locked mode", () => {
  it("does not open the reaction picker via the reactions summary while locked", () => {
    const images = [makeImage({ reactions: { "❤️": 1 } })];
    renderWithProviders(<GalleryGrid images={images} locked />);

    fireEvent.click(screen.getByText(/❤️ 1/));

    expect(document.querySelector(".reaction-picker")).not.toBeInTheDocument();
  });

  it("still allows opening the lightbox while locked", () => {
    const images = [makeImage()];
    const { container } = renderWithProviders(<GalleryGrid images={images} locked />);

    fireEvent.click(container.querySelector(".gallery-grid__item")!);

    expect(document.querySelector(".gallery-lightbox")).toBeInTheDocument();
  });

  it("still allows selecting and downloading while locked", () => {
    const images = [makeImage({ id: "a" })];
    const { container } = renderWithProviders(<GalleryGrid images={images} locked />);

    fireEvent.click(container.querySelector(".gallery-grid__check")!);

    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
  });

  it("hides the lightbox react button while locked", () => {
    const images = [makeImage()];
    const { container } = renderWithProviders(<GalleryGrid images={images} locked />);
    fireEvent.click(container.querySelector(".gallery-grid__item")!);

    expect(screen.queryByLabelText(/add reaction/i)).not.toBeInTheDocument();
  });

  it("shows the lightbox react button when not locked and there are no reactions yet", () => {
    const images = [makeImage()];
    const { container } = renderWithProviders(<GalleryGrid images={images} locked={false} />);
    fireEvent.click(container.querySelector(".gallery-grid__item")!);

    expect(screen.getByLabelText(/add reaction/i)).toBeInTheDocument();
  });
});
