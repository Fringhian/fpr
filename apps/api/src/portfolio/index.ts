import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import { cashAt, deleteCash, editCash, setCash } from "./cash.js";
import { deleteChange, editChange, recordChange } from "./changes.js";
import { logEntry, logPage } from "./log.js";

/**
 * The handlers of `apiContract.portfolio`: a member's log, share changes and
 * cash balances. A write to one person's portfolio is allowed to them and the
 * admin, and clears the balance series once committed.
 */
export const portfolioRouter = {
  log: api.portfolio.log
    .use(signedIn)
    .handler(({ context, input }) => logPage(context.db, input)),

  logEntry: api.portfolio.logEntry
    .use(signedIn)
    .handler(({ context, input }) => logEntry(context.db, input)),

  cashAt: api.portfolio.cashAt
    .use(signedIn)
    .handler(({ context, input }) => cashAt(context.db, input)),

  addChange: api.portfolio.addChange
    .use(signedIn)
    .handler(({ context, input }) =>
      recordChange(context, context.viewer, input),
    ),

  updateChange: api.portfolio.updateChange
    .use(signedIn)
    .handler(({ context, input }) =>
      editChange(context, context.viewer, input),
    ),

  deleteChange: api.portfolio.deleteChange
    .use(signedIn)
    .handler(({ context, input }) =>
      deleteChange(context, context.viewer, input.id),
    ),

  setCash: api.portfolio.setCash
    .use(signedIn)
    .handler(({ context, input }) => setCash(context, context.viewer, input)),

  updateCash: api.portfolio.updateCash
    .use(signedIn)
    .handler(({ context, input }) => editCash(context, context.viewer, input)),

  deleteCash: api.portfolio.deleteCash
    .use(signedIn)
    .handler(({ context, input }) =>
      deleteCash(context, context.viewer, input.id),
    ),
};
