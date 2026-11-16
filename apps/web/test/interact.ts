import { act } from "react";
import { expect, vi } from "vitest";

/** Types `value` into `input`, as a person would, past React's own value tracking. */
export function typeInto(input: HTMLInputElement | null, value: string) {
  if (input === null) {
    throw new Error("No field to type into");
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

/** Presses the step's main button, its form's submit button, then waits until `done` holds. */
export async function submit(page: HTMLElement, done: () => void) {
  const button = page.querySelector<HTMLButtonElement>(
    'form button[type="submit"]',
  );
  await act(async () => {
    button?.click();
    await vi.waitFor(done);
  });
}

/** Clicks the element `find` gives, once it shows, then waits until `done` holds. */
export async function click(
  find: () => HTMLElement | null | undefined,
  done: () => void,
) {
  await act(async () => {
    await vi.waitFor(() => expect(find()).toBeTruthy());
    find()?.click();
    await vi.waitFor(done);
  });
}
