import type { Language } from "@fpr/contracts";
import { periods } from "@fpr/contracts/values";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId } from "react";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import type { Mover } from "../mover-row/mover-row";
import * as FocusPanel from "./focus-panel";

const MOVERS: readonly Mover[] = [
  {
    id: "c6a1e0f2-4b3d-4e5f-8a7b-1c2d3e4f5a61",
    name: "Example Pharma SA",
    gain: { eur: "620.00", percent: "12.4" },
  },
  {
    id: "d7b2f103-5c4e-4f60-9b8c-2d3e4f5a6b72",
    name: "World Index ETF",
    gain: { eur: "180.00", percent: "2.4" },
  },
  {
    id: "e8c30214-6d5f-4071-ac9d-3e4f5a6b7c83",
    name: "Euro Bank SA",
    gain: { eur: "-40.00", percent: "-1.0" },
  },
];

const LOSING_MOVERS: readonly Mover[] = [
  {
    id: "f9d41325-7e60-4182-bdae-4f5a6b7c8d94",
    name: "Green Energy Fund",
    gain: { eur: "-310.00", percent: "-8.6" },
  },
  {
    id: "0ae52436-8f71-4293-8ebf-5a6b7c8d9ea5",
    name: "Euro Bank SA",
    gain: { eur: "-95.00", percent: "-2.3" },
  },
  {
    id: "d7b2f103-5c4e-4f60-9b8c-2d3e4f5a6b72",
    name: "World Index ETF",
    gain: { eur: "42.00", percent: "0.6" },
  },
];

/** The icons the page link can end with, by name. */
const PAGE_ICONS = {
  "caret-right": CaretRightIcon,
  "arrow-right": ArrowRightIcon,
} as const;

/**
 * The stories' args: “Back to you” is a part, switched on or off, and the
 * page link's icon is picked by name.
 */
type PanelArgs = Omit<FocusPanel.BasicProps, "backLink" | "pageLink"> & {
  backLink: boolean;
  pageLink: keyof typeof PAGE_ICONS;
};

function toProps({
  backLink,
  pageLink,
  ...args
}: PanelArgs): FocusPanel.BasicProps {
  return {
    ...args,
    pageLink: { href: "#", toPageIcon: PAGE_ICONS[pageLink] },
    backLink: backLink ? { href: "#" } : null,
  };
}

const DESCRIPTION = `
The member the viewer looks at on Home, the viewer by default: their picture and name, their gain over the period, the holdings that moved it, and a link to their page.

- Focusing another member, from their curve or their lane, names them and their period (“Their month”), and offers “Back to you”. A guest or an anonymous viewer has no portfolio: their panel has no “Back to you”.
- The gain reads in the unit setting, with the other unit beside it. An anonymous viewer has no euros, so the gain and the movers read in percent alone, and the names are pseudonyms with no photo.
- The movers are the Mover row organism: each holding’s gain over the period, biggest effect first, with its bar.
- The link opens their page, or the viewer’s portfolio: an \`href\`, or \`render\` for the router’s link, as the Text link takes.
- It fills the width it is given: a narrow column beside the race on desktop, the full width under it on tablet and phone. The **Home layout** stories in the sidebar show it at each width.
- The card rests on an outline. As the first card under the sky, beside the race on desktop, \`className="shadow-rest"\` lifts it.

\`FocusPanel.Basic\` is the ready-made panel. A screen with a special need composes the parts: \`Root\` (the card), \`Header\`, \`Gain\`, \`Movers\` and \`PageLink\`.
`;

const meta = {
  title: "Organisms/Focus panel",
  component: FocusPanel.Basic,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
} satisfies Meta<typeof FocusPanel.Basic>;

export default meta;

