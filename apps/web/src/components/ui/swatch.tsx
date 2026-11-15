import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { useLanguage } from "../../lib/i18n";
import { initialOf } from "../../lib/initial";
import type { MemberColor } from "../../lib/member-color";
import { Icon, type IconProps } from "./icon";

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
} as const satisfies Record<MemberColor, string>;

const group = cn(
  "",
  "grid grid-cols-[repeat(5,2rem)] gap-x-m gap-y-[0.75rem]",
  "tablet:flex tablet:flex-wrap tablet:gap-x-[0.75rem] tablet:gap-y-[0.75rem]",
  "desktop:flex desktop:flex-wrap desktop:gap-x-[0.75rem] desktop:gap-y-[0.75rem]",
);

const item = cn(
  "group inline-flex size-[2rem] shrink-0 cursor-pointer items-center justify-center rounded-full text-xs font-semibold text-on-primary opacity-100 outline-primary outline-offset-2",
  "",
  "",
  "",
  "checked:opacity-100 checked:outline-3",
  "focus-visible:focus-ring",
  "checked:focus-visible:outline-3 checked:focus-visible:outline-offset-4",
  "disabled:cursor-not-allowed",
);

/** Every prop of Base UI's radio group, its value a member colour. */
export type GroupProps = RadioGroup.Props<MemberColor>;

/**
 * The picker's swatches, one choice among them: a row of five per line on
 * phone, one wrapping row from tablet up. Name it with `aria-labelledby` or
 * `aria-label`. Every prop goes to Base UI's radio group, `className`
 * included: a string, or a function of its state.
 */
export function Group({ className, ...props }: GroupProps) {
  return (
    <RadioGroup<MemberColor>
      {...props}
      className={(state) =>
        cn(
          group,
          typeof className === "function" ? className(state) : className,
        )
      }
    />
  );
}

export interface ItemOwnProps {
  /** One of the ten member colours, and the value the group takes when it is picked. */
  color: MemberColor;
  /** The name of the member who has this colour: the swatch fades and shows their initial. A taken colour can't be picked unless all ten are taken, so `disabled` usually comes with it. */
  takenBy?: string | undefined;
  /** The icon a selected swatch shows, any Phosphor icon. A check by default. */
  checkIcon?: IconProps["icon"] | undefined;
}

export type ItemProps = ItemOwnProps &
  Omit<
    Radio.Root.Props<MemberColor>,
    keyof ItemOwnProps | "value" | "children"
  >;

/**
 * One colour in the picker, a radio in `Swatch.Group`: free, selected (a
 * check and a charcoal ring), or taken (faded, with its owner's initial).
 * Screen readers hear the colour's name, and its owner when taken. Every
 * other prop goes to Base UI's radio, `className` included: a string, or a
 * function of its state.
 */
export function Item({
  color,
  takenBy,
  checkIcon = CheckIcon,
  className,
  ...props
}: ItemProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const name = t(`swatch.colours.${color}`);
  const owner = takenBy?.trim() ? takenBy.trim() : undefined;
  const label = owner
    ? t("swatch.takenBy", { colour: name, name: owner })
    : name;
  const classes = cn(item, FILLS[color], owner ? "opacity-[0.35]" : null);

  return (
    <Radio.Root<MemberColor>
      aria-label={label}
      {...props}
      value={color}
      className={(state) =>
        cn(
          classes,
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      <Radio.Indicator className="flex">
        <Icon icon={checkIcon} size="s" />
      </Radio.Indicator>
      {owner ? (
        <span aria-hidden className="group-checked:hidden">
          {initialOf(owner, language)}
        </span>
      ) : null}
    </Radio.Root>
  );
}
