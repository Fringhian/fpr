import type { AdminPerson, AdminUpdatePerson, Role } from "@fpr/contracts";
import { roles, writerRoles } from "@fpr/contracts/values";
import { dayOf, endOfDay } from "../../../../lib/date-field";

/** The one dialog People shows at a time, and who or what it is for. */
export type PersonDialog =
  | { kind: "add"; role: Role }
  | {
      kind: "edit" | "replaceLink" | "resetKey" | "delete";
      person: AdminPerson;
    };

/**
 * What the admin does from People: open a dialog, or revoke or restore
 * access at once. They live on the screen, so a write's toast still shows
 * once the menu it started from has closed.
 */
export type PeopleActions = {
  show: (dialog: PersonDialog) => void;
  revoke: (person: AdminPerson) => void;
  restore: (person: AdminPerson) => void;
};

/** Everyone in each role, in the order the API lists them: by when they were added. */
export function byRole(
  people: readonly AdminPerson[],
): Record<Role, AdminPerson[]> {
  const groups = Object.fromEntries(
    roles.map((role) => [role, [] as AdminPerson[]]),
  ) as Record<Role, AdminPerson[]>;
  for (const person of people) {
    groups[person.role].push(person);
  }
  return groups;
}

/**
 * Whether `person` is the last admin with access: FPR keeps at least one, so
 * their access can't be revoked, ended or replaced, and they can't be deleted
 * or change role.
 */
export function isLastAdmin(
  person: AdminPerson,
  people: readonly AdminPerson[],
): boolean {
  return (
    person.role === "admin" &&
    !people.some(
      (other) =>
        other.id !== person.id &&
        other.role === "admin" &&
        other.accessStatus === "active",
    )
  );
}

/** Whether the role has a portfolio, which the admin can prepare. */
export function hasPortfolio(role: Role): boolean {
  return (writerRoles as readonly Role[]).includes(role);
}

/**
 * What the edit form changes on `person`: each field that differs from what
 * they have, so an end date already past, left as it is, isn't sent again.
 * Access lasts through its end day.
 */
export function changesOf(
  person: AdminPerson,
  values: {
    displayName: string;
    email?: string | undefined;
    role: Role;
    accessUntil?: string | undefined;
  },
): Omit<AdminUpdatePerson, "id"> {
  const changes: Omit<AdminUpdatePerson, "id"> = {};
  const displayName = values.displayName.trim();
  const email = values.email?.trim();
  if (displayName !== person.displayName) changes.displayName = displayName;
  if (email !== undefined && email !== person.email) changes.email = email;
  if (values.role !== person.role) changes.role = values.role;
  if (
    values.accessUntil !== undefined &&
    values.accessUntil !== dayOf(person.accessUntil)
  ) {
    changes.accessUntil = endOfDay(values.accessUntil);
  }
  return changes;
}
