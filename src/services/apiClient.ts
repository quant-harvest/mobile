import { PortfolioYieldSummary, HoldingYieldSummary, SchwabAccountOption } from '../types/portfolio';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
}

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.apiKey && this.apiKey.trim().length > 0) {
      headers['X-API-Key'] = this.apiKey.trim();
      headers['Authorization'] = `Bearer ${this.apiKey.trim()}`;
    }
    return headers;
  }

  async fetchPortfolioYieldSummary(accountFilter?: string): Promise<PortfolioYieldSummary> {
    let url = `${this.baseUrl}/api/dividends/summary`;
    if (accountFilter && accountFilter !== 'ALL') {
      url += `?account=${encodeURIComponent(accountFilter)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const raw = await response.json();

      // Normalize fields to ensure compatibility
      const holdings: HoldingYieldSummary[] = (raw.holdings || []).map((h: any) => ({
        symbol: h.symbol || '',
        description: h.description || '',
        accountNumber: h.accountNumber || '',
        shares: Number(h.shares) || 0,
        currentPrice: Number(h.currentPrice) || 0,
        costBasisPerShare: Number(h.costBasisPerShare) || 0,
        totalCostBasis: Number(h.totalCostBasis) || 0,
        marketValue: Number(h.marketValue) || 0,
        unrealizedPnL: Number(h.unrealizedPnL) || 0,
        unrealizedPnLPct: Number(h.unrealizedPnLPct) || 0,
        totalDividends: Number(h.totalDividends) || 0,
        dividendCount: Number(h.dividendCount) || 0,
        optionPremiumHarvested: Number(h.optionPremiumHarvested) || 0,
        totalIncome: Number(h.totalIncome) || 0,
        effectiveCostBasisPerShare: Number(h.effectiveCostBasisPerShare) || 0,
        yieldOnCost: Number(h.yieldOnCostPct ?? h.yieldOnCost ?? 0),
        netTotalReturn: Number(h.netTotalReturnDollar ?? h.netTotalReturn ?? 0),
        netTotalReturnPct: Number(h.netTotalReturnPct) || 0,
      }));

      const totalCostBasis = Number(raw.totalCostBasis) || 0;
      const totalMarketValue = Number(raw.totalMarketValue) || 0;
      const totalUnrealizedPnL = Number(raw.unrealizedPricePnL ?? raw.totalUnrealizedPnL ?? 0);
      const totalUnrealizedPnLPct = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;
      const totalDividends = Number(raw.totalDividendsCollected ?? raw.totalDividends ?? 0);
      const totalOptionPremium = Number(raw.totalOptionPremiumCollected ?? raw.totalOptionPremium ?? 0);
      const totalIncome = Number(raw.totalIncomeCollected ?? raw.totalIncome ?? 0);
      const portfolioYieldOnCost = Number(raw.aggregateYieldOnCostPct ?? raw.portfolioYieldOnCost ?? 0);
      const netTotalReturn = Number(raw.netTotalReturnDollar ?? raw.netTotalReturn ?? 0);
      const netTotalReturnPct = Number(raw.netTotalReturnPct) || 0;

      return {
        totalMarketValue,
        totalCostBasis,
        totalUnrealizedPnL,
        totalUnrealizedPnLPct,
        totalDividends,
        totalOptionPremium,
        totalIncome,
        portfolioYieldOnCost,
        netTotalReturn,
        netTotalReturnPct,
        holdings,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async fetchAccounts(): Promise<SchwabAccountOption[]> {
    const url = `${this.baseUrl}/api/schwab/accounts`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        return [];
      }

      const accounts: Array<{ accountNumber: string; hashValue: string }> = await response.json();
      return accounts;
    } catch {
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
