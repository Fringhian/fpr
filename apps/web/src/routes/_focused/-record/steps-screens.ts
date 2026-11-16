import type { ComponentType } from "react";
import type { RecordStep } from "../../../lib/record-search";
import { AmountStep } from "./amount-step";
import { ReviewStep } from "./review-step";
import { SavedStep } from "./saved-step";
import { ShareStep } from "./share-step";
import { WhatStep } from "./what-step";
import { WhenStep } from "./when-step";

/** The screen of each step. */
export const STEPS = {
  what: WhatStep,
  share: ShareStep,
  when: WhenStep,
  amount: AmountStep,
  review: ReviewStep,
  saved: SavedStep,
} as const satisfies Record<RecordStep, ComponentType>;
