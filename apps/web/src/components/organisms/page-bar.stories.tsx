import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { CaretLeftIcon } from "@phosphor-icons/react/CaretLeft";
import { HouseIcon } from "@phosphor-icons/react/House";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { cn } from "../../lib/cn";
import { useLanguage } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import * as Sky from "../foundations/sky";
import { PeriodControl, type PeriodSetting } from "../molecules/period-control";
import * as Sentence from "../molecules/sentence";
import * as PageBar from "./page-bar";

/** The icons the back link can lead with, by name. */
const ICONS = {
  "caret-left": CaretLeftIcon,
  "arrow-left": ArrowLeftIcon,
  house: HouseIcon,
} as const;

/** Which parts the page renders, and the back link's icon by name. */
interface PageArgs {
  back: boolean;
  controls: boolean;
  sky: boolean;
  icon: keyof typeof ICONS;
}

/** The demo pages' names and card, in the toolbar's language. They are the stories' content, not the page bar's. */
const LABELS = {
  en: {
    home: "Home",
    members: "Members",
    portfolio: "Portfolio",
    history: "History",
    card: "The page’s main card",
    onRidge:
      "Under the header sentence, it starts on the ridge: 240px from the top on phone, 236px from tablet up.",
    onSnow:
      "Without a header sentence, the page starts on snow, under the page bar.",
    memberStory: "Sam is up +6.1%, 1.9 points ahead of you.",
  },
  fr: {
    home: "Accueil",
    members: "Membres",
    portfolio: "Portefeuille",
    history: "Historique",
    card: "La carte principale de la page",
    onRidge:
      "Sous la phrase d’en-tête, elle commence sur la crête : à 240 px du haut sur téléphone, 236 px dès la tablette.",
    onSnow:
      "Sans phrase d’en-tête, la page commence sur la neige, sous la barre de page.",
    memberStory: "Sam est en hausse de +6,1 %, 1,9 point devant toi.",
  },
} as const satisfies Record<Language, Record<string, string>>;

const sam = {
  name: "Sam",
  color: "vermilion",
  gain: { eur: "640", percent: "6.1" },
} as const;

const gutters = cn("", "px-m", "tablet:px-l", "desktop:px-l");

/**
 * A page's top, made of the parts the controls switch on. It keeps the period
 * setting the way the app shell will, so the sentence follows the control.
 */
function Page({ back, controls, sky, icon }: PageArgs) {
  const language = useLanguage();
  const [setting, setSetting] = useState<PeriodSetting>({
    period: "1M",
    unit: "percent",
  });

  const labels = LABELS[language];
  const left = back ? (
    <>
      <PageBar.Back href="#members" icon={ICONS[icon]}>
        {sky ? labels.members : labels.portfolio}
      </PageBar.Back>
      <PageBar.Current>{sky ? sam.name : labels.history}</PageBar.Current>
    </>
  ) : (
    <PageBar.Title render={sky ? undefined : (props) => <h1 {...props} />}>
      {sky ? labels.home : labels.members}
    </PageBar.Title>
  );
  const bar = (
    <PageBar.Root>
      {left}
      {controls ? (
        <PageBar.Controls>
          <PeriodControl
            value={setting}
            onChange={setSetting}
            backdrop={sky ? "sky" : "snow"}
          />
        </PageBar.Controls>
      ) : null}
    </PageBar.Root>
  );
  const sentence = back ? (
    <Sentence.Root>
      <Sentence.Headline>{sam.name}</Sentence.Headline>
      <Sentence.Story>{labels.memberStory}</Sentence.Story>
    </Sentence.Root>
  ) : (
    <Sentence.Race
      name="Alex"
      color="cobalt"
      timeOfDay="evening"
      period={setting.period}
      unit={setting.unit}
      standing="theyLead"
      gain={{ eur: "512", percent: "4.2" }}
      leader={sam}
      starShare={{ name: "Swiss Pharma AG", gain: "12.4" }}
    />
  );

  return (
    <Sky.Root className={cn("pb-xl font-sans text-primary", gutters)}>
      {sky ? (
        <>
          <Sky.Band />
          <Sky.Header>
            {bar}
            {sentence}
          </Sky.Header>
        </>
      ) : (
        bar
      )}
      <section className="grid h-[16rem] content-start gap-xs rounded-l bg-surface p-m shadow-rest">
        <h2 className="text-l font-semibold">{labels.card}</h2>
        <p className="text-s text-secondary">
          {sky ? labels.onRidge : labels.onSnow}
        </p>
      </section>
    </Sky.Root>
  );
}

