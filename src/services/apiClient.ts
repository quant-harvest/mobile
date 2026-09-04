import { PortfolioYieldSummary, SchwabAccountOption } from '../types/portfolio';

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
    let url = `${this.baseUrl}/api/portfolio/yield-summary`;
    if (accountFilter && accountFilter !== 'ALL') {
      url += `?account=${encodeURIComponent(accountFilter)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data: PortfolioYieldSummary = await response.json();
      return data;
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

  async syncDividends(): Promise<{ success: boolean; syncedCount?: number; error?: string }> {
    const url = `${this.baseUrl}/api/dividends/sync-schwab`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      const json = await response.json();
      return json;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
