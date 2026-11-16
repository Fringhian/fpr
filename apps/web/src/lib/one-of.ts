/** `value` when it is one of `list`, such as a period from the address, else nothing. */
export function oneOf<const T extends string>(
  list: readonly T[],
  value: unknown,
): T | undefined {
  return (list as readonly unknown[]).includes(value)
    ? (value as T)
    : undefined;
}
