export interface StagedReentryOrder {
  id: string;
  accountHash: string;
  accountNumber: string;
  symbol: string;
  underlying: string;
  instruction: string; // "SELL_TO_OPEN" | "BUY_TO_OPEN"
  quantity: number;
  reversalType: string; // "TOP_EXHAUSTION" | "BOTTOM_BOUNCE" | "PULLBACK_REVERSAL"
  underlyingPrice: number;
  suggestedStop: number;
  confidenceScore: number;
  reason: string;
  timestamp: number;
}
