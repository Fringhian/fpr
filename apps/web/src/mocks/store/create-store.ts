import type { Id } from "@fpr/contracts";
import {
  type FixturePerson,
  fixturePeople,
  fixturePersonId,
  type PersonKey,
} from "../fixtures/people.ts";
import { fixturePicture } from "../fixtures/pictures.ts";
import { fixturePortfolios } from "../fixtures/portfolios.ts";
import { fixtureId } from "../fixtures/random.ts";
import {
  fixtureShareId,
  fixtureShares,
  type ShareKey,
} from "../fixtures/shares.ts";
import { accessKeys, mockPassword } from "../magic.ts";
import {
  addDays,
  type Calendar,
  createCalendar,
  localInstant,
  MOCK_RACE_TIME_ZONE,
  timestamp,
} from "./calendar.ts";
import { storedShare } from "./seed-shares.ts";
import type { MockPerson, MockStore, StoredEntry } from "./types.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

export type MockStoreOptions = {
  /** The store's clock: now by default, fixed in stories. */
  now?: Date;
  /** The signed-in person, or `null` for nobody. */
  session?: Id | null;
  onSessionChange?: (session: Id | null) => void;
  /** An instance with nobody yet, where `/setup` is open. */
  empty?: boolean;
  /** Another member changes each manual value point just before its first edit or deletion. */
  conflicts?: boolean;
  /** The time zone `GET /me` names, `MOCK_RACE_TIME_ZONE` by default. The store's own days stay in `MOCK_RACE_TIME_ZONE`. */
  raceTimeZone?: string;
};

function mockPerson(fixture: FixturePerson, calendar: Calendar): MockPerson {
  const addedAtMs = localInstant(
    addDays(calendar.today, -fixture.addedDaysAgo),
    "09:00:00",
  );
  const waiting = fixture.access === "waiting" || fixture.access === "expired";
  return {
    id: fixture.id,
    displayName: fixture.displayName,
    email: fixture.email,
    role: fixture.role,
    color: fixture.color,
    language: fixture.language,
    onboarded: fixture.onboarded,
    avatar: fixture.picture ? fixturePicture(fixture.color) : null,
    avatarVersion: fixture.picture ? 1 : 0,
    password: fixture.hasPassword ? mockPassword : null,
    keyClaimed: !waiting,
    revoked: fixture.access === "revoked",
    claimBeforeMs:
      fixture.access === "waiting"
        ? calendar.nowMs + 5 * DAY_MS
        : addedAtMs + 7 * DAY_MS,
    accessUntilMs:
      fixture.accessUntilDays === null
        ? null
        : calendar.nowMs + fixture.accessUntilDays * DAY_MS,
    addedAtMs,
  };
}

function storedEntries(calendar: Calendar): StoredEntry[] {
  const entries: StoredEntry[] = [];
  const moment = (atMs: number) => ({
    id: fixtureId(3000 + entries.length),
    atMs,
    effectiveAt: timestamp(atMs),
  });
  const admin = fixturePersonId("alex");
  for (const [key, days] of Object.entries(fixturePortfolios)) {
    const userId = fixturePersonId(key as PersonKey);
    for (const day of days ?? []) {
      const dayStart = localInstant(
        addDays(calendar.today, -day.daysAgo),
        "10:15:00",
      );
      const madeBy = day.byAdmin ? admin : userId;
      Object.entries(day.changes ?? {}).forEach(
        ([share, quantityDelta], index) => {
          const shareId = fixtureShareId(share as ShareKey);
          entries.push({
            type: "change",
            userId,
            shareId,
            quantityDelta,
            madeBy,
            ...moment(dayStart + index * 60_000),
          });
        },
      );
      if (day.cashEur !== undefined) {
        entries.push({
          type: "cash",
          userId,
          amountEur: day.cashEur,
          madeBy,
          ...moment(dayStart + 15 * 60_000),
        });
      }
    }
  }
  return entries;
}

function seededAccessKeys(): MockStore["accessKeys"] {
  const keys: MockStore["accessKeys"] = new Map();
  for (const person of fixturePeople) {
    keys.set(`key-${person.key}`.padEnd(43, "_"), {
      userId: person.id,
      replaced: false,
    });
  }
  for (const [state, { key, person }] of Object.entries(accessKeys)) {
    if (person !== null) {
      keys.set(key, {
        userId: fixturePersonId(person),
        replaced: state === "replaced",
      });
    }
  }
  return keys;
}

/** A store seeded from the fixtures, as of `now`. */
export function createMockStore(options: MockStoreOptions = {}): MockStore {
  const calendar = createCalendar(options.now ?? new Date());
  const empty = options.empty === true;
  const entries = empty ? [] : storedEntries(calendar);
  return {
    calendar,
    raceTimeZone: options.raceTimeZone ?? MOCK_RACE_TIME_ZONE,
    people: empty
      ? []
      : fixturePeople.map((person) => mockPerson(person, calendar)),
    shares: empty
      ? []
      : fixtureShares.map((share, index) =>
          storedShare(share, calendar, index, entries),
        ),
    entries,
    accessKeys: empty ? new Map() : seededAccessKeys(),
    resetKeys: new Map(),
    conflicted: options.conflicts ? new Set() : null,
    refreshes: { running: false, count: 0, lastRunMs: null, offline: false },
    session: options.session ?? null,
    onSessionChange: options.onSessionChange ?? (() => {}),
  };
}
