import { type AvatarMediaType, avatarMaxBytes } from "@fpr/contracts";
import sharp from "sharp";
import { apiError } from "../errors.js";

/** The largest picture, in pixels, the API decodes: 40 megapixels. */
const avatarMaxPixels = 40_000_000;

/** The longest side of a stored picture, in pixels. */
const avatarMaxSide = 512;

export const storedAvatarType = "image/webp";

interface Signature {
  type: AvatarMediaType;
  /** `sharp`'s name for the format. */
  format: string;
  /** Each byte expected at its offset, `null` for any. */
  bytes: readonly (number | null)[];
}

const any = null;

/** The first bytes of each format a picture may be uploaded in. */
const signatures: readonly Signature[] = [
  { type: "image/jpeg", format: "jpeg", bytes: [0xff, 0xd8, 0xff] },
  {
    type: "image/png",
    format: "png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  {
    // "RIFF", the file's size, then "WEBP".
    type: "image/webp",
    format: "webp",
    bytes: [0x52, 0x49, 0x46, 0x46, any, any, any, any, 0x57, 0x45, 0x42, 0x50],
  },
];

/**
 * The format a picture's first bytes announce, among JPEG, PNG, and WebP, or
 * `undefined` for anything else.
 */
function sniffAvatar(bytes: Uint8Array): Signature | undefined {
  return signatures.find((signature) =>
    signature.bytes.every(
      (expected, offset) => expected === null || bytes[offset] === expected,
    ),
  );
}

/** Whether a `Content-Type` is JPEG, PNG, or WebP, parameters aside. */
function isAvatarMediaType(contentType: string): boolean {
  const essence = contentType.split(";")[0]?.trim().toLowerCase();
  return signatures.some((signature) => signature.type === essence);
}

/**
 * Checks an uploaded picture by its content and re-encodes it for storage:
 * turned upright, at most `avatarMaxSide` pixels a side, as WebP, without
 * its metadata (location, camera, and the like).
 *
 * Refused with `avatar_too_large` over `avatarMaxBytes` or `avatarMaxPixels`,
 * and with `avatar_type_unsupported` when the declared media type isn't
 * JPEG, PNG, or WebP, when the bytes aren't one of them, or when they don't
 * decode.
 */
export async function prepareAvatar(
  bytes: Uint8Array,
  contentType: string,
): Promise<Uint8Array> {
  if (bytes.byteLength > avatarMaxBytes) {
    throw apiError("avatar_too_large");
  }
  const signature = sniffAvatar(bytes);
  if (signature === undefined || !isAvatarMediaType(contentType)) {
    throw apiError("avatar_type_unsupported");
  }

  // The header alone, read without decoding the pixels.
  const metadata = await sharp(bytes, { limitInputPixels: false })
    .metadata()
    .catch(() => null);
  if (metadata === null || metadata.format !== signature.format) {
    throw apiError("avatar_type_unsupported");
  }
  if (metadata.width * metadata.height > avatarMaxPixels) {
    throw apiError("avatar_too_large");
  }

  try {
    return await sharp(bytes, {
      limitInputPixels: avatarMaxPixels,
      failOn: "error",
    })
      .rotate()
      .resize(avatarMaxSide, avatarMaxSide, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw apiError("avatar_type_unsupported");
  }
}
