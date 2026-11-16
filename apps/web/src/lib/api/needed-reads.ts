import type { UseQueryResult } from "@tanstack/react-query";

/**
 * The state of the reads a page needs: `failed` once one has failed with
 * nothing to show, and `retry`, which fetches the failed ones again and
 * leaves the others as they are.
 */
export function neededReads(reads: readonly UseQueryResult<unknown>[]) {
  return {
    failed: reads.some((read) => read.isError && read.data === undefined),
    retry: () => {
      for (const read of reads) if (read.isError) void read.refetch();
    },
  };
}
