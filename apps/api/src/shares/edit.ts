import { apiContract } from "@fpr/contracts";
import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import { forwardRefusal } from "../prices/forward-refusal.js";

/** `PATCH /shares/{id}`: a manual share's name or ISIN. A market share is `not_found`. */
export const updateShare = api.shares.update
  .use(signedIn)
  .handler(async ({ context, input }) => {
    const share = await context.prices
      .updateShare(input)
      .catch(forwardRefusal(apiContract.shares.update, context.req.log));
    context.series.clear();
    return share;
  });

/** `DELETE /shares/{id}`, the admin's, with its prices and value edits. */
export const deleteShare = api.shares.delete
  .use(signedIn)
  .handler(async ({ context, input }) => {
    await context.prices
      .deleteShare({ id: input.id })
      .catch(forwardRefusal(apiContract.shares.delete, context.req.log));
    context.series.clear();
  });
