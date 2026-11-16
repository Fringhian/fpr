import { createContext } from "react";

/** What the parts of a menu opened as a sheet share: the trigger's id, which names the sheet, and how to close it. */
export interface Sheet {
  triggerId: string;
  close: () => void;
}

/** The sheet the parts sit in, on phone. Null in a menu that opens as a popup. */
export const SheetContext = createContext<Sheet | null>(null);
