import type { Id, ShareQuote } from "@fpr/contracts";
import { useState } from "react";

/**
 * The shares to list: `shares`, with the one picked, `value`, kept first when
 * a later search leaves it out, so the selection never hides. The picked
 * share is remembered as a result last showed it.
 */
export function useKeptPick(
  value: Id | null,
  shares: readonly ShareQuote[] | undefined,
): readonly ShareQuote[] | undefined {
  const [kept, setKept] = useState<ShareQuote | null>(null);

  const listed = shares?.find((share) => share.id === value);
  if (listed !== undefined && listed !== kept) setKept(listed);
  if (shares === undefined || listed !== undefined) return shares;
  return kept !== null && kept.id === value ? [kept, ...shares] : shares;
}
