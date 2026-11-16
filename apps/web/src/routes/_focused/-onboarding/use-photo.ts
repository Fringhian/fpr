import { useMutation } from "@tanstack/react-query";
import { type ChangeEvent, useState } from "react";
import { isApiError, useErrorText } from "../../../lib/api/errors";
import { useApi } from "../../../lib/api/use-api";

/** A refusal of the picture itself: another picture is the fix, not a retry. */
function refusesPicture(error: unknown): boolean {
  return (
    isApiError(error, "avatar_too_large") ||
    isApiError(error, "avatar_type_unsupported") ||
    isApiError(error, "invalid_request")
  );
}

/**
 * The person's photo, uploaded as soon as a file is picked, or removed. The
 * API judges the file: JPEG, PNG or WebP within its size limit. `error` says
 * why the last attempt failed, and `retry` sends the same file again after a
 * failure that wasn't the picture's fault. While one request runs, `busy`
 * holds and neither action starts another, so an upload and a removal
 * never race.
 */
export function usePhoto() {
  const api = useApi();
  const errorText = useErrorText();
  const [picked, setPicked] = useState<File | null>(null);
  const upload = useMutation(api.me.setAvatar.mutationOptions());
  const remove = useMutation(api.me.deleteAvatar.mutationOptions());

  const busy = upload.isPending || remove.isPending;
  const failure = upload.error ?? remove.error;
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
      setPicked(file);
      remove.reset();
      upload.mutate(file);
    },
    remove: () => {
      if (busy) return;
      upload.reset();
      remove.mutate(undefined);
    },
  };
}
