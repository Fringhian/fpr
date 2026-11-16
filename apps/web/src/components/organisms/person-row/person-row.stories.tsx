import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react/DotsThreeVertical";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { useLanguage } from "../../../lib/i18n";
import type { Language } from "../../../lib/language";
import { MEMBER_COLORS } from "../../../lib/member-color";
import * as Menu from "../../molecules/menu/menu";
import {
  type AccessStatus,
  PersonList,
  PersonRow,
  type PersonRowProps,
} from "./person-row";

/** An abstract photo, drawn inline: a sun over two hills, no person. */
const PHOTO = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='0.4' y2='1'><stop offset='0' stop-color='#f6b48f'/><stop offset='1' stop-color='#8c6a9e'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><circle cx='62' cy='34' r='14' fill='#ffe6b8'/><path d='M0 70 C24 52 44 54 64 66 C76 72 86 70 96 62 V96 H0Z' fill='#5d4a6e'/><path d='M0 82 C30 72 58 76 96 84 V96 H0Z' fill='#3d3150'/></svg>",
)}`;

const PHOTOS = { none: null, photo: PHOTO } as const;
type PhotoName = keyof typeof PHOTOS;

/** The end dates the control offers: none, one ahead, one past. */
const END_DATES = {
  none: null,
  "2027-06-30": "2027-06-30",
  "2026-11-01": "2026-11-01",
} as const;
type EndDateName = keyof typeof END_DATES;

/** The icons the ⋯ button's control offers. */
const MORE_ICONS = {
  "dots-three": DotsThreeIcon,
  "dots-three-vertical": DotsThreeVerticalIcon,
} as const;
type MoreIconName = keyof typeof MORE_ICONS;

const STATUSES = [
  "waiting",
  "active",
  "expired",
  "ended",
  "revoked",
] as const satisfies readonly AccessStatus[];

/** The demo menu items, in the toolbar’s language. They are the stories’ content, not the row’s. */
const TEXTS = {
  en: {
    edit: "Edit",
    editPortfolio: "Edit portfolio",
    replaceLink: "Replace link",
    revoke: "Revoke access",
    restore: "Restore access",
    delete: "Delete",
  },
  fr: {
    edit: "Modifier",
    editPortfolio: "Modifier le portefeuille",
    replaceLink: "Remplacer le lien",
    revoke: "Révoquer l’accès",
    restore: "Rétablir l’accès",
    delete: "Supprimer",
  },
} as const satisfies Record<Language, Record<string, string>>;

/** The admin’s actions on a person: revoking becomes restoring once access is revoked. */
function Actions({ status }: { status: AccessStatus }) {
  const text = TEXTS[useLanguage()];

  return (
    <>
      <Menu.Item>{text.edit}</Menu.Item>
      <Menu.Item>{text.editPortfolio}</Menu.Item>
      <Menu.Item>{text.replaceLink}</Menu.Item>
      <Menu.Item>{status === "revoked" ? text.restore : text.revoke}</Menu.Item>
      <Menu.Separator />
      <Menu.Item intent="danger">{text.delete}</Menu.Item>
    </>
  );
}

/** The stories’ args: the photo, end date and ⋯ icon are picked by name, and `actions` switches the ⋯ menu on. */
type PersonRowArgs = Omit<
  PersonRowProps,
  "photo" | "accessUntil" | "actions" | "moreIcon"
> & {
  photo: PhotoName;
  accessUntil: EndDateName;
  actions: boolean;
  moreIcon: MoreIconName;
};

function toProps({
  photo,
  accessUntil,
  actions,
  moreIcon,
  ...args
}: PersonRowArgs): PersonRowProps {
  return {
    ...args,
    photo: PHOTOS[photo],
    accessUntil: END_DATES[accessUntil],
    actions: actions ? <Actions status={args.status} /> : undefined,
    moreIcon: MORE_ICONS[moreIcon],
  };
}

/** The people of the list stories: invented names, example addresses. */
const PEOPLE = [
  {
    name: "Alex",
    color: "vermilion",
    email: "alex@example.com",
    status: "active",
    accessUntil: null,
    photo: PHOTO,
  },
  {
    name: "Sam",
    color: "cobalt",
    email: "sam@example.com",
    status: "active",
    accessUntil: null,
    photo: null,
  },
  {
    name: "Lea",
    color: "green",
    email: "lea.martin@example.org",
    status: "waiting",
    accessUntil: null,
    photo: null,
  },
  {
    name: "Max",
    color: "violet",
    email: "max@example.com",
    status: "revoked",
    accessUntil: null,
    photo: null,
  },
  {
    name: "Jo",
    color: "amber",
    email: "jo@example.com",
    status: "active",
    accessUntil: "2027-06-30",
    photo: null,
  },
  {
    name: "Rui",
    color: "pink",
    email: "rui@example.com",
    status: "expired",
    accessUntil: null,
    photo: null,
  },
  {
    name: "Quokka",
    color: "cyan",
    email: null,
    status: "ended",
    accessUntil: "2026-11-01",
    photo: null,
  },
] as const satisfies readonly Omit<PersonRowProps, "actions">[];

/** The same people as an anonymous viewer reads them: pseudonyms, initials, no emails, no ⋯. */
const PSEUDONYMS = [
  "Quiet Heron",
  "Brave Otter",
  "Swift Lynx",
  "Calm Badger",
  "Bright Finch",
  "Swift Lynx 2",
  "Gentle Quokka",
];

const DESCRIPTION = `
A person in the admin area: their picture, name, email, access status, end date, and the ⋯ menu of what the admin can do. Rows go in a \`PersonList\`, whose columns every row shares, so the emails, badges and end dates line up.

| Part | What it is |
| --- | --- |
| \`PersonList\` | The \`<ul>\` the rows go in. |
| \`PersonRow\` | One person, an \`<li>\`. |

- The status is one of five, each with its badge: waiting for first use, active, link expired (never used before its deadline), ended (past its end date), or revoked. Grey is a plain fact, green works, red keeps the person out.
- The end date is written with its year, “Until 30 Jun 2027”. With no end date, a dash, read “No end date” by screen readers.
- The ⋯ menu holds the items the screen passes in \`actions\`; it is named for the person, “More actions for Sam”, and \`moreIcon\` takes any Phosphor icon, three dots by default. Without actions there is no ⋯: an anonymous viewer reads the admin area without changing it.
- An anonymous viewer receives pseudonyms for names, no photos and no emails: the row shows the pseudonym’s initial and leaves the email out.
- On tablet the email moves under the name. The admin area works on tablet and desktop; on a phone, the status and end date go under the email too.

The **Phone** and **Tablet** stories in the sidebar show the list at those widths.
`;

