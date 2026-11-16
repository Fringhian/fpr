import { colorCount } from "@fpr/contracts";
import { type Trx, users } from "@fpr/db";

/**
 * The first colour nobody has, or 1 once every colour is taken. Takes the
 * colours' lock first, so two people added at once never get the same free
 * colour.
 */
export async function takeFirstFreeColor(trx: Trx): Promise<number> {
  await users.lockColors(trx);
  const taken = await users.colorsInUse(trx);
  for (let color = 1; color <= colorCount; color += 1) {
    if (!taken.includes(color)) {
      return color;
    }
  }
  return 1;
}
