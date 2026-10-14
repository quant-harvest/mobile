import { PortfolioYieldSummary, HoldingYieldSummary, SchwabAccountOption, MacroRibbon } from '../types/portfolio';
import { StagedReentryOrder, UserUpdatesPayload } from '../types/orders';

const DEFAULT_API_KEY = 'qh_sec_9e2b7a4f6d1c8e3a5b0f4d7e2a9c1b8f';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
}

export class ApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey && config.apiKey.trim().length > 0 ? config.apiKey.trim() : DEFAULT_API_KEY;
  }

  public getWebSocketUrl(): string {
    const wsBase = this.baseUrl.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    const key = (this.apiKey && this.apiKey.trim().length > 0) ? this.apiKey.trim() : DEFAULT_API_KEY;
    const authQ = `?key=${encodeURIComponent(key)}`;
    return `${wsBase}/ws/cockpit${authQ}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    const key = (this.apiKey && this.apiKey.trim().length > 0) ? this.apiKey.trim() : DEFAULT_API_KEY;
    headers['X-API-Key'] = key;
    headers['Authorization'] = `Bearer ${key}`;
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
      const [response, accountsResp] = await Promise.all([
        fetch(url, {
          method: 'GET',
          headers: this.getHeaders(),
          signal: controller.signal,
        }),
        fetch(`${this.baseUrl}/api/schwab/accounts/all`, {
          method: 'GET',
          headers: this.getHeaders(),
          signal: controller.signal,
        }).catch(() => null),
      ]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const raw = await response.json();
      let rawAccounts: any[] = [];
      if (accountsResp && accountsResp.ok) {
        const parsedAccs = await accountsResp.json().catch(() => []);
        if (Array.isArray(parsedAccs)) {
          rawAccounts = parsedAccs;
        }
      }

      // Filter accounts if accountFilter is active
      const filteredAccounts =
        accountFilter && accountFilter !== 'ALL'
          ? rawAccounts.filter((a: any) => a.accountNumber === accountFilter || a.hashValue === accountFilter)
          : rawAccounts;

      // Map (accountNumber, symbol) -> { dayPnL, dayPnLPct } for equity holdings, and sum totalDayPnL across all positions
      const holdingDayMap = new Map<string, { dayPnL: number; dayPnLPct: number }>();
      let totalDayPnL: number | undefined = undefined;
      if (filteredAccounts.length > 0) {
        let daySum = 0;
        for (const acc of filteredAccounts) {
          const accNum = (acc.accountNumber || '').trim();
          const positions = Array.isArray(acc.positions) ? acc.positions : [];
          for (const pos of positions) {
            const posDayPnL = Number(pos.currentDayProfitLoss) || 0;
            daySum += posDayPnL;
            if (pos.assetType !== 'OPTION') {
              const sym = (pos.symbol || '').trim().toUpperCase();
              const prevVal = (Number(pos.marketValue) || 0) - posDayPnL;
              const pct =
                Number(pos.currentDayProfitLossPercentage) ||
                (prevVal > 0 ? (posDayPnL / prevVal) * 100 : 0);
              holdingDayMap.set(`${accNum}_${sym}`, { dayPnL: posDayPnL, dayPnLPct: pct });
            }
          }
        }
        totalDayPnL = daySum;
      }

      const holdings: HoldingYieldSummary[] = (raw.holdings || []).map((h: any) => {
        const sym = (h.symbol || '').trim().toUpperCase();
        const accNum = (h.accountNumber || '').trim();
        const dayInfo = holdingDayMap.get(`${accNum}_${sym}`);
        return {
          symbol: h.symbol || '',
          description: h.description || '',
          accountNumber: h.accountNumber || '',
          shares: Number(h.shares) || 0,
          currentPrice: Number(h.currentPrice) || 0,
          costBasisPerShare: Number(h.costBasisPerShare) || 0,
          totalCostBasis: Number(h.totalCostBasis) || 0,
          marketValue: Number(h.marketValue) || 0,
          dayPnL: dayInfo?.dayPnL,
          dayPnLPct: dayInfo?.dayPnLPct,
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
        };
      });

      const totalCostBasis = Number(raw.totalCostBasis) || 0;
      const totalMarketValue = Number(raw.totalMarketValue) || 0;
      const totalLiquidationValue = Number(raw.totalLiquidationValue) || 0;
      const totalCash = Number(raw.totalCash) || 0;
      const totalUnrealizedPnL = Number(raw.unrealizedPricePnL ?? raw.totalUnrealizedPnL ?? 0);
      const totalUnrealizedPnLPct = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;
      const baseForDayPct = (totalLiquidationValue > 0 ? totalLiquidationValue : totalMarketValue) - (totalDayPnL || 0);
      const totalDayPnLPct =
        totalDayPnL !== undefined && baseForDayPct > 0 ? (totalDayPnL / baseForDayPct) * 100 : undefined;
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
        totalDayPnL,
        totalDayPnLPct,
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

  async executeStagedReentry(
    order: StagedReentryOrder,
    customLimitPrice?: number
  ): Promise<{ success: boolean; message?: string }> {
    const url = `${this.baseUrl}/api/reentry/execute`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const effectivePrice =
      customLimitPrice && customLimitPrice > 0 ? customLimitPrice : order.suggestedStop;

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
          stopPrice: effectivePrice,
          limitPrice: effectivePrice,
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

  async fetchUserUpdates(): Promise<UserUpdatesPayload | null> {
    const url = `${this.baseUrl}/api/updates/user`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async dismissUserUpdateItem(symbol: string): Promise<boolean> {
    const url = `${this.baseUrl}/api/updates/dismiss-item`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ symbol }),
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async fetchMacroRibbon(): Promise<MacroRibbon | null> {
    const url = `${this.baseUrl}/api/macro/ribbon`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
