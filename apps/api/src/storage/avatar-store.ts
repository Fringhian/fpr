import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/** Where profile pictures are kept, by object key. */
export interface AvatarStore {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** The object, or `null` when the bucket has none at this key. */
  get(key: string): Promise<{ body: Uint8Array; contentType: string } | null>;
  /** Removes the object. Removing a missing key succeeds. */
  remove(key: string): Promise<void>;
}

/**
 * An S3 client for any S3-compatible storage: RustFS, Cloudflare R2, AWS S3.
 * Buckets are addressed by path, which every one of them serves, and
 * checksums are sent and checked only where an operation requires them, as
 * services other than AWS S3 may not support the SDK's default ones.
 */
export function createS3Client(options: {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}): S3Client {
  return new S3Client({
    endpoint: options.endpoint,
    region: options.region,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/** The pictures in one bucket, through an S3 client. */
export function createAvatarStore(
  client: S3Client,
  bucket: string,
): AvatarStore {
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    async get(key) {
      try {
        const object = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        if (object.Body === undefined) {
          return null;
        }
        return {
          body: await object.Body.transformToByteArray(),
          contentType: object.ContentType ?? "application/octet-stream",
        };
      } catch (error) {
        if (error instanceof NoSuchKey) {
          return null;
        }
        throw error;
      }
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
