import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import { InlineReactionPicker } from "./ReactionPicker";

const CONFIG = {
  REACTION_GROUPS: [
    { key: "love", label: "Love", icon: "💖", emojis: ["❤️", "🤍"] },
    { key: "fun", label: "Fun", icon: "💃", emojis: ["😂", "😮"] },
  ],
  maxUploadSize: 10_000_000,
  maxUploaderNameLength: 100,
};

let reactResponse: { reactions: Record<string, number>; previousEmoji: string | null } = {
  reactions: { "❤️": 1 },
  previousEmoji: null,
};
let reactOk = true;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("wedding_uploader_name", "Ben");
  reactOk = true;
  reactResponse = { reactions: { "❤️": 1 }, previousEmoji: null };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, opts?: RequestInit) => {
      if (url.endsWith("/config")) {
        return { ok: true, json: async () => CONFIG };
      }
      if (url.endsWith("/react")) {
        return { ok: reactOk, json: async () => reactResponse };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(props: Partial<Parameters<typeof InlineReactionPicker>[0]> = {}) {
  const onReacted = vi.fn();
  const onClose = vi.fn();
  const utils = renderWithProviders(
    <InlineReactionPicker
      imageId="img-1"
      myReaction={null}
      onReacted={onReacted}
      onClose={onClose}
      {...props}
    />,
  );
  return { ...utils, onReacted, onClose };
}

async function waitForConfigLoaded() {
  await waitFor(() => expect(screen.getByText("❤️")).toBeInTheDocument());
}

describe("InlineReactionPicker — main pill", () => {
  it("shows up to 4 quick-react emojis from the loaded config", async () => {
    setup();
    await waitForConfigLoaded();
    expect(screen.getByText("❤️")).toBeInTheDocument();
    expect(screen.getByText("🤍")).toBeInTheDocument();
    expect(screen.getByText("😂")).toBeInTheDocument();
    expect(screen.getByText("😮")).toBeInTheDocument();
  });

  it("submits a reaction and calls onReacted with the new counts", async () => {
    const { onReacted, onClose } = setup();
    await waitForConfigLoaded();

    fireEvent.click(screen.getByText("❤️"));

    await waitFor(() => expect(onReacted).toHaveBeenCalledWith("❤️", { "❤️": 1 }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes without calling the API when re-clicking the user's current reaction", async () => {
    const { onReacted, onClose } = setup({ myReaction: "❤️" });
    await waitForConfigLoaded();

    fireEvent.click(screen.getByText("❤️"));

    expect(onClose).toHaveBeenCalled();
    expect(onReacted).not.toHaveBeenCalled();
  });

  it("does not submit a reaction if no uploader name is stored", async () => {
    localStorage.removeItem("wedding_uploader_name");
    const { onReacted } = setup();
    await waitForConfigLoaded();

    fireEvent.click(screen.getByText("❤️"));

    await new Promise((r) => setTimeout(r, 0));
    expect(onReacted).not.toHaveBeenCalled();
  });

  it("logs and does not call onReacted when the server rejects the reaction", async () => {
    reactOk = false;
    const { onReacted } = setup();
    await waitForConfigLoaded();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    fireEvent.click(screen.getByText("❤️"));

    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(onReacted).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("InlineReactionPicker — expanded overlay", () => {
  it("opens the overlay with an 'All' tab active by default, showing every emoji", async () => {
    setup();
    await waitForConfigLoaded();

    fireEvent.click(screen.getByLabelText(/more reactions/i));

    expect(screen.getByText("All")).toBeInTheDocument();
    // All 4 emojis from both groups should be visible at once under "All"
    const grid = document.querySelector(".reaction-overlay__grid")!;
    expect(grid.textContent).toContain("❤️");
    expect(grid.textContent).toContain("🤍");
    expect(grid.textContent).toContain("😂");
    expect(grid.textContent).toContain("😮");
  });

  it("switching to a category tab filters the grid to just that group", async () => {
    setup();
    await waitForConfigLoaded();
    fireEvent.click(screen.getByLabelText(/more reactions/i));

    fireEvent.click(screen.getByText("Fun"));

    const grid = document.querySelector(".reaction-overlay__grid")!;
    expect(grid.textContent).toContain("😂");
    expect(grid.textContent).toContain("😮");
    expect(grid.textContent).not.toContain("❤️");
  });

  it("clicking the backdrop closes the overlay", async () => {
    setup();
    await waitForConfigLoaded();
    fireEvent.click(screen.getByLabelText(/more reactions/i));
    expect(document.querySelector(".reaction-overlay")).toBeInTheDocument();

    fireEvent.click(document.querySelector(".reaction-overlay")!);

    expect(document.querySelector(".reaction-overlay")).not.toBeInTheDocument();
  });

  it("reacting from inside the overlay also calls onReacted", async () => {
    const { onReacted } = setup();
    await waitForConfigLoaded();
    fireEvent.click(screen.getByLabelText(/more reactions/i));

    const grid = document.querySelector(".reaction-overlay__grid")!;
    fireEvent.click(grid.querySelector("button")!);

    await waitFor(() => expect(onReacted).toHaveBeenCalled());
  });
});
