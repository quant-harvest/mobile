export interface HoldingYieldSummary {
  symbol: string;
  description: string;
  accountNumber: string;
  shares: number;
  currentPrice: number;
  costBasisPerShare: number;
  totalCostBasis: number;
  marketValue: number;
  dayPnL?: number;
  dayPnLPct?: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  totalDividends: number;
  dividendCount: number;
  optionPremiumHarvested: number;
  totalIncome: number;
  effectiveCostBasisPerShare: number;
  yieldOnCost: number;
  netTotalReturn: number;
  netTotalReturnPct: number;
}

export interface PortfolioYieldSummary {
  totalMarketValue: number;
  totalLiquidationValue?: number;
  totalCash?: number;
  totalCostBasis: number;
  totalDayPnL?: number;
  totalDayPnLPct?: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPct: number;
  totalDividends: number;
  totalOptionPremium: number;
  totalIncome: number;
  portfolioYieldOnCost: number;
  netTotalReturn: number;
  netTotalReturnPct: number;
  holdings: HoldingYieldSummary[];
}

export interface SchwabAccountOption {
  accountNumber: string;
  hashValue: string;
  nickName?: string;
  liquidationValue?: number;
}

export interface AppConfig {
  serverUrl: string;
  apiKey: string;
  autoRefreshIntervalSec: number;
}

export interface MacroItem {
  symbol: string;
  label: string;
  category: string;
  lastPrice: number;
  changePct: number;
  changeDollar: number;
}

export interface MacroRibbon {
  items: MacroItem[];
  timestamp: number;
}

