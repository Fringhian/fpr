import type { Meta, StoryObj } from "@storybook/react-vite";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/cn";
import {
  formatDate,
  formatGain,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatTime,
} from "../lib/format";
import { useLanguage } from "../lib/i18n";
import { quote } from "../lib/typography";
import { Specimen } from "./specimen";

// Invented values, read in UTC so every reader sees the same times.
const TIME_ZONE = "UTC";
const DAY = "2026-03-05";
const PRICED_AT = "2026-03-05T14:30:00Z";

function Formatting() {
  const { t } = useTranslation();
  const language = useLanguage();
  const time = formatTime(PRICED_AT, language, { timeZone: TIME_ZONE });

  const rows = [
    {
      label: t("foundations.formatting.money"),
      input: "1234.56",
      output: formatMoney("1234.56", language),
    },
    {
      label: t("foundations.formatting.balance"),
      input: "12374.40",
      output: formatMoney("12374.40", language, { precision: "euros" }),
    },
    {
      label: t("foundations.formatting.gain"),
      input: "{ eur: 512.40, percent: 4.2 }",
      output: formatGain({ eur: "512.40", percent: "4.2" }, language, {
        precision: "euros",
      }),
      tone: "text-positive",
    },
    {
      label: t("foundations.formatting.loss"),
      input: "-1.25",
      output: formatPercent("-1.25", language, { signed: true }),
      tone: "text-negative",
    },
    {
      label: t("foundations.formatting.weight"),
      input: "16.2",
      output: formatPercent("16.2", language),
    },
    {
      label: t("foundations.formatting.quantity"),
      input: "74.328 · 10 · 1.50",
      output: ["74.328", "10", "1.50"]
        .map((quantity) => formatQuantity(quantity, language))
        .join(" · "),
    },
    {
      label: t("foundations.formatting.date"),
      input: DAY,
      output: formatDate(DAY, language),
    },
    {
      label: t("foundations.formatting.dateLong"),
      input: DAY,
      output: formatDate(DAY, language, { style: "long", year: true }),
    },
    {
      label: t("foundations.formatting.dateWeekday"),
      input: DAY,
      output: t("foundations.formatting.closeOf", {
        date: formatDate(DAY, language, { style: "weekday" }),
      }),
    },
    {
      label: t("foundations.formatting.time"),
      input: PRICED_AT,
      output: t("foundations.formatting.asOf", { time }),
    },
    {
      label: t("foundations.formatting.quote"),
      input: "World Index ETF",
      output: quote("World Index ETF", language),
    },
    {
      label: t("foundations.formatting.sentence"),
      input: "1500",
      output: t("foundations.formatting.question", {
        quantity: formatQuantity("1500", language),
      }),
    },
  ];

  return (
    <Specimen
      title={t("foundations.formatting.title")}
      lead={t("foundations.formatting.lead")}
    >
      <ul className="grid max-w-[48rem] gap-s rounded-l bg-surface p-m shadow-outline">
        {rows.map(({ label, input, output, tone }) => (
          <li key={label} className="grid grid-cols-[1fr_auto] gap-xs">
            <span className="text-s text-secondary">{label}</span>
            <span className={cn("text-m font-semibold tabular-nums", tone)}>
              {output}
            </span>
            <code className="col-span-2 text-xs text-secondary">
              {t("foundations.formatting.input", { value: input })}
            </code>
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

const meta = {
  title: "Foundations/Formatting",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** In the toolbar's language. */
export const Values: Story = { render: () => <Formatting /> };

/** Always in French, so its tests check the French typography too. */
export const French: Story = {
  render: () => <Formatting />,
  globals: { locale: "fr" },
};
