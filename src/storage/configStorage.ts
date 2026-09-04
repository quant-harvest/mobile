import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig } from '../types/portfolio';

const STORAGE_KEY_SERVER_URL = '@waveskimmer_server_url';
const STORAGE_KEY_API_KEY = '@waveskimmer_api_key';
const STORAGE_KEY_REFRESH = '@waveskimmer_refresh_interval';

export const DEFAULT_CONFIG: AppConfig = {
  // Uses plain HTTP port 8444 on your Mac's Wi-Fi IP to avoid mobile self-signed SSL cert rejections
  serverUrl: 'http://192.168.1.85:8444',
  apiKey: '',
  autoRefreshIntervalSec: 15,
};

export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const [storedUrl, storedKey, storedInterval] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_SERVER_URL),
      AsyncStorage.getItem(STORAGE_KEY_API_KEY),
      AsyncStorage.getItem(STORAGE_KEY_REFRESH),
    ]);

    return {
      serverUrl: storedUrl || DEFAULT_CONFIG.serverUrl,
      apiKey: storedKey || DEFAULT_CONFIG.apiKey,
      autoRefreshIntervalSec: storedInterval ? parseInt(storedInterval, 10) : DEFAULT_CONFIG.autoRefreshIntervalSec,
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
