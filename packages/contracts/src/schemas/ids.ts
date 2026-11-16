import { z } from "zod";
import { idPattern } from "../values.js";

/** A row's id: a Postgres `uuid`. */
export const idSchema = z.stringFormat("uuid", idPattern);

export type Id = z.infer<typeof idSchema>;

/**
 * The id a client generates for an entry it creates, a UUID, so a request
 * sent twice saves the entry once: a request repeating an id already stored
 * for that person answers the stored entry as it is.
 */
export const clientIdSchema = idSchema.optional();
