import type { Person, ShareValueEvent } from "@fpr/contracts";
import {
  type Db,
  type ManualPriceEvent,
  manualPriceEvents,
  prices,
  type Share,
  shares,
} from "@fpr/db";
import { apiError } from "../errors.js";
import { api } from "../implement.js";
import { peopleById } from "../me/me.js";

async function findShare(db: Db, id: string): Promise<Share> {
  const share = await shares.findById(db, id);
  if (share === undefined) {
    throw apiError("not_found");
  }
  return share;
}

function toValueEvent(
  event: ManualPriceEvent,
  madeBy: Person | null,
): ShareValueEvent {
  const base = {
    id: event.id,
    at: event.at.toISOString(),
    madeBy,
    madeAt: event.createdAt.toISOString(),
  };
  // The table's checks pair each action with the prices it carries.
  if (event.action === "added") {
    return {
      ...base,
      action: "added",
      priceEur: event.priceEur ?? "",
      previousPriceEur: null,
    };
  }
  if (event.action === "deleted") {
    return {
      ...base,
      action: "deleted",
      priceEur: null,
      previousPriceEur: event.previousPriceEur ?? "",
    };
  }
  return {
    ...base,
    action: "edited",
    priceEur: event.priceEur ?? "",
    previousPriceEur: event.previousPriceEur ?? "",
  };
}

/** `GET /shares/{id}/values`: newest first, each with who last entered it. A market share has none. */
export const listShareValues = api.shares.values.handler(
  async ({ context, input }) => {
    const share = await findShare(context.db, input.id);
    if (share.kind !== "manual") {
      return { values: [] };
    }
    const [points, people] = await Promise.all([
      prices.listManual(context.db, share.id),
      peopleById(context.db),
    ]);
    return {
      values: points.map((point) => ({
        at: point.at.toISOString(),
        priceEur: point.priceEur,
        enteredBy:
          point.enteredBy === null
            ? null
            : (people.get(point.enteredBy) ?? null),
      })),
    };
  },
);

/** `GET /shares/{id}/value-events`: newest first, each with who made it. */
export const listShareValueEvents = api.shares.valueEvents.handler(
  async ({ context, input }) => {
    const share = await findShare(context.db, input.id);
    const [events, people] = await Promise.all([
      manualPriceEvents.listByShare(context.db, share.id),
      peopleById(context.db),
    ]);
    return {
      events: events.map((event) =>
        toValueEvent(
          event,
          event.userId === null ? null : (people.get(event.userId) ?? null),
        ),
      ),
    };
  },
);
