import type { Language } from "@fpr/contracts";
import { useState } from "react";
import { formatMoney } from "../../../lib/format/money";
import { formatQuantity } from "../../../lib/format/number";
import { useLanguage } from "../../../lib/i18n";
import { Card } from "../../atoms/card/card";
import { TextLink } from "../../atoms/text-link/text-link";
import * as Field from "../../molecules/field/field";
import { LanguageSwitch } from "../../molecules/language-switch/language-switch";
import { HOLDINGS, LABELS } from "./step-flow-story-labels";

/** The stories' demo content in the toolbar's language. */
export function useLabels() {
  return LABELS[useLanguage()];
}

const row = "flex items-baseline justify-between gap-m py-s";

/** Record a change, step 4: the quantity bought. */
export function QuantityField() {
  const { record } = useLabels();

  return (
    <Field.Root>
      <Field.Label>{record.field}</Field.Label>
      <Field.Control decimal defaultValue="10" />
      <Field.Description>{record.help}</Field.Description>
    </Field.Root>
  );
}

/** The sky panel of Record a change: the change so far. */
export function ChangeSummary() {
  const { record } = useLabels();

  return (
    <Card elevation="rest" className="w-full max-w-[26.25rem] p-m">
      <h2 className="text-s font-medium text-secondary">{record.summary}</h2>
      <dl className="divide-y divide-divider">
        {record.rows.map(([term, value]) => (
          <div key={term} className={row}>
            <dt className="text-s text-secondary">{term}</dt>
            <dd className="text-m font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** The language switch at the right of the header, before sign-in. */
export function HeaderLanguageSwitch() {
  const [language, setLanguage] = useState<Language>("en");

  return (
    <LanguageSwitch
      value={language}
      onValueChange={setLanguage}
      className="ms-auto"
    />
  );
}

/** Sign-in's fields and the way to a reset. */
export function SignInFields() {
  const { signIn } = useLabels();

  return (
    <>
      <Field.Root>
        <Field.Label>{signIn.email}</Field.Label>
        <Field.Control type="email" autoComplete="email" />
      </Field.Root>
      <Field.Root>
        <Field.Label>{signIn.password}</Field.Label>
        <Field.Password autoComplete="current-password" />
      </Field.Root>
      <p className="text-s text-secondary">
        {signIn.forgot} <TextLink href="#reset">{signIn.reset}</TextLink>.
      </p>
    </>
  );
}

/** Sign-in's sky panel: what FPR is about, before anyone signs in. */
export function SignInPanel() {
  const { signIn } = useLabels();

  return (
    <>
      <p className="text-s text-on-sky">{signIn.panelCaption}</p>
      <p className="text-center text-xl font-semibold text-balance">
        {signIn.panelTitle}
      </p>
    </>
  );
}

/** Onboarding, step 3: the prepared portfolio, long enough to scroll. */
export function PortfolioList() {
  const language = useLanguage();
  const { portfolio } = LABELS[language];

  return (
    <Card render={<ul />} className="divide-y divide-divider px-m">
      {HOLDINGS.map(([name, units, value]) => (
        <li key={name} className={row}>
          <span className="min-w-0">
            <span className="block truncate text-m font-semibold">{name}</span>
            <span className="text-s text-secondary">
              {formatQuantity(units, language)} {portfolio.units}
            </span>
          </span>
          <span className="text-s tabular-nums">
            {formatMoney(value, language)}
          </span>
        </li>
      ))}
      <li className={row}>
        <span className="text-m font-semibold">{portfolio.cash}</span>
        <span className="text-s tabular-nums">
          {formatMoney("2000", language)}
        </span>
      </li>
    </Card>
  );
}

/** A sky panel holding one figure under its caption. */
export function PanelFigure({ caption }: { caption: string }) {
  const language = useLanguage();

  return (
    <Card elevation="rest" className="grid w-full max-w-[26.25rem] gap-xs p-m">
      <p className="text-s text-secondary">{caption}</p>
      <p className="text-xl font-semibold tabular-nums">
        {formatMoney("14374.95", language)}
      </p>
    </Card>
  );
}

/** The changes saved in this session, each with Undo. */
export function SessionList() {
  const { saved } = useLabels();

  return (
    <section className="grid gap-s">
      <h2 className="text-s font-medium text-secondary">{saved.session}</h2>
      <Card render={<ul />} className="divide-y divide-divider px-m">
        {saved.changes.map((change) => (
          <li key={change} className={row}>
            <span className="text-s">{change}</span>
            <TextLink
              render={<button type="button" />}
              className="cursor-pointer text-s"
            >
              {saved.undo}
            </TextLink>
          </li>
        ))}
      </Card>
    </section>
  );
}
