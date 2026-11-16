/**
 * The id a seed key was inserted under. Throws for a key the seed has not
 * inserted.
 */
export type IdOf<Key extends string> = (key: Key) => string;

export function idOf<Key extends string>(
  entity: string,
  ids: ReadonlyMap<Key, string>,
): IdOf<Key> {
  return (key) => {
    const id = ids.get(key);
    if (id === undefined) throw new Error(`No seeded ${entity} ${key}`);
    return id;
  };
}
