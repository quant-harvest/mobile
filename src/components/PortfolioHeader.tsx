import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PortfolioYieldSummary } from '../types/portfolio';

interface Props {
  summary: PortfolioYieldSummary | null;
  lastUpdated?: Date | null;
}

export const PortfolioHeader: React.FC<Props> = ({ summary, lastUpdated }) => {
  if (!summary) {
    return (
      <View style={styles.card}>
        <Text style={styles.loadingText}>Loading portfolio overview...</Text>
      </View>
    );
  }

  const isProfit = summary.totalUnrealizedPnL >= 0;
  const pnlSign = isProfit ? '+' : '';
  const pnlColor = isProfit ? '#089981' : '#f23645';

  const isNetTotalProfit = summary.netTotalReturn >= 0;
  const netSign = isNetTotalProfit ? '+' : '';
  const netColor = isNetTotalProfit ? '#089981' : '#f23645';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.label}>TOTAL PORTFOLIO VALUE</Text>
          <Text style={styles.mainValue}>
            ${summary.totalMarketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={[styles.pnlBadge, { backgroundColor: isProfit ? 'rgba(8,153,129,0.15)' : 'rgba(242,54,69,0.15)' }]}>
          <Text style={[styles.pnlText, { color: pnlColor }]}>
            {pnlSign}${Math.abs(summary.totalUnrealizedPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={[styles.pnlSubText, { color: pnlColor }]}>
            ({pnlSign}{summary.totalUnrealizedPnLPct.toFixed(1)}%)
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Income & Yield Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>DIVIDENDS</Text>
          <Text style={[styles.metricValue, { color: '#089981' }]}>
            +${summary.totalDividends.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>COVERED CALLS</Text>
          <Text style={[styles.metricValue, { color: '#38bdf8' }]}>
            +${summary.totalOptionPremium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>TOTAL INCOME</Text>
          <Text style={[styles.metricValue, { color: '#e6edf3' }]}>
            +${summary.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      <View style={styles.subGrid}>
        <View style={styles.subCol}>
          <Text style={styles.subLabel}>Yield On Cost:</Text>
          <Text style={styles.subValue}>{summary.portfolioYieldOnCost.toFixed(2)}%</Text>
        </View>

        <View style={styles.subCol}>
          <Text style={styles.subLabel}>Net Total Return:</Text>
          <Text style={[styles.subValue, { color: netColor }]}>
            {netSign}${Math.abs(summary.netTotalReturn).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({netSign}{summary.netTotalReturnPct.toFixed(1)}%)
          </Text>
        </View>
      </View>

      {lastUpdated && (
        <Text style={styles.timestamp}>
          Updated: {lastUpdated.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161b22',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b949e',
    letterSpacing: 0.5,
  },
  mainValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f0f6fc',
    marginTop: 2,
  },
  pnlBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  pnlText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pnlSubText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#21262d',
    marginVertical: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8b949e',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  subGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#21262d',
  },
  subCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subLabel: {
    fontSize: 11,
    color: '#8b949e',
  },
  subValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f0f6fc',
  },
  timestamp: {
    fontSize: 10,
    color: '#484f58',
    textAlign: 'right',
    marginTop: 8,
  },
  loadingText: {
    color: '#8b949e',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
