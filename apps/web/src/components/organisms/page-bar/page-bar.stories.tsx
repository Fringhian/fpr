import type { Language } from "@fpr/contracts";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { CaretLeftIcon } from "@phosphor-icons/react/CaretLeft";
import { HouseIcon } from "@phosphor-icons/react/House";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import { Card } from "../../atoms/card/card";
import * as Sky from "../../foundations/sky/sky";
import {
  PeriodControl,
  type PeriodSetting,
} from "../../molecules/period-control/period-control";
import * as Sentence from "../../molecules/sentence/sentence";
import * as Navigation from "../navigation/navigation";
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
  compact: boolean;
  icon: keyof typeof ICONS;
}

/** The demo pages' names and cards, in the toolbar's language. They are the stories' content, not the page bar's. */
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
    more: "A card further down",
    scroll:
      "Past the page bar, the compact bar keeps the page’s name and the period at the top.",
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
    more: "Une carte plus bas",
    scroll:
      "Passé la barre de page, la barre compacte garde le nom de la page et la période en haut.",
  },
} as const satisfies Record<Language, Record<string, string>>;

type Labels = (typeof LABELS)[Language];

const alex = { name: "Alex", color: "cobalt" } as const;

const sam = {
  name: "Sam",
  color: "vermilion",
  gain: { eur: "640", percent: "6.1" },
} as const;

/** The navigation's current item for each page, by `back` and `sky`. */
const CURRENT = {
  "false-true": "home",
  "false-false": "members",
  "true-true": "members",
  "true-false": "portfolio",
} as const satisfies Record<`${boolean}-${boolean}`, Navigation.Destination>;

const gutters = cn("", "px-m", "tablet:px-l", "desktop:px-l");

/** The page's name: Home, Members, a member under Members, or History under Portfolio. */
function pageName(
  labels: Labels,
  { back, sky }: { back: boolean; sky: boolean },
) {
  if (back) return sky ? sam.name : labels.history;
  return sky ? labels.home : labels.members;
}

/** The bar's left end: the back link and the page's name, or the title, which is the heading on snow. */
function BarStart({
  back,
  sky,
  icon,
}: Pick<PageArgs, "back" | "sky" | "icon">) {
  const labels = LABELS[useLanguage()];

  const name = pageName(labels, { back, sky });

  return back ? (
    <>
      <PageBar.Back href="#members" icon={ICONS[icon]}>
        {sky ? labels.members : labels.portfolio}
      </PageBar.Back>
      <PageBar.Current>{name}</PageBar.Current>
    </>
  ) : (
    <PageBar.Title render={sky ? undefined : (props) => <h1 {...props} />}>
      {name}
    </PageBar.Title>
  );
}

/** The bar's right end: the period on pages that show it, then the account menu, which shows on phone only. */
function BarControls({
  controls,
  setting,
  onChange,
  backdrop,
}: {
  controls: boolean;
  setting: PeriodSetting;
  onChange: (setting: PeriodSetting) => void;
  backdrop: "sky" | "snow";
}) {
  return (
    <PageBar.Controls>
      {controls ? (
        <PeriodControl
          value={setting}
          onChange={onChange}
          backdrop={backdrop}
        />
      ) : null}
      <Navigation.AccountMenu />
    </PageBar.Controls>
  );
}

/** The header sentence: a member's, under a back link, or Home's race. */
function PageSentence({
  back,
  setting,
}: {
  back: boolean;
  setting: PeriodSetting;
}) {
  const labels = LABELS[useLanguage()];

  return back ? (
    <Sentence.Root>
      <Sentence.Headline>{sam.name}</Sentence.Headline>
      <Sentence.Story>{labels.memberStory}</Sentence.Story>
    </Sentence.Root>
  ) : (
    <Sentence.Race
      name={alex.name}
      color={alex.color}
      timeOfDay="evening"
      period={setting.period}
      unit={setting.unit}
      standing="theyLead"
      gain={{ eur: "512", percent: "4.2" }}
      leader={sam}
      starShare={{ name: "Swiss Pharma AG", gain: "12.4" }}
    />
  );
}

