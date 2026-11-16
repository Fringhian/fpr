import type { Id } from "@fpr/contracts";
import { useEffect, useState } from "react";
import { cn } from "../../lib/cn.ts";
import { accessKeys, mockPassword } from "../magic.ts";
import {
  type Persona,
  personaOf,
  personaSession,
  personas,
} from "../personas.ts";
import { readHidden, writeHidden, writeSession } from "./saved-session.ts";

function switchTo(persona: Persona): void {
  writeSession(personaSession(persona));
  window.location.reload();
}

function PersonaList({ current }: { current: Persona | undefined }) {
  return (
    <ul className="flex flex-col gap-xs">
      {(Object.keys(personas) as Persona[]).map((persona) => (
        <li key={persona}>
          <button
            type="button"
            aria-pressed={persona === current}
            className={cn(
              "w-full rounded-s bg-surface px-xs text-left font-normal",
              "",
              "",
              "",
              "hover:bg-highlight",
              "pressed:bg-highlight pressed:font-semibold",
            )}
            onClick={() => switchTo(persona)}
          >
            {personas[persona].label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function AccessLinks() {
  return (
    <ul className="flex flex-col gap-xs">
      {Object.entries(accessKeys).map(([state, { key }]) => (
        <li key={state}>
          <a className="text-link underline" href={`/access/${key}`}>
            {state.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * The mock API's role switch, in `pnpm dev:mock` only: signs in as each
 * persona, lists an access link in each state, and hides with Alt+Shift+M.
 */
export function RoleSwitch({ session }: { session: Id | null }) {
  const [hidden, setHidden] = useState(readHidden);

  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.code === "KeyM") {
        setHidden((was) => {
          writeHidden(!was);
          return !was;
        });
      }
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, []);

  const current = personaOf(session);
  const label =
    current === undefined ? "Another person" : personas[current].label;
  const hide = () => {
    writeHidden(true);
    setHidden(true);
  };

  if (hidden) {
    return null;
  }
  return (
    <details className="fixed bottom-s left-s z-50 max-w-[16rem] rounded-card bg-surface p-xs text-xs text-primary shadow-float">
      <summary className="cursor-pointer font-medium">
        Mock API · {label}
      </summary>
      <div className="flex flex-col gap-s pt-xs">
        <PersonaList current={current} />
        <p>Password: “{mockPassword}”. Access links:</p>
        <AccessLinks />
        <button type="button" className="text-left underline" onClick={hide}>
          Hide (Alt+Shift+M shows it)
        </button>
      </div>
    </details>
  );
}
