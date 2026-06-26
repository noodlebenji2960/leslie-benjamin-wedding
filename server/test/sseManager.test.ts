import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Response } from "express";
import { sseManager } from "../src/sseManager.js";

function fakeClient(): { res: Response; writes: string[] } {
  const writes: string[] = [];
  const res = {
    write: vi.fn((chunk: string) => {
      writes.push(chunk);
      return true;
    }),
  } as unknown as Response;
  return { res, writes };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("sseManager", () => {
  it("broadcasts a new-image event to all connected clients", () => {
    const a = fakeClient();
    const b = fakeClient();
    const cleanupA = sseManager.add(a.res);
    const cleanupB = sseManager.add(b.res);

    sseManager.broadcastNewImage({ id: "img-1" } as never);

    expect(a.writes.some((w) => w.includes("event: new-image"))).toBe(true);
    expect(b.writes.some((w) => w.includes("event: new-image"))).toBe(true);

    cleanupA();
    cleanupB();
  });

  it("includes the serialized payload in the broadcast message", () => {
    const a = fakeClient();
    const cleanup = sseManager.add(a.res);

    sseManager.broadcastReaction("img-1", { "❤️": 3 });

    const message = a.writes.find((w) => w.includes("event: react-image"));
    expect(message).toBeDefined();
    expect(message).toContain(JSON.stringify({ id: "img-1", reactions: { "❤️": 3 } }));

    cleanup();
  });

  it("does not deliver events to clients that already cleaned up", () => {
    const a = fakeClient();
    const cleanup = sseManager.add(a.res);
    cleanup();

    sseManager.broadcastDeleteImage("img-1");

    expect(a.writes).toHaveLength(0);
  });

  it("removes a client automatically if writing to it throws", () => {
    const res = {
      write: vi.fn(() => {
        throw new Error("client disconnected");
      }),
    } as unknown as Response;

    const before = sseManager.clientCount;
    sseManager.add(res);
    expect(sseManager.clientCount).toBe(before + 1);

    // The broadcast call that fails should silently remove the dead client
    // instead of throwing out to the caller.
    expect(() => sseManager.broadcastClearAll()).not.toThrow();
    expect(sseManager.clientCount).toBe(before);
  });

  it("sends a heartbeat on the configured interval", () => {
    const a = fakeClient();
    const cleanup = sseManager.add(a.res);

    vi.advanceTimersByTime(30_000);

    expect(a.writes.some((w) => w.includes("heartbeat"))).toBe(true);

    cleanup();
  });

  it("stops sending heartbeats after cleanup", () => {
    const a = fakeClient();
    const cleanup = sseManager.add(a.res);
    cleanup();
    a.writes.length = 0;

    vi.advanceTimersByTime(60_000);

    expect(a.writes).toHaveLength(0);
  });
});
