import { z } from "zod";
import { personal } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { idSchema } from "../../schemas/ids.js";
import { meEditorRoles, meSchema } from "./profile.js";

/** The largest picture `PUT /me/avatar` stores: 2 MB. */
export const avatarMaxBytes = 2 * 1024 * 1024;

/** The picture formats `PUT /me/avatar` stores. */
export const avatarMediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AvatarMediaType = (typeof avatarMediaTypes)[number];

/**
 * The uploaded picture, sent as the raw request body with its media type. The
 * schema takes any file, so the API answers a picture over `avatarMaxBytes`
 * with `avatar_too_large` and one of another format with
 * `avatar_type_unsupported`, in place of `invalid_request`.
 */
export const avatarUploadSchema = z.file().meta({
  description:
    "A JPEG, PNG, or WebP picture up to 2 MB, as the raw body with its media type.",
});

/** A person's uploaded picture, sent as the response body with its media type. */
export const avatarSchema = personal(
  z.file().meta({ description: "The uploaded JPEG, PNG, or WebP picture." }),
);

/** Who `GET /users/{userId}/avatar` shows a picture to: anonymous viewers see none. */
export const avatarViewerRoles = ["admin", "member", "guest"] as const;

export const setMeAvatar = signedInRoute(meEditorRoles)
  .route({ method: "PUT", path: "/me/avatar", summary: "Upload a picture" })
  .input(avatarUploadSchema)
  .output(meSchema)
  .errors(
    errorMap(
      "invalid_request",
      "forbidden",
      "avatar_too_large",
      "avatar_type_unsupported",
    ),
  );

export const deleteMeAvatar = signedInRoute(meEditorRoles)
  .route({
    method: "DELETE",
    path: "/me/avatar",
    summary: "Go back to the initial on the person's colour",
  })
  .output(meSchema)
  .errors(errorMap("forbidden"));

export const getUserAvatar = signedInRoute(avatarViewerRoles)
  .route({
    method: "GET",
    path: "/users/{userId}/avatar",
    summary: "A person's uploaded picture",
  })
  .input(z.object({ userId: idSchema }))
  .output(avatarSchema)
  .errors(errorMap("invalid_request", "forbidden", "not_found"));
