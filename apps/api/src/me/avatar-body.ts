import { avatarMaxBytes } from "@fpr/contracts";
import express, { type RequestHandler } from "express";
import { ApiError } from "../errors.js";

/** Where pictures are uploaded: `PUT /api/me/avatar`. */
export const avatarUploadPath = "/api/me/avatar";

const readRawBody = express.raw({
  type: () => true,
  limit: avatarMaxBytes,
  // A compressed body would be inflated past the limit's check on what was sent.
  inflate: false,
});

/**
 * Reads the body of `PUT /me/avatar` before the route does, at most
 * `avatarMaxBytes`, and hands it on as a `File` with the request's media
 * type. A larger body is refused with `avatar_too_large` without being read
 * to its end, whatever its `Content-Length` says, and a compressed one with
 * `avatar_type_unsupported`.
 */
export const readAvatarBody: RequestHandler = (req, res, next) => {
  readRawBody(req, res, (error?: unknown) => {
    if (error !== undefined) {
      next(toApiError(error));
      return;
    }
    if (Buffer.isBuffer(req.body)) {
      req.body = new File([req.body], "avatar", {
        type: req.get("content-type") ?? "",
      });
    }
    next();
  });
};

/**
 * A body too large is `avatar_too_large`, a compressed one
 * `avatar_type_unsupported`, and any other client mistake, such as a body
 * shorter than its `Content-Length`, `invalid_request`. body-parser's errors
 * carry their kind in `type`, and their status.
 */
function toApiError(error: unknown): unknown {
  const { type, status }: { type?: unknown; status?: unknown } =
    typeof error === "object" && error !== null ? error : {};
  if (type === "entity.too.large") {
    return new ApiError("avatar_too_large");
  }
  if (type === "encoding.unsupported") {
    return new ApiError("avatar_type_unsupported");
  }
  if (typeof status === "number" && status >= 400 && status < 500) {
    return new ApiError("invalid_request");
  }
  return error;
}
