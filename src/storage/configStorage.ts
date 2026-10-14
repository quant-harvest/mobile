import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig } from '../types/portfolio';

const STORAGE_KEY_SERVER_URL = '@quantharvest_server_url';
const STORAGE_KEY_API_KEY = '@quantharvest_api_key';
const STORAGE_KEY_REFRESH = '@quantharvest_refresh_interval';

export const DEFAULT_CONFIG: AppConfig = {
  serverUrl: 'https://app.quantharvest.com',
  apiKey: '',
  autoRefreshIntervalSec: 10,
};

export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const [storedUrl, storedKey, storedInterval] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_SERVER_URL),
      AsyncStorage.getItem(STORAGE_KEY_API_KEY),
      AsyncStorage.getItem(STORAGE_KEY_REFRESH),
    ]);

    const candidateUrl = storedUrl || DEFAULT_CONFIG.serverUrl;
    const resolvedUrl = candidateUrl.includes(':8444') ? DEFAULT_CONFIG.serverUrl : candidateUrl;
    const resolvedKey = storedKey ?? DEFAULT_CONFIG.apiKey;
    const rawInterval = storedInterval;

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