const DESCRIPTION = `
Every page’s top: the page bar, then, on a page with a header sentence, the sentence on the sky and the ridge, with the page’s main card starting on it. Import the bar as a namespace: \`import * as PageBar from "…/page-bar"\`, and compose it with \`Sky\`, \`Sentence\` and \`PeriodControl\`.

| Part | What it is |
| --- | --- |
| \`PageBar.Root\` | The bar: 70px high on phone, 80px from tablet up. The page’s gutters frame it. |
| \`PageBar.Title\` | The page’s name on the left, “Home”. A \`<p>\`; a page without a header sentence renders it as its heading, \`render={(props) => <h1 {...props} />}\`. |
| \`PageBar.Back\` | The back link on the left, in place of the title: \`icon\`, a caret by default, then the parent page, “Members”. Screen readers hear “Back to Members”. \`render\` composes it with the router’s link. |
| \`PageBar.Current\` | The page’s name after the back link, from tablet up: “Members / Sam”. The phone shows the back link alone. |
| \`PageBar.Controls\` | The right end, holding \`PeriodControl\`: the full capsules from tablet up, one capsule opening a sheet on phone. On snow it takes \`backdrop="snow"\`. A page without the period, like People, leaves it out. |

- **With a header sentence** (Home, Portfolio, a member, a share): \`Sky.Root\` holds \`Sky.Band\` and \`Sky.Header\`; \`Sky.Header\` holds the bar, then the sentence, which ends above the ridge. The main card follows \`Sky.Header\` and starts on the ridge.
- **Without one** (Members, Shares, People, How FPR works…): \`Sky.Root\` alone, the bar on snow, and the title is the page’s heading.

Every part takes \`className\` and the props of the element it renders. The controls switch each part on and off and pick the back link’s icon. On this page every story renders at the page’s own width, a desktop width: the **Phone** and **Tablet** stories in the sidebar show the narrower ones.
`;

const meta = {
  title: "Organisms/Page bar and sky header",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: DESCRIPTION } },
  },
  args: { back: false, controls: true, sky: true, icon: "caret-left" },
  argTypes: {
    back: {
      name: "PageBar.Back",
      description:
        "Renders the back link, then the page’s name in `PageBar.Current`, in place of `PageBar.Title`: a member’s page, or a share’s.",
      control: { type: "boolean" },
    },
    icon: {
      name: "PageBar.Back icon",
      description:
        "`PageBar.Back`’s `icon`: any Phosphor icon, a caret pointing left by default.",
      options: Object.keys(ICONS),
      control: { type: "select" },
      if: { arg: "back" },
    },
    controls: {
      name: "PageBar.Controls",
      description:
        "Renders the period control at the right end. Off, as on People or How FPR works.",
      control: { type: "boolean" },
    },
    sky: {
      name: "Sky.Band, Sky.Header",
      description:
        "Renders the sky, with the header sentence and the ridge. Off, a page without a header sentence: the bar on snow, its title the page’s heading.",
      control: { type: "boolean" },
    },
  },
  render: (args) => <Page {...args} />,
} satisfies Meta<PageArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Home’s top, its parts switched in the Controls panel. Picking a period changes the sentence under it. */
export const Desktop: Story = {
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: /^This month/ }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "3M" }));
    await expect(
      canvas.getByRole("heading", { level: 1, name: /^Over three months/ }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "1M" }));
    // Leaves the story at rest, without the focus ring on 1M.
    const focused = canvasElement.ownerDocument.activeElement;
    if (focused instanceof HTMLElement) focused.blur();
  },
};

/** The Docs page can't narrow a story, so the narrower widths live in the sidebar only. */
export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** On phone, the period is one capsule at the right of the bar. */
export const Phone: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: /This month · %/ }),
    ).toBeVisible();
  },
};
