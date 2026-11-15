/** The spans a gain is measured over, as `periods` in `@fpr/contracts`. */
export const PERIODS = ["1D", "1W", "1M", "3M", "YTD", "all"] as const;

/** The span a gain is measured over, as `Period` in `@fpr/contracts`. */
export type Period = (typeof PERIODS)[number];
