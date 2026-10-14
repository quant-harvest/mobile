import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Vibration,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { HoldingYieldSummary, PortfolioYieldSummary, SchwabAccountOption, AppConfig, MacroRibbon } from '../types/portfolio';
import { ApiClient } from '../services/apiClient';
import { loadAppConfig } from '../storage/configStorage';
import { PortfolioHeader } from '../components/PortfolioHeader';
import { AccountFilterPills } from '../components/AccountFilterPills';
import { PositionCard } from '../components/PositionCard';
import { PositionDetailModal } from './PositionDetailModal';
import { SettingsModal } from './SettingsModal';
import { StagedReentryOrder, UserUpdatesPayload, UserUpdateItem } from '../types/orders';
import { StagedTradeApprovalCard } from '../components/StagedTradeApprovalCard';

export const PositionsScreen: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [accounts, setAccounts] = useState<SchwabAccountOption[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [summary, setSummary] = useState<PortfolioYieldSummary | null>(null);
  const [macroRibbon, setMacroRibbon] = useState<MacroRibbon | null>(null);
  const [stagedOrders, setStagedOrders] = useState<StagedReentryOrder[]>([]);
  const [userUpdates, setUserUpdates] = useState<UserUpdatesPayload | null>(null);
  const [updatesModalVisible, setUpdatesModalVisible] = useState<boolean>(false);
  const [activeAlertOrder, setActiveAlertOrder] = useState<StagedReentryOrder | null>(null);
  const [alertBannerText, setAlertBannerText] = useState<string | null>(null);
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
  const wsRef = useRef<WebSocket | null>(null);
  const alertedOrderIdsRef = useRef<Set<string>>(new Set());

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

  const triggerStagedOrderAlert = useCallback((order: StagedReentryOrder) => {
    if (!alertedOrderIdsRef.current.has(order.id)) {
      alertedOrderIdsRef.current.add(order.id);
      try {
        Vibration.vibrate([0, 250, 120, 250]);
      } catch {
        // ignore vibration permission error on web/simulator
      }
      const isSellOpen =
        order.instruction.toUpperCase().includes('SELL') &&
        order.instruction.toUpperCase().includes('OPEN');
      const priceLabel =
        order.suggestedStop > 0 ? ` @ $${order.suggestedStop.toFixed(2)}` : '';
      setAlertBannerText(
        isSellOpen
          ? `🏔️ Peak Exhaustion CC Staged: ${order.underlying} (${order.quantity}x ${order.symbol}${priceLabel}) — Tap for 1-Click`
          : `⚡ 1-Click Order Staged: ${order.instruction} ${order.quantity}x ${order.symbol}${priceLabel} — Tap to Open`
      );
      setActiveAlertOrder(order);
    }
  }, []);

  const fetchStagedAndUpdates = useCallback(async () => {
    const client = apiClientRef.current;
    if (!client) return;
    try {
      const [list, updatesData] = await Promise.all([
        client.fetchStagedReentries(),
        client.fetchUserUpdates(),
      ]);
      setStagedOrders(list);
      if (updatesData) {
        setUserUpdates(updatesData);
      }
      if (list.length > 0) {
        // Trigger alert sheet on newest un-alerted staged order
        const newestUnalerted = list.find(o => !alertedOrderIdsRef.current.has(o.id));
        if (newestUnalerted) {
          triggerStagedOrderAlert(newestUnalerted);
        }
      } else {
        setActiveAlertOrder(null);
      }
    } catch {
      // silent
    }
  }, [triggerStagedOrderAlert]);

  const fetchData = useCallback(
    async (currentConfig?: AppConfig) => {
      const activeConfig = currentConfig || config;
      if (!activeConfig) return;

      const client =
        apiClientRef.current ||
        new ApiClient({
          baseUrl: activeConfig.serverUrl,
          apiKey: activeConfig.apiKey,
        });

      try {
        setErrorMsg(null);
        const [accList, yieldData, macroData, updatesData] = await Promise.all([
          client.fetchAccounts(),
          client.fetchPortfolioYieldSummary(selectedAccount),
          client.fetchMacroRibbon(),
          client.fetchUserUpdates(),
        ]);

        if (accList.length > 0) {
          setAccounts(accList);
        }
        setSummary(yieldData);
        if (macroData) {
          setMacroRibbon(macroData);
        }
        if (updatesData) {
          setUserUpdates(updatesData);
        }
        setLastUpdated(new Date());
      } catch (err: any) {
        console.warn('Error fetching portfolio data:', err);
        setErrorMsg(err?.message || 'Failed to connect to QuantHarvest');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [config, selectedAccount]
  );

  // Connect to QuantHarvest Cockpit WebSocket for instant STAGED_ORDER & SYSTEM_ALERT push
  useEffect(() => {
    if (!config || !apiClientRef.current) return;

    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWs = () => {
      if (!isMounted || !apiClientRef.current) return;
      try {
        if (wsRef.current) {
          wsRef.current.close();
        }
        const wsUrl = apiClientRef.current.getWebSocketUrl();
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data);
            if (payload.type === 'STAGED_ORDER' || payload.type === 'SYSTEM_ALERT') {
              if (payload.type === 'SYSTEM_ALERT' && payload.title) {
                setAlertBannerText(`${payload.title}: ${payload.message || ''}`);
              }
              fetchStagedAndUpdates();
            }
          } catch {
            // ignore non-json frames
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            reconnectTimeout = setTimeout(connectWs, 5000);
          }
        };
      } catch {
        if (isMounted) {
          reconnectTimeout = setTimeout(connectWs, 5000);
        }
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [config, fetchStagedAndUpdates]);

  const handleSelectAccount = (acc: string) => {
    setSelectedAccount(acc);
    setLoading(true);
  };

  useEffect(() => {
    if (config) {
      fetchData();
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (!config || config.autoRefreshIntervalSec <= 0) return;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      fetchData();
    }, config.autoRefreshIntervalSec * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [config, selectedAccount, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
    fetchStagedAndUpdates();
  }, [fetchData, fetchStagedAndUpdates]);

  const handleSaveConfig = (updated: AppConfig) => {
    setConfig(updated);
    apiClientRef.current = new ApiClient({
      baseUrl: updated.serverUrl,
      apiKey: updated.apiKey,
    });
    setLoading(true);
    fetchData(updated);
    fetchStagedAndUpdates();
  };

  useEffect(() => {
    if (!config) return;
    fetchStagedAndUpdates();
    if (stagedTimerRef.current) clearInterval(stagedTimerRef.current);
    stagedTimerRef.current = setInterval(() => {
      fetchStagedAndUpdates();
    }, 4000);

    return () => {
      if (stagedTimerRef.current) clearInterval(stagedTimerRef.current);
    };
  }, [config, fetchStagedAndUpdates]);

  const handleApproveStaged = async (order: StagedReentryOrder, customLimitPrice?: number) => {
    const client = apiClientRef.current;
    if (!client) return;
    setStagedOrders(prev => prev.filter(o => o.id !== order.id));
    setActiveAlertOrder(prev => (prev?.id === order.id ? null : prev));
    setAlertBannerText(null);
    const effPrice = customLimitPrice && customLimitPrice > 0 ? customLimitPrice : order.suggestedStop;
    const priceSuffix = effPrice > 0 ? ` @ $${effPrice.toFixed(2)}` : '';
    setStatusNotification(`⚡ Routing ${order.instruction} x${order.quantity} ${order.symbol}${priceSuffix}...`);
    try {
      const res = await client.executeStagedReentry(order, customLimitPrice);
      if (res.success) {
        setStatusNotification(`✅ Executed: ${order.instruction} x${order.quantity} ${order.symbol}${priceSuffix}`);
        fetchData();
        fetchStagedAndUpdates();
      } else {
        setStatusNotification(`⚠️ Order response: ${res.message || 'Submitted'}`);
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
    setActiveAlertOrder(prev => (prev?.id === order.id ? null : prev));
    setAlertBannerText(null);
    setStatusNotification(`🛑 Dismissed: ${order.instruction} on ${order.underlying}`);
    try {
      await client.dismissStagedReentry(order.id);
      fetchStagedAndUpdates();
    } catch {
      // silent
    }
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const handleOpenUpdateOrder = (item: UserUpdateItem) => {
    const sym = (item.symbol || '').trim().toUpperCase();
    const matchingOrder =
      stagedOrders.find(o => o.underlying.toUpperCase() === sym || o.symbol.toUpperCase().startsWith(sym)) ||
      stagedOrders[0];
    if (matchingOrder) {
      setUpdatesModalVisible(false);
      setActiveAlertOrder(matchingOrder);
    }
  };

  const handleDismissUpdateItem = async (symbol?: string) => {
    if (!symbol || !apiClientRef.current) return;
    await apiClientRef.current.dismissUserUpdateItem(symbol);
    fetchStagedAndUpdates();
  };

  const filteredHoldings = (summary?.holdings || []).filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toUpperCase().trim();
    return h.symbol.toUpperCase().includes(q) || (h.description && h.description.toUpperCase().includes(q));
  });

  const activeUpdatesCount = userUpdates?.events?.length || 0;
  const insets = useSafeAreaInsets();
  const topSafePadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) + 6 : 0
  );

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topSafePadding }]} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" />

      {/* Top Navbar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <Text style={styles.appTitle}>QuantHarvest</Text>
          <View style={[styles.statusDot, { backgroundColor: errorMsg ? '#f23645' : '#089981' }]} />
        </View>

        <View style={styles.navRight}>
          {stagedOrders.length > 0 && (
            <TouchableOpacity
              style={styles.stagedPillButton}
              onPress={() => setActiveAlertOrder(stagedOrders[0])}
              activeOpacity={0.7}
            >
              <Text style={styles.stagedPillText}>⚡ 1-Click ({stagedOrders.length})</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.updatesButton,
              activeUpdatesCount > 0 && styles.updatesButtonActive,
            ]}
            onPress={() => setUpdatesModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.updatesButtonText,
                activeUpdatesCount > 0 && styles.updatesButtonTextActive,
              ]}
            >
              🔔 {activeUpdatesCount > 0 ? `Updates (${activeUpdatesCount})` : 'Updates'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tap-to-Open Alert Banner */}
      {alertBannerText ? (
        <TouchableOpacity
          style={styles.alertPopupBanner}
          activeOpacity={0.8}
          onPress={() => {
            if (stagedOrders.length > 0) {
              setActiveAlertOrder(stagedOrders[0]);
            } else {
              setUpdatesModalVisible(true);
            }
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.alertPopupText}>{alertBannerText}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setAlertBannerText(null)}
            style={styles.alertDismissBtn}
          >
            <Text style={styles.alertDismissText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search positions (e.g. GOOG, AMZN, NVDA, QQQ)..."
          placeholderTextColor="#484f58"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Inline 1-Click Staged Trade Cards */}
      {stagedOrders.map((order) => (
        <StagedTradeApprovalCard
          key={order.id}
          order={order}
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
          <Text style={styles.loadingSubtext}>Connecting to QuantHarvest...</Text>
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

      {/* Alert-Triggered 1-Click Action Sheet Modal */}
      <Modal
        visible={!!activeAlertOrder}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveAlertOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertSheetContent}>
            <View style={styles.alertSheetHeader}>
              <Text style={styles.alertSheetTitle}>⚡ 1-Click Peak Exhaustion Co-Pilot</Text>
              <TouchableOpacity
                onPress={() => setActiveAlertOrder(null)}
                style={styles.alertSheetCloseBtn}
              >
                <Text style={styles.alertSheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            {activeAlertOrder ? (
              <StagedTradeApprovalCard
                order={activeAlertOrder}
                onApprove={handleApproveStaged}
                onReject={handleRejectStaged}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* 🔔 User Updates Modal */}
      <Modal
        visible={updatesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUpdatesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.updatesSheetContent}>
            <View style={styles.alertSheetHeader}>
              <Text style={styles.alertSheetTitle}>
                🔔 Operational User Updates ({activeUpdatesCount})
              </Text>
              <TouchableOpacity
                onPress={() => setUpdatesModalVisible(false)}
                style={styles.alertSheetCloseBtn}
              >
                <Text style={styles.alertSheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.updatesSummaryText}>
              {userUpdates?.summaryText || 'All fleet systems nominal.'}
            </Text>
            <ScrollView style={{ maxHeight: 460 }}>
              {(userUpdates?.events || []).length === 0 ? (
                <View style={styles.nominalBox}>
                  <Text style={styles.nominalText}>
                    ✓ Fleet Systems Nominal: No pending peak exhaustion alerts or macro blackouts.
                  </Text>
                </View>
              ) : (
                (userUpdates?.events || []).map((ev, idx) => {
                  const isPeak = ev.category === 'CC_PEAK_EXHAUSTION';
                  const isWarn = ev.severity === 'WARNING' || ev.severity === 'CRITICAL';
                  return (
                    <View
                      key={`${ev.category}_${ev.symbol || idx}`}
                      style={[
                        styles.updateItemCard,
                        isWarn && styles.updateItemCardWarn,
                      ]}
                    >
                      <Text style={styles.updateItemTitle}>{ev.title}</Text>
                      <Text style={styles.updateItemDetails}>{ev.details}</Text>
                      {ev.actionableNotes ? (
                        <Text style={styles.updateItemNote}>👉 {ev.actionableNotes}</Text>
                      ) : null}
                      <View style={styles.updateItemActions}>
                        {isPeak && (
                          <TouchableOpacity
                            style={styles.updateOpen1ClickBtn}
                            onPress={() => handleOpenUpdateOrder(ev)}
                          >
                            <Text style={styles.updateOpen1ClickText}>
                              ⚡ Open 1-Click CC Ticket
                            </Text>
                          </TouchableOpacity>
                        )}
                        {ev.symbol && (
                          <TouchableOpacity
                            style={styles.updateDismissBtn}
                            onPress={() => handleDismissUpdateItem(ev.symbol)}
                          >
                            <Text style={styles.updateDismissText}>✕ Dismiss</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    gap: 8,
  },
  stagedPillButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  stagedPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
  },
  updatesButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  updatesButtonActive: {
    backgroundColor: 'rgba(255, 152, 0, 0.16)',
    borderColor: 'rgba(255, 152, 0, 0.5)',
  },
  updatesButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#90caf9',
  },
  updatesButtonTextActive: {
    color: '#ffa726',
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
  alertPopupBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertPopupText: {
    color: '#fef3c7',
    fontSize: 12,
    fontWeight: '800',
  },
  alertDismissBtn: {
    padding: 4,
  },
  alertDismissText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  alertSheetContent: {
    backgroundColor: '#0d1117',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  updatesSheetContent: {
    backgroundColor: '#161b22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  alertSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  alertSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f0f6fc',
  },
  alertSheetCloseBtn: {
    padding: 6,
  },
  alertSheetCloseText: {
    color: '#8b949e',
    fontSize: 16,
    fontWeight: '700',
  },
  updatesSummaryText: {
    fontSize: 12,
    color: '#8b949e',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  nominalBox: {
    backgroundColor: 'rgba(8, 153, 129, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#089981',
    padding: 12,
    borderRadius: 6,
  },
  nominalText: {
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '600',
  },
  updateItemCard: {
    backgroundColor: 'rgba(41, 98, 255, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#2962ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  updateItemCardWarn: {
    backgroundColor: 'rgba(255, 152, 0, 0.12)',
    borderLeftColor: '#ff9800',
  },
  updateItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  updateItemDetails: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 17,
  },
  updateItemNote: {
    fontSize: 11,
    color: '#fef08a',
    fontWeight: '700',
    marginTop: 6,
  },
  updateItemActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  updateOpen1ClickBtn: {
    backgroundColor: '#2962ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  updateOpen1ClickText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  updateDismissBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  updateDismissText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
});