/** The page's cards: the main one, starting on the ridge or under the bar, then enough below it to scroll. */
function Cards({ sky }: { sky: boolean }) {
  const labels = LABELS[useLanguage()];

  return (
    <div className="grid gap-m">
      <Card
        elevation="rest"
        render={<section />}
        className="grid h-[16rem] content-start gap-xs p-m"
      >
        <h2 className="text-l font-semibold">{labels.card}</h2>
        <p className="text-s text-secondary">
          {sky ? labels.onRidge : labels.onSnow}
        </p>
      </Card>
      {[1, 2, 3, 4, 5].map((card) => (
        <Card
          key={card}
          render={<section />}
          className="grid h-[10rem] content-start gap-xs p-m"
        >
          <h2 className="text-m font-semibold">{labels.more}</h2>
          <p className="text-s text-secondary">{labels.scroll}</p>
        </Card>
      ))}
    </div>
  );
}

/** The app's frame: the side navigation, the page's column, and the phone's tab bar, which the column leaves room for. */
function Frame({
  current,
  children,
}: {
  current: Navigation.Destination;
  children: ReactNode;
}) {
  return (
    <Navigation.Root userRole="member" account={alex} current={current}>
      <div className="flex font-sans text-primary">
        <Navigation.Side />
        <main className="min-w-0 flex-1 pb-(--tab-bar-room)">{children}</main>
        <Navigation.TabBar />
      </div>
    </Navigation.Root>
  );
}

/**
 * A page in the app's frame, made of the parts the controls switch on: the
 * compact bar at the top of its column, then the sky header and the cards.
 * It keeps the period setting the way the app shell will, so both bars and
 * the sentence follow it.
 */
function Page({ back, controls, sky, compact, icon }: PageArgs) {
  const labels = LABELS[useLanguage()];
  const [setting, setSetting] = useState<PeriodSetting>({
    period: "1M",
    unit: "percent",
  });
  const anchor = useRef<HTMLDivElement>(null);

  const bar = (
    <PageBar.Root ref={anchor}>
      <BarStart back={back} sky={sky} icon={icon} />
      <BarControls
        controls={controls}
        setting={setting}
        onChange={setSetting}
        backdrop={sky ? "sky" : "snow"}
      />
    </PageBar.Root>
  );

  return (
    <Frame current={CURRENT[`${back}-${sky}`]}>
      {compact ? (
        <PageBar.Compact anchor={anchor}>
          <PageBar.Title>{pageName(labels, { back, sky })}</PageBar.Title>
          <BarControls
            controls={controls}
            setting={setting}
            onChange={setSetting}
            backdrop="snow"
          />
        </PageBar.Compact>
      ) : null}
      <Sky.Root className={cn("pb-xl", gutters)}>
        {sky ? (
          <>
            <Sky.Band />
            <Sky.Header>
              {bar}
              <PageSentence back={back} setting={setting} />
            </Sky.Header>
          </>
        ) : (
          bar
        )}
        <Cards sky={sky} />
      </Sky.Root>
    </Frame>
  );
}

