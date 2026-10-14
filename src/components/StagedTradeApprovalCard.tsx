import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StagedReentryOrder } from '../types/orders';

interface Props {
  order: StagedReentryOrder;
  ttlMinutes?: number;
  onApprove: (order: StagedReentryOrder, customLimitPrice?: number) => void;
  onReject: (order: StagedReentryOrder) => void;
}

export const StagedTradeApprovalCard: React.FC<Props> = ({
  order,
  ttlMinutes = 10,
  onApprove,
  onReject,
}) => {
  const isSellOpen =
    order.instruction.toUpperCase().includes('SELL') &&
    order.instruction.toUpperCase().includes('OPEN');
  const isSell = order.instruction.toUpperCase().includes('SELL');

  const initialPrice = order.suggestedStop > 0 ? order.suggestedStop : 0;
  const [customLimitPrice, setCustomLimitPrice] = useState<number>(initialPrice);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedMins, setElapsedMins] = useState<number>(0);

  useEffect(() => {
    setCustomLimitPrice(order.suggestedStop > 0 ? order.suggestedStop : 0);
    setIsProcessing(false);
  }, [order.id, order.suggestedStop]);

  // Passive TTL age display ONLY — strictly NEVER auto-executes without operator tap
  useEffect(() => {
    const updateAge = () => {
      if (order.timestamp > 0) {
        setElapsedMins(Math.max(0, Math.floor((Date.now() - order.timestamp) / 60000)));
      }
    };
    updateAge();
    const interval = setInterval(updateAge, 15000);
    return () => clearInterval(interval);
  }, [order.timestamp]);

  const nudgeLimitPrice = (delta: number) => {
    setCustomLimitPrice(prev => {
      const base = prev > 0 ? prev : order.suggestedStop;
      return Math.max(0.05, Math.round((base + delta) * 100) / 100);
    });
  };

  const handleManualApprove = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    onApprove(order, customLimitPrice > 0 ? customLimitPrice : undefined);
  };

  const handleReject = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    onReject(order);
  };

  const actionColor = isSell ? '#f59e0b' : '#00e676';
  const minsLeft = Math.max(0, ttlMinutes - elapsedMins);
  const totalCreditDollars =
    isSellOpen && customLimitPrice > 0 ? Math.round(customLimitPrice * order.quantity * 100) : 0;

  return (
    <View style={[styles.cardContainer, isSellOpen && styles.cardContainerCcPeak]}>
      {/* Top Header with Alert Icon & Passive TTL Badge */}
      <View style={styles.headerRow}>
        <View style={styles.alertBadge}>
          <Text style={styles.alertIcon}>{isSellOpen ? '🏔️' : '⚡'}</Text>
          <Text style={[styles.alertTitle, isSellOpen && { color: '#fbbf24' }]}>
            {isSellOpen ? 'PEAK EXHAUSTION 1-CLICK CC' : '1-CLICK STAGED ORDER'}
          </Text>
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>
            ⏱️ {elapsedMins}m ago ({minsLeft}m TTL)
          </Text>
        </View>
      </View>

      {/* Main Order Details */}
      <View style={styles.bodyContent}>
        <View style={styles.actionRow}>
          <View style={[styles.instructionBadge, { borderColor: actionColor }]}>
            <Text style={[styles.instructionText, { color: actionColor }]}>
              {order.instruction} x{order.quantity}
            </Text>
          </View>
          <Text style={styles.underlyingText}>{order.underlying}</Text>
        </View>

        <Text style={styles.symbolText}>{order.symbol}</Text>

        {/* Key Metrics Chips */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>CONFIDENCE</Text>
            <Text style={styles.metricValue}>
              {Math.round(order.confidenceScore * 100)}%
            </Text>
          </View>
          {order.underlyingPrice > 0 ? (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>SPOT PRICE</Text>
              <Text style={styles.metricValue}>
                ${order.underlyingPrice.toFixed(2)}
              </Text>
            </View>
          ) : null}
          {customLimitPrice > 0 ? (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>
                {isSellOpen ? 'EST. CREDIT' : 'LIMIT / STOP'}
              </Text>
              <Text style={[styles.metricValue, isSellOpen && { color: '#38bdf8' }]}>
                ${customLimitPrice.toFixed(2)}
                {totalCreditDollars > 0 ? ` ($${totalCreditDollars})` : ''}
              </Text>
            </View>
          ) : null}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>ACCOUNT</Text>
            <Text style={styles.metricValue}>#{order.accountNumber}</Text>
          </View>
        </View>

        {/* Interactive Limit Price Stepper for 1-Click Fine-Tuning */}
        {customLimitPrice > 0 && (
          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Limit Credit / Price:</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => nudgeLimitPrice(-0.05)}
                disabled={isProcessing}
              >
                <Text style={styles.stepperBtnText}>− $0.05</Text>
              </TouchableOpacity>
              <Text style={styles.stepperPriceText}>${customLimitPrice.toFixed(2)}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => nudgeLimitPrice(0.05)}
                disabled={isProcessing}
              >
                <Text style={styles.stepperBtnText}>+ $0.05</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Reason / Peak Exhaustion + KER Telemetry */}
        {order.reason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonText} numberOfLines={3}>
              💡 {order.reason}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Big Tactile 1-Click Execute / Dismiss Buttons (Manual Only) */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn, isProcessing && styles.btnDisabled]}
          onPress={handleReject}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={styles.rejectBtnText}>🛑 DISMISS</Text>
          <Text style={styles.subBtnText}>Skip signal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn, isProcessing && styles.btnDisabled]}
          onPress={handleManualApprove}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={styles.approveBtnText}>
            {isSellOpen ? '⚡ 1-CLICK SELL CC' : '🚀 1-CLICK EXECUTE'}
          </Text>
          <Text style={styles.subBtnText}>
            {customLimitPrice > 0
              ? `Route @ $${customLimitPrice.toFixed(2)}${totalCreditDollars > 0 ? ` ($${totalCreditDollars})` : ''}`
              : 'Execute now'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#1b2234',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 14,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  cardContainerCcPeak: {
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#60a5fa',
    letterSpacing: 0.6,
  },
  timerBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  bodyContent: {
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  instructionBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginRight: 8,
  },
  instructionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  underlyingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  symbolText: {
    fontSize: 13,
    fontFamily: 'Courier',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 8,
    gap: 8,
    marginBottom: 10,
  },
  metricItem: {
    flex: 1,
    minWidth: 70,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepperLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepperBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
  },
  stepperPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
    minWidth: 52,
    textAlign: 'center',
  },
  reasonBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  reasonText: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  approveBtn: {
    backgroundColor: '#2962ff',
    borderWidth: 1.5,
    borderColor: '#60a5fa',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fca5a5',
    marginBottom: 2,
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  subBtnText: {
    fontSize: 10,
    color: '#cbd5e1',
    opacity: 0.85,
  },
});
