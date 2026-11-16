/**
 * A CSS variable's value where an element sits, so a script reads the same
 * token as the styles: `cssVariable("--ease-soft")`. The page's root by
 * default.
 */
export function cssVariable(
  name: `--${string}`,
  element: Element = document.documentElement,
): string {
  return getComputedStyle(element).getPropertyValue(name).trim();
}
