import type { Id, ShareValue } from "@fpr/contracts";
import { TagIcon } from "@phosphor-icons/react/Tag";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import * as ConfirmDialog from "../../../../components/molecules/confirm-dialog/confirm-dialog";
import * as Menu from "../../../../components/molecules/menu/menu";
import * as TimelineRow from "../../../../components/molecules/timeline-row/timeline-row";
import { formatDate, formatTime } from "../../../../lib/format/date";
import { formatMoney } from "../../../../lib/format/money";
import { useLanguage } from "../../../../lib/i18n";
import { lookOf } from "../../../../lib/look";
import { inThisYear, raceTimeZone } from "../../../../lib/race-day";
import { type ChangedValue, useDeleteValue } from "./use-delete-value";

/** “€40.10, 3 Mar”: a value as the toasts and the ⋯ button name it. */
function useSubject() {
  const { t } = useTranslation();
  const language = useLanguage();

  return (value: ShareValue) =>
    t("timelineRow.subject", {
      title: formatMoney(value.priceEur, language),
      date: formatDate(value.at, language, { timeZone: raceTimeZone() }),
    });
}

/** Its ⋯ items: Edit opens the value's page; Delete deletes it, or says why the only value can't be. */
function ValueActions({
  shareId,
  value,
  only,
  onDelete,
}: {
  shareId: Id;
  value: ShareValue;
  only: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      <Menu.LinkItem
        render={
          <Link
            to="/shares/$shareId/value"
            params={{ shareId }}
            search={{ at: value.at }}
          />
        }
      >
        {t("entryActions.edit")}
      </Menu.LinkItem>
      <Menu.Separator />
      <Menu.Item intent="danger" disabled={only} onClick={onDelete}>
        <span className="grid">
          {t("entryActions.delete")}
          {only ? (
            <span className="text-xs text-secondary">
              {t("valueActions.keepOne")}
            </span>
          ) : null}
        </span>
      </Menu.Item>
    </>
  );
}

/** One value: its day, the price, its time and who entered it, then its ⋯ when the viewer may change it. */
function ValueRow({
  value,
  actions,
}: {
  value: ShareValue;
  actions: ReactNode;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const subject = useSubject();

  const timeZone = raceTimeZone();
  const price = formatMoney(value.priceEur, language);
  const by = value.enteredBy && lookOf(value.enteredBy).name;
  const time = formatTime(value.at, language, { timeZone });

  return (
    <TimelineRow.Root>
      <TimelineRow.Day
        date={value.at}
        timeZone={timeZone}
        year={!inThisYear(value.at)}
      />
      <TimelineRow.Marker icon={TagIcon} />
      <TimelineRow.Text>
        <TimelineRow.Title className="tabular-nums">{price}</TimelineRow.Title>
        <TimelineRow.Detail>
          {by ? `${time} · ${t("timelineRow.madeBy", { name: by })}` : time}
        </TimelineRow.Detail>
      </TimelineRow.Text>
      {actions ? (
        <TimelineRow.Actions subject={subject(value)}>
          {actions}
        </TimelineRow.Actions>
      ) : (
        <span />
      )}
    </TimelineRow.Root>
  );
}

/** Asks before deleting a value someone changed in the meantime, showing its new price. */
function ChangedConfirm({
  changed,
  onConfirm,
  onDismiss,
}: {
  changed: ChangedValue | null;
  onConfirm: () => unknown;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  const price = changed ? formatMoney(changed.priceEur, language) : "";
  return (
    <ConfirmDialog.Basic
      open={changed !== null}
      onOpenChange={(open) => (open ? undefined : onDismiss())}
      title={t("valueActions.changed.title")}
      description={t("valueActions.changed.description", { price })}
      confirmLabel={t("valueActions.changed.confirm", { price })}
      cancelLabel={t("valueActions.changed.keep")}
      onConfirm={onConfirm}
    />
  );
}

/**
 * A manual share's values, newest first: each one's day, price, time and who
 * entered it. A viewer who may change them has ⋯ on each, to edit it or
 * delete it; the only value left can't be deleted.
 */
export function ValueList({
  shareId,
  values,
  writer,
}: {
  shareId: Id;
  values: readonly ShareValue[];
  writer: boolean;
}) {
  const deletion = useDeleteValue(shareId, useSubject());

  return (
    <>
      <TimelineRow.List>
        {values.map((value) => (
          <ValueRow
            key={value.at}
            value={value}
            actions={
              writer ? (
                <ValueActions
                  shareId={shareId}
                  value={value}
                  only={values.length === 1}
                  onDelete={() => void deletion.remove(value)}
                />
              ) : null
            }
          />
        ))}
      </TimelineRow.List>
      <ChangedConfirm
        changed={deletion.changed}
        onConfirm={deletion.confirm}
        onDismiss={deletion.dismiss}
      />
    </>
  );
}
