import { CheckIcon } from "@phosphor-icons/react/Check";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../atoms/button/button";
import * as Field from "../field/field";

export type OneTimeSecretProps = {
  /** Names the secret, above it: “Access link”, “Reset key”. */
  label: string;
  /** The secret, shown as it is, read-only. */
  value: string;
  /** Called once the clipboard holds the secret. */
  onCopied?: (() => void) | undefined;
  /** Moves the focus to Copy as it appears, such as when it replaces the form that asked for it. */
  focusCopy?: boolean | undefined;
  /** Classes for the field, such as its margin. */
  className?: string | undefined;
};

/**
 * A secret shown once, such as an access link or a reset key: read-only, in
 * full, with Copy at its end. Copy puts it on the clipboard and says so; when
 * the browser refuses, the text is selected, to copy by hand, and the line
 * under it says so. Focusing it selects it all.
 */
export function OneTimeSecret({
  label,
  value,
  onCopied,
  focusCopy = false,
  className,
}: OneTimeSecretProps) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "refused">("idle");

  useEffect(() => {
    if (focusCopy) button.current?.focus();
  }, [focusCopy]);

  const copied = copy === "copied";
  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopy("copied");
      onCopied?.();
    } catch {
      setCopy("refused");
      input.current?.focus();
      input.current?.select();
    }
  };

  return (
    <Field.Root className={className}>
      <Field.Label>{label}</Field.Label>
      <Field.Control
        ref={input}
        value={value}
        readOnly
        spellCheck={false}
        onFocus={(event) => event.currentTarget.select()}
        className="pe-xs"
        end={
          <Button
            ref={button}
            intent={copied ? "secondary" : "primary"}
            size="s"
            icon={copied ? CheckIcon : CopyIcon}
            onClick={() => void copyValue()}
          >
            {copied ? t("oneTimeSecret.copied") : t("oneTimeSecret.copy")}
          </Button>
        }
      />
      <p aria-live="polite" className="mt-[0.375rem] text-xs text-secondary">
        {copy === "refused" ? t("oneTimeSecret.copyByHand") : null}
        {copied ? t("oneTimeSecret.onClipboard") : null}
      </p>
    </Field.Root>
  );
}
