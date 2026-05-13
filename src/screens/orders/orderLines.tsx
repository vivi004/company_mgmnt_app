import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useRouter, useNavigation } from 'expo-router';
import { fetchOrderLines, OrderLine } from '../../services/shopService';
import { getUserData } from '../../services/authService';

export default function OrderLines() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrderLines();
  }, []);

  const loadOrderLines = async () => {
    setLoading(true);
    setError('');
    try {
      const allData = await fetchOrderLines();
      const userData = await getUserData();

      // If user is Admin, show all. If Staff, filter by accessible_orderlines.
      if (userData && userData.accessible_orderlines) {
        let authorizedIds: number[] = [];
        const raw = userData.accessible_orderlines;

        if (typeof raw === 'string') {
          try {
            authorizedIds = JSON.parse(raw);
          } catch (e) {
            // If it's a comma separated string instead of JSON
            authorizedIds = raw.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          }
        } else if (Array.isArray(raw)) {
          authorizedIds = raw;
        }

        if (authorizedIds.length > 0) {
          const filtered = allData.filter(ol => authorizedIds.includes(ol.id));
          setOrderLines(filtered);
          return;
        }
      }

      setOrderLines(allData);
    } catch {
      setError('Failed to load sectors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVillage = (ol: OrderLine) => {
    router.push({
      pathname: '/(drawer)/shop-list' as any,
      params: { orderLineId: ol.id, villageName: ol.name, areaName: ol.area_name || ol.name },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="px-6 pt-4 pb-2 flex-row items-center">
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          className="p-2.5 border border-slate-200 rounded-2xl bg-white shadow-sm"
        >
          <Feather name="menu" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <View className="px-6 pt-4 pb-2 flex-row items-end justify-between">
        <View>
          <Text className="text-4xl font-black tracking-tight text-slate-900 italic leading-tight">
            Sector{'\n'}Directory
          </Text>
          <Text className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">
            Click a village to view shops
          </Text>
        </View>
        <View className="bg-slate-100 px-4 py-2 rounded-2xl">
          <Text className="text-slate-500 font-black text-xs uppercase tracking-widest">
            {orderLines.length} Nodes Identified
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
          <Text className="text-emerald-500 font-black italic uppercase tracking-widest mt-4 animate-pulse">
            Syncing Sector Data...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 font-bold text-center mb-4">{error}</Text>
          <TouchableOpacity
            onPress={loadOrderLines}
            className="bg-emerald-600 px-6 py-3 rounded-2xl"
          >
            <Text className="text-white font-black uppercase tracking-widest text-xs">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orderLines}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 24, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadOrderLines} colors={['#10B981']} />
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => handleSelectVillage(item)}
              activeOpacity={0.85}
              className="bg-white border border-slate-100 rounded-[28px] p-5 flex-row items-center justify-between mb-4 shadow-lg shadow-slate-200/30"
              style={{ shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 }}
            >
              <View className="flex-row items-center flex-1 mr-3">
                {/* Node Number Badge */}
                <View className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 items-center justify-center mr-4">
                  <Text className="text-emerald-600 text-2xl font-black">{index + 1}</Text>
                </View>
                {/* Node Info */}
                <View className="flex-1">
                  <Text className="text-slate-900 font-black tracking-tight uppercase italic text-base leading-tight">
                    {item.name}
                  </Text>
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                    Node ID: {item.node_id}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        />
      )}
      <View style={{ height: insets.bottom, backgroundColor: '#F8FAFC' }} />
    </SafeAreaView>
  );
}
