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

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Session is invalid on server side
    await logout();
    // We can't easily trigger a navigation from here without a circular dependency 
    // or passing the router. Instead, we rely on the error to be caught by the screen,
    // and the SessionProvider to catch the state change or the user to be redirected 
    // on next app-state change.
    // However, throwing a specific error helps.
    throw new Error('UNAUTHORIZED');
  }

  return response;
};
