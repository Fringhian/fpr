import type { ColumnType, Selectable } from "kysely";

/** A column of a view: read, never written. */
type ViewColumn<T> = ColumnType<T, never, never>;

/**
 * The view `current_positions`: each person's holding of each share, summed
 * from their changes, for the holdings above zero only.
 */
export interface CurrentPositionView {
  userId: ViewColumn<string>;
  shareId: ViewColumn<string>;
  /** A decimal string above zero. */
  quantity: ViewColumn<string>;
}

export type CurrentPosition = Selectable<CurrentPositionView>;
