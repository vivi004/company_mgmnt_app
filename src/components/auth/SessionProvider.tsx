import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { isSessionValid, logout, getAuthToken } from '../../services/authService';
import { loadCachedRates, fetchAndCacheRatesFromServer } from '../../services/productService';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const appState = useRef(AppState.currentState);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  const performSessionCheck = async () => {
    // We only care about session validity if we are NOT on the auth screens
    // Using cast to any to bypass strict union type checks in different Expo versions
    const currentSegments = segments as any[];
    const isAuthRoute = currentSegments.includes('login') || currentSegments.length === 0 || (currentSegments.length === 1 && currentSegments[0] === 'index');
    
    if (isAuthRoute) return;

    const valid = await isSessionValid();
    
    if (valid) {
        // If session is valid, try to refresh product rates from server in background
        fetchAndCacheRatesFromServer();
    } else {
      await logout();
      Alert.alert(
        "Session Expired",
        "Your session has expired (24 hours). Please login again.",
        [{ text: "OK", onPress: () => router.replace('/login') }]
      );
    }
  };

  useEffect(() => {
    // Initial check
    loadCachedRates(); // Load what we have in storage first
    performSessionCheck();

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        performSessionCheck();
      }
      appState.current = nextAppState;
    });

    // Periodic check every 15 seconds for faster rate syncing
    checkInterval.current = setInterval(performSessionCheck, 15000);

    return () => {
      subscription.remove();
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, [segments]);

  return <>{children}</>;
}
