import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useImageUpload } from "./useImageUpload";
import type { SSEImageRecord } from "./useSSE";

class FakeXhr {
  static instances: FakeXhr[] = [];

  status = 0;
  responseText = "";
  upload = { onprogress: null as ((e: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private headers: Record<string, string> = {};
  private sent: FormData | null = null;

  open(_method: string, _url: string) {}
  send(body: FormData) {
    this.sent = body;
    FakeXhr.instances.push(this);
  }
  getResponseHeader(name: string) {
    return this.headers[name.toLowerCase()] ?? null;
  }

  // test helpers
  respond(status: number, body: unknown, headers: Record<string, string> = {}) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.headers = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
    );
    this.onload?.();
  }
  networkError() {
    this.onerror?.();
  }
  get sentFormData() {
    return this.sent;
  }
}

beforeEach(() => {
  FakeXhr.instances = [];
  vi.stubGlobal("XMLHttpRequest", FakeXhr as unknown as typeof XMLHttpRequest);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function makeFile(name = "photo.jpg", type = "image/jpeg", sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("useImageUpload", () => {
  it("starts idle and transitions through staging -> uploading -> success", async () => {
    const { result } = renderHook(() => useImageUpload());
    expect(result.current.status).toBe("idle");

    const file = makeFile();
    let uploadPromise: Promise<SSEImageRecord | null>;
    act(() => {
      uploadPromise = result.current.upload(file, { uploaderName: "Ben" });
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    const xhr = FakeXhr.instances[0];

    act(() => {
      xhr.respond(201, { id: "img-1", url: "u", thumbnailUrl: "t" });
    });

    const image = await uploadPromise!;
    expect(image).toEqual({ id: "img-1", url: "u", thumbnailUrl: "t" });
    await waitFor(() => expect(result.current.status).toBe("success"));
  });

  it("trims the uploader name and appends it to the form data", async () => {
    const { result } = renderHook(() => useImageUpload());
    const file = makeFile();

    act(() => {
      void result.current.upload(file, { uploaderName: "  Ben  " });
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    const formData = FakeXhr.instances[0].sentFormData!;
    expect(formData.get("uploaderName")).toBe("Ben");
  });

  it("omits uploaderName from the form data when it's blank", async () => {
    const { result } = renderHook(() => useImageUpload());
    const file = makeFile();

    act(() => {
      void result.current.upload(file, { uploaderName: "   " });
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    const formData = FakeXhr.instances[0].sentFormData!;
    expect(formData.get("uploaderName")).toBeNull();
  });

  it("sets an error message and returns null on a server error response", async () => {
    const { result } = renderHook(() => useImageUpload());
    const file = makeFile();

    let uploadPromise: Promise<SSEImageRecord | null>;
    act(() => {
      uploadPromise = result.current.upload(file);
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    act(() => {
      FakeXhr.instances[0].respond(500, { error: "Upload failed. Please try again." });
    });

    const image = await uploadPromise!;
    expect(image).toBeNull();
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorMessage).toBe("Upload failed. Please try again.");
  });

  it("sets a generic error message on a network error", async () => {
    const { result } = renderHook(() => useImageUpload());
    const file = makeFile();

    let uploadPromise: Promise<SSEImageRecord | null>;
    act(() => {
      uploadPromise = result.current.upload(file);
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    act(() => {
      FakeXhr.instances[0].networkError();
    });

    await uploadPromise!;
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorMessage).toBe("Upload failed. Please try again.");
  });

  it("retries once after a 429, then succeeds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useImageUpload());
    const file = makeFile();

    let uploadPromise: Promise<SSEImageRecord | null>;
    act(() => {
      uploadPromise = result.current.upload(file);
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    act(() => {
      FakeXhr.instances[0].respond(429, { retryAfterSeconds: 1 });
    });

    // advance past the retry delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
    act(() => {
      FakeXhr.instances[1].respond(201, { id: "img-2", url: "u2", thumbnailUrl: "t2" });
    });

    const image = await uploadPromise!;
    expect(image).toEqual({ id: "img-2", url: "u2", thumbnailUrl: "t2" });
  });

  it("gives up and surfaces an error after a second consecutive 429", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useImageUpload());
    const file = makeFile();

    let uploadPromise: Promise<SSEImageRecord | null>;
    act(() => {
      uploadPromise = result.current.upload(file);
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    act(() => {
      FakeXhr.instances[0].respond(429, { retryAfterSeconds: 1 });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
    act(() => {
      FakeXhr.instances[1].respond(429, { retryAfterSeconds: 1 });
    });

    const image = await uploadPromise!;
    expect(image).toBeNull();
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("falls back to the Retry-After header when the body has no retryAfterSeconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useImageUpload());
    const file = makeFile();

    let uploadPromise: Promise<SSEImageRecord | null>;
    act(() => {
      uploadPromise = result.current.upload(file);
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    act(() => {
      FakeXhr.instances[0].respond(429, {}, { "Retry-After": "2" });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
    act(() => {
      FakeXhr.instances[1].respond(201, { id: "img-3", url: "u3", thumbnailUrl: "t3" });
    });

    const image = await uploadPromise!;
    expect(image?.id).toBe("img-3");
  });

  it("reset() clears status and error back to idle", async () => {
    const { result } = renderHook(() => useImageUpload());
    const file = makeFile();

    let uploadPromise: Promise<SSEImageRecord | null>;
    act(() => {
      uploadPromise = result.current.upload(file);
    });
    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    act(() => {
      FakeXhr.instances[0].respond(500, { error: "oops" });
    });
    await uploadPromise!;
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => result.current.reset());

    expect(result.current.status).toBe("idle");
    expect(result.current.errorMessage).toBeNull();
  });

  it("does not compress small files (under the target size)", async () => {
    const { result } = renderHook(() => useImageUpload());
    const small = makeFile("small.jpg", "image/jpeg", 1024);

    act(() => {
      void result.current.upload(small);
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    const formData = FakeXhr.instances[0].sentFormData!;
    const sentFile = formData.get("file") as File;
    expect(sentFile.name).toBe("small.jpg");
  });

  it("does not attempt to compress GIFs even if large", async () => {
    const { result } = renderHook(() => useImageUpload());
    const bigGif = makeFile("anim.gif", "image/gif", 9 * 1024 * 1024);

    act(() => {
      void result.current.upload(bigGif);
    });

    await waitFor(() => expect(FakeXhr.instances).toHaveLength(1));
    const formData = FakeXhr.instances[0].sentFormData!;
    const sentFile = formData.get("file") as File;
    expect(sentFile.type).toBe("image/gif");
  });
});
