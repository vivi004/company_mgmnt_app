import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../config/api';
import { getAuthToken, getUserData } from '../../services/authService';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = await getUserData();
      if (user) {
        setUserData(user);
        setProfilePic(user.profile_pic || null);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      handleUpdateProfilePic(base64Image);
    }
  };

  const handleUpdateProfilePic = async (base64Image: string) => {
    if (!userData?.id) return;

    setLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/employees/${userData.id}/profile-pic`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ profile_pic: base64Image }),
      });

      const data = await response.json();

      if (response.ok) {
        setProfilePic(base64Image);
        const updatedUser = { ...userData, profile_pic: base64Image };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        setUserData(updatedUser);
        Alert.alert('Success', 'Profile picture updated successfully');
      } else {
        throw new Error(data.message || 'Update failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  };

  const removeProfilePic = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => handleUpdateProfilePic(''),
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <View className="px-6 pt-12 pb-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          className="w-12 h-12 bg-white rounded-2xl items-center justify-center shadow-sm border border-slate-100"
        >
          <Ionicons name="menu-outline" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Settings</Text>
        <View className="w-12" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="mx-6 mt-6 bg-white rounded-[40px] shadow-xl shadow-slate-200 border border-slate-50 overflow-hidden">
          <View className="p-8 items-center">
            <View className="flex-row items-center mb-10 w-full px-2">
              <View className="w-16 h-16 bg-[#10B981] rounded-[20px] items-center justify-center shadow-lg shadow-emerald-500/30 mr-4">
                <MaterialIcons name="photo-camera" size={32} color="white" />
              </View>
              <View>
                <Text className="text-2xl font-black text-slate-900 tracking-tighter">Profile Identity</Text>
                <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                  Personalize Your Presence
                </Text>
              </View>
            </View>

            <View className="relative">
              <View className="w-48 h-48 rounded-full border-4 border-slate-50 shadow-2xl overflow-hidden bg-slate-100">
                {profilePic ? (
                  <Image
                    source={{ uri: profilePic }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={500}
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center bg-slate-100">
                    <Text className="text-6xl font-black italic text-slate-300">
                      {userData?.first_name ? userData.first_name[0] : 'A'}
                    </Text>
                  </View>
                )}
              </View>
              
              {loading && (
                <View className="absolute inset-0 bg-white/40 rounded-full items-center justify-center">
                  <ActivityIndicator color="#4F46E5" size="large" />
                </View>
              )}
            </View>

            <View className="items-center mt-10 w-full">
              <Text className="text-xl font-black italic text-slate-800 mb-2">Customize your Avatar</Text>
              <Text className="text-slate-500 text-sm font-medium text-center px-4 mb-8">
                Upload a profile image to make your dashboard unique. Recommended size: 400x400px.
              </Text>

              <View className="w-full">
                <TouchableOpacity
                  onPress={pickImage}
                  disabled={loading}
                  activeOpacity={0.8}
                  className="mb-4"
                >
                  <LinearGradient
                    colors={['#6366F1', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 24 }}
                  >
                    <View className="py-4 items-center">
                      <Text className="text-white font-black text-[12px] uppercase tracking-widest">
                        Browse Image
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={removeProfilePic}
                  disabled={loading || !profilePic}
                  className={`py-4 rounded-[24px] border ${
                    !profilePic ? 'border-slate-100 bg-slate-50' : 'border-slate-100 bg-white'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-black text-[12px] uppercase tracking-widest text-center ${
                      !profilePic ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Remove Photo
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">
                Supports .PNG, .JPG, .GIF
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={{ height: insets.bottom, backgroundColor: '#F8FAFC' }} />
    </View>
  );
}
