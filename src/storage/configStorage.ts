import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig } from '../types/portfolio';

const STORAGE_KEY_SERVER_URL = '@quantharvest_server_url';
const STORAGE_KEY_API_KEY = '@quantharvest_api_key';
const STORAGE_KEY_REFRESH = '@quantharvest_refresh_interval';

// Legacy WaveSkimmer keys for seamless migration
const LEGACY_KEY_SERVER_URL = '@waveskimmer_server_url';
const LEGACY_KEY_API_KEY = '@waveskimmer_api_key';
const LEGACY_KEY_REFRESH = '@waveskimmer_refresh_interval';

export const DEFAULT_CONFIG: AppConfig = {
  serverUrl: 'https://app.quantharvest.com',
  apiKey: '',
  autoRefreshIntervalSec: 10,
};

export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const [storedUrl, storedKey, storedInterval, legacyUrl, legacyKey, legacyInterval] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_SERVER_URL),
      AsyncStorage.getItem(STORAGE_KEY_API_KEY),
      AsyncStorage.getItem(STORAGE_KEY_REFRESH),
      AsyncStorage.getItem(LEGACY_KEY_SERVER_URL),
      AsyncStorage.getItem(LEGACY_KEY_API_KEY),
      AsyncStorage.getItem(LEGACY_KEY_REFRESH),
    ]);

    const candidateUrl = storedUrl || legacyUrl || DEFAULT_CONFIG.serverUrl;
    // Automatically migrate retired WaveSkimmer port 8444 URL to QuantHarvest production
    const resolvedUrl = candidateUrl.includes(':8444') ? DEFAULT_CONFIG.serverUrl : candidateUrl;
    const resolvedKey = storedKey ?? legacyKey ?? DEFAULT_CONFIG.apiKey;
    const rawInterval = storedInterval ?? legacyInterval;

    return {
      serverUrl: resolvedUrl,
      apiKey: resolvedKey,
      autoRefreshIntervalSec: rawInterval ? parseInt(rawInterval, 10) : DEFAULT_CONFIG.autoRefreshIntervalSec,
    };
  } catch (err) {
    console.warn('Failed to read config from storage, using defaults:', err);
    return DEFAULT_CONFIG;
  }
}

export async function saveAppConfig(config: Partial<AppConfig>): Promise<void> {
  try {
    const promises: Promise<void>[] = [];
    if (config.serverUrl !== undefined) {
      promises.push(AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, config.serverUrl.trim()));
    }
    if (config.apiKey !== undefined) {
      promises.push(AsyncStorage.setItem(STORAGE_KEY_API_KEY, config.apiKey.trim()));
    }
    if (config.autoRefreshIntervalSec !== undefined) {
      promises.push(AsyncStorage.setItem(STORAGE_KEY_REFRESH, config.autoRefreshIntervalSec.toString()));
    }
    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to save config to storage:', err);
  }
}
