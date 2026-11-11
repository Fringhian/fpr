import { z } from "zod";

/** A row's id: a Postgres `uuid`. */
export const idSchema = z.uuid();

export type Id = z.infer<typeof idSchema>;
