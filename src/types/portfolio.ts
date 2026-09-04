export interface HoldingYieldSummary {
  symbol: string;
  description: string;
  accountNumber: string;
  shares: number;
  currentPrice: number;
  costBasisPerShare: number;
  totalCostBasis: number;
  marketValue: number;
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
  totalCostBasis: number;
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
}

export interface AppConfig {
  serverUrl: string;
  apiKey: string;
  autoRefreshIntervalSec: number;
}