const DESCRIPTION = `
Every page’s top: the page bar, then, on a page with a header sentence, the sentence on the sky and the ridge, with the page’s main card starting on it. Past the page bar, the compact bar takes its place at the top. Import the bar as a namespace: \`import * as PageBar from "…/page-bar"\`, and compose it with \`Sky\`, \`Sentence\`, \`PeriodControl\` and \`Navigation.AccountMenu\`.

| Part | What it is |
| --- | --- |
| \`PageBar.Root\` | The bar: 70px high on phone, 80px from tablet up, under the top safe area of an installed app. The page’s gutters frame it. |
| \`PageBar.Title\` | The page’s name on the left, “Home”. A \`<p>\`; a page without a header sentence renders it as its heading, \`render={(props) => <h1 {...props} />}\`. |
| \`PageBar.Back\` | The back link on the left, in place of the title: \`icon\`, a caret by default, then the parent page, “Members”. Screen readers hear “Back to Members”. \`render\` composes it with the router’s link. |
| \`PageBar.Current\` | The page’s name after the back link, from tablet up: “Members / Sam”. The phone shows the back link alone. |
| \`PageBar.Controls\` | The right end, holding \`PeriodControl\`: the full capsules from tablet up, one capsule opening a sheet on phone. On snow it takes \`backdrop="snow"\`. A page without the period, like People, leaves it out. On phone it ends with \`Navigation.AccountMenu\`, your picture, which hides itself from tablet up. |
| \`PageBar.Compact\` | The compact bar, 56px high on phone, 64px from tablet up, frosted over the page. It holds \`PageBar.Title\` with the page’s name, never a heading, and the same \`PageBar.Controls\`, bound to the same setting. \`anchor\` is a ref to the page’s \`PageBar.Root\`. |

- **With a header sentence** (Home, Portfolio, a member, a share): \`Sky.Root\` holds \`Sky.Band\` and \`Sky.Header\`; \`Sky.Header\` holds the bar, then the sentence, which ends above the ridge. The main card follows \`Sky.Header\` and starts on the ridge.
- **Without one** (Members, Shares, People, How FPR works…): \`Sky.Root\` alone, the bar on snow, and the title is the page’s heading.
- **On scroll**: the sky and the page bar scroll away together. Once the page bar has passed the top, \`PageBar.Compact\` shows at the top, under the safe area. On tablet and desktop it stays pinned. On phone it tucks away on every scroll down and comes back on the first scroll up; keyboard focus moving into it brings it back too. While the page bar is in view it is out of reach, so its controls are never there twice. Under reduced motion it fades without sliding. Its state, \`away\`, \`tucked\` or \`shown\`, is in \`data-state\`.
- **Clear of the bars**: the page’s scroll padding, set in \`theme.css\`, keeps a focused or scrolled-to element clear of the compact bar at the top and, on phone, of the tab bar at the bottom, which leaves \`--tab-bar-room\` at the page’s end. The two bars hold opposite edges and never cover the same content.

The layout places \`PageBar.Compact\` first in the page’s column, outside the gutters, and \`PageBar.Root\` at the top of the page. A page has these bars at every width.

Every part takes \`className\` and the props of the element it renders. The controls switch each part on and off and pick the back link’s icon. Each story renders in its own frame at the page’s own width and scrolls: the **Scrolled** stories start past the page bar, and the **Phone** and **Tablet** stories in the sidebar show the narrower widths.
`;

const meta = {
  title: "Organisms/Page bar and sky header",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: { component: DESCRIPTION },
      story: { inline: false, height: "40rem" },
    },
  },
  args: {
    back: false,
    controls: true,
    sky: true,
    compact: true,
    icon: "caret-left",
  },
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
        "Renders the period control at the right end of both bars. Off, as on People or How FPR works.",
      control: { type: "boolean" },
    },
    sky: {
      name: "Sky.Band, Sky.Header",
      description:
        "Renders the sky, with the header sentence and the ridge. Off, a page without a header sentence: the bar on snow, its title the page’s heading.",
      control: { type: "boolean" },
    },
    compact: {
      name: "PageBar.Compact",
      description:
        "Renders the compact bar, which takes the page bar’s place at the top once it has scrolled past.",
      control: { type: "boolean" },
    },
  },
  render: (args) => <Page {...args} />,
} satisfies Meta<PageArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The compact bar, which carries its state in `data-state`. */
function compactBar(canvasElement: HTMLElement): HTMLElement {
  const bar = canvasElement.querySelector<HTMLElement>("[data-state]");
  if (bar === null) throw new Error("No compact bar");
  return bar;
}

/** Scrolls the story's window to `top` and waits for the compact bar's state. */
async function scrollTo(
  canvasElement: HTMLElement,
  top: number,
  state: "away" | "tucked" | "shown",
) {
  canvasElement.ownerDocument.defaultView?.scrollTo({ top });
  await waitFor(() =>
    expect(compactBar(canvasElement)).toHaveAttribute("data-state", state),
  );
}

/** Home’s top, its parts switched in the Controls panel. Picking a period changes the sentence under it. */
export const Desktop: Story = {
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: /^This month/ }),
    ).toBeVisible();
    await expect(compactBar(canvasElement)).not.toBeVisible();
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

/**
 * Scrolled past the page bar: the compact bar is pinned at the top with the
 * title, the period and the unit. Picking a period there changes the page as
 * the page bar does.
 */
