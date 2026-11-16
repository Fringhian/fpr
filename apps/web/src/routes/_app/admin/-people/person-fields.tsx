import type { Role } from "@fpr/contracts";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import * as Segment from "../../../../components/atoms/segment/segment";
import * as Field from "../../../../components/molecules/field/field";
import { today } from "../../../../lib/date-field";

/** The roles a person moves between: nobody becomes or stops being anonymous. */
const CHANGEABLE_ROLES = [
  "admin",
  "member",
  "guest",
] as const satisfies readonly Role[];

/**
 * The day access ends, named `accessUntil`, empty for no end. A day before
 * today is refused, unless it is the one the person already has. `reason`,
 * when set, disables the field and says why under it.
 */
export function EndDateField({
  defaultValue = "",
  reason,
}: {
  defaultValue?: string | undefined;
  reason?: string | undefined;
}) {
  const { t } = useTranslation();

  const validate = (value: unknown) =>
    typeof value === "string" &&
    value !== "" &&
    value !== defaultValue &&
    value < today()
      ? t("adminPeople.fields.endDatePast")
      : null;

  return (
    <Field.Root
      name="accessUntil"
      validate={validate}
      disabled={reason !== undefined}
    >
      <Field.Label>{t("adminPeople.fields.endDate")}</Field.Label>
      <Field.Control type="date" defaultValue={defaultValue} />
      <Field.Description>
        {reason ?? t("adminPeople.fields.endDateHelp")}
      </Field.Description>
      <Field.Error />
    </Field.Root>
  );
}

/**
 * The role, as a segment of admin, member and guest. `guestReason` disables
 * guest and says why; `reason` disables every role and says why.
 */
export function RoleField({
  value,
  onValueChange,
  reason,
  guestReason,
}: {
  value: Role;
  onValueChange: (role: Role) => void;
  reason?: string | undefined;
  guestReason?: string | undefined;
}) {
  const { t } = useTranslation();
  const labelId = useId();
  const helpId = useId();

  const help = reason ?? guestReason;

  return (
    <div className="flex flex-col">
      <Field.GroupLabel id={labelId}>
        {t("adminPeople.fields.role")}
      </Field.GroupLabel>
      <Segment.Root<Role>
        aria-labelledby={labelId}
        aria-describedby={help === undefined ? undefined : helpId}
        backdrop="snow"
        value={value}
        onValueChange={onValueChange}
        disabled={reason !== undefined}
        className="self-start"
      >
        {CHANGEABLE_ROLES.map((role) => (
          <Segment.Item
            key={role}
            value={role}
            disabled={role === "guest" && guestReason !== undefined}
          >
            {t(`adminPeople.roles.${role}`)}
          </Segment.Item>
        ))}
      </Segment.Root>
      {help === undefined ? null : (
        <p id={helpId} className="mt-[0.375rem] text-xs text-secondary">
          {help}
        </p>
      )}
    </div>
  );
}
