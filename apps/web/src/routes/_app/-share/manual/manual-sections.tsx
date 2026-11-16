import type { ShareDetail, ShareValue, ShareValueEvent } from "@fpr/contracts";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../../components/atoms/card/card";
import { LoadingPlaceholder } from "../../../../components/atoms/loading-placeholder/loading-placeholder";
import { cn } from "../../../../lib/cn";
import { ValueEvents } from "./value-events";
import { ValueList } from "./value-list";

/** A titled card that holds its place while its list loads. */
function ListCard({
  title,
  loading,
  children,
}: {
  title: string;
  loading: boolean;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <Card
      render={<section aria-labelledby={titleId} />}
      className={cn(
        "grid content-start gap-s",
        "p-m",
        "tablet:p-l",
        "desktop:p-l",
      )}
    >
      <h2 id={titleId} className="text-m font-semibold text-primary">
        {title}
      </h2>
      {loading ? <LoadingPlaceholder className="h-[8rem]" /> : children}
    </Card>
  );
}

/**
 * A manual share's values, each with ⋯ to edit or delete it for a viewer who
 * may, beside the history of their edits: side by side on desktop, one under
 * the other below it.
 */
export function ManualSections({
  share,
  values,
  events,
  writer,
}: {
  share: ShareDetail;
  /** Newest first, or `undefined` while they load. */
  values: readonly ShareValue[] | undefined;
  /** Newest first, or `undefined` while they load. */
  events: readonly ShareValueEvent[] | undefined;
  writer: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "grid gap-m",
        "grid-cols-1",
        "tablet:grid-cols-1",
        "desktop:grid-cols-2",
      )}
    >
      <ListCard title={t("sharePage.values.title")} loading={!values}>
        {values ? (
          <ValueList shareId={share.id} values={values} writer={writer} />
        ) : null}
      </ListCard>
      <ListCard title={t("sharePage.events.title")} loading={!events}>
        {events ? <ValueEvents events={events} /> : null}
      </ListCard>
    </div>
  );
}
