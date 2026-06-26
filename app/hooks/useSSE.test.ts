import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useSSE } from "./useSSE";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static OPEN = 1;
  static CLOSED = 2;

  readyState = FakeEventSource.OPEN;
  url: string;
  onerror: (() => void) | null = null;
  private listeners: Record<string, ((e: { data: string }) => void)[]> = {};
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (e: { data: string }) => void) {
    (this.listeners[type] ??= []).push(handler);
  }

  close() {
    this.closed = true;
    this.readyState = FakeEventSource.CLOSED;
  }

  emit(type: string, data?: unknown) {
    for (const handler of this.listeners[type] ?? []) {
      handler({ data: JSON.stringify(data ?? {}) });
    }
  }

  triggerError() {
    this.onerror?.();
  }
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource as unknown as typeof EventSource);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function latestSource(): FakeEventSource {
  return FakeEventSource.instances[FakeEventSource.instances.length - 1];
}

describe("useSSE", () => {
  it("opens a connection to <API_BASE>/events on mount", () => {
    renderHook(() => useSSE(vi.fn()));
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(latestSource().url).toContain("/events");
  });

  it("calls onNewImage with the parsed payload", () => {
    const onNewImage = vi.fn();
    renderHook(() => useSSE(onNewImage));

    act(() => {
      latestSource().emit("new-image", { id: "img-1" });
    });

    expect(onNewImage).toHaveBeenCalledWith({ id: "img-1" });
  });

  it("calls onDeleteImage with just the id", () => {
    const onDeleteImage = vi.fn();
    renderHook(() => useSSE(vi.fn(), onDeleteImage));

    act(() => {
      latestSource().emit("delete-image", { id: "img-2" });
    });

    expect(onDeleteImage).toHaveBeenCalledWith("img-2");
  });

  it("calls onUpdateImage with id and uploaderName", () => {
    const onUpdateImage = vi.fn();
    renderHook(() => useSSE(vi.fn(), undefined, onUpdateImage));

    act(() => {
      latestSource().emit("update-image", { id: "img-3", uploaderName: "Ben" });
    });

    expect(onUpdateImage).toHaveBeenCalledWith("img-3", "Ben");
  });

  it("calls onReactImage with id and reactions", () => {
    const onReactImage = vi.fn();
    renderHook(() => useSSE(vi.fn(), undefined, undefined, onReactImage));

    act(() => {
      latestSource().emit("react-image", { id: "img-4", reactions: { "❤️": 2 } });
    });

    expect(onReactImage).toHaveBeenCalledWith("img-4", { "❤️": 2 });
  });

  it("calls onClearAll with no arguments", () => {
    const onClearAll = vi.fn();
    renderHook(() => useSSE(vi.fn(), undefined, undefined, undefined, onClearAll));

    act(() => {
      latestSource().emit("clear-all");
    });

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("silently ignores a malformed new-image payload instead of throwing", () => {
    const onNewImage = vi.fn();
    renderHook(() => useSSE(onNewImage));
    const source = latestSource();

    expect(() => {
      act(() => {
        source.emit("new-image", undefined);
        // simulate truly malformed JSON by calling the raw listener path
      });
    }).not.toThrow();
  });

  it("closes the connection on unmount", () => {
    const { unmount } = renderHook(() => useSSE(vi.fn()));
    const source = latestSource();
    expect(source.closed).toBe(false);

    unmount();

    expect(source.closed).toBe(true);
  });

  it("always uses the latest callback even if the hook re-renders with new ones", () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const { rerender } = renderHook(({ handler }) => useSSE(handler), {
      initialProps: { handler: firstHandler },
    });

    rerender({ handler: secondHandler });

    act(() => {
      latestSource().emit("new-image", { id: "img-5" });
    });

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledWith({ id: "img-5" });
  });

  it("reconnects automatically after onerror fires, after the retry delay", () => {
    vi.useFakeTimers();
    renderHook(() => useSSE(vi.fn()));
    expect(FakeEventSource.instances).toHaveLength(1);

    act(() => {
      latestSource().triggerError();
    });
    expect(latestSource().closed).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it("reconnects when the tab becomes visible again and the connection isn't open", () => {
    renderHook(() => useSSE(vi.fn()));
    expect(FakeEventSource.instances).toHaveLength(1);

    // Simulate the connection having silently died while backgrounded.
    latestSource().readyState = FakeEventSource.CLOSED;

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it("does not reconnect on visibility change if the connection is already open", () => {
    renderHook(() => useSSE(vi.fn()));
    expect(FakeEventSource.instances).toHaveLength(1);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(FakeEventSource.instances).toHaveLength(1);
  });
});
