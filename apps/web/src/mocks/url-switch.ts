/**
 * The value of a `?mock-…` switch in the address, `""` when it has none, or
 * `null` when it is absent. It is removed from the address once read, so it
 * lasts until the next load.
 */
export function takeUrlSwitch(name: string): string | null {
  const url = new URL(window.location.href);
  const value = url.searchParams.get(name);
  if (value === null) {
    return null;
  }
  url.searchParams.delete(name);
  window.history.replaceState(window.history.state, "", url);
  return value;
}
