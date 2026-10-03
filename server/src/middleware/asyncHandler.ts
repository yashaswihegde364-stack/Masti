import type { NextFunction, Request, Response } from "express";

/**
 * Express 4 does not catch rejected promises from async route handlers —
 * an unhandled rejection there crashes the whole process (verified: a
 * missing VOYAGE_API_KEY during a /chat request took the entire server
 * down, not just that request). Wrap every async handler with this so
 * errors reach Express's error middleware instead.
 */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Req, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
