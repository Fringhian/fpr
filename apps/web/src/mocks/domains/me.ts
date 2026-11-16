import {
  avatarMaxBytes,
  avatarMediaTypes,
  colorCount,
  type Me,
} from "@fpr/contracts";
import { RACE_TIME_ZONE } from "../../lib/race-day.ts";
import { mockError } from "../server/errors.ts";
import { mock, viewerOf } from "../server/implementer.ts";
import { peopleInOrder, personOf, toPerson } from "../store/people.ts";
import type { MockPerson } from "../store/types.ts";

function toMe(person: MockPerson): Me {
  return {
    ...toPerson(person),
    role: person.role,
    email: person.role === "anonymous" ? null : person.email,
    raceTimeZone: RACE_TIME_ZONE,
    language: person.language,
    onboarded: person.onboarded,
  };
}

/** The signed-in person's routes, and everyone's pictures. */
export const meRoutes = {
  get: mock.me.get.handler(({ context }) => toMe(viewerOf(context))),

  update: mock.me.update.handler(({ context, input }) => {
    const viewer = viewerOf(context);
    const { people } = context.store;
    const allTaken =
      new Set(people.map((person) => person.color)).size >= colorCount;
    const taken = people.some(
      (person) => person.id !== viewer.id && person.color === input.color,
    );
    if (input.color !== undefined && taken && !allTaken) {
      throw mockError("color_taken");
    }
    Object.assign(
      viewer,
      Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined),
      ),
    );
    return toMe(viewer);
  }),

  setAvatar: mock.me.setAvatar.handler(({ context, input }) => {
    const viewer = viewerOf(context);
    if (!(avatarMediaTypes as readonly string[]).includes(input.type)) {
      throw mockError("avatar_type_unsupported");
    }
    if (input.size > avatarMaxBytes) {
      throw mockError("avatar_too_large");
    }
    viewer.avatar = input;
    viewer.avatarVersion += 1;
    return toMe(viewer);
  }),

  deleteAvatar: mock.me.deleteAvatar.handler(({ context }) => {
    const viewer = viewerOf(context);
    viewer.avatar = null;
    return toMe(viewer);
  }),

  people: mock.me.people.handler(({ context }) =>
    peopleInOrder(context.store).map((person) => ({
      ...toPerson(person),
      role: person.role,
    })),
  ),

  getAvatar: mock.me.getAvatar.handler(({ context, input }) => {
    const avatar = personOf(context.store, input.userId)?.avatar;
    if (avatar === undefined || avatar === null) {
      throw mockError("not_found");
    }
    return avatar;
  }),
};
