/** The part of the day a greeting names. */
export type TimeOfDay = "morning" | "afternoon" | "evening";

/**
 * The part of the day at a moment, on the browser's clock: morning from 5:00,
 * afternoon from 12:00, evening from 18:00 until 5:00.
 */
export function timeOfDay(moment: Date): TimeOfDay {
  const hour = moment.getHours();
  if (hour >= 5 && hour < 12) {
    return "morning";
  }
  return hour >= 12 && hour < 18 ? "afternoon" : "evening";
}
