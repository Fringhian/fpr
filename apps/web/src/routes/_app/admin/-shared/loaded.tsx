import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LoadingPlaceholder } from "../../../../components/atoms/loading-placeholder/loading-placeholder";
import { PageMessage } from "../../../../components/templates/page-message/page-message";
import { useLoadFailedMessage } from "../../../-states/load-failed";

/**
 * An admin page's read: a placeholder while it loads, the failure with Retry
 * under the page bar, then the page drawn from its data.
 */
export function Loaded<Data>({
  query,
  loading,
  children,
}: {
  query: UseQueryResult<Data>;
  /** What is loading, read by screen readers in the placeholder. */
  loading: string;
  children: (data: Data) => ReactNode;
}) {
  const failed = useLoadFailedMessage(() => void query.refetch());

  if (query.data !== undefined) {
    return children(query.data);
  }
  return query.isError ? (
    <PageMessage {...failed} />
  ) : (
    <LoadingPlaceholder className="h-[20rem]">{loading}</LoadingPlaceholder>
  );
}
