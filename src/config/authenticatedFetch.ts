import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './api';
import { logout } from '../services/authService';

/**
 * A wrapper around fetch that handles 401 Unauthorized errors by logging out the user.
 */
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const maxRetries = 2;
  let attempt = 0;
  let lastError: any;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        // Session is invalid on server side
        await logout();
        throw new Error('UNAUTHORIZED');
      }

      if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new Error(`SERVER_TEMP_ERROR_${response.status}`);
      }

      return response;
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        throw err;
      }
      lastError = err;
      attempt++;
      if (attempt <= maxRetries) {
        const delay = attempt * 2000; // Linear backoff: 2s, 4s to allow Render sleep spin-up
        console.warn(`[FETCH RETRY] Network hit failed. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};
