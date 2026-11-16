// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { fixturePersonId } from "../src/mocks/fixtures/people.ts";
import {
  accessKeys,
  mockBootstrapKey,
  mockPassword,
  mockResetKey,
} from "../src/mocks/magic.ts";
import { keyState } from "../src/mocks/store/access-keys.ts";
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

/** Presses the button named `label`, then waits until `done` holds. */
async function press(page: HTMLElement, label: string, done: () => void) {
  const button = [...page.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  await act(async () => {
    button?.click();
    await vi.waitFor(done);
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

/** Presses the step's main button, the last of the page's column, then waits until `done` holds. */
async function next(page: HTMLElement, done: () => void) {
  const button = [...page.querySelectorAll("main button")].at(-1);
  await act(async () => {
    (button as HTMLButtonElement | undefined)?.click();
    await vi.waitFor(done);
  });
}

describe("onboarding", () => {
  it("save each step's choice, say the portfolio is being prepared, then mark onboarding finished and land Home", async () => {
    const { page, router, store } = await visit("/onboarding", "newcomer");
    const noa = store.people.find(
      (person) => person.id === fixturePersonId("noa"),
    );
    fill(page, "displayName", "  Noa L.  ");
    await submit(page, () =>
      expect(router.state.location.searchStr).toBe("?step=look"),
    );
    expect(noa?.displayName).toBe("Noa L.");

    await next(page, () =>
      expect(router.state.location.searchStr).toBe("?step=portfolio"),
    );
    await vi.waitFor(() =>
      expect(page.textContent).toContain(
        "Votre portefeuille est en préparation",
      ),
    );

    await next(page, () =>
      expect(router.state.location.searchStr).toBe("?step=welcome"),
    );
    await next(page, () => expect(router.state.location.pathname).toBe("/"));
    expect(noa?.onboarded).toBe(true);
  });

  it("keep sending an unfinished person back to the first step, with what they chose kept", async () => {
    const { page, router } = await visit("/onboarding", "newcomer");
    fill(page, "displayName", "Noa L.");
    await submit(page, () =>
      expect(router.state.location.searchStr).toBe("?step=look"),
    );

    await act(() => router.navigate({ to: "/shares" }));
    expect(router.state.location.href).toBe("/onboarding");
    expect(
      page.querySelector<HTMLInputElement>('input[name="displayName"]')?.value,
    ).toBe("Noa L.");
  });

  it("take a guest from their look straight to the welcome", async () => {
    const { page, router, store, queryClient } = await visit("/", "guest");
    const guest = store.people.find(
      (person) => person.id === fixturePersonId("morgan"),
    );
    if (guest) guest.onboarded = false;
    await act(async () => {
      await queryClient.invalidateQueries();
      await router.navigate({ to: "/onboarding", search: { step: "look" } });
    });

    await next(page, () =>
      expect(router.state.location.searchStr).toBe("?step=welcome"),
    );
    expect(
      page.querySelector('[role="progressbar"]')?.getAttribute("aria-valuemax"),
    ).toBe("3");
  });
});

describe("the access screens", () => {
  it("sign in and open the page asked for, after one generic error for a wrong pair", async () => {
    const { page, router } = await visit(
      "/sign-in?redirect=%2Fshares",
      "signedOut",
    );
    fill(page, "email", "sam@example.com");
    fill(page, "password", "not the password");
    await submit(page, () =>
      expect(page.querySelector('[role="alert"]')?.textContent).toContain(
        "email and password don’t match",
      ),
    );
    expect(page.querySelector('[aria-invalid="true"]')).toBeNull();

    fill(page, "email", "sam@example.com ");
    expect(page.textContent).not.toContain("email and password don’t match");

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

  it("open an invitation without the key in the address, keep it valid until the password, then onboard through the prepared portfolio to Home", async () => {
    const { key } = accessKeys.waiting;
    const { page, router, store } = await visit(`/access/${key}`, "signedOut");
    expect(router.state.location.href).toBe("/access");
    expect(page.textContent).toContain("You’re invited, Camille Roux");

    await press(page, "Choose a password", () =>
      expect(page.querySelector('input[name="password"]')).not.toBeNull(),
    );
    expect(keyState(store, key).state).toBe("waiting");

    fill(page, "password", "a long enough password");
    await submit(page, () =>
      expect(router.state.location.pathname).toBe("/onboarding"),
    );

    await submit(page, () =>
      expect(router.state.location.searchStr).toBe("?step=look"),
    );
    await next(page, () => expect(page.textContent).toContain("Robotics ETF"));
    expect(page.textContent).toContain("Price pending");
    await next(page, () =>
      expect(router.state.location.searchStr).toBe("?step=welcome"),
    );
    await next(page, () => expect(router.state.location.pathname).toBe("/"));
  });

  it("sign an anonymous viewer in with their link and take them Home", async () => {
    const { key } = accessKeys.anonymous;
    const { router, store } = await visit(`/access/${key}`, "signedOut");
    expect(router.state.location.pathname).toBe("/");
    expect(keyState(store, key).state).toBe("claimed");
  });

  it("lead a new link of a person who has a password to sign-in", async () => {
    const { router } = await visit(
      `/access/${accessKeys.waitingWithPassword.key}`,
      "signedOut",
    );
    expect(router.state.location.href).toBe("/sign-in");
  });

  it.each([
    ["expired", accessKeys.expired.key, "This link has expired"],
    ["replaced", accessKeys.replaced.key, "This link was replaced"],
    ["claimed", accessKeys.claimed.key, "This link was already used"],
    ["revoked", accessKeys.revoked.key, "Your access has ended"],
    ["ended", accessKeys.ended.key, "Your access has ended"],
    ["unknown", "x".repeat(43), "This link doesn’t work"],
  ])("say where a %s link stops", async (_state, key, title) => {
    const { text } = await visit(`/access/${key}`, "signedOut");
    expect(text).toContain(title);
  });

  it("open a link pasted on sign-in", async () => {
    const { page, router } = await visit("/sign-in?step=link", "signedOut");
    fill(
      page,
      "link",
      `https://fpr.example.com/access/${accessKeys.anonymous.key}`,
    );
    await submit(page, () => expect(router.state.location.pathname).toBe("/"));
  });

  it("open a bare access key pasted on sign-in", async () => {
    const { page, router } = await visit("/sign-in?step=link", "signedOut");
    fill(page, "link", accessKeys.waiting.key);
    await submit(page, () =>
      expect(page.textContent).toContain("You’re invited, Camille Roux"),
    );
    expect(router.state.location.href).toBe("/access");
  });
});
