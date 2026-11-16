import type { Language } from "@fpr/contracts";
import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { XIcon } from "@phosphor-icons/react/X";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import { Button } from "../../atoms/button/button";
import * as Dialog from "./dialog";

/** The demo texts, in the toolbar’s language. They are the stories’ content, not the dialog’s. */
const TEXTS = {
  en: {
    open: "Make manual",
    title: "Make Nordic Wind AG manual?",
    description:
      "FPR stops asking the provider for its price. This can’t be undone.",
    confirm: "Make manual",
    manage: "Manage Max’s access",
    accessTitle: "Max’s access",
    accessDescription:
      "Max signs in with his access link. It works until you revoke it.",
    revoke: "Revoke access",
    revokeTitle: "Revoke Max’s access?",
    revokeDescription:
      "Max can’t sign in until you send him a new link. He stays in the race with his data.",
    back: "Back",
    help: "How FPR works",
    helpTitle: "How FPR works",
    sections: [
      [
        "The race",
        "Each line is one member’s gain since the start of the period you picked.",
      ],
      [
        "Periods and € / %",
        "Every page shows the same period, in euros or in percent.",
      ],
      [
        "Today and closes",
        "Today’s value moves until the market closes, then becomes final.",
      ],
      [
        "Recording a change",
        "Record what you bought or sold, with its date, quantity, and price.",
      ],
      ["Cash", "Your cash balance counts in your portfolio’s value."],
      [
        "Manual shares",
        "A share with no price from the provider takes the value members enter.",
      ],
      [
        "Missing prices",
        "Until a share’s price arrives, it isn’t counted, never at €0.",
      ],
      [
        "Splits and dividends",
        "A split changes the quantity, never the value of what you hold.",
      ],
      [
        "Finding a share",
        "Search by name, ticker, or ISIN; a share nobody holds still has its page.",
      ],
      [
        "Members",
        "Every member sees everyone’s portfolio, and the race ranks them all.",
      ],
      [
        "Your access link",
        "It signs you in. Ask the admin for a new one if you lose it.",
      ],
    ],
  },
  fr: {
    open: "Passer en manuel",
    title: "Passer Nordic Wind AG en manuel ?",
    description:
      "FPR cesse de demander son prix au fournisseur. C’est définitif.",
    confirm: "Passer en manuel",
    manage: "Gérer l’accès de Max",
    accessTitle: "Accès de Max",
    accessDescription:
      "Max se connecte avec son lien d’accès. Il fonctionne jusqu’à ce que vous le révoquiez.",
    revoke: "Révoquer l’accès",
    revokeTitle: "Révoquer l’accès de Max ?",
    revokeDescription:
      "Max ne peut plus se connecter tant que vous ne lui envoyez pas un nouveau lien. Il reste dans la course avec ses données.",
    back: "Retour",
    help: "Comment marche FPR",
    helpTitle: "Comment marche FPR",
    sections: [
      [
        "La course",
        "Chaque ligne est le gain d’un membre depuis le début de la période choisie.",
      ],
      [
        "Périodes et € / %",
        "Chaque page montre la même période, en euros ou en pourcentage.",
      ],
      [
        "Aujourd’hui et clôtures",
        "La valeur du jour bouge jusqu’à la clôture du marché, puis devient définitive.",
      ],
      [
        "Enregistrer un mouvement",
        "Enregistrez ce que vous avez acheté ou vendu, avec la date, la quantité et le prix.",
      ],
      [
        "Liquidités",
        "Vos liquidités comptent dans la valeur de votre portefeuille.",
      ],
      [
        "Actions manuelles",
        "Une action sans prix du fournisseur prend la valeur saisie par les membres.",
      ],
      [
        "Prix manquants",
        "Tant que le prix d’une action n’est pas arrivé, elle n’est pas comptée, jamais à 0 €.",
      ],
      [
        "Divisions et dividendes",
        "Une division change la quantité, jamais la valeur de ce que vous détenez.",
      ],
      [
        "Trouver une action",
        "Cherchez par nom, symbole ou ISIN ; une action que personne ne détient a aussi sa page.",
      ],
      [
        "Membres",
        "Chaque membre voit le portefeuille de tous, et la course les classe tous.",
      ],
      [
        "Votre lien d’accès",
        "Il vous connecte. Demandez-en un nouveau à l’admin si vous le perdez.",
      ],
    ],
  },
} as const satisfies Record<
  Language,
  Record<string, string | readonly (readonly [string, string])[]>
>;

/** The icons the close button offers, by name. */
const CLOSE_ICONS = {
  x: XIcon,
  "arrow-left": ArrowLeftIcon,
  "caret-down": CaretDownIcon,
} as const;

