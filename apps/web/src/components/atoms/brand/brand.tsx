import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";

const letterColours = ["text-cobalt", "text-vermilion", "text-green"];

/** FPR's name, as its wordmark: F, P and R in Rubik Black, at the top of the sidebar, and above the steps before sign-in. */
export function Brand({ className, ...props }: ComponentProps<"p">) {
  const { t } = useTranslation();

  const letters = Array.from(t("brand"));

  return (
    <p
      {...props}
      className={cn("font-[family-name:Rubik] text-l font-black", className)}
    >
      {letterColours.map((colour, index) => (
        <span key={colour} className={colour}>
          {letters[index]}
        </span>
      ))}
    </p>
  );
}
