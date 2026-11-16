import { avatarMaxBytes, avatarMediaTypes } from "@fpr/contracts/values";
import { ORPCError } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { type ChangeEvent, useState } from "react";
import { isApiError, useErrorText } from "../../lib/api/errors";
import { useApi } from "../../lib/api/use-api";
import { oneOf } from "../../lib/one-of";

/** A refusal of the picture itself: another picture is the fix, not a retry. */
function refusesPicture(error: unknown): boolean {
  return (
    isApiError(error, "avatar_too_large") ||
    isApiError(error, "avatar_type_unsupported") ||
    isApiError(error, "invalid_request")
  );
}

function pictureRefusal(file: File): ORPCError<string, unknown> | null {
  if (oneOf(avatarMediaTypes, file.type) === undefined) {
    return new ORPCError("avatar_type_unsupported");
  }
  return file.size > avatarMaxBytes ? new ORPCError("avatar_too_large") : null;
}

/**
 * The person's photo, uploaded as soon as a file is picked, or removed. A
 * file the API would refuse, not JPEG, PNG or WebP or past its size limit,
 * is refused before it is sent. `error` says why the last attempt failed,
 * and `retry` sends the same file again after a failure that wasn't the
 * picture's fault. While one request runs, `busy` holds and neither action
 * starts another, so an upload and a removal never race.
 */
export function usePhoto() {
  const api = useApi();
  const errorText = useErrorText();
  const [picked, setPicked] = useState<File | null>(null);
  const [refused, setRefused] = useState<unknown>(null);
  const upload = useMutation(api.me.setAvatar.mutationOptions());
  const remove = useMutation(api.me.deleteAvatar.mutationOptions());

  const busy = upload.isPending || remove.isPending;
  const failure = refused ?? upload.error ?? remove.error;
  const canRetry =
    upload.isError && !refusesPicture(upload.error) && picked !== null;

  return {
    uploading: upload.isPending,
    removing: remove.isPending,
    busy,
    error: failure === null ? null : errorText(failure),
    retry: canRetry ? () => upload.mutate(picked) : null,
    choose: (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file === undefined || busy) return;
      upload.reset();
      remove.reset();
      const refusal = pictureRefusal(file);
      setRefused(refusal);
      if (refusal !== null) return;
      setPicked(file);
      upload.mutate(file);
    },
    remove: () => {
      if (busy) return;
      upload.reset();
      setRefused(null);
      remove.mutate(undefined);
    },
  };
}
