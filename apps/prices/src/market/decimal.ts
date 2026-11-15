import { type Decimal, decimalPattern } from "@fpr/contracts";

/**
 * A decimal string as an exact integer and a scale: `74.328` is `74328n` at
 * scale 3. Arithmetic on it never goes through a floating-point number.
 */
interface Scaled {
  units: bigint;
  scale: number;
}

function parse(value: Decimal): Scaled {
  if (!decimalPattern.test(value)) {
    throw new RangeError(`Expected a decimal string: ${value}`);
  }
  const [whole = "", fraction = ""] = value.split(".");
  return { units: BigInt(whole + fraction), scale: fraction.length };
}

function format(units: bigint, scale: number): Decimal {
  const negative = units < 0n;
  const digits = (negative ? -units : units)
    .toString()
    .padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale).replace(/0+$/, "");
  const text = fraction === "" ? whole : `${whole}.${fraction}`;
  return negative && /[1-9]/.test(text) ? `-${text}` : text;
}

/**
 * `dividend / divisor`, exact, rounded half away from zero to `scale` decimal
 * places, with trailing zeros removed: `divideDecimal("10", "3", 2)` is `3.33`.
 * Throws a `RangeError` for a divisor of zero or a value that is not a
 * decimal string.
 */
export function divideDecimal(
  dividend: Decimal,
  divisor: Decimal,
  scale: number,
): Decimal {
  if (!Number.isInteger(scale) || scale < 0) {
    throw new RangeError(`Expected a scale of 0 or more: ${scale}`);
  }
  const a = parse(dividend);
  const b = parse(divisor);
  if (b.units === 0n) {
    throw new RangeError("Division by zero");
  }
  // a / b = (a.units / 10^a.scale) / (b.units / 10^b.scale), times 10^scale.
  const numerator = a.units * 10n ** BigInt(b.scale + scale);
  const denominator = b.units * 10n ** BigInt(a.scale);
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  let quotient = n / d;
  if ((n % d) * 2n >= d) {
    quotient += 1n;
  }
  return format(negative ? -quotient : quotient, scale);
}

/** `value / 10^places`, exact: `shiftDecimal("1234.5", 2)` is `12.345`. */
export function shiftDecimal(value: Decimal, places: number): Decimal {
  if (!Number.isInteger(places) || places < 0) {
    throw new RangeError(`Expected 0 or more places: ${places}`);
  }
  const { units, scale } = parse(value);
  return format(units, scale + places);
}
