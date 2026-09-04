import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { HoldingYieldSummary } from '../types/portfolio';

interface Props {
  visible: boolean;
  item: HoldingYieldSummary | null;
  onClose: () => void;
}

export const PositionDetailModal: React.FC<Props> = ({ visible, item, onClose }) => {
  if (!item) return null;

  const isCapitalGain = item.unrealizedPnL >= 0;
  const capSign = isCapitalGain ? '+' : '';
  const capColor = isCapitalGain ? '#089981' : '#f23645';

  const isNetProfit = item.netTotalReturn >= 0;
  const netSign = isNetProfit ? '+' : '';
  const netColor = isNetProfit ? '#089981' : '#f23645';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalSymbol}>{item.symbol}</Text>
              <Text style={styles.modalDescription}>{item.description}</Text>
              <Text style={styles.modalAccount}>Account #{item.accountNumber}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Position Sizing Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>POSITION SIZING</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Shares Owned:</Text>
                <Text style={styles.rowValue}>{item.shares.toLocaleString()} shares</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Current Price:</Text>
                <Text style={styles.rowValue}>${item.currentPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Market Value:</Text>
                <Text style={[styles.rowValue, { fontWeight: '800' }]}>
                  ${item.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Unrealized Capital P&L:</Text>
                <Text style={[styles.rowValue, { color: capColor, fontWeight: '700' }]}>
                  {capSign}${Math.abs(item.unrealizedPnL).toFixed(2)} ({capSign}{item.unrealizedPnLPct.toFixed(2)}%)
                </Text>
              </View>
            </View>

            {/* Cost Basis Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>COST BASIS & BREAK-EVEN</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Cost Basis / Share:</Text>
                <Text style={styles.rowValue}>${item.costBasisPerShare.toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Total Cost Basis:</Text>
                <Text style={styles.rowValue}>
                  ${item.totalCostBasis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Effective Cost / Share:</Text>
                <Text style={[styles.rowValue, { color: '#38bdf8', fontWeight: '700' }]}>
                  ${item.effectiveCostBasisPerShare.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* Income Harvested Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>HARVESTED INCOME</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Total Dividends Paid:</Text>
                <Text style={[styles.rowValue, { color: '#089981', fontWeight: '700' }]}>
                  +${item.totalDividends.toFixed(2)} {item.dividendCount > 0 ? `(${item.dividendCount} payments)` : ''}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Covered Call Option Premium:</Text>
                <Text style={[styles.rowValue, { color: '#38bdf8', fontWeight: '700' }]}>
                  +${item.optionPremiumHarvested.toFixed(2)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Total Harvested Income:</Text>
                <Text style={[styles.rowValue, { color: '#089981', fontWeight: '800' }]}>
                  +${item.totalIncome.toFixed(2)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Yield on Cost:</Text>
                <Text style={[styles.rowValue, { color: '#e6edf3', fontWeight: '800' }]}>
                  {item.yieldOnCost.toFixed(2)}%
                </Text>
              </View>
            </View>

            {/* Net Total Return Section */}
            <View style={[styles.section, styles.highlightSection]}>
              <Text style={styles.sectionTitle}>NET TOTAL RETURN (CAPITAL + INCOME)</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Net Total Return ($):</Text>
                <Text style={[styles.rowValue, { color: netColor, fontSize: 16, fontWeight: '800' }]}>
                  {netSign}${Math.abs(item.netTotalReturn).toFixed(2)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Net Total Return (%):</Text>
                <Text style={[styles.rowValue, { color: netColor, fontSize: 16, fontWeight: '800' }]}>
                  {netSign}{item.netTotalReturnPct.toFixed(2)}%
                </Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  modalSymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f0f6fc',
  },
  modalDescription: {
    fontSize: 13,
    color: '#8b949e',
    marginTop: 2,
  },
  modalAccount: {
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 2,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#21262d',
  },
  closeButtonText: {
    color: '#8b949e',
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#0d1117',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#21262d',
  },
  highlightSection: {
    borderColor: '#30363d',
    backgroundColor: '#131920',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8b949e',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 13,
    color: '#8b949e',
  },
  rowValue: {
    fontSize: 13,
    color: '#f0f6fc',
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#38bdf8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#0d1117',
    fontSize: 16,
    fontWeight: '700',
  },
});
