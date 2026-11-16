import type { Language } from "@fpr/contracts";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { useState } from "react";
import { useLanguage } from "../../../lib/i18n";
import { LeaveGuard } from "../../../lib/leave-guard";
import { TextLink } from "../../atoms/text-link/text-link";
import * as Field from "../field/field";
import { Page } from "./confirm-dialog-story";

/** The demo texts, in the toolbar’s language. */
export const LEAVE_TEXTS = {
  en: {
    note: "Note",
    leave: "Go to the other page",
    elsewhere: "The other page",
    back: "Back to the form",
  },
  fr: {
    note: "Note",
    leave: "Aller à l’autre page",
    elsewhere: "L’autre page",
    back: "Retour au formulaire",
  },
} as const satisfies Record<Language, Record<string, string>>;

/** The story's addresses, plain strings: its routes aren't the app's. */
const FORM: string = "/";
const ELSEWHERE: string = "/elsewhere";

function FormPage() {
  const text = LEAVE_TEXTS[useLanguage()];
  const [note, setNote] = useState("");

  return (
    <Page>
      <Field.Root>
        <Field.Label>{text.note}</Field.Label>
        <Field.Control value={note} onValueChange={setNote} />
      </Field.Root>
      <TextLink render={<Link to={ELSEWHERE} />}>{text.leave}</TextLink>
      <LeaveGuard when={note !== ""} />
    </Page>
  );
}

function Elsewhere() {
  const text = LEAVE_TEXTS[useLanguage()];

  return (
    <Page>
      <h1 className="text-l font-semibold">{text.elsewhere}</h1>
      <TextLink render={<Link to={FORM} />}>{text.back}</TextLink>
    </Page>
  );
}

const rootRoute = createRootRoute({ component: Outlet });

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: FormPage,
  }),
  createRoute({
    getParentRoute: () => rootRoute,
    path: ELSEWHERE,
    component: Elsewhere,
  }),
]);

/** A form on its own small router: leaving it with a note typed asks first. */
export function LeavingAForm() {
  const [router] = useState(() =>
    createRouter({ routeTree, history: createMemoryHistory() }),
  );

  return <RouterProvider router={router} />;
}