const meta = {
  title: "Organisms/Person row",
  component: PersonRow,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
} satisfies Meta<typeof PersonRow>;

export default meta;

/** Every one-person story's args, controls and render: one row, configured in the Controls panel. */
const configurable = {
  args: {
    name: "Sam",
    color: "cobalt",
    photo: "none",
    email: "sam@example.com",
    status: "active",
    accessUntil: "none",
    actions: true,
    moreIcon: "dots-three",
  },
  argTypes: {
    name: { control: { type: "text" } },
    color: { control: { type: "select" }, options: MEMBER_COLORS },
    photo: {
      description:
        "The photo's URL, or `null` for the initial. Picked by name here.",
      control: { type: "inline-radio" },
      options: Object.keys(PHOTOS),
    },
    email: { control: { type: "text" } },
    status: { control: { type: "inline-radio" }, options: STATUSES },
    accessUntil: {
      description:
        "When access ends, as a day or a timestamp, or `null` for no end date. Picked by name here.",
      control: { type: "inline-radio" },
      options: Object.keys(END_DATES),
    },
    actions: {
      description:
        "The ⋯ menu's items. Without them the row has no ⋯. Switched on and off here.",
      control: { type: "boolean" },
    },
    moreIcon: {
      description:
        "The ⋯ button's icon: any Phosphor icon, three dots by default. Picked by name here.",
      control: { type: "select" },
      options: Object.keys(MORE_ICONS),
      if: { arg: "actions" },
    },
  },
  render: (args) => (
    <PersonList>
      <PersonRow {...toProps(args)} />
    </PersonList>
  ),
} satisfies StoryObj<PersonRowArgs>;

type Story = StoryObj<PersonRowArgs>;

/** One person, every prop in the Controls panel. Switch the language in the toolbar to read it in French. */
export const Playground: Story = { ...configurable };

/** Added, their link not opened yet. */
export const WaitingForFirstUse: Story = {
  ...configurable,
  name: "Waiting for first use",
  args: {
    ...configurable.args,
    name: "Lea",
    color: "green",
    email: "lea.martin@example.org",
    status: "waiting",
  },
};

/** Signed in, with an end date: their access stops on that day. */
export const ActiveWithEndDate: Story = {
  ...configurable,
  name: "Active, with an end date",
  args: {
    ...configurable.args,
    name: "Jo",
    color: "amber",
    email: "jo@example.com",
    status: "active",
    accessUntil: "2027-06-30",
  },
};

/** Past its end date. Moving the date brings them back. */
export const Ended: Story = {
  ...configurable,
  args: {
    ...configurable.args,
    name: "Kim",
    color: "lime",
    email: "kim@example.com",
    status: "ended",
    accessUntil: "2026-11-01",
  },
};

/** Revoked by the admin, who can restore it. */
export const Revoked: Story = {
  ...configurable,
  args: {
    ...configurable.args,
    name: "Max",
    color: "violet",
    email: "max@example.com",
    status: "revoked",
  },
};

/** Never opened before its deadline: the admin replaces the link. */
export const LinkExpired: Story = {
  ...configurable,
  name: "Link expired",
  args: {
    ...configurable.args,
    name: "Rui",
    color: "pink",
    email: "rui@example.com",
    status: "expired",
  },
};

/** A list of people with every status, as the admin sees it. */
export const List: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <PersonList>
      {PEOPLE.map((person) => (
        <PersonRow
          key={person.name}
          {...person}
          actions={<Actions status={person.status} />}
        />
      ))}
    </PersonList>
  ),
};

/** The same list as an anonymous viewer reads it: pseudonyms and their initials, no emails, no ⋯. */
export const AnonymousViewer: Story = {
  name: "As an anonymous viewer",
  parameters: { controls: { disable: true } },
  render: () => (
    <PersonList>
      {PEOPLE.map((person, index) => (
        <PersonRow
          key={person.name}
          {...person}
          name={PSEUDONYMS[index] ?? person.name}
          photo={null}
          email={null}
        />
      ))}
    </PersonList>
  ),
};

/** ⋯ opens the menu of the screen’s actions, named for the person. */
export const OpenMenu: Story = {
  ...configurable,
  name: "Opening the menu",
  tags: ["!autodocs"],
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "More actions for Sam",
      }),
    );
    const menu = await page.findByRole("menu");
    await expect(within(menu).getAllByRole("menuitem")).toHaveLength(5);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("menu")).toBeNull());
  },
};

/** The Docs page can’t narrow a story, so the narrower widths live in the sidebar only. */
export const Phone: Story = {
  ...List,
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

export const Tablet: Story = {
  ...List,
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};
