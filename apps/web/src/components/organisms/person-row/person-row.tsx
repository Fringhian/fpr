// The person row's parts, imported as a namespace: `import * as PersonRow from "…/person-row"`.
import type { IsoDate, Timestamp } from "@fpr/contracts";
import type { ComponentProps, ReactNode } from "react";
import type { MemberColor } from "../../../lib/member-color";
import type { IconProps } from "../../foundations/icon/icon";
import {
  Access,
  type AccessStatus,
  Actions,
  Name,
  Picture,
  Root,
} from "./person-row-parts";

export {
  Access,
  type AccessStatus,
  Actions,
  List,
  Name,
  Picture,
  Root,
} from "./person-row-parts";

export type BasicProps = {
  /** The person's display name, or the pseudonym an anonymous viewer sees in its place. */
  name: string;
  /** The person's colour: their picture sits on its pastel. */
  color: MemberColor;
  /** The photo's URL, or `null` for the initial. An anonymous viewer always receives `null`. */
  photo?: string | null | undefined;
  /** The sign-in email, or `null`: an anonymous viewer has none, and an anonymous viewer reading the list sees none. */
  email: string | null;
  /** Where the person's access stands, named by its badge. */
  status: AccessStatus;
  /** When access ends, as a day or a timestamp, or `null` for no end date. */
  accessUntil: IsoDate | Timestamp | null;
  /** The ⋯ menu's items, as `Menu.Item`s and a `Menu.Separator`. Without them the row has no ⋯, as for an anonymous viewer, who reads the admin area without changing it. */
  actions?: ReactNode;
  /** The ⋯ button's icon, any Phosphor icon. Three dots by default. */
  actionsIcon?: IconProps["icon"] | undefined;
} & Omit<
  ComponentProps<"li">,
  | "name"
  | "color"
  | "photo"
  | "email"
  | "status"
  | "accessUntil"
  | "actions"
  | "actionsIcon"
  | "children"
>;

/**
 * A person in the admin area: picture, name, email, access status, end date,
 * and the ⋯ menu of what the admin can do. It goes in a `List`. On tablet
 * the email moves under the name; on phone the status and end date go under
 * it too.
 */
export function Basic({
  name,
  color,
  photo,
  email,
  status,
  accessUntil,
  actions,
  actionsIcon,
  ...props
}: BasicProps) {
  return (
    <Root {...props}>
      <Picture name={name} color={color} photo={photo ?? null} />
      <Name name={name} email={email} />
      <Access status={status} accessUntil={accessUntil} />
      {actions === undefined ? null : (
        <Actions subject={name} icon={actionsIcon}>
          {actions}
        </Actions>
      )}
    </Root>
  );
}
