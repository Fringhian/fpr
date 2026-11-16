import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import type { Language } from "../../../lib/language";
import { MEMBER_COLORS } from "../../../lib/member-color";
import { Chip } from "../../atoms/chip/chip";
import { TrailSign } from "../../atoms/trail-sign/trail-sign";
import * as Sky from "../../foundations/sky/sky";
import * as Sentence from "./sentence";

/** Stands in for the page bar, at its height in the design. */
function PageBar() {
  return (
    <p
      className={cn(
        "flex items-center text-l font-semibold",
        "h-[4.375rem]",
        "tablet:h-[5rem]",
        "desktop:h-[5rem]",
      )}
    >
      Home
    </p>
  );
}

/** Every story sits where the sentence lives: on the sky, under the page bar, above the ridge. */
const onTheSky: Decorator = (Story) => (
  <Sky.Root
    className={cn(
      "pb-l font-sans text-primary",
      "px-m",
      "tablet:px-l",
      "desktop:px-l",
    )}
  >
    <Sky.Band />
    <Sky.Header>
      <PageBar />
      <Story />
    </Sky.Header>
  </Sky.Root>
);

const sam = {
  name: "Sam",
  color: "vermilion",
  gain: { eur: "640", percent: "6.1" },
} as const;

const starShare = { name: "Swiss Pharma AG", gain: "12.4" };

/** Which of the sentence's optional parts the Parts story renders. */
interface SentenceParts {
  greeting: boolean;
  headline: boolean;
  story: boolean;
  wide: boolean;
}

/** The Parts story's words, in the toolbar's language. They are its content, not the parts'. */
const PARTS_TEXT = {
  en: {
    greeting: "Sam’s portfolio",
    headline: "This month, Sam is up €640 (+6.1%)",
    lead: " leads the race",
    wide: " · best share ",
  },
  fr: {
    greeting: "Le portefeuille de Sam",
    headline: "Ce mois-ci, Sam gagne 640 € (+6,1 %)",
    lead: " est en tête de la course",
    wide: " · meilleur titre ",
  },
} as const satisfies Record<Language, Record<string, string>>;

/** A member's page sentence, made of the parts the controls switch on. */
function PartsSentence({ greeting, headline, story, wide }: SentenceParts) {
  const text = PARTS_TEXT[useLanguage()];

  return (
    <Sentence.Root>
      {greeting ? <Sentence.Greeting>{text.greeting}</Sentence.Greeting> : null}
      {headline ? <Sentence.Headline>{text.headline}</Sentence.Headline> : null}
      {story ? (
        <Sentence.Story>
          <TrailSign person={{ name: "Sam", color: "vermilion" }}>
            Sam
          </TrailSign>
          {text.lead}
          {wide ? (
            <Sentence.Wide>
              {text.wide}
              <Chip gain="12.4">Swiss Pharma AG</Chip>
            </Sentence.Wide>
          ) : null}
        </Sentence.Story>
      ) : null}
    </Sentence.Root>
  );
}

const DESCRIPTION = `
The header sentence: a greeting, the headline, and one story line with trail signs and chips. It sits on the sky, in \`Sky.Header\` after the page bar, and ends above the ridge. Import it as a namespace: \`import * as Sentence from "…/sentence"\`.

\`Sentence.Race\` writes Home's sentence from the race, in the reader's language. It adapts to where you stand:

| \`standing\` | Story line |
| --- | --- |
| \`theyLead\` | “Sam leads at +6.1% · star share Swiss Pharma AG” |
| \`youLead\` | “You lead the race · star share …” |
| \`alone\` | “You’re the first one in” |
| \`watching\` | A guest or an anonymous viewer, with no portfolio: the headline names the leader. |

- Everyone is down when the gain that leads is down, yours or the leader's: on tablet and desktop the story line starts with “Everyone is down this month”.
- The headline is display size on tablet and desktop, headline size on phone. On phone the story line names the leader only, so the sentence ends above the ridge: the star share shows in their lane instead.
- Without euros, as for an anonymous viewer, every gain reads in percent.

The parts lay out any page's header sentence:

| Part | What it is |
| --- | --- |
| \`Sentence.Root\` | The block, in \`Sky.Header\` after the page bar |
| \`Sentence.Greeting\` | The greeting, in the sky's ink |
| \`Sentence.Headline\` | The page's heading |
| \`Sentence.Story\` | The story line, spaced for signs and chips |
| \`Sentence.Wide\` | A part of the story line shown from tablet up |

Every part, and \`Sentence.Race\`, passes every other prop to the element it renders, \`className\` included. The **Parts** story lays out a member's page with them, its controls switching each optional part.

On this page every story renders at the page's own width: the **Phone** and **Tablet** stories in the sidebar show the narrower ones.
`;

