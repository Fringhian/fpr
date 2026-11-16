import type { Person } from "@fpr/contracts";
import { Picture } from "../../../components/atoms/picture/picture";
import { cn } from "../../../lib/cn";
import { type Look, lookOf } from "../../../lib/look";
import { MEMBER_TONES } from "../../../lib/member-color";

/** How many of the others stand around the person. */
const CROWD_SIZE = 6;

/**
 * Where each of the others stands, in percent of the crowd's square box: on
 * a circle clear of the person's ringed picture, from the top left round.
 */
function placeOf(index: number, count: number) {
  const angle = ((-150 + index * (360 / Math.max(count, 1))) * Math.PI) / 180;
  return {
    left: `${50 + Math.cos(angle) * 38}%`,
    top: `${50 + Math.sin(angle) * 38}%`,
  };
}

/**
 * The person in the middle of everyone already there: their picture, ringed
 * in their colour, with up to six of the others around it. The pictures are
 * decoration; the sentence beside the crowd names the others.
 */
export function WelcomeCrowd({
  look,
  others,
  className,
}: {
  look: Look;
  others: readonly Person[];
  className?: string;
}) {
  const around = others.slice(0, CROWD_SIZE);

  return (
    <div aria-hidden className={cn("relative aspect-square w-full", className)}>
      {around.map((person, index) => (
        <Picture
          key={person.id}
          {...lookOf(person)}
          size="m"
          className="absolute -translate-1/2"
          style={placeOf(index, around.length)}
        />
      ))}
      <Picture
        name={look.name}
        color={look.color}
        photo={look.photo}
        size="l"
        className={cn(
          "absolute top-1/2 left-1/2 -translate-1/2 outline-4 outline-offset-3 outline-(--tone)",
          MEMBER_TONES[look.color],
        )}
      />
    </div>
  );
}
