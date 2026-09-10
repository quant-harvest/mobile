import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { StagedReentryOrder } from '../types/orders';

interface Props {
  order: StagedReentryOrder;
  timeoutSec?: number;
  onApprove: (order: StagedReentryOrder) => void;
  onReject: (order: StagedReentryOrder) => void;
}

export const StagedTradeApprovalCard: React.FC<Props> = ({
  order,
  timeoutSec = 30,
  onApprove,
  onReject,
}) => {
  const [timeLeft, setTimeLeft] = useState(timeoutSec);
  const [isProcessing, setIsProcessing] = useState(false);
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer with auto-approval on expiration
  useEffect(() => {
    setTimeLeft(timeoutSec);
    progressAnim.setValue(1);

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: timeoutSec * 1000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoApprove();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      progressAnim.stopAnimation();
    };
  }, [order.id, timeoutSec]);

  const handleAutoApprove = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    onApprove(order);
  };

  const handleManualApprove = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    onApprove(order);
  };

  const handleReject = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    onReject(order);
  };

  const isSell = order.instruction.toUpperCase().includes('SELL');
  const actionColor = isSell ? '#f59e0b' : '#00e676';
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.cardContainer}>
      {/* Top Header with Alert Icon & Countdown Badge */}
      <View style={styles.headerRow}>
        <View style={styles.alertBadge}>
          <Text style={styles.alertIcon}>⚡</Text>
          <Text style={styles.alertTitle}>TRADE ENTRY CANDIDATE</Text>
        </View>
        <View style={[styles.timerBadge, timeLeft <= 10 && styles.timerBadgeUrgent]}>
          <Text style={[styles.timerText, timeLeft <= 10 && styles.timerTextUrgent]}>
            ⏳ Auto-YES: {timeLeft}s
          </Text>
        </View>
      </View>

      {/* Animated Timeout Progress Bar */}
      <View style={styles.progressBarBackground}>
        <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
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
              <Text style={styles.metricLabel}>STOCK PRICE</Text>
              <Text style={styles.metricValue}>
                ${order.underlyingPrice.toFixed(2)}
              </Text>
            </View>
          ) : null}
          {order.suggestedStop > 0 ? (
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>SUGGESTED STOP</Text>
              <Text style={styles.metricValue}>
                ${order.suggestedStop.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>ACCOUNT</Text>
            <Text style={styles.metricValue}>#{order.accountNumber}</Text>
          </View>
        </View>

        {/* Reason / Setup Rationale */}
        {order.reason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonText} numberOfLines={2}>
              💡 {order.reason}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Big Tactile Yes / No Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn, isProcessing && styles.btnDisabled]}
          onPress={handleReject}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={styles.rejectBtnText}>🛑 NO / VETO</Text>
          <Text style={styles.subBtnText}>Dismiss trade</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn, isProcessing && styles.btnDisabled]}
          onPress={handleManualApprove}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={styles.approveBtnText}>🚀 YES / EXECUTE</Text>
          <Text style={styles.subBtnText}>Execute now</Text>
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
    letterSpacing: 0.8,
  },
  timerBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerBadgeUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#ef4444',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#93c5fd',
  },
  timerTextUrgent: {
    color: '#f87171',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
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
  reasonBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
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
    backgroundColor: '#089981',
    borderWidth: 1.5,
    borderColor: '#10b981',
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
    opacity: 0.8,
  },
});
