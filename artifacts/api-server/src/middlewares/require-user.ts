import type { NextFunction, Request, Response } from "express";
import type { User } from "@workspace/db";
import { getSessionUser } from "../lib/auth";

export type AuthedRequest = Request & { user: User };

/** Rejects the request with 401 unless a valid session cookie is present. */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Please sign in." });
    return;
  }
  (req as AuthedRequest).user = user;
  next();
}