export const Scrolled: Story = {
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvasElement }) => {
    await scrollTo(canvasElement, 400, "shown");
    const bar = compactBar(canvasElement);
    await waitFor(() => expect(bar).toBeVisible());
    await userEvent.click(within(bar).getByRole("button", { name: "3M" }));
    const header = canvasElement.querySelector("header");
    if (header === null) throw new Error("No sky header");
    await expect(
      within(header).getByRole("button", { name: "3M" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      within(header).getByRole("heading", { level: 1 }),
    ).toHaveTextContent(/^Over three months/);
    // Moving through the bar with the keyboard leaves the page where it is.
    await userEvent.keyboard("{ArrowRight}");
    await expect(
      within(bar).getByRole("button", { name: "YTD" }),
    ).toHaveFocus();
    await expect(window.scrollY).toBe(400);
    const focused = canvasElement.ownerDocument.activeElement;
    if (focused instanceof HTMLElement) focused.blur();
  },
};

/** The Docs page can't narrow a story, so the narrower widths live in the sidebar only. */
export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** On tablet, the compact bar stays pinned past the page bar, with the period and the unit, beside the rail. */
export const TabletScrolled: Story = {
  name: "Tablet, scrolled",
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
  play: async ({ canvasElement }) => {
    await scrollTo(canvasElement, 400, "shown");
    await waitFor(() => expect(compactBar(canvasElement)).toBeVisible());
  },
};

/** On phone, the period is one capsule at the right of the bar, before your picture. */
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

/**
 * On phone, the compact bar tucks away while the page scrolls down and comes
 * back on the first scroll up, with the title, the period and your picture.
 * It holds the top edge and the tab bar the bottom one, and the page’s scroll
 * padding keeps clear of both.
 */
export const PhoneScrolled: Story = {
  name: "Phone, scrolled up",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement, step }) => {
    const bar = compactBar(canvasElement);
    await step("Scrolling down tucks it away", async () => {
      await scrollTo(canvasElement, 600, "tucked");
      await waitFor(() => expect(bar).not.toBeVisible());
    });
    await step("The first scroll up brings it back", async () => {
      await scrollTo(canvasElement, 560, "shown");
      await waitFor(() => expect(bar.getBoundingClientRect().top).toBe(0));
    });
    await step("It and the tab bar keep to their own edges", async () => {
      const tabBar = within(canvasElement).getByRole("navigation", {
        name: "Main",
      });
      const root = getComputedStyle(
        canvasElement.ownerDocument.documentElement,
      );
      const { bottom } = bar.getBoundingClientRect();
      const { top } = tabBar.getBoundingClientRect();
      await expect(bottom).toBeLessThan(top);
      await expect(Number.parseFloat(root.scrollPaddingTop)).toBe(bottom);
      await expect(Number.parseFloat(root.scrollPaddingBottom)).toBeGreaterThan(
        window.innerHeight - top,
      );
    });
  },
};

/** Keyboard focus moving into the tucked bar brings it back, where the page is. */
export const PhoneFocus: Story = {
  name: "Phone, keyboard focus",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    await scrollTo(canvasElement, 600, "tucked");
    const bar = compactBar(canvasElement);
    // Tucked, it is transparent yet still in the tab order, first in the page.
    await waitFor(() =>
      expect(getComputedStyle(bar).visibility).toBe("visible"),
    );
    await expect(bar).not.toBeVisible();
    await userEvent.tab();
    await expect(
      within(bar).getByRole("button", { name: /This month · %/ }),
    ).toHaveFocus();
    await waitFor(() => expect(bar.getBoundingClientRect().top).toBe(0));
    await expect(bar).toBeVisible();
    await expect(window.scrollY).toBeGreaterThan(500);
  },
};

/** A phone’s notch: 59px, the inset an installed app draws under. */
const NOTCH = 59;

/**
 * Installed on a phone with a notch: the sky reaches under it, the bar pads
 * below it, and the sentence, the ridge and the main card move down with it.
 */
export const PhoneInstalled: Story = {
  name: "Phone, installed",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  decorators: [
    (Story) => (
      <div style={{ "--safe-top": `${NOTCH}px` } as CSSProperties}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector("header");
    const bar = header?.firstElementChild;
    const card = header?.nextElementSibling?.firstElementChild;
    if (!(bar instanceof HTMLElement) || !(card instanceof HTMLElement)) {
      throw new Error("No page bar or main card");
    }
    const top = header?.getBoundingClientRect().top ?? 0;
    const ridgeTop = top + NOTCH + 206;
    await expect(getComputedStyle(bar).paddingTop).toBe(`${NOTCH}px`);
    await expect(
      within(canvasElement)
        .getByRole("heading", { level: 1 })
        .getBoundingClientRect().bottom,
    ).toBeLessThan(ridgeTop);
    await expect(card.getBoundingClientRect().top - top).toBe(NOTCH + 240);
  },
};
