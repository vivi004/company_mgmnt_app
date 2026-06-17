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

LogBox.ignoreLogs([
  'ExpoKeepAwake.activate',
  'InteractionManager has been deprecated'
]);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...Feather.font,
  });
  const [isDelayOver, setIsDelayOver] = React.useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDelayOver(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ((loaded || error) && isDelayOver) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, isDelayOver]);

  if ((!loaded && !error) || !isDelayOver) {
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