/** Which of the dialog’s optional parts the story renders, and the close button’s icon; its content stays the same. */
interface DialogParts {
  close: boolean;
  closeIcon: keyof typeof CLOSE_ICONS;
  description: boolean;
  footer: boolean;
  cancel: boolean;
}

/** The page behind the overlay, with the button that opens it. */
function Page({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "font-sans text-primary",
        "p-m",
        "tablet:p-l",
        "desktop:p-l",
      )}
    >
      {children}
    </div>
  );
}

/** A confirmation, made of the parts the controls switch on. */
function Confirm({
  close,
  closeIcon,
  description,
  footer,
  cancel,
}: DialogParts) {
  const text = TEXTS[useLanguage()];
  const [open, setOpen] = useState(false);

  return (
    <Page>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger render={<Button />}>{text.open}</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Header>
            <Dialog.Title>{text.title}</Dialog.Title>
            {close ? <Dialog.Close icon={CLOSE_ICONS[closeIcon]} /> : null}
          </Dialog.Header>
          {description ? (
            <Dialog.Description>{text.description}</Dialog.Description>
          ) : null}
          {footer ? (
            <Dialog.Footer>
              {cancel ? <Dialog.Cancel /> : null}
              <Button intent="primary" onClick={() => setOpen(false)}>
                {text.confirm}
              </Button>
            </Dialog.Footer>
          ) : null}
        </Dialog.Popup>
      </Dialog.Root>
    </Page>
  );
}

/** Revoking someone’s access: the dialog swaps its content for the confirmation, and Back swaps it back. */
function RevokeAccess() {
  const text = TEXTS[useLanguage()];
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <Page>
      <Dialog.Root
        open={open}
        onOpenChange={setOpen}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) setConfirming(false);
        }}
      >
        <Dialog.Trigger render={<Button />}>{text.manage}</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Header>
            <Dialog.Title>
              {confirming ? text.revokeTitle : text.accessTitle}
            </Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Description>
            {confirming ? text.revokeDescription : text.accessDescription}
          </Dialog.Description>
          <Dialog.Footer>
            {confirming ? (
              <>
                <Button onClick={() => setConfirming(false)}>
                  {text.back}
                </Button>
                <Button intent="danger" onClick={() => setOpen(false)}>
                  {text.revoke}
                </Button>
              </>
            ) : (
              <Button intent="danger" onClick={() => setConfirming(true)}>
                {text.revoke}
              </Button>
            )}
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Root>
    </Page>
  );
}

/** More content than the screen holds: the dialog or sheet scrolls inside. */
function TallContent() {
  const text = TEXTS[useLanguage()];

  return (
    <Page>
      <Dialog.Root>
        <Dialog.Trigger render={<Button />}>{text.help}</Dialog.Trigger>
        <Dialog.Popup>
          <Dialog.Header>
            <Dialog.Title>{text.helpTitle}</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          {text.sections.map(([title, sentence]) => (
            <section key={title} className="grid gap-xs">
              <h3 className="text-m font-semibold">{title}</h3>
              <p className="text-s text-secondary">{sentence}</p>
            </section>
          ))}
        </Dialog.Popup>
      </Dialog.Root>
    </Page>
  );
}

/** Opens the story’s dialog from its trigger and waits for it. */
async function open(canvasElement: HTMLElement): Promise<HTMLElement> {
  const trigger = within(canvasElement).getByRole("button");
  await userEvent.click(trigger);
  return within(canvasElement.ownerDocument.body).findByRole("dialog");
}

const DESCRIPTION = `
One overlay at a time: a dialog in the middle of the page on tablet and desktop, a sheet rising from the bottom on phone. The page behind dims. Built on Base UI’s dialog. Import it as a namespace: \`import * as Dialog from "…/dialog"\`.

| Part | What it is |
| --- | --- |
| \`Dialog.Root\` | Holds the open state: \`open\` and \`onOpenChange\` to control it, \`defaultOpen\` to start open. |
| \`Dialog.Trigger\` | Opens it. \`render={<Button />}\` makes it a button; focus returns to it on close. |
| \`Dialog.Popup\` | The overlay: the dimmed page, then the dialog or the sheet with its grab handle. Everything else goes inside it. |
| \`Dialog.Header\` | The title and the close button, in one row. |
| \`Dialog.Title\` | Names the dialog, as a question when it confirms. |
| \`Dialog.Description\` | One or two sentences: what happens next. |
| \`Dialog.Footer\` | The buttons, the main one last: a row at the bottom right from tablet up, a full-width stack with the main one on top on phone. |
| \`Dialog.Close\` | The close button, named “Close”. \`icon\` takes any Phosphor icon, a cross by default. |
| \`Dialog.Cancel\` | A secondary “Cancel” button that closes without acting. |

- Focus moves into the overlay and stays there until it closes. Escape, the close button, Cancel, or a press on the dimmed page closes it, and focus returns to the button that opened it.
- A dialog never opens another: it changes its own content, as **Changes its content** shows.
- The sheet pads its bottom for the device’s safe area, and scrolls inside when its content is taller than the screen. The dialog does the same from tablet up.
- It rises (sheet) or grows (dialog) into place; with reduced motion, it only fades.

The controls switch each optional part on and off. Every story opens its overlay; the **Phone** and **Tablet** stories in the sidebar show the sheet and the tablet dialog.
`;

