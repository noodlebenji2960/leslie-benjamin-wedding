import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { asyncRoute } from "../src/asyncRoute.js";

describe("asyncRoute", () => {
  it("calls the wrapped handler with req, res, next", async () => {
    const handler = vi.fn(async () => {});
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await asyncRoute(handler)(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
  });

  it("forwards a rejected promise to next() instead of letting it crash the process", async () => {
    const error = new Error("boom");
    const handler = vi.fn(async () => {
      throw error;
    });
    const next = vi.fn() as NextFunction;

    await asyncRoute(handler)({} as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("does not call next() when the handler resolves successfully", async () => {
    const handler = vi.fn(async () => {});
    const next = vi.fn() as NextFunction;

    await asyncRoute(handler)({} as Request, {} as Response, next);

    expect(next).not.toHaveBeenCalled();
  });
});
