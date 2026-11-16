import { mockError } from "../../server/errors.ts";
import { mock } from "../../server/implementer.ts";
import { accessLink, newAccessKey } from "../../store/access-keys.ts";
import { timestamp } from "../../store/calendar.ts";
import { endSessionsOf } from "../../store/session.ts";
import { refuseLastAdmin, requirePerson, toAdminPerson } from "./people.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The admin's access controls: revoking, restoring, links, and reset keys. */
export const accessControlRoutes = {
  revoke: mock.admin.revoke.handler(({ context, input }) => {
    const { store } = context;
    const person = requirePerson(store, input.id);
    refuseLastAdmin(store, person);
    person.revoked = true;
    endSessionsOf(store, person.id);
    return toAdminPerson(store, person);
  }),

  restore: mock.admin.restore.handler(({ context, input }) => {
    const { store } = context;
    const person = requirePerson(store, input.id);
    person.revoked = false;
    return toAdminPerson(store, person);
  }),

  replaceLink: mock.admin.replaceLink.handler(({ context, input }) => {
    const { store } = context;
    const person = requirePerson(store, input.id);
    refuseLastAdmin(store, person);
    const key = newAccessKey(store, person.id);
    person.keyClaimed = false;
    person.revoked = false;
    person.claimBeforeMs = store.calendar.nowMs + 7 * DAY_MS;
    endSessionsOf(store, person.id);
    return {
      person: toAdminPerson(store, person),
      accessLink: accessLink(context.origin, key),
    };
  }),

  resetKey: mock.admin.resetKey.handler(({ context, input }) => {
    const { store } = context;
    const person = requirePerson(store, input.id);
    if (person.role === "anonymous") {
      throw mockError("forbidden");
    }
    for (const [key, reset] of store.resetKeys) {
      if (reset.userId === person.id && !reset.used) {
        store.resetKeys.delete(key);
      }
    }
    const resetKey = crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 16)
      .toUpperCase();
    const expiresAtMs = store.calendar.nowMs + DAY_MS;
    store.resetKeys.set(resetKey, {
      userId: person.id,
      expiresAtMs,
      used: false,
    });
    return { resetKey, expiresAt: timestamp(expiresAtMs) };
  }),
};
