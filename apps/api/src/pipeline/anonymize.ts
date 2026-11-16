import { anonymizeResponse, Role } from "@fpr/contracts";
import { users } from "@fpr/db";
import { os } from "@orpc/server";
import type { z } from "zod";
import { pseudonyms } from "../pseudonyms/pseudonyms.js";
import type { PipelineContext } from "./session.js";

/**
 * The anonymizer: for an anonymous viewer, replaces personal data in the
 * response, from the marks of the route's output schema. Display names
 * become pseudonyms, pictures and emails `null`, amounts in euros are
 * removed, and quantities and cash become their weight. It runs on the
 * response once its contract has validated it.
 *
 * A handler whose quantities have no weight beside them puts each entry's
 * weight in `context.quantityWeights`, by entry id, or by share id for a
 * holding at a moment.
 */
export const anonymize = os
  .$context<PipelineContext>()
  .middleware(async ({ context, next, procedure }) => {
    const quantityWeights = new Map<string, string>();
    const result = await next({ context: { quantityWeights } });
    const { outputSchema } = procedure["~orpc"];
    if (context.viewer?.role !== Role.anonymous || outputSchema === undefined) {
      return result;
    }
    // Pseudonyms come from every person, so a suffix is the same on every screen.
    const names = pseudonyms(
      context.pseudonymSecret,
      await users.listIds(context.db),
    );
    const output = anonymizeResponse(
      result.output,
      // The contracts' schemas are Zod's, which the anonymizer walks.
      outputSchema as unknown as z.core.$ZodType,
      {
        pseudonym: (id) => names.get(id) ?? "",
        weights: quantityWeights,
      },
    );
    return { ...result, output };
  });