const meta = {
  title: "Molecules/Sentence",
  component: Sentence.Race,
  tags: ["autodocs"],
  decorators: [onTheSky],
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: DESCRIPTION } },
  },
  args: {
    name: "Alex",
    color: "cobalt",
    timeOfDay: "evening",
    period: "1M",
    unit: "percent",
    standing: "theyLead",
    gain: { eur: "512", percent: "4.2" },
    leader: sam,
    starShare,
  },
  argTypes: {
    standing: {
      description:
        "Where you stand in the race: someone else leads, you lead, you're alone, or you watch without a portfolio.",
      control: { type: "inline-radio" },
      options: ["theyLead", "youLead", "alone", "watching"],
    },
    name: { control: { type: "text" } },
    color: { control: { type: "select" }, options: MEMBER_COLORS },
    photo: { control: false },
    timeOfDay: {
      control: { type: "inline-radio" },
      options: ["morning", "afternoon", "evening"],
    },
    period: {
      control: { type: "inline-radio" },
      options: ["1D", "1W", "1M", "3M", "YTD", "all"],
    },
    unit: { control: { type: "inline-radio" }, options: ["eur", "percent"] },
    gain: {
      control: { type: "object" },
      description:
        "Your gain over the period, as the API sends it. A viewer without a portfolio (`watching`) has none.",
      if: { arg: "standing", neq: "watching" },
    },
    leader: {
      control: { type: "object" },
      description:
        "Who leads, with their gain over the period, when someone else leads or you watch.",
    },
    starShare: { control: { type: "object" } },
    className: {
      description:
        "Classes added to the sentence's block, which win any conflict.",
      control: false,
    },
  },
} satisfies Meta<typeof Sentence.Race>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Someone else leads: the story line names them and the star share. */
export const SomeoneElseLeads: Story = {
  name: "Someone else leads",
  globals: { viewport: { value: "desktop" } },
};

/** You lead the race: your picture on the sign. */
export const YouLead: Story = {
  name: "You lead",
  args: { standing: "youLead", leader: undefined },
};

const everyoneIsDown = {
  gain: { eur: "-120", percent: "-1.3" },
  leader: { ...sam, gain: { eur: "-25", percent: "-0.4" } },
  starShare: { name: "Nordic Wind AG", gain: "2.1" },
} satisfies Story["args"];

/** Everyone is down, the leader too: the story line says so first. */
export const EveryoneIsDown: Story = {
  name: "Everyone is down",
  args: everyoneIsDown,
};

/** Nobody else has started yet. */
export const YoureAlone: Story = {
  name: "You’re alone",
  args: { standing: "alone", leader: undefined, starShare: undefined },
};

/**
 * An anonymous viewer, with no portfolio: greeted by their pseudonym, the
 * headline names the leader by theirs, and every gain reads in percent.
 */
export const AnonymousViewer: Story = {
  name: "Anonymous viewer",
  args: {
    name: "Brave Otter",
    standing: "watching",
    gain: undefined,
    leader: {
      name: "Quiet Heron",
      color: "vermilion",
      gain: { percent: "6.1" },
    },
  },
};

/**
 * Any page's header sentence, laid out with the parts: a member's page here.
 * The controls switch each optional part on and off; the words stay the same.
 */
export const Parts = {
  args: { greeting: true, headline: true, story: true, wide: true },
  argTypes: {
    greeting: {
      name: "Sentence.Greeting",
      description: "Renders the greeting above the headline.",
      control: { type: "boolean" },
    },
    headline: {
      name: "Sentence.Headline",
      description: "Renders the headline, the page's heading.",
      control: { type: "boolean" },
    },
    story: {
      name: "Sentence.Story",
      description: "Renders the story line under the headline.",
      control: { type: "boolean" },
    },
    wide: {
      name: "Sentence.Wide",
      description:
        "Renders the story line's part shown from tablet up. The phone hides it either way.",
      control: { type: "boolean" },
      if: { arg: "story" },
    },
  },
  parameters: {
    controls: {
      include: [
        "Sentence.Greeting",
        "Sentence.Headline",
        "Sentence.Story",
        "Sentence.Wide",
      ],
    },
  },
  render: (parts) => <PartsSentence {...parts} />,
} satisfies StoryObj<SentenceParts>;

/** The Docs page can't narrow a story, so the narrower widths live in the sidebar only. */
export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** On phone the headline is headline size, and the story line names the leader only. */
export const Phone: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** On phone, with everyone down: the headline says you're down, and the story line still names the leader only. */
export const PhoneEveryoneIsDown: Story = {
  name: "Phone, everyone is down",
  tags: ["!autodocs"],
  args: everyoneIsDown,
  globals: { viewport: { value: "phone" } },
};
