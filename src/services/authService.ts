import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config/api';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface LoginResponse {
  success: boolean;
  token: string;
  role: string;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    accessible_orderlines: string;
    profile_pic: string;
  };
  message?: string;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }

  return data;
};

export const saveAuthData = async (token: string, user: LoginResponse['user'], role: string) => {
  await AsyncStorage.setItem('authToken', token);
  await AsyncStorage.setItem('userRole', role);
  await AsyncStorage.setItem('userData', JSON.stringify(user));
  await AsyncStorage.setItem('loginTimestamp', Date.now().toString());
};

export const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('authToken');
};

export const getUserData = async () => {
  const data = await AsyncStorage.getItem('userData');
  return data ? JSON.parse(data) : null;
};

export const logout = async () => {
  await AsyncStorage.removeItem('authToken');
  await AsyncStorage.removeItem('userRole');
  await AsyncStorage.removeItem('userData');
  await AsyncStorage.removeItem('loginTimestamp');
};

export const isSessionValid = async (): Promise<boolean> => {
  const timestampStr = await AsyncStorage.getItem('loginTimestamp');
  if (!timestampStr) return false;

  const loginTime = parseInt(timestampStr, 10);
  const currentTime = Date.now();
  
  return currentTime - loginTime < SESSION_DURATION;
};

export const isAuthenticated = async (): Promise<boolean> => {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) return false;
  
  const valid = await isSessionValid();
  if (!valid) {
    await logout();
    return false;
  }
  
  return true;
};
