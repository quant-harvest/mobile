export interface StagedReentryOrder {
  id: string;
  accountHash: string;
  accountNumber: string;
  symbol: string;
  underlying: string;
  instruction: string; // "SELL_TO_OPEN" | "BUY_TO_OPEN" | "SELL_TO_CLOSE" | "BUY_TO_CLOSE"
  quantity: number;
  reversalType: string; // "TOP_EXHAUSTION" | "BOTTOM_BOUNCE" | "PULLBACK_REVERSAL"
  underlyingPrice: number;
  suggestedStop: number; // For SELL_TO_OPEN Covered Calls, holds the clean option limit credit per contract
  confidenceScore: number;
  reason: string;
  timestamp: number;
}

export interface UserUpdateItem {
  category: string; // e.g. "CC_PEAK_EXHAUSTION" | "CC_MANUAL_RADAR_READY" | "CC_RELOAD_ADVISORY"
  symbol?: string;
  title: string;
  details: string;
  severity: string; // "CRITICAL" | "WARNING" | "INFO"
  actionableNotes?: string;
  suggestedAction?: string;
  actionPayload?: string;
}

export interface UserUpdatesPayload {
  date: string;
  generatedTimestampMs: number;
  isDismissed: boolean;
  dismissedTimestampMs?: number;
  events: UserUpdateItem[];
  summaryText: string;
}
