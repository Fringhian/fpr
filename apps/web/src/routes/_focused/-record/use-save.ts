import type { Id, IsoDate } from "@fpr/contracts";
import { type EntryValue, useEntryWrites } from "../../../lib/entry-writes";
import type { SavedEntry } from "../../../lib/log-entry";
import { type Draft, momentOf } from "./draft";
import { useFlow } from "./flow";

// A new entry's id is a version 8 UUID hashed from the draft's id, the owner
// and the answers. The same answers of the same draft, saved again by a double
// press, Back from Saved or a reload, send the same id, and the API answers the
// entry already stored instead of adding a second one.
async function entryIdOf(draftId: Id, ownerId: Id, draft: Draft): Promise<Id> {
  const key = [
    draftId,
    ownerId,
    draft.kind,
    draft.shareId,
    draft.day,
    draft.amount,
  ];
  const hash = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(key.join("|")),
    ),
  ).slice(0, 16);
  hash[6] = ((hash[6] ?? 0) & 0x0f) | 0x80;
  hash[8] = ((hash[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(hash, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10),
  ]
    .map((group) => group.join(""))
    .join("-");
}

function draftValue(draft: Draft, today: IsoDate): EntryValue {
  const { kind, shareId, entry } = draft;
  const effectiveAt = momentOf(draft, today);
  const amount = draft.amount ?? "0";
  return (entry?.type ?? (kind === "cash" ? "cash" : "change")) === "cash"
    ? { type: "cash", amountEur: amount, effectiveAt }
    : {
        type: "change",
        shareId: shareId ?? "",
        quantityDelta: kind === "sell" ? `-${amount}` : amount,
        effectiveAt,
      };
}

/** Saves the draft in the owner's portfolio: a new entry, or the edit of one. */
export function useSave() {
  const { owner, draft, draftId, today } = useFlow();
  const writes = useEntryWrites();

  const save = async (): Promise<SavedEntry> => {
    const value = draftValue(draft, today);
    return draft.entry
      ? writes.update(draft.entry.id, value)
      : writes.add(owner.id, await entryIdOf(draftId, owner.id, draft), value);
  };
  return { save, pending: writes.pending };
}
