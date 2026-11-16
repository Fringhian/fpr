import type { Language } from "@fpr/contracts";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CaretUpDownIcon } from "@phosphor-icons/react/CaretUpDown";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/SlidersHorizontal";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import * as Popover from "../popover/popover";
import {
  PeriodControl,
  type PeriodControlProps,
  type PeriodSetting,
} from "./period-control";

/** The icons the phone capsule can end with, by name. */
const ICONS = {
  "caret-down": CaretDownIcon,
  "caret-up-down": CaretUpDownIcon,
  "sliders-horizontal": SlidersHorizontalIcon,
} as const;

/** The stories’ args: the control’s props, its icon picked by name, and whether the units come with their explanation. */
type PeriodControlArgs = Omit<
  PeriodControlProps,
  "icon" | "unitInfo" | "unitNote"
> & {
  icon: keyof typeof ICONS;
  unitHelp: boolean;
};

/** The explanation of € and %, in the toolbar’s language. It is the story’s content, not the control’s. */
const UNIT_HELP = {
  en: {
    title: "€ or %",
    body: "€ counts the money each member earned over the period. % compares their performance.",
  },
  fr: {
    title: "€ ou %",
    body: "En €, on compte l’argent gagné par chacun sur la période. En %, on compare la performance.",
  },
} as const satisfies Record<Language, { title: string; body: string }>;

/** The ⓘ a page puts after the € / % capsules. */
function UnitInfo() {
  const text = UNIT_HELP[useLanguage()];

  return (
    <Popover.Root>
      <Popover.InfoTrigger label={text.title} />
      <Popover.Popup align="end">
        <Popover.Title>{text.title}</Popover.Title>
        <Popover.Description>{text.body}</Popover.Description>
      </Popover.Popup>
    </Popover.Root>
  );
}

/** The same words written out under the sheet’s rows. */
function UnitNote() {
  return (
    <p className="text-s text-secondary">{UNIT_HELP[useLanguage()].body}</p>
  );
}

/**
 * The control on the sky, at the end of the bar like in the page bar. It
 * keeps the setting the way the app shell will, starting from the `value` arg.
 */
function Owner({
  value,
  icon,
  onChange,
  unitHelp,
  ...args
}: PeriodControlArgs) {
  const [setting, setSetting] = useState(value);

  return (
    <div
      className={cn(
        "flex justify-end rounded-l p-m font-sans text-primary",
        args.backdrop === "snow" ? "bg-page" : "bg-sky",
      )}
    >
      <PeriodControl
        {...args}
        value={setting}
        icon={ICONS[icon]}
        unitInfo={unitHelp ? <UnitInfo /> : undefined}
        unitNote={unitHelp ? <UnitNote /> : undefined}
        onChange={(next) => {
          onChange(next);
          setSetting(next);
        }}
      />
    </div>
  );
}

const DESCRIPTION = `
The shared period and € / %: one setting for every page, shown at the right of the page bar, on the sky.

- **Tablet and desktop**: the period capsules (1D, 1W, 1M, 3M, YTD, All), then the € / % capsules.
- **Phone**: one capsule naming both, “This month · %”, which opens a sheet holding the two rows. CSS picks the layout, so both live in the markup and one is hidden.
- **What € and % mean**: \`unitInfo\` sits after the € / % capsules from tablet up, such as an ⓘ; \`unitNote\` sits under the sheet’s rows on phone, the same words written out, since an ⓘ there would open a second overlay.
- **Backdrop**: \`sky\` by default; \`snow\` on a page without a header sentence, where the capsules take a darker fill.
- **Anonymous viewer**: amounts are in % only, so the € / % capsules are hidden, the phone capsule names the period alone (“This month”), and \`onChange\` always sends \`unit: "percent"\`. An option a viewer can’t use is hidden, never disabled.
- **Controlled**: \`value\` (\`{ period, unit }\`, with the API’s names: \`"1M"\`, \`"eur"\` or \`"percent"\`) and \`onChange\`, called with the whole new setting. The app shell keeps it, in \`localStorage\` and the URL.
- **Keyboard**: each row is a capsule segment: Tab reaches it, the arrow keys move between its options, Space or Enter picks one. The sheet keeps focus inside until Escape, the ✕ or a press on the dimmed page closes it.

\`import { PeriodControl } from "…/period-control"\`, with \`PeriodSetting\` beside it. The periods and units are \`periods\` and \`units\` from \`@fpr/contracts/values\`.

The controls change the setting, the anonymous version, the phone capsule’s icon, and the backdrop. The **Phone** stories in the sidebar show the capsule and its sheet.
`;

