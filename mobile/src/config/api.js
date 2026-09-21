import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_API_URL = '@biblioteca_api_url';
const LEGACY_API_URL = 'http://10.15.10.50:3000';

// Default URLs depending on environment
// Current Wi-Fi IP of the backend machine: 10.206.198.97:3000
export const DEFAULT_API_URL = 'http://10.206.198.97:3000';

let currentApiUrl = DEFAULT_API_URL;

export async function getBaseUrl() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
    if (saved) {
      if (saved === LEGACY_API_URL) {
        await AsyncStorage.setItem(STORAGE_KEY_API_URL, DEFAULT_API_URL);
        currentApiUrl = DEFAULT_API_URL;
        return DEFAULT_API_URL;
      }
      currentApiUrl = saved;
      return saved;
    }
  } catch (e) {
    console.warn('Error reading API URL from storage:', e);
  }
  return currentApiUrl;
}

export async function setBaseUrl(url) {
  try {
    currentApiUrl = url;
    await AsyncStorage.setItem(STORAGE_KEY_API_URL, url);
  } catch (e) {
    console.error('Error saving API URL:', e);
  }
}