const meta = {
  title: "Molecules/Dialog and sheet",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: { component: DESCRIPTION },
      // Each story renders in its own frame, so its overlay covers that frame, not the Docs page.
      story: { inline: false, height: "32rem" },
    },
  },
  args: {
    close: true,
    closeIcon: "x",
    description: true,
    footer: true,
    cancel: true,
  },
  argTypes: {
    close: {
      name: "Dialog.Close",
      description: "Renders the close button at the end of the header.",
      control: { type: "boolean" },
    },
    closeIcon: {
      name: "Dialog.Close icon",
      description:
        "The close button’s `icon`: any Phosphor icon, a cross by default.",
      options: Object.keys(CLOSE_ICONS),
      control: { type: "select" },
      if: { arg: "close" },
    },
    description: {
      name: "Dialog.Description",
      description: "Renders the sentence under the title.",
      control: { type: "boolean" },
    },
    footer: {
      name: "Dialog.Footer",
      description: "Renders the row of buttons.",
      control: { type: "boolean" },
    },
    cancel: {
      name: "Dialog.Cancel",
      description: "Renders the Cancel button before the main one.",
      control: { type: "boolean" },
      if: { arg: "footer" },
    },
  },
  render: (parts) => <Confirm {...parts} />,
  play: async ({ canvasElement, step }) => {
    const trigger = within(canvasElement).getByRole("button");
    await step("Opening moves focus inside", async () => {
      const dialog = await open(canvasElement);
      await waitFor(() =>
        expect(dialog).toContainElement(
          canvasElement.ownerDocument.activeElement as HTMLElement,
        ),
      );
    });
    await step("Escape closes, and focus returns to the opener", async () => {
      await userEvent.keyboard("{Escape}");
      await waitFor(() =>
        expect(
          within(canvasElement.ownerDocument.body).queryByRole("dialog"),
        ).toBeNull(),
      );
      await expect(trigger).toHaveFocus();
    });
    await step("Open again, to show it", async () => {
      await open(canvasElement);
    });
  },
} satisfies Meta<DialogParts>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A confirmation, its parts switched in the Controls panel. From tablet up, a dialog in the middle of the page. */
export const Desktop: Story = { globals: { viewport: { value: "desktop" } } };

/** The Docs page can't narrow a story, so the narrower widths live in the sidebar only. */
export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** On phone, a sheet rising from the bottom, its buttons stacked full width. */
export const Phone: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** Revoke access swaps the dialog’s content for its confirmation, in the same dialog; Back swaps it back. */
export const ChangesItsContent: Story = {
  name: "Changes its content",
  parameters: { controls: { disable: true } },
  render: () => <RevokeAccess />,
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await open(canvasElement);
    await step("The confirmation replaces the content", async () => {
      await userEvent.click(
        within(dialog).getByRole("button", { name: TEXTS.en.revoke }),
      );
      await expect(dialog).toHaveAccessibleName(TEXTS.en.revokeTitle);
      await expect(body.getAllByRole("dialog")).toHaveLength(1);
      await waitFor(() =>
        expect(dialog).toContainElement(
          canvasElement.ownerDocument.activeElement as HTMLElement,
        ),
      );
    });
    await step("Back returns to the first content", async () => {
      await userEvent.click(
        within(dialog).getByRole("button", { name: TEXTS.en.back }),
      );
      await expect(dialog).toHaveAccessibleName(TEXTS.en.accessTitle);
    });
    await step("Show the confirmation", async () => {
      await userEvent.click(
        within(dialog).getByRole("button", { name: TEXTS.en.revoke }),
      );
    });
  },
};

/** The same on phone: the sheet changes its content in place. */
export const ChangesItsContentPhone: Story = {
  ...ChangesItsContent,
  name: "Changes its content, phone",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};

/** More content than the screen holds: the dialog, or the sheet on phone, scrolls inside. */
export const Tall: Story = {
  parameters: { controls: { disable: true } },
  render: () => <TallContent />,
  play: async ({ canvasElement }) => {
    await open(canvasElement);
  },
};

/** The sheet scrolls inside, under the top of the screen, and pads its bottom for the safe area. */
export const TallPhone: Story = {
  ...Tall,
  name: "Tall, phone",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
};
