// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  mockBootstrapKey,
  mockPassword,
  mockResetKey,
} from "../src/mocks/magic.ts";
import { visit } from "./visit-app.tsx";

/** Types `value` into the page's field named `name`, as a person would. */
function fill(page: HTMLElement, name: string, value: string) {
  const input = page.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (input === null) {
    throw new Error(`No field named ${name}`);
  }
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  act(() => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Presses the step's main button, then waits until `done` holds. */
async function submit(page: HTMLElement, done: () => void) {
  const button = page.querySelector<HTMLButtonElement>(
    'form button[type="submit"]',
  );
  await act(async () => {
    button?.click();
    await vi.waitFor(done);
  });
}

describe("the access screens", () => {
  it("sign in and open the page asked for, after one generic error for a wrong pair", async () => {
    const { page, router } = await visit(
      "/sign-in?redirect=%2Fshares",
      "signedOut",
    );
    fill(page, "email", "sam@example.com");
    fill(page, "password", "not the password");
    await submit(page, () =>
      expect(page.textContent).toContain("email and password don’t match"),
    );

    fill(page, "password", mockPassword);
    await submit(page, () =>
      expect(router.state.location.pathname).toBe("/shares"),
    );
  });

  it("say “Your access has ended” to the right password of a person whose access ended", async () => {
    const { page, router } = await visit("/sign-in", "signedOut");
    fill(page, "email", "sacha@example.com");
    fill(page, "password", mockPassword);
    await submit(page, () =>
      expect(router.state.location.searchStr).toBe("?access=ended"),
    );
    expect(page.textContent).toContain("Your access has ended");
  });

  it("reset a password, then sign in with the new one", async () => {
    const { page, router } = await visit("/reset-password", "signedOut");
    fill(page, "email", "sam@example.com");
    fill(page, "key", mockResetKey);
    await submit(page, () =>
      expect(page.querySelector('input[name="password"]')).not.toBeNull(),
    );
    fill(page, "password", "a brand new password");
    await submit(page, () =>
      expect(router.state.location.pathname).toBe("/sign-in"),
    );

    fill(page, "email", "sam@example.com");
    fill(page, "password", "a brand new password");
    await submit(page, () => expect(router.state.location.pathname).toBe("/"));
  });

  it("set up the first admin, who lands on onboarding", async () => {
    const { page, router } = await visit("/setup", "signedOut", {
      empty: true,
    });
    fill(page, "bootstrapKey", mockBootstrapKey);
    fill(page, "email", "alex@example.com");
    fill(page, "displayName", "Alex");
    fill(page, "password", "a long enough password");
    await submit(page, () =>
      expect(router.state.location.pathname).toBe("/onboarding"),
    );
  });

  it("close the setup once an admin exists", async () => {
    const { text } = await visit("/setup", "signedOut");
    expect(text).toContain("FPR is already set up");
  });
});
