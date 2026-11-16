import { act } from "react";
import { expect, vi } from "vitest";

/** The text of the whole document: dialogs, menus and toasts render in portals. */
export function screenText(): string {
  return document.body.textContent ?? "";
}

/** The button or menu item whose text is `name`, anywhere in the document. */
export function buttonNamed(name: string): HTMLElement | undefined {
  return [
    ...document.body.querySelectorAll<HTMLElement>("button, [role=menuitem]"),
  ].find((element) => element.textContent?.trim() === name);
}

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

/** Types `value` into the field named `name` inside `root`, as a person would. */
export function fill(root: HTMLElement, name: string, value: string) {
  typeInto(
    root.querySelector<HTMLInputElement>(`input[name="${name}"]`),
    value,
  );
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
