import { z } from "zod";
import { personal } from "../../anonymize.js";
import { idSchema } from "../../schemas/ids.js";
import { displayNameSchema } from "../../schemas/person.js";

/**
 * Who recorded a share change or cash balance: its member, or the admin for
 * them. `null` once that person is deleted.
 */
export const portfolioMadeBySchema = z
  .object({ id: idSchema, displayName: personal(displayNameSchema) })
  .nullable();

export type PortfolioMadeBy = z.infer<typeof portfolioMadeBySchema>;
