import { getPortfolioBalanceHistory } from "./balance-history.js";
import {
  deletePortfolioCash,
  setPortfolioCash,
  updatePortfolioCash,
} from "./cash.js";
import {
  addPortfolioChange,
  deletePortfolioChange,
  updatePortfolioChange,
} from "./changes.js";
import { getPortfolio } from "./holdings.js";
import { getPortfolioLog } from "./log.js";

export {
  getPortfolioBalanceHistory,
  type PortfolioBalanceHistory,
  type PortfolioBalancePoint,
  portfolioBalanceHistorySchema,
  portfolioBalancePointSchema,
} from "./balance-history.js";
export {
  deletePortfolioCash,
  type PortfolioCashBalance,
  portfolioCashAmountSchema,
  portfolioCashBalanceSchema,
  setPortfolioCash,
  updatePortfolioCash,
} from "./cash.js";
export {
  addPortfolioChange,
  deletePortfolioChange,
  type PortfolioChange,
  type PortfolioHoldingBelowZeroDetails,
  portfolioChangeSchema,
  portfolioHoldingBelowZeroDetailsSchema,
  portfolioQuantityDeltaSchema,
  updatePortfolioChange,
} from "./changes.js";
export {
  getPortfolio,
  type Portfolio,
  type PortfolioGain,
  type PortfolioHolding,
  portfolioGainSchema,
  portfolioHoldingSchema,
  portfolioSchema,
} from "./holdings.js";
export {
  getPortfolioLog,
  type PortfolioLog,
  type PortfolioLogEntry,
  portfolioLogEntrySchema,
  portfolioLogSchema,
} from "./log.js";

/** A member's holdings, share changes, cash balances, and log. */
export const portfolioContract = {
  get: getPortfolio,
  log: getPortfolioLog,
  addChange: addPortfolioChange,
  updateChange: updatePortfolioChange,
  deleteChange: deletePortfolioChange,
  setCash: setPortfolioCash,
  updateCash: updatePortfolioCash,
  deleteCash: deletePortfolioCash,
  balanceHistory: getPortfolioBalanceHistory,
};