/** Every story's args, controls and render: one panel in a column as wide as the desktop's. */
const configurable = {
  args: {
    member: { name: "Alex", color: "cobalt", photo: null },
    you: true,
    period: "1M",
    unit: "percent",
    gain: { eur: "512.00", percent: "4.2" },
    movers: MOVERS,
    pageLink: "caret-right",
    backLink: false,
  },
  argTypes: {
    member: {
      description:
        "`name`, `color` (one of the member colours) and `photo` (a URL or `null`).",
      control: { type: "object" },
    },
    you: { control: { type: "boolean" } },
    period: { control: { type: "inline-radio" }, options: periods },
    unit: { control: { type: "inline-radio" }, options: ["percent", "eur"] },
    gain: {
      description:
        "`{ eur, percent }`, decimal strings as the API sends them. Remove `eur` to read as an anonymous viewer.",
      control: { type: "object" },
    },
    movers: {
      description:
        "Each mover’s `id`, share `name`, and `gain` over the period, biggest effect first. Empty, the panel says nothing has moved yet.",
      control: { type: "object" },
    },
    pageLink: {
      description:
        "Their page, or the viewer’s portfolio: an `href`, or `render` for the router’s link, and `toPageIcon`, any Phosphor icon, a caret by default. Here, the icon is picked by name.",
      control: { type: "select" },
      options: Object.keys(PAGE_ICONS),
      table: { type: { summary: 'Omit<PageLinkProps, "children">' } },
    },
    backLink: {
      name: "backLink",
      description:
        "“Back to you”: an `href` or a `render`, as `pageLink`. Shown only when `you` is off. Here, switched on or off.",
      control: { type: "boolean" },
      table: { type: { summary: "BackLinkProps | null" } },
      if: { arg: "you", truthy: false },
    },
  },
  render: (args) => (
    <FocusPanel.Basic {...toProps(args)} className="max-w-[18.75rem]" />
  ),
} satisfies StoryObj<PanelArgs>;

type Story = StoryObj<PanelArgs>;

/** You, by default: your month, what moved you, and a link to your portfolio. */
export const You: Story = { ...configurable };

/** Another member, focused from their curve or their lane, with “Back to you”. */
export const AnotherMember: Story = {
  ...configurable,
  name: "Another member",
  args: {
    ...configurable.args,
    member: { name: "Sam", color: "vermilion", photo: null },
    you: false,
    gain: { eur: "1240.00", percent: "6.1" },
    backLink: true,
  },
};

/** With the unit set to euros: the gain in whole euros, its percentage beside it. */
export const InEuros: Story = {
  ...AnotherMember,
  name: "In euros",
  args: { ...AnotherMember.args, unit: "eur" },
};

/** A losing month: the gain and most movers read red, each with its minus sign. */
export const Loss: Story = {
  ...configurable,
  args: {
    ...configurable.args,
    member: { name: "Lea", color: "green", photo: null },
    you: false,
    gain: { eur: "-363.00", percent: "-3.8" },
    movers: LOSING_MOVERS,
    backLink: true,
  },
};

/**
 * An anonymous viewer sees a pseudonym with no photo, and percentages alone,
 * even with the unit set to euros. They have no portfolio, so no “Back to you”.
 */
export const AnonymousViewer: Story = {
  ...configurable,
  name: "Anonymous viewer",
  args: {
    ...configurable.args,
    member: { name: "Calm Heron", color: "vermilion", photo: null },
    you: false,
    unit: "eur",
    gain: { percent: "6.1" },
    movers: MOVERS.map(({ gain, ...mover }) => ({
      ...mover,
      gain: { percent: gain.percent },
    })),
  },
};

/** A member who just started: no gain yet, and nothing has moved. */
export const NoMoversYet: Story = {
  ...configurable,
  name: "No movers yet",
  args: {
    ...configurable.args,
    member: { name: "Milo", color: "violet", photo: null },
    you: false,
    gain: { eur: "0.00", percent: "0.0" },
    movers: [],
    backLink: true,
  },
};

/** At the full width it is given, as under the race on tablet and phone. */
export const FullWidth: Story = {
  ...AnotherMember,
  name: "Full width",
  render: (args) => <FocusPanel.Basic {...toProps(args)} />,
};

