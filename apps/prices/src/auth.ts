import { createHash, timingSafeEqual } from "node:crypto";
import { type ErrorBody, errorStatus } from "@fpr/contracts";
import type { RequestHandler } from "express";

/** SHA-256 of a value. Both sides are hashed so their lengths always match. */
function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Answers `401 unauthenticated` unless the request carries
 * `Authorization: Bearer <token>` with the configured token. The comparison
 * takes the same time whether the token is wrong, short, or long.
 */
export function requireToken(token: string): RequestHandler {
  const expected = digest(token);

  return (req, res, next) => {
    const header = req.get("authorization") ?? "";
    const match = /^Bearer (.+)$/.exec(header);
    const presented = match?.[1];

    if (
      presented !== undefined &&
      timingSafeEqual(digest(presented), expected)
    ) {
      next();
      return;
    }

    const body: ErrorBody = { error: { code: "unauthenticated" } };
    res.status(errorStatus.unauthenticated).json(body);
  };
}
