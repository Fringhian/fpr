import type { Id } from "@fpr/contracts";
import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

/**
 * The router's link to a member's page in edit mode, where the admin records
 * their portfolio. Every other prop goes to the `<a>`, so a menu item or a
 * text link renders it.
 */
export function EditPortfolioLink({
  userId,
  ...props
}: { userId: Id } & Omit<ComponentProps<"a">, "href" | "target">) {
  return (
    <Link
      {...props}
      to="/members/$userId"
      params={{ userId }}
      // The member's page opens in edit mode with `edit`.
      search={(previous) => ({ ...previous, edit: 1 })}
    />
  );
}
