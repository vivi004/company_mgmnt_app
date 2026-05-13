import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';

export default function ProductRates() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header wrapper for Drawer Toggle */}
      <View className="px-6 pt-4 pb-2 flex-row items-center">
        <TouchableOpacity 
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())} 
          className="p-2 border border-slate-200 rounded-xl bg-slate-50"
        >
          <Feather name="menu" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-2 pb-2">
        <View className="mt-4 mb-2 px-2">
          <Text className="text-[22px] font-black tracking-tight italic text-slate-900">
            Rate Card
          </Text>
          <Text className="text-slate-500 font-bold mt-0.5 uppercase text-[9px] tracking-widest">
            Live from Master Database
          </Text>
        </View>

        {/* WebView Wrapper - Direct Sheet 1 (gid=0) */}
        <View className="flex-1 rounded-2xl border border-slate-100 shadow-2xl bg-white overflow-hidden mb-2">
          {Platform.OS === 'web' ? (
            <iframe 
              src={`https://docs.google.com/spreadsheets/d/1gSE3fMAzka_eIlIU2sFR4xC4_IxJTeHAgJkp5YQCSvM/htmlembed?widget=false&headers=false&chrome=false&gid=0`}
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <WebView 
              source={{ uri: `https://docs.google.com/spreadsheets/d/1gSE3fMAzka_eIlIU2sFR4xC4_IxJTeHAgJkp5YQCSvM/htmlembed?widget=false&headers=false&chrome=false&gid=0` }}
              className="flex-1 w-full h-full bg-transparent"
              bounces={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              startInLoadingState={true}
            />
          )}
        </View>
      </View>
      <View style={{ height: insets.bottom, backgroundColor: '#FFFFFF' }} />
    </SafeAreaView>
  );
}
