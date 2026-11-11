import pg from "pg";

const { builtins, getTypeParser } = pg.types;

const asString = (value: string): string => value;

/**
 * How the pool reads Postgres values, set on the pool rather than on `pg`'s
 * global registry:
 *
 * - `numeric` stays a decimal string, never a floating-point number.
 * - `timestamptz` becomes a `Date`.
 * - `date` stays a `YYYY-MM-DD` string, with no time zone attached.
 *
 * Every other type keeps `pg`'s default parser.
 */
export const typeParsers: pg.CustomTypesConfig = {
  getTypeParser: ((oid: number, format?: "text" | "binary") => {
    if (format === undefined || format === "text") {
      switch (oid) {
        case builtins.NUMERIC:
        case builtins.DATE:
          return asString;
        case builtins.TIMESTAMPTZ:
          return getTypeParser(builtins.TIMESTAMPTZ, "text");
      }
    }
    return getTypeParser(oid, format);
  }) as pg.CustomTypesConfig["getTypeParser"],
};
