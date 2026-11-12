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
import { getPortfolio, getPortfolioHoldingAt } from "./holdings.js";
import { getPortfolioLog } from "./log.js";

export type * from "./balance-history.js";
export type * from "./cash.js";
export type * from "./changes.js";
export type * from "./holdings.js";
export type * from "./log.js";

/** A member's holdings, share changes, cash balances, and log. */
export const portfolioContract = {
  get: getPortfolio,
  holdingAt: getPortfolioHoldingAt,
  log: getPortfolioLog,
  addChange: addPortfolioChange,
  updateChange: updatePortfolioChange,
  deleteChange: deletePortfolioChange,
  setCash: setPortfolioCash,
  updateCash: updatePortfolioCash,
  deleteCash: deletePortfolioCash,
  balanceHistory: getPortfolioBalanceHistory,
};
