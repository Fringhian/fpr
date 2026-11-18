/**
 * Where the visitor is: the page's path, plus the step of a step flow, which
 * `?step=` names. Any other search value, such as the period, changes the
 * view in place, not the page.
 */
export function pagePlace({
  pathname,
  search,
}: {
  pathname: string;
  search: object;
}): string {
  const { step } = search as { step?: unknown };
  return step === undefined ? pathname : `${pathname}?step=${String(step)}`;
}
