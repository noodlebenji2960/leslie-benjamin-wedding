import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { JSDOM } from "jsdom";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_HTML = readFileSync(path.resolve(__dirname, "../admin/index.html"), "utf-8");
const ADMIN_JS = readFileSync(path.resolve(__dirname, "../admin/admin.js"), "utf-8");

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static OPEN = 1;
  static CLOSED = 2;
  readyState = FakeEventSource.OPEN;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private listeners: Record<string, ((e: { data: string }) => void)[]> = {};
  closed = false;

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, handler: (e: { data: string }) => void) {
    (this.listeners[type] ??= []).push(handler);
  }
  close() {
    this.closed = true;
    this.readyState = FakeEventSource.CLOSED;
  }
  emit(type: string, data: unknown) {
    for (const h of this.listeners[type] ?? []) h({ data: JSON.stringify(data) });
  }
}

interface Harness {
  dom: JSDOM;
  fetchMock: ReturnType<typeof vi.fn>;
  run: () => Promise<void>;
}

/**
 * Loads the real admin index.html into a fresh JSDOM window, stubs fetch/EventSource/
 * confirm/prompt on that window, then evaluates admin.js inside it. admin.js has
 * top-level side effects (event listener wiring + an immediate auth check IIFE), so
 * each test gets a brand-new window/module evaluation — there is no exported API to
 * reset between tests.
 */
function loadAdminPage(fetchImpl: (url: string, opts?: RequestInit) => Promise<unknown>): Harness {
  const dom = new JSDOM(ADMIN_HTML, { url: "http://localhost/admin/", runScripts: "outside-only" });
  const { window } = dom;

  const fetchMock = vi.fn(fetchImpl as never);
  window.fetch = fetchMock as unknown as typeof fetch;
  window.EventSource = FakeEventSource as unknown as typeof EventSource;
  window.confirm = vi.fn(() => true) as unknown as typeof confirm;
  window.prompt = vi.fn(() => null) as unknown as typeof prompt;
  window.alert = vi.fn();
  // jsdom doesn't implement IntersectionObserver — the infinite-scroll sentinel uses it.
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };

  async function run() {
    window.eval(ADMIN_JS);
    // flush the boot IIFE's microtasks
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  }

  return { dom, fetchMock, run };
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

