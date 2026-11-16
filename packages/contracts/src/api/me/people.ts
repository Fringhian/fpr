import { z } from "zod";
import { signedInRoute } from "../../contract.js";
import { roleSchema, roles } from "../../roles.js";
import { personSchema } from "../../schemas/person.js";

/** A person of the instance, as pickers and onboarding list them. */
export const peoplePersonSchema = personSchema.extend({ role: roleSchema });

export type PeoplePerson = z.infer<typeof peoplePersonSchema>;

/** Every person, in the order they were added. */
export const getPeople = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/people",
    summary: "Every person: name, picture, colour, and role",
  })
  .output(z.array(peoplePersonSchema));
