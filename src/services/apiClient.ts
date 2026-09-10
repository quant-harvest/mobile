import { PortfolioYieldSummary, HoldingYieldSummary, SchwabAccountOption } from '../types/portfolio';
import { StagedReentryOrder } from '../types/orders';

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
      const totalLiquidationValue = Number(raw.totalLiquidationValue) || 0;
      const totalCash = Number(raw.totalCash) || 0;
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
        totalLiquidationValue,
        totalCash,
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
    const url = `${this.baseUrl}/api/schwab/accounts/all`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      if (response.ok) {
        const raw = await response.json();
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((a: any) => ({
            accountNumber: a.accountNumber || '',
            hashValue: a.hashValue || a.accountNumber || '',
            nickName: a.nickName || undefined,
            liquidationValue: Number(a.balances?.liquidationValue) || 0,
          }));
        }
      }

      // Fallback to basic accounts endpoint
      const fallbackUrl = `${this.baseUrl}/api/schwab/accounts`;
      const fallbackResp = await fetch(fallbackUrl, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (fallbackResp.ok) {
        const fallbackList: Array<{ accountNumber: string; hashValue: string }> = await fallbackResp.json();
        return Array.isArray(fallbackList) ? fallbackList : [];
      }
      return [];
    } catch {
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async fetchStagedReentries(): Promise<StagedReentryOrder[]> {
    const url = `${this.baseUrl}/api/reentry/staged`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        return [];
      }

      const list: StagedReentryOrder[] = await response.json();
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async executeStagedReentry(order: StagedReentryOrder): Promise<{ success: boolean; message?: string }> {
    const url = `${this.baseUrl}/api/reentry/execute`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          id: order.id,
          accountNumber: order.accountNumber,
          symbol: order.symbol,
          instruction: order.instruction,
          quantity: order.quantity,
          stopPrice: order.suggestedStop,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      return { success: response.ok && Boolean(data?.success), message: data?.message || data?.error };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Execution request failed' };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async dismissStagedReentry(id: string): Promise<{ success: boolean }> {
    const url = `${this.baseUrl}/api/reentry/dismiss?id=${encodeURIComponent(id)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      const data = await response.json();
      return { success: response.ok && Boolean(data?.success) };
    } catch {
      return { success: false };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

