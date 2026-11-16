import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";

/** FPR's name, as its wordmark: at the top of the sidebar, and above the steps before sign-in. */
export function Brand({ className, ...props }: ComponentProps<"p">) {
  const { t } = useTranslation();

  return (
    <p
      {...props}
      className={cn("text-m font-semibold tracking-[0.08em]", className)}
    >
      {t("brand")}
    </p>
  );
}
