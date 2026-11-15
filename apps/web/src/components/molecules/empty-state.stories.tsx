import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { QuestionIcon } from "@phosphor-icons/react/Question";
import { TrayIcon } from "@phosphor-icons/react/Tray";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLanguage } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import { Button } from "../atoms/button";
import * as EmptyState from "./empty-state";

interface Use {
  title: string;
  description: string;
  action?: string;
}

/** The demo texts, in the toolbar’s language: three empty states from the user stories. They are the stories’ content, not the empty state’s. */
const TEXTS = {
  en: {
    portfolio: {
      title: "Your portfolio is empty",
      description:
        "Record each share you hold with the day you bought it. A week late is fine.",
      action: "Record a change",
    },
    member: {
      title: "No shares yet",
      description: "Sam hasn’t recorded any shares yet.",
    },
    notFound: {
      title: "No share found for LU00EXMPL008",
      description:
        "The price provider doesn’t track it. Create it and enter its value yourself.",
      action: "Create a manual share",
    },
  },
  fr: {
    portfolio: {
      title: "Votre portefeuille est vide",
      description:
        "Enregistrez chaque part que vous détenez avec le jour de son achat. Une semaine de retard ne pose aucun problème.",
      action: "Enregistrer un mouvement",
    },
    member: {
      title: "Pas encore de parts",
      description: "Sam n’a encore enregistré aucune part.",
    },
    notFound: {
      title: "Aucune part trouvée pour LU00EXMPL008",
      description:
        "Le fournisseur de cours ne la suit pas. Créez-la et saisissez vous-même sa valeur.",
      action: "Créer une part manuelle",
    },
  },
} as const satisfies Record<Language, Record<string, Use>>;

type UseName = keyof (typeof TEXTS)["en"];

/** The icons the empty state’s icon offers, by name. */
const ICONS = {
  tray: TrayIcon,
  plus: PlusIcon,
  question: QuestionIcon,
  "magnifying-glass": MagnifyingGlassIcon,
} as const satisfies Record<string, EmptyState.IconProps["icon"]>;

/** Which of the empty state’s optional parts the story renders, and its icon; its content stays the same. */
interface EmptyStateParts {
  icon: keyof typeof ICONS;
  withTitle: boolean;
  withAction: boolean;
}

/** The Docs page reads the root’s props; the controls are the parts. */
type StoryArgs = EmptyState.RootProps & EmptyStateParts;

function Demo({
  use,
  icon,
  withTitle,
  withAction,
}: EmptyStateParts & { use: UseName }) {
  const text: Use = TEXTS[useLanguage()][use];

  return (
    <div className="py-l font-sans">
      <EmptyState.Root>
        <EmptyState.Icon icon={ICONS[icon]} />
        {withTitle ? <EmptyState.Title>{text.title}</EmptyState.Title> : null}
        <EmptyState.Description>{text.description}</EmptyState.Description>
        {withAction && text.action ? (
          <EmptyState.Action>
            <Button intent="primary">{text.action}</Button>
          </EmptyState.Action>
        ) : null}
      </EmptyState.Root>
    </div>
  );
}

const DESCRIPTION = `
What a list or a page shows when it has nothing yet: a small icon in a soft circle, one sentence that says what to do, and the action. Import it as a namespace: \`import * as EmptyState from "…/empty-state"\`.

| Part | What it is |
| --- | --- |
| \`EmptyState.Root\` | The column, centred, at most 320px wide. |
| \`EmptyState.Icon\` | The state icon, 56px: \`icon\`, any Phosphor icon, the tray by default; and \`label\` when the icon says something the text doesn’t. |
| \`EmptyState.Title\` | What is empty, an \`<h2>\`; \`render={<h1 />}\` when it is the page’s heading. Optional. |
| \`EmptyState.Description\` | One sentence that says what to do. |
| \`EmptyState.Action\` | The action that fills it: a \`Button\` or a \`TextLink\`. Optional: a state nobody can fill, such as another member’s, has none. |

The controls pick the icon and switch each optional part on and off.
`;

const meta = {
  title: "Molecules/Empty state",
  component: EmptyState.Root,
  subcomponents: {
    "EmptyState.Icon": EmptyState.Icon,
    "EmptyState.Title": EmptyState.Title,
    "EmptyState.Description": EmptyState.Description,
    "EmptyState.Action": EmptyState.Action,
  },
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: { icon: "tray", withTitle: true, withAction: true },
  argTypes: {
    icon: {
      name: "EmptyState.Icon icon",
      description:
        "The state’s `icon`: any Phosphor icon, the tray by default.",
      options: Object.keys(ICONS),
      control: { type: "select" },
    },
    withTitle: {
      name: "EmptyState.Title",
      description: "Renders the title over the sentence.",
      control: { type: "boolean" },
    },
    withAction: {
      name: "EmptyState.Action",
      description: "Renders the action under the sentence.",
      control: { type: "boolean" },
    },
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

/** Portfolio, before the first change is recorded: the action records it. */
export const EmptyPortfolio: Story = {
  args: { icon: "plus" },
  render: (parts) => <Demo use="portfolio" {...parts} />,
};

/** Another member’s page before they record anything: nobody but them can fill it, so it has no action. */
export const MemberWithoutShares: Story = {
  args: { withAction: false },
  argTypes: { withAction: { control: false } },
  render: (parts) => <Demo use="member" {...parts} />,
};

/** Shares, when a lookup finds nothing: the action creates the share by hand. */
export const NoShareFound: Story = {
  args: { icon: "question" },
  render: (parts) => <Demo use="notFound" {...parts} />,
};
