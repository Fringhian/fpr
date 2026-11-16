import type { UseQueryResult } from "@tanstack/react-query";

/** What `neededReads` reads of a query or an infinite query. */
type Read = Pick<UseQueryResult<unknown>, "isError" | "data"> & {
  refetch: () => Promise<unknown>;
};

/**
 * The state of the reads a page needs: `failed` once one has failed with
 * nothing to show, and `retry`, which fetches the failed ones again and
 * leaves the others as they are.
 */
export function neededReads(reads: readonly Read[]) {
  return {
    failed: reads.some((read) => read.isError && read.data === undefined),
    retry: () => {
      for (const read of reads) if (read.isError) void read.refetch();
    },
  };
}
