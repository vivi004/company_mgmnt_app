import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import API_BASE_URL from '../config/api';
import { getAuthToken } from './authService';

// Configure how notifications are displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers this device for push notifications, retrieves the token,
 * and sends it to the backend for the current employee.
 */
export async function registerForPushNotificationsAsync(employeeId: number): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[PUSH] Must use physical device for Push Notifications');
    return null;
  }

  try {
    // 1. Check existing permissions using the standard 'granted' property
    const settings = await Notifications.getPermissionsAsync();
    let isGranted = (settings as any).granted;

    // 2. Request permissions if not already granted
    if (!isGranted) {
      const response = await Notifications.requestPermissionsAsync();
      isGranted = (response as any).granted;
    }

    if (!isGranted) {
      console.log('[PUSH] Failed to get push token: permission not granted');
      return null;
    }

    // 3. Get Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '7ce43538-a6e0-4790-bc5e-2c5c4c380e10',
    });
    const token = tokenData.data;
    console.log('[PUSH] Retrieved Expo Push Token:', token);

    // 4. Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7A',
      });
    }

    // 5. Send the token to the backend database
    const authToken = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/push-token`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ expo_push_token: token }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to save token on server');
    }

    console.log('[PUSH] Successfully registered and saved push token on server');
    return token;
  } catch (error) {
    console.error('[PUSH ERROR] Error during registration:', error);
    return null;
  }
}