beforeEach(() => {
  FakeEventSource.instances = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("admin.js boot sequence", () => {
  it("shows the login screen when not authenticated", async () => {
    const { dom, run } = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(401, { error: "Unauthorized" });
      throw new Error(`unexpected fetch ${url}`);
    });
    await run();

    const { document } = dom.window;
    expect((document.getElementById("login-screen") as HTMLElement).style.display).not.toBe("none");
  });

  it("skips straight to the gallery when already authenticated", async () => {
    const { dom, run, fetchMock } = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(200, { ok: true });
      if (url.includes("/gallery")) return jsonResponse(200, { images: [], nextCursor: null, total: 0 });
      if (url.includes("/service-status")) {
        return jsonResponse(200, { uploadsDisabled: false, galleryApiDisabled: false });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    await run();

    const { document } = dom.window;
    expect((document.getElementById("gallery-screen") as HTMLElement).style.display).toBe("block");
    expect(fetchMock).toHaveBeenCalledWith("/admin/api/check", expect.any(Object));
  });
});

describe("admin.js login flow", () => {
  it("shows an error message on incorrect password", async () => {
    const { dom, run } = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(401, {});
      if (url.includes("/api/login")) return jsonResponse(401, { error: "Incorrect password." });
      throw new Error(`unexpected fetch ${url}`);
    });
    await run();
    const { document } = dom.window;

    (document.getElementById("pw") as HTMLInputElement).value = "wrong";
    (document.getElementById("login-btn") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const errorEl = document.getElementById("login-error") as HTMLElement;
    expect(errorEl.style.display).toBe("block");
    expect(errorEl.textContent).toMatch(/incorrect password/i);
  });

  it("shows the gallery screen after a successful login", async () => {
    const { dom, run } = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(401, {});
      if (url.includes("/api/login")) return jsonResponse(200, { ok: true });
      if (url.includes("/gallery")) return jsonResponse(200, { images: [], nextCursor: null, total: 0 });
      if (url.includes("/service-status")) {
        return jsonResponse(200, { uploadsDisabled: false, galleryApiDisabled: false });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    await run();
    const { document } = dom.window;

    (document.getElementById("pw") as HTMLInputElement).value = "correct";
    (document.getElementById("login-btn") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect((document.getElementById("gallery-screen") as HTMLElement).style.display).toBe("block");
  });

  it("does nothing when the password field is empty", async () => {
    const { dom, run, fetchMock } = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(401, {});
      throw new Error(`unexpected fetch ${url}`);
    });
    await run();
    fetchMock.mockClear();
    const { document } = dom.window;

    (document.getElementById("pw") as HTMLInputElement).value = "";
    (document.getElementById("login-btn") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("admin.js gallery rendering", () => {
  async function bootIntoGallery(images: unknown[], extra: Record<string, unknown> = {}) {
    const harness = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(200, { ok: true });
      if (url.includes("/reactions/")) return jsonResponse(200, []);
      if (url.includes("/gallery")) {
        return jsonResponse(200, { images, nextCursor: null, total: images.length, ...extra });
      }
      if (url.includes("/service-status")) {
        return jsonResponse(200, { uploadsDisabled: false, galleryApiDisabled: false });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    await harness.run();
    return harness;
  }

  it("shows an empty-state message when there are no photos", async () => {
    const { dom } = await bootIntoGallery([]);
    expect(dom.window.document.querySelector(".empty")?.textContent).toMatch(/no photos uploaded/i);
  });

  it("renders one card per image with date/size metadata", async () => {
    const { dom } = await bootIntoGallery([
      { id: "a", thumbnailUrl: "t.jpg", uploadedAt: "2026-06-25T00:00:00.000Z", fileSize: 2048 },
    ]);
    const card = dom.window.document.getElementById("card-a");
    expect(card).not.toBeNull();
    expect(card!.querySelector(".size")!.textContent).toBe("2 KB");
  });

  it("updates the subtitle with the total photo count", async () => {
    const { dom } = await bootIntoGallery(
      [{ id: "a", thumbnailUrl: "t.jpg", uploadedAt: "2026-06-25T00:00:00.000Z", fileSize: 1024 }],
      {},
    );
    expect(dom.window.document.getElementById("subtitle")!.textContent).toBe("1 photo");
  });

  it("the edit button toggles the name input and danger buttons without focusing anything by default", async () => {
    const { dom } = await bootIntoGallery([
      { id: "a", thumbnailUrl: "t.jpg", uploadedAt: "2026-06-25T00:00:00.000Z", fileSize: 1024, uploaderName: "Ben" },
    ]);
    const { document } = dom.window;
    const card = document.getElementById("card-a")!;
    const editBtn = card.querySelector(".toolbar-btn") as HTMLButtonElement;
    const nameInput = card.querySelector(".name-input") as HTMLInputElement;
    const deleteBtn = card.querySelector(".toolbar-btn--danger") as HTMLButtonElement;

    expect(nameInput.disabled).toBe(true);
    expect(card.classList.contains("is-editing")).toBe(false);

    editBtn.click();

    expect(nameInput.disabled).toBe(false);
    expect(card.classList.contains("is-editing")).toBe(true);
    expect(document.activeElement).not.toBe(nameInput);
    expect(deleteBtn).not.toBeNull();
  });

  it("reactor rename buttons are disabled until edit mode is entered", async () => {
    const harness = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(200, { ok: true });
      if (url.includes("/reactions/")) {
        return jsonResponse(200, [{ emoji: "❤️", name: "Ana", visitorId: "v1" }]);
      }
      if (url.includes("/gallery")) {
        return jsonResponse(200, {
          images: [
            {
              id: "a",
              thumbnailUrl: "t.jpg",
              uploadedAt: "2026-06-25T00:00:00.000Z",
              fileSize: 1024,
              reactions: { "❤️": 1 },
            },
          ],
          nextCursor: null,
          total: 1,
        });
      }
      if (url.includes("/service-status")) {
        return jsonResponse(200, { uploadsDisabled: false, galleryApiDisabled: false });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    await harness.run();
    const { document } = harness.dom.window;

    const card = document.getElementById("card-a")!;
    const nameChip = card.querySelector(".reaction-name-chip") as HTMLButtonElement;
    expect(nameChip.disabled).toBe(true);

    (card.querySelector(".toolbar-btn") as HTMLButtonElement).click();
    expect(nameChip.disabled).toBe(false);
  });
});

describe("admin.js service toggles", () => {
  it("reflects uploadsDisabled/galleryApiDisabled in the toggle button labels", async () => {
    const harness = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(200, { ok: true });
      if (url.includes("/gallery")) return jsonResponse(200, { images: [], nextCursor: null, total: 0 });
      if (url.includes("/service-status")) {
        return jsonResponse(200, { uploadsDisabled: true, galleryApiDisabled: false });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    await harness.run();
    const { document } = harness.dom.window;

    expect(document.getElementById("toggle-uploads-btn")!.textContent).toMatch(/uploads: off/i);
    expect(document.getElementById("toggle-gallery-btn")!.textContent).toMatch(/gallery api: on/i);
  });

  it("disables the uploads toggle and explains why when the gallery API itself is off", async () => {
    const harness = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(200, { ok: true });
      if (url.includes("/gallery")) return jsonResponse(200, { images: [], nextCursor: null, total: 0 });
      if (url.includes("/service-status")) {
        return jsonResponse(200, { uploadsDisabled: false, galleryApiDisabled: true });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    await harness.run();
    const { document } = harness.dom.window;

    const uploadsBtn = document.getElementById("toggle-uploads-btn") as HTMLButtonElement;
    expect(uploadsBtn.disabled).toBe(true);
    expect(uploadsBtn.textContent).toMatch(/gallery disabled/i);
  });

  it("clicking the uploads toggle calls the API and updates the label", async () => {
    let uploadsDisabled = false;
    const harness = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(200, { ok: true });
      if (url.includes("/gallery")) return jsonResponse(200, { images: [], nextCursor: null, total: 0 });
      if (url.includes("/service-status")) return jsonResponse(200, { uploadsDisabled, galleryApiDisabled: false });
      if (url.includes("/service/uploads/off")) {
        uploadsDisabled = true;
        return jsonResponse(200, { uploadsDisabled, galleryApiDisabled: false });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    await harness.run();
    const { document } = harness.dom.window;

    (document.getElementById("toggle-uploads-btn") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(document.getElementById("toggle-uploads-btn")!.textContent).toMatch(/uploads: off/i);
  });
});

describe("admin.js delete-all flow", () => {
  it("asks for double confirmation before deleting everything", async () => {
    const harness = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(200, { ok: true });
      if (url.includes("/gallery")) return jsonResponse(200, { images: [], nextCursor: null, total: 0 });
      if (url.includes("/service-status")) {
        return jsonResponse(200, { uploadsDisabled: false, galleryApiDisabled: false });
      }
      if (url.includes("/delete-all")) return jsonResponse(200, { ok: true, deletedCount: 0 });
      throw new Error(`unexpected fetch ${url}`);
    });
    await harness.run();
    const { document, window } = harness.dom.window as unknown as { document: Document; window: Window };
    const confirmSpy = harness.dom.window.confirm as unknown as ReturnType<typeof vi.fn>;

    (document.getElementById("delete-all-btn") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));

    expect(confirmSpy).toHaveBeenCalledTimes(2);
  });

  it("does not call the API if the first confirmation is declined", async () => {
    const harness = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(200, { ok: true });
      if (url.includes("/gallery")) return jsonResponse(200, { images: [], nextCursor: null, total: 0 });
      if (url.includes("/service-status")) {
        return jsonResponse(200, { uploadsDisabled: false, galleryApiDisabled: false });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    await harness.run();
    harness.dom.window.confirm = (() => false) as unknown as typeof confirm;

    const { document } = harness.dom.window;
    harness.fetchMock.mockClear();
    (document.getElementById("delete-all-btn") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));

    expect(harness.fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/delete-all"),
      expect.any(Object),
    );
  });
});

describe("admin.js SSE live updates", () => {
  it("prepends a newly uploaded image without a full reload", async () => {
    const harness = await (async () => {
      const h = loadAdminPage(async (url: string) => {
        if (url.includes("/api/check")) return jsonResponse(200, { ok: true });
        if (url.includes("/gallery")) return jsonResponse(200, { images: [], nextCursor: null, total: 0 });
        if (url.includes("/service-status")) {
          return jsonResponse(200, { uploadsDisabled: false, galleryApiDisabled: false });
        }
        throw new Error(`unexpected fetch ${url}`);
      });
      await h.run();
      return h;
    })();

    const source = FakeEventSource.instances[FakeEventSource.instances.length - 1];
    source.emit("new-image", {
      id: "new-1",
      thumbnailUrl: "t.jpg",
      uploadedAt: "2026-06-25T00:00:00.000Z",
      fileSize: 1024,
    });
    await new Promise((r) => setTimeout(r, 0));

    expect(harness.dom.window.document.getElementById("card-new-1")).not.toBeNull();
  });

  it("removes a card when a delete-image event arrives", async () => {
    const harness = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(200, { ok: true });
      if (url.includes("/reactions/")) return jsonResponse(200, []);
      if (url.includes("/gallery")) {
        return jsonResponse(200, {
          images: [{ id: "a", thumbnailUrl: "t.jpg", uploadedAt: "2026-06-25T00:00:00.000Z", fileSize: 1024 }],
          nextCursor: null,
          total: 1,
        });
      }
      if (url.includes("/service-status")) {
        return jsonResponse(200, { uploadsDisabled: false, galleryApiDisabled: false });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    await harness.run();

    const source = FakeEventSource.instances[FakeEventSource.instances.length - 1];
    source.emit("delete-image", { id: "a" });
    await new Promise((r) => setTimeout(r, 0));

    expect(harness.dom.window.document.getElementById("card-a")).toBeNull();
  });

  it("clear-all resets the grid to the empty state", async () => {
    const harness = loadAdminPage(async (url: string) => {
      if (url.includes("/api/check")) return jsonResponse(200, { ok: true });
      if (url.includes("/reactions/")) return jsonResponse(200, []);
      if (url.includes("/gallery")) {
        return jsonResponse(200, {
          images: [{ id: "a", thumbnailUrl: "t.jpg", uploadedAt: "2026-06-25T00:00:00.000Z", fileSize: 1024 }],
          nextCursor: null,
          total: 1,
        });
      }
      if (url.includes("/service-status")) {
        return jsonResponse(200, { uploadsDisabled: false, galleryApiDisabled: false });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    await harness.run();

    const source = FakeEventSource.instances[FakeEventSource.instances.length - 1];
    source.emit("clear-all", {});
    await new Promise((r) => setTimeout(r, 0));

    expect(harness.dom.window.document.querySelector(".empty")).not.toBeNull();
  });
});
