import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HoldingYieldSummary } from '../types/portfolio';

interface Props {
  item: HoldingYieldSummary;
  onPress: (item: HoldingYieldSummary) => void;
}

export const PositionCard: React.FC<Props> = ({ item, onPress }) => {
  const hasDayPnL = item.dayPnL !== undefined;
  const dayVal = hasDayPnL ? item.dayPnL! : 0;
  const dayPct = hasDayPnL ? (item.dayPnLPct || 0) : 0;
  const isDayGain = dayVal >= 0;
  const daySign = isDayGain ? '+' : '-';
  const dayColor = isDayGain ? '#089981' : '#f23645';

  const isCapitalGain = item.unrealizedPnL >= 0;
  const capSign = isCapitalGain ? '+' : '-';
  const capColor = isCapitalGain ? '#089981' : '#f23645';

  const isNetProfit = item.netTotalReturn >= 0;
  const netSign = isNetProfit ? '+' : '-';
  const netColor = isNetProfit ? '#089981' : '#f23645';

  const hasDividends = item.totalDividends > 0;
  const hasOptionPremium = item.optionPremiumHarvested > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {/* Header Row: Symbol, Shares @ Price, Market Value */}
      <View style={styles.headerRow}>
        <View style={styles.symbolContainer}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text style={styles.sharesPrice}>
            {item.shares.toLocaleString()} shs @ ${item.currentPrice.toFixed(2)}
          </Text>
        </View>
        <View style={styles.marketValContainer}>
          <Text style={styles.marketVal}>
            ${item.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          {hasDayPnL && (
            <View style={[styles.capBadge, { backgroundColor: isDayGain ? 'rgba(8,153,129,0.14)' : 'rgba(242,54,69,0.14)' }]}>
              <Text style={[styles.capText, { color: dayColor }]}>
                Day: {daySign}${Math.abs(dayVal).toFixed(2)} ({daySign}{Math.abs(dayPct).toFixed(1)}%)
              </Text>
            </View>
          )}
          <View style={[styles.capBadge, { backgroundColor: isCapitalGain ? 'rgba(8,153,129,0.08)' : 'rgba(242,54,69,0.08)' }]}>
            <Text style={[styles.capText, { color: capColor }]}>
              All-Time: {capSign}${Math.abs(item.unrealizedPnL).toFixed(0)} ({capSign}{Math.abs(item.unrealizedPnLPct).toFixed(1)}%)
            </Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {item.description ? (
        <Text style={styles.description} numberOfLines={1}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.divider} />

      {/* Income & Yield Highlights */}
      <View style={styles.yieldRow}>
        <View style={styles.incomeCol}>
          <Text style={styles.statLabel}>DIVIDENDS</Text>
          <Text style={[styles.statValue, { color: hasDividends ? '#089981' : '#8b949e' }]}>
            {hasDividends ? `+$${item.totalDividends.toFixed(2)}` : '$0.00'}
            {item.dividendCount > 0 && (
              <Text style={styles.countBadge}> ({item.dividendCount})</Text>
            )}
          </Text>
        </View>

        {hasOptionPremium ? (
          <View style={styles.incomeCol}>
            <Text style={styles.statLabel}>CALL PREM</Text>
            <Text style={[styles.statValue, { color: '#38bdf8' }]}>
              +${item.optionPremiumHarvested.toFixed(2)}
            </Text>
          </View>
        ) : null}

        <View style={styles.incomeCol}>
          <Text style={styles.statLabel}>YIELD ON COST</Text>
          <Text style={[styles.statValue, { color: '#e6edf3' }]}>
            {item.yieldOnCost.toFixed(2)}%
          </Text>
        </View>

        <View style={[styles.incomeCol, { alignItems: 'flex-end' }]}>
          <Text style={styles.statLabel}>NET TOTAL RETURN</Text>
          <Text style={[styles.statValue, { color: netColor }]}>
            {netSign}${Math.abs(item.netTotalReturn).toFixed(2)} ({netSign}{item.netTotalReturnPct.toFixed(1)}%)
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161b22',
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  symbolContainer: {
    flex: 1,
  },
  symbol: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f0f6fc',
    letterSpacing: 0.3,
  },
  sharesPrice: {
    fontSize: 12,
    color: '#8b949e',
    marginTop: 2,
    fontWeight: '500',
  },
  marketValContainer: {
    alignItems: 'flex-end',
  },
  marketVal: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f0f6fc',
  },
  capBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  capText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 11,
    color: '#6e7681',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#21262d',
    marginVertical: 10,
  },
  yieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomeCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8b949e',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  countBadge: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8b949e',
  },
});
