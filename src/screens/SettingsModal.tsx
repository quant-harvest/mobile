import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { AppConfig } from '../types/portfolio';
import { saveAppConfig } from '../storage/configStorage';

interface Props {
  visible: boolean;
  config: AppConfig;
  onClose: () => void;
  onSave: (updatedConfig: AppConfig) => void;
}

const HOST_PRESETS = [
  { label: '☁️ Cloud Prod', url: 'https://app.quantharvest.com' },
  { label: '🚀 Cloud Stage', url: 'https://qh-stage-xpb7l5xnsq-uk.a.run.app' },
  { label: '💻 Mac LAN (:8080)', url: 'http://192.168.1.85:8080' },
];

export const SettingsModal: React.FC<Props> = ({ visible, config, onClose, onSave }) => {
  const [serverUrl, setServerUrl] = useState(config.serverUrl);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [refreshInterval, setRefreshInterval] = useState(config.autoRefreshIntervalSec.toString());

  useEffect(() => {
    setServerUrl(config.serverUrl);
    setApiKey(config.apiKey);
    setRefreshInterval(config.autoRefreshIntervalSec.toString());
  }, [config, visible]);

  const handleSave = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Server URL cannot be empty');
      return;
    }

    const interval = parseInt(refreshInterval, 10) || 10;
    const updated: AppConfig = {
      serverUrl: serverUrl.trim(),
      apiKey: apiKey.trim(),
      autoRefreshIntervalSec: interval,
    };

    await saveAppConfig(updated);
    onSave(updated);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>QuantHarvest Connection</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>QUANTHARVEST HOST / URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="https://app.quantharvest.com"
              placeholderTextColor="#484f58"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.presetsRow}>
              {HOST_PRESETS.map(p => (
                <TouchableOpacity
                  key={p.url}
                  style={[
                    styles.presetChip,
                    serverUrl.trim() === p.url && styles.presetChipActive,
                  ]}
                  onPress={() => setServerUrl(p.url)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      serverUrl.trim() === p.url && styles.presetChipTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>API KEY (OPTIONAL FOR LAN DEV)</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Enter Cockpit API Key for Cloud Prod"
              placeholderTextColor="#484f58"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={true}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>AUTO-REFRESH INTERVAL (SECONDS)</Text>
            <TextInput
              style={styles.input}
              value={refreshInterval}
              onChangeText={setRefreshInterval}
              placeholder="10"
              placeholderTextColor="#484f58"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save & Reconnect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#161b22',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f0f6fc',
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: '#8b949e',
    fontSize: 16,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b949e',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0d1117',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f0f6fc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#21262d',
    borderWidth: 1,
    borderColor: '#30363d',
  },
  presetChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderColor: '#38bdf8',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b949e',
  },
  presetChipTextActive: {
    color: '#38bdf8',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#21262d',
  },
  cancelText: {
    color: '#8b949e',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#38bdf8',
  },
  saveText: {
    color: '#0d1117',
    fontWeight: '700',
    fontSize: 14,
  },
});
