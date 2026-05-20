import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { login, saveAuthData } from '../../services/authService';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const response = await login(username.trim(), password);

      if (response.success) {
        await saveAuthData(response.token, response.user, response.role);
        // Navigate to main app after successful login
        router.replace('/(drawer)/product-rates');
        Alert.alert('Success', `Welcome, ${response.user.first_name}!`);
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFBFD]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-8">
            {/* Logo Card */}
            <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 w-36 h-24 items-center justify-center mb-6">
              <Image
                source={require('../../../assets/dw_img/Logo.png')}
                className="w-24 h-16"
                resizeMode="contain"
              />
            </View>

            <Text className="text-4xl font-bold text-[#1C2434] mb-2">Sign In</Text>
            <Text className="text-center text-[#64748B] text-base px-4">
              Login to access the Nisha Oil Mill dashboard
            </Text>
          </View>

          {/* Form Fields */}
          <View className="mb-6">
            <Text className="text-[#334155] font-bold text-sm ml-2 mb-2">Username</Text>
            <View className="bg-[#F1F5F9] rounded-3xl h-14 px-6 justify-center mb-5">
              <TextInput
                placeholder="Enter your username"
                placeholderTextColor="#94A3B8"
                className="flex-1 text-[#1E293B] text-base font-medium"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text className="text-[#334155] font-bold text-sm ml-2 mb-2">Password</Text>
            <View className="bg-[#F1F5F9] rounded-3xl h-14 px-6 flex-row items-center mb-2">
              <TextInput
                placeholder="Enter password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!passwordVisible}
                className="flex-1 text-[#1E293B] text-base font-medium"
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} className="ml-2">
                <Feather name={passwordVisible ? "eye" : "eye-off"} size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className="bg-[#2563EB] rounded-full h-14 justify-center items-center mt-2 shadow-lg shadow-blue-500/30"
            onPress={handleLogin}
            disabled={loading}
            style={loading ? { opacity: 0.7 } : {}}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white text-lg font-bold">Sign In</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