const meta = {
  title: "Molecules/Period control",
  tags: ["autodocs"],
  parameters: { docs: { description: { component: DESCRIPTION } } },
  args: {
    value: { period: "1M", unit: "percent" },
    anonymous: false,
    icon: "caret-down",
    backdrop: "sky",
    unitHelp: true,
    onChange: fn(),
  },
  argTypes: {
    unitHelp: {
      name: "unitInfo / unitNote",
      description:
        "What € and % mean: `unitInfo`, an ⓘ after the € / % capsules from tablet up, and `unitNote`, the same words under the sheet’s rows on phone, where an ⓘ would open a second overlay. An anonymous viewer gets neither.",
      control: { type: "boolean" },
    },
    value: {
      description:
        "The period and unit shown, held by the owner: `{ period, unit }`. Pair it with `onChange`.",
      control: { type: "object" },
    },
    onChange: {
      description: "Called with the whole new setting.",
      control: false,
    },
    anonymous: {
      description:
        "An anonymous viewer sees amounts in % only: the € / % capsules are hidden, and `onChange` always sends `percent`.",
      control: { type: "boolean" },
    },
    icon: {
      description:
        "The icon at the end of the phone capsule, any Phosphor icon. A caret by default.",
      control: { type: "select" },
      options: Object.keys(ICONS),
    },
    backdrop: {
      description:
        "What the control sits on: `sky` by default, or `snow` on a page without a header sentence.",
      control: { type: "inline-radio" },
      options: ["sky", "snow"],
    },
  },
  // A new `value` from the Controls panel starts the owner again from it.
  render: (args) => <Owner key={JSON.stringify(args.value)} {...args} />,
} satisfies Meta<PeriodControlArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The setting after a change, for the play tests. */
function changed(change: Partial<PeriodSetting>): PeriodSetting {
  return { period: "1M", unit: "percent", ...change };
}

/** Tablet and desktop: the period capsules, then € / %. Picking 3M hands the whole setting to `onChange`. */
export const Desktop: Story = {
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "3M" }));
    await expect(args.onChange).toHaveBeenLastCalledWith(
      changed({ period: "3M" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "1M" }));
  },
};

/** The Docs page can't narrow a story, so the narrower widths live in the sidebar only. */
export const Tablet: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "tablet" } },
};

/** On phone, one capsule naming the period and the unit. */
export const Phone: Story = {
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: /This month · %/ }),
    ).toBeVisible();
    await expect(canvas.queryByRole("group", { name: "Period" })).toBeNull();
  },
};

/** The capsule opens a sheet with both rows. Picking 1W changes the setting and the capsule; the sheet stays open for the unit. */
export const PhoneSheet: Story = {
  name: "Phone, sheet open",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement, args, step }) => {
    const body = within(canvasElement.ownerDocument.body);
    const capsule = within(canvasElement).getByRole("button", {
      name: /This month · %/,
    });
    await userEvent.click(capsule);
    const sheet = await body.findByRole("dialog", { name: "Period" });
    await step("Picking 1W changes the period", async () => {
      await userEvent.click(within(sheet).getByRole("button", { name: "1W" }));
      await expect(args.onChange).toHaveBeenLastCalledWith(
        changed({ period: "1W" }),
      );
      await waitFor(() => expect(capsule).toHaveTextContent("This week · %"));
      await expect(
        within(sheet).getByRole("button", { name: "1W" }),
      ).toHaveAttribute("aria-pressed", "true");
    });
  },
};

/** An anonymous viewer: the period alone, the € / % capsules hidden. Picking a period still sends `percent`, even when the setting asked for euros. */
export const Anonymous: Story = {
  args: { anonymous: true, value: { period: "YTD", unit: "eur" } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("group", { name: "Unit" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "€" })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "1W" }));
    await expect(args.onChange).toHaveBeenLastCalledWith(
      changed({ period: "1W" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "YTD" }));
  },
};

/** The anonymous viewer on phone: the capsule names the period alone, and its sheet holds the period row only. */
export const AnonymousPhone: Story = {
  ...Anonymous,
  name: "Anonymous, phone",
  tags: ["!autodocs"],
  globals: { viewport: { value: "phone" } },
  play: async ({ canvasElement }) => {
    const capsule = within(canvasElement).getByRole("button", {
      name: "This year",
    });
    await userEvent.click(capsule);
    const sheet = await within(canvasElement.ownerDocument.body).findByRole(
      "dialog",
    );
    await expect(
      within(sheet).getByRole("group", { name: "Period" }),
    ).toBeVisible();
    await expect(
      within(sheet).queryByRole("group", { name: "Unit" }),
    ).toBeNull();
  },
};
