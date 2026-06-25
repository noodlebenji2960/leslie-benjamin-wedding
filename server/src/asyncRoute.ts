import type { Request, Response, NextFunction } from "express";

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export const asyncRoute =
  (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
