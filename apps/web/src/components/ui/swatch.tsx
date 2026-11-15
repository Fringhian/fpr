import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { useLanguage } from "../../lib/i18n";
import { initialOf } from "../../lib/initial";
import { Icon } from "./icon";

/** The ten member colours, in the order the picker shows them. */
export const MEMBER_COLOURS = [
  "vermilion",
  "cobalt",
  "green",
  "violet",
  "amber",
  "pink",
  "cyan",
  "lime",
  "sienna",
  "periwinkle",
] as const;

export type MemberColour = (typeof MEMBER_COLOURS)[number];

const FILLS = {
  vermilion: "bg-vermilion",
  cobalt: "bg-cobalt",
  green: "bg-green",
  violet: "bg-violet",
  amber: "bg-amber",
  pink: "bg-pink",
  cyan: "bg-cyan",
  lime: "bg-lime",
  sienna: "bg-sienna",
  periwinkle: "bg-periwinkle",
} as const satisfies Record<MemberColour, string>;

export interface GroupProps
  extends Omit<RadioGroup.Props<MemberColour>, "className" | "render"> {
  /** Classes for the group. */
  className?: string | undefined;
}

/**
 * The picker's swatches, one choice among them: a row of five per line on
 * phone, one wrapping row from tablet up. Name it with `aria-labelledby` or
 * `aria-label`.
 */
export function Group({ className, ...props }: GroupProps) {
  return (
    <RadioGroup<MemberColour>
      {...props}
      className={cn(
        "",
        "grid grid-cols-[repeat(5,2rem)] gap-x-m gap-y-[0.75rem]",
        "tablet:flex tablet:flex-wrap tablet:gap-x-[0.75rem] tablet:gap-y-[0.75rem]",
        "desktop:flex desktop:flex-wrap desktop:gap-x-[0.75rem] desktop:gap-y-[0.75rem]",
        className,
      )}
    />
  );
}

export interface ItemProps
  extends Omit<
    Radio.Root.Props<MemberColour>,
    "value" | "className" | "children" | "render"
  > {
  /** One of the ten member colours, and the value the group takes when it is picked. */
  colour: MemberColour;
  /** The name of the member who has this colour: the swatch fades and shows their initial. A taken colour can't be picked unless all ten are taken, so `disabled` usually comes with it. */
  takenBy?: string | undefined;
  /** Classes for the swatch. */
  className?: string | undefined;
}

/**
 * One colour in the picker, a radio in `Swatch.Group`: free, selected (a
 * check and a charcoal ring), or taken (faded, with its owner's initial).
 * Screen readers hear the colour's name, and its owner when taken.
 */
export function Item({ colour, takenBy, className, ...props }: ItemProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const name = t(`swatch.colours.${colour}`);
  const owner = takenBy?.trim() ? takenBy.trim() : undefined;
  return (
    <Radio.Root<MemberColour>
      aria-label={
        owner ? t("swatch.takenBy", { colour: name, name: owner }) : name
      }
      {...props}
      value={colour}
      className={cn(
        "group inline-flex size-[2rem] shrink-0 cursor-pointer items-center justify-center rounded-full text-xs font-semibold text-on-primary opacity-100 outline-primary outline-offset-2",
        "",
        "",
        "",
        "checked:opacity-100 checked:outline-3",
        "focus-visible:focus-ring",
        "checked:focus-visible:outline-3 checked:focus-visible:outline-offset-4",
        "disabled:cursor-not-allowed",
        FILLS[colour],
        owner ? "opacity-[0.35]" : null,
        className,
      )}
    >
      <Radio.Indicator className="flex">
        <Icon icon={CheckIcon} size="s" />
      </Radio.Indicator>
      {owner ? (
        <span aria-hidden className="group-checked:hidden">
          {initialOf(owner, language)}
        </span>
      ) : null}
    </Radio.Root>
  );
}
