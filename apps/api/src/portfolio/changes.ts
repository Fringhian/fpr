import type {
  PortfolioChange,
  PortfolioChangeInput,
  PortfolioChangeUpdate,
} from "@fpr/contracts";
import {
  type Db,
  portfolioChanges,
  type Share,
  shares,
  violatedConstraint,
} from "@fpr/db";
import { apiError } from "../errors.js";
import type { ApiContext } from "../orpc.js";
import { assertMayWriteUser } from "../ownership.js";
import type { Viewer } from "../pipeline/index.js";
import { readChange } from "./entries.js";
import { fillMissingHistory } from "./history.js";
import { findPortfolioOwner, pastMoment } from "./owner.js";

type Context = Pick<
  ApiContext,
  "db" | "series" | "prices" | "raceTimeZone" | "req"
>;

/**
 * Refuses with `holding_below_zero` a write that takes the person's holding
 * of a share below zero at any moment, inside its transaction, which then
 * rolls back. The error names the first stored change at that moment, or
 * `null` when the change sent is there, and the quantity held just before.
 */
async function keepHoldingAboveZero(
  trx: Db,
  { userId, shareId }: { userId: string; shareId: string },
  sentId: string | null,
): Promise<void> {
  const broken = await portfolioChanges.belowZero(trx, userId, shareId);
  if (broken === undefined) {
    return;
  }
  const storedId = broken.changeIds.find((id) => id !== sentId);
  const sentIsThere = sentId !== null && broken.changeIds.includes(sentId);
  throw apiError("holding_below_zero", {
    change:
      sentIsThere || storedId === undefined
        ? null
        : await readChange(trx, userId, storedId),
    held: broken.quantityBefore,
  });
}

async function findShare(db: Db, shareId: string): Promise<Share> {
  const share = await shares.findById(db, shareId);
  if (share === undefined) {
    throw apiError("not_found");
  }
  return share;
}

/** What follows a committed write: the series is stale, and a share may need its history. */
async function afterWrite(
  context: Context,
  share: Share,
  effectiveAt: Date | undefined,
): Promise<void> {
  context.series.clear();
  if (effectiveAt !== undefined) {
    await fillMissingHistory(
      { ...context, logger: context.req.log },
      share,
      effectiveAt,
    );
  }
}

/**
 * `POST /users/{userId}/changes`, in one transaction holding the person's
 * lock. An `id` already stored for the person answers that change and saves
 * nothing; one another person has is `forbidden`.
 */
export async function recordChange(
  context: Context,
  viewer: Viewer,
  input: PortfolioChangeInput,
): Promise<PortfolioChange> {
  const { db } = context;
  assertMayWriteUser(viewer, input.userId);
  await findPortfolioOwner(db, input.userId);
  const effectiveAt = pastMoment(input.effectiveAt);
  const share = await findShare(db, input.shareId);
  const saved = await db
    .transaction()
    .execute(async (trx) => {
      await portfolioChanges.lockUser(trx, input.userId);
      const stored =
        input.id === undefined
          ? undefined
          : await portfolioChanges.findById(trx, input.id);
      if (stored !== undefined) {
        if (stored.userId !== input.userId) {
          throw apiError("forbidden");
        }
        return { id: stored.id, created: false };
      }
      const change = await portfolioChanges.insert(trx, {
        ...(input.id === undefined ? {} : { id: input.id }),
        userId: input.userId,
        shareId: share.id,
        quantityDelta: input.quantityDelta,
        effectiveAt,
        createdBy: viewer.id,
      });
      await keepHoldingAboveZero(trx, change, change.id);
      return { id: change.id, created: true };
    })
    .catch((error: unknown) => {
      // Another person's change took this id in the meantime.
      if (violatedConstraint(error) === "portfolio_changes_pkey") {
        throw apiError("forbidden");
      }
      throw error;
    });
  if (saved.created) {
    await afterWrite(context, share, effectiveAt);
  }
  return readChange(db, input.userId, saved.id);
}

/** A stored change the viewer may write, or `not_found` / `forbidden`. */
async function writableChange(db: Db, viewer: Viewer, id: string) {
  const change = await portfolioChanges.findById(db, id);
  if (change === undefined) {
    throw apiError("not_found");
  }
  assertMayWriteUser(viewer, change.userId);
  return change;
}

/** `PATCH /changes/{id}`: same lock and holding check as recording. */
export async function editChange(
  context: Context,
  viewer: Viewer,
  input: PortfolioChangeUpdate,
): Promise<PortfolioChange> {
  const { db } = context;
  const change = await writableChange(db, viewer, input.id);
  const effectiveAt =
    input.effectiveAt === undefined ? undefined : pastMoment(input.effectiveAt);
  await db.transaction().execute(async (trx) => {
    await portfolioChanges.lockUser(trx, change.userId);
    const updated = await portfolioChanges.update(trx, change.id, {
      quantityDelta: input.quantityDelta,
      effectiveAt,
    });
    if (updated === undefined) {
      throw apiError("not_found");
    }
    await keepHoldingAboveZero(trx, change, change.id);
  });
  await afterWrite(context, await findShare(db, change.shareId), effectiveAt);
  return readChange(db, change.userId, change.id);
}

/** `DELETE /changes/{id}`: same lock and holding check as recording. */
export async function deleteChange(
  context: Context,
  viewer: Viewer,
  id: string,
): Promise<void> {
  const { db } = context;
  const change = await writableChange(db, viewer, id);
  await db.transaction().execute(async (trx) => {
    await portfolioChanges.lockUser(trx, change.userId);
    if (!(await portfolioChanges.remove(trx, change.id))) {
      throw apiError("not_found");
    }
    await keepHoldingAboveZero(trx, change, null);
  });
  context.series.clear();
}
