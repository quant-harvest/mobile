import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { HoldingYieldSummary, PortfolioYieldSummary, SchwabAccountOption, AppConfig, MacroRibbon } from '../types/portfolio';
import { ApiClient } from '../services/apiClient';

import { loadAppConfig } from '../storage/configStorage';
import { PortfolioHeader } from '../components/PortfolioHeader';
import { AccountFilterPills } from '../components/AccountFilterPills';
import { PositionCard } from '../components/PositionCard';
import { PositionDetailModal } from './PositionDetailModal';
import { SettingsModal } from './SettingsModal';
import { StagedReentryOrder } from '../types/orders';
import { StagedTradeApprovalCard } from '../components/StagedTradeApprovalCard';

export const PositionsScreen: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [accounts, setAccounts] = useState<SchwabAccountOption[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [summary, setSummary] = useState<PortfolioYieldSummary | null>(null);
  const [macroRibbon, setMacroRibbon] = useState<MacroRibbon | null>(null);
  const [stagedOrders, setStagedOrders] = useState<StagedReentryOrder[]>([]);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHolding, setSelectedHolding] = useState<HoldingYieldSummary | null>(null);
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const apiClientRef = useRef<ApiClient | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stagedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Config & API Client
  useEffect(() => {
    loadAppConfig().then((loadedConfig) => {
      setConfig(loadedConfig);
      apiClientRef.current = new ApiClient({
        baseUrl: loadedConfig.serverUrl,
        apiKey: loadedConfig.apiKey,
      });
      fetchData(loadedConfig);
    });
  }, []);

  const fetchData = useCallback(
    async (currentConfig?: AppConfig) => {
      const activeConfig = currentConfig || config;
      if (!activeConfig) return;

      const client = apiClientRef.current || new ApiClient({
        baseUrl: activeConfig.serverUrl,
        apiKey: activeConfig.apiKey,
      });

      try {
        setErrorMsg(null);
        const [accList, yieldData, macroData] = await Promise.all([
          client.fetchAccounts(),
          client.fetchPortfolioYieldSummary(selectedAccount),
          client.fetchMacroRibbon(),
        ]);

        if (accList.length > 0) {
          setAccounts(accList);
        }
        setSummary(yieldData);
        if (macroData) {
          setMacroRibbon(macroData);
        }
        setLastUpdated(new Date());
      } catch (err: any) {
        console.warn('Error fetching portfolio data:', err);
        setErrorMsg(err?.message || 'Failed to connect to Schwabster');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

    },
    [config, selectedAccount]
  );

  // Handle Account Change
  const handleSelectAccount = (acc: string) => {
    setSelectedAccount(acc);
    setLoading(true);
  };

  // Re-fetch on account change
  useEffect(() => {
    if (config) {
      fetchData();
    }
  }, [selectedAccount]);

  // Periodic Auto-Refresh
  useEffect(() => {
    if (!config || config.autoRefreshIntervalSec <= 0) return;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      fetchData();
    }, config.autoRefreshIntervalSec * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [config, selectedAccount]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleSaveConfig = (updated: AppConfig) => {
    setConfig(updated);
    apiClientRef.current = new ApiClient({
      baseUrl: updated.serverUrl,
      apiKey: updated.apiKey,
    });
    setLoading(true);
    fetchData(updated);
    fetchStagedOrders();
  };

  const fetchStagedOrders = useCallback(async () => {
    const client = apiClientRef.current;
    if (!client) return;
    try {
      const list = await client.fetchStagedReentries();
      setStagedOrders(list);
    } catch {
      // silent
    }
  }, []);

  // Poll staged orders every 4 seconds for immediate prompt display
  useEffect(() => {
    if (!config) return;
    fetchStagedOrders();
    if (stagedTimerRef.current) clearInterval(stagedTimerRef.current);
    stagedTimerRef.current = setInterval(() => {
      fetchStagedOrders();
    }, 4000);

    return () => {
      if (stagedTimerRef.current) clearInterval(stagedTimerRef.current);
    };
  }, [config, fetchStagedOrders]);

  const handleApproveStaged = async (order: StagedReentryOrder) => {
    const client = apiClientRef.current;
    if (!client) return;
    setStagedOrders(prev => prev.filter(o => o.id !== order.id));
    setStatusNotification(`🚀 Executing ${order.instruction} x${order.quantity} ${order.symbol}...`);
    try {
      const res = await client.executeStagedReentry(order);
      if (res.success) {
        setStatusNotification(`✅ Order Executed: ${order.instruction} x${order.quantity} ${order.symbol}`);
        fetchData();
      } else {
        setStatusNotification(`⚠️ Order placement: ${res.message || 'Submitted'}`);
      }
    } catch (err: any) {
      setStatusNotification(`⚠️ Execution error: ${err?.message || 'Failed'}`);
    }
    setTimeout(() => setStatusNotification(null), 5000);
  };

  const handleRejectStaged = async (order: StagedReentryOrder) => {
    const client = apiClientRef.current;
    if (!client) return;
    setStagedOrders(prev => prev.filter(o => o.id !== order.id));
    setStatusNotification(`🛑 Vetoed: ${order.instruction} on ${order.underlying} dismissed`);
    try {
      await client.dismissStagedReentry(order.id);
    } catch {
      // silent
    }
    setTimeout(() => setStatusNotification(null), 4000);
  };

  // Filter Holdings by search query
  const filteredHoldings = (summary?.holdings || []).filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toUpperCase().trim();
    return h.symbol.toUpperCase().includes(q) || (h.description && h.description.toUpperCase().includes(q));
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Top Navbar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <Text style={styles.appTitle}>WaveSkimmer</Text>
          <View style={[styles.statusDot, { backgroundColor: errorMsg ? '#f23645' : '#089981' }]} />
        </View>

        <View style={styles.navRight}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search positions (e.g. XYZY, OBDC, AAPL)..."
          placeholderTextColor="#484f58"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Pinned Real-time Trade Candidate Approvals (In Your Face Yes/No) */}
      {stagedOrders.map((order) => (
        <StagedTradeApprovalCard
          key={order.id}
          order={order}
          timeoutSec={30}
          onApprove={handleApproveStaged}
          onReject={handleRejectStaged}
        />
      ))}

      {/* Execution / Veto Notification Toast Banner */}
      {statusNotification ? (
        <View style={styles.statusNotificationBanner}>
          <Text style={styles.statusNotificationText}>{statusNotification}</Text>
        </View>
      ) : null}

      {/* Error Alert Banner */}
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          <TouchableOpacity onPress={() => setSettingsVisible(true)}>
            <Text style={styles.errorLink}>Settings</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Main List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loadingSubtext}>Connecting to Schwabster...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHoldings}
          keyExtractor={(item, index) => `${item.accountNumber}_${item.symbol}_${index}`}
          renderItem={({ item }) => (
            <PositionCard item={item} onPress={setSelectedHolding} />
          )}
          ListHeaderComponent={
            <View>
              <PortfolioHeader summary={summary} macroRibbon={macroRibbon} lastUpdated={lastUpdated} />
              <AccountFilterPills

                accounts={accounts}
                selectedAccount={selectedAccount}
                onSelectAccount={handleSelectAccount}
              />
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  POSITIONS ({filteredHoldings.length})
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? `No positions matching "${searchQuery}"` : 'No open equity positions found'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#38bdf8"
              colors={['#38bdf8']}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Position Detail Modal */}
      <PositionDetailModal
        visible={!!selectedHolding}
        item={selectedHolding}
        onClose={() => setSelectedHolding(null)}
      />

      {/* Settings Modal */}
      {config ? (
        <SettingsModal
          visible={settingsVisible}
          config={config}
          onClose={() => setSettingsVisible(false)}
          onSave={handleSaveConfig}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f0f6fc',
    letterSpacing: 0.5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  settingsIcon: {
    fontSize: 16,
    color: '#8b949e',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0d1117',
  },
  searchInput: {
    backgroundColor: '#161b22',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f0f6fc',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  statusNotificationBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusNotificationText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(242,54,69,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#f23645',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  errorLink: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8b949e',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingSubtext: {
    color: '#8b949e',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8b949e',
    fontSize: 14,
    textAlign: 'center',
  },
});
