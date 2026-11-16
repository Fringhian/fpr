import type { Id, Timestamp } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { isApiError } from "../../../lib/api/errors";
import { neededReads } from "../../../lib/api/needed-reads";
import { useApi } from "../../../lib/api/use-api";
import { DEFAULT_SETTING } from "../../../lib/view-state/view-search";
import { LoadState } from "../-record/load-state";
import { ValueForm } from "./value-form";

/** The manual share and its values, and the value at `at` when one is edited. */
function useValueData(shareId: Id, at: Timestamp | undefined) {
  const api = useApi();
  const share = useQuery(
    api.shares.get.queryOptions({
      input: { id: shareId, period: DEFAULT_SETTING.period },
    }),
  );
  const values = useQuery(
    api.shares.values.queryOptions({ input: { id: shareId } }),
  );

  const list = values.data?.values;
  const editing =
    at === undefined
      ? undefined
      : list?.find((value) => Date.parse(value.at) === Date.parse(at));
  const missing =
    isApiError(share.error, "not_found") ||
    (share.data !== undefined && share.data.kind !== "manual") ||
    (at !== undefined && list !== undefined && editing === undefined);
  return {
    share: share.data,
    values: list,
    editing,
    missing,
    ...neededReads([share, values]),
  };
}

/**
 * Add a value to a manual share, or with `at` edit the value at that moment:
 * a focused page whose Close leads back to the share's page. It waits for
 * the share and its values; a value no longer there, or a share that isn't
 * manual, says so.
 */
export function ValuePage({
  shareId,
  at,
}: {
  shareId: Id;
  at: Timestamp | undefined;
}) {
  const data = useValueData(shareId, at);

  const close = <Link to="/shares/$shareId" params={{ shareId }} />;
  if (data.missing || data.failed || !data.share || !data.values) {
    return (
      <LoadState
        subject="value"
        state={data.missing ? "missing" : data.failed ? "failed" : "loading"}
        onRetry={data.retry}
        close={close}
      />
    );
  }
  return (
    <ValueForm
      shareId={shareId}
      shareName={data.share.name}
      values={data.values}
      editing={data.editing}
      close={close}
    />
  );
}
