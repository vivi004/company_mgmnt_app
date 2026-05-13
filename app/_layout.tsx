import "../global.css";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LogBox } from 'react-native';
import { ReanimatedLogLevel, configureReanimatedLogger } from 'react-native-reanimated';
import { SessionProvider } from "../src/components/auth/SessionProvider";
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreLogs(['ExpoKeepAwake.activate']);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...Feather.font,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
