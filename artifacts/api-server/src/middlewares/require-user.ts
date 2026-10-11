import type { NextFunction, Request, Response } from "express";
import type { User } from "@workspace/db";
import { getSessionUser } from "../lib/auth";

export type AuthedRequest = Request<any, any, any, any, any> & { user: User };

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

/** Signed-in accounts must have an adult's recorded consent before learner data is read or changed. */
export function requireParentConsent(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).user;
  if (!user?.parentConsentAt || !user.privacyNoticeVersion) {
    res.status(403).json({ error: "A parent or caregiver must review and accept the privacy notice first." });
    return;
  }
  next();
}