/** The Parts story's own line and link, in the toolbar’s language. They are the story’s content, not the panel’s. */
const TEXTS = {
  en: { note: "Sam joined the race on 3 March.", open: "See Sam’s holdings" },
  fr: {
    note: "Sam a rejoint la course le 3 mars.",
    open: "Voir les titres de Sam",
  },
} as const satisfies Record<Language, Record<string, string>>;

/** A panel composed of its parts, with a line of its own between the gain and the movers. */
function Composed({ movers }: { movers: boolean }) {
  const text = TEXTS[useLanguage()];
  const titleId = useId();

  return (
    <FocusPanel.Root aria-labelledby={titleId} className="max-w-[18.75rem]">
      <FocusPanel.Header
        titleId={titleId}
        member={{ name: "Sam", color: "vermilion", photo: null }}
        you={false}
        period="1M"
        backLink={{ href: "#" }}
      />
      <FocusPanel.Gain
        gain={{ eur: "1240.00", percent: "6.1" }}
        unit="percent"
      />
      <p className="text-s text-secondary">{text.note}</p>
      {movers ? (
        <FocusPanel.Movers you={false} movers={MOVERS} unit="percent" />
      ) : null}
      <FocusPanel.PageLink href="#">{text.open}</FocusPanel.PageLink>
    </FocusPanel.Root>
  );
}

/** The parts composed by hand, for a screen with a special need: here a line of its own under the gain. */
export const Parts: StoryObj<{ movers: boolean }> = {
  args: { movers: true },
  argTypes: {
    movers: { control: { type: "boolean" }, name: "FocusPanel.Movers" },
  },
  render: (args) => <Composed {...args} />,
};

/** The race's place in the Home layout stories, in the toolbar’s language. */
const RACE = {
  en: "The race",
  fr: "La course",
} as const satisfies Record<Language, string>;

function RacePlaceholder() {
  const language = useLanguage();

  return (
    <div
      className={cn(
        "grid place-items-center rounded-l bg-surface p-m text-s text-secondary shadow-rest",
        "h-[13.75rem]",
        "tablet:h-[17.5rem]",
        "desktop:h-[22.5rem]",
      )}
    >
      {RACE[language]}
    </div>
  );
}

/** Home's race and its focus panel: beside it on desktop, under it on tablet and phone. */
function HomeLayout(args: PanelArgs) {
  return (
    <div
      className={cn(
        "grid gap-m",
        "grid-cols-1",
        "tablet:grid-cols-1",
        "desktop:grid-cols-[minmax(0,1fr)_18.75rem]",
      )}
    >
      <RacePlaceholder />
      <FocusPanel.Basic
        {...toProps(args)}
        className={cn(
          "",
          "shadow-outline",
          "tablet:shadow-outline",
          "desktop:shadow-rest",
        )}
      />
    </div>
  );
}

/** Desktop: beside the race, in a 300px column, lifted as the first card under the sky. */
export const HomeLayoutOnDesktop: Story = {
  ...AnotherMember,
  name: "Home layout on desktop",
  tags: ["!autodocs"],
  globals: { viewport: { value: "desktop" } },
  render: (args) => <HomeLayout {...args} />,
};

/** Tablet: under the race, at its full width. */
export const HomeLayoutOnTablet: Story = {
  ...HomeLayoutOnDesktop,
  name: "Home layout on tablet",
  globals: { viewport: { value: "tablet" } },
};

/** Phone: under the race, at its full width. */
export const HomeLayoutOnPhone: Story = {
  ...HomeLayoutOnDesktop,
  name: "Home layout on phone",
  globals: { viewport: { value: "phone" } },
};

/** In French: the period, the labels and the link follow the language. */
export const InFrench: Story = {
  ...AnotherMember,
  name: "In French",
  globals: { locale: "fr" },
};
