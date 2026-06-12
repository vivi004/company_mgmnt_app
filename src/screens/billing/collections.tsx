import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as collectionService from '../../services/collectionService';

import { getUserData } from '../../services/authService';

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CollectionsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().split('T')[0];
  });
  const [orderLines, setOrderLines] = useState<any[]>([]);
  const [selectedOlId, setSelectedOlId] = useState<number | null>(null);
  const [collections, setCollections] = useState<collectionService.DailyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      const allOls = await collectionService.fetchOrderLines();
      const userData = await getUserData();
      let filteredOls = allOls;

      if (userData && userData.accessible_orderlines) {
        let authorizedIds: number[] = [];
        const raw = userData.accessible_orderlines;

        if (typeof raw === 'string') {
          try {
            authorizedIds = JSON.parse(raw);
          } catch (e) {
            authorizedIds = raw.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          }
        } else if (Array.isArray(raw)) {
          authorizedIds = raw;
        }

        if (authorizedIds.length > 0) {
          filteredOls = allOls.filter((ol: any) => authorizedIds.includes(ol.id));
        }
      }

      setOrderLines(filteredOls);
      if (filteredOls.length > 0 && selectedOlId === null) {
        setSelectedOlId(filteredOls[0].id);
      }
    } catch (error) {
      console.error('Failed to load order lines:', error);
    }
  }, []); // Stable: no dependencies to prevent loops

  const loadCollections = useCallback(async (olId: number, date: string) => {
    setLoading(true);
    try {
      const data = await collectionService.fetchCollectionsByOrderLine(olId, date);
      setCollections(data.collections);
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (selectedOlId) {
      loadCollections(selectedOlId, selectedDate);
    }
  }, [selectedOlId, selectedDate, loadCollections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedOlId) {
      await loadCollections(selectedOlId, selectedDate);
    }
    setRefreshing(false);
  }, [selectedOlId, selectedDate, loadCollections]);

  const totals = useMemo(() => {
    return collections.reduce(
      (acc, row) => {
        const rowCollected = row.cash_collected + row.upi_collected + row.cheque_collected;
        return {
          amountCollected: acc.amountCollected + rowCollected,
          todaysBillAmount: acc.todaysBillAmount + row.todays_bill_amount,
          todaysBillBalance: acc.todaysBillBalance + Math.max(0, row.todays_bill_amount - rowCollected),
          totalBalance: acc.totalBalance + row.total_balance,
        };
      },
      { amountCollected: 0, todaysBillAmount: 0, todaysBillBalance: 0, totalBalance: 0 }
    );
  }, [collections]);

  const modeBreakdown = useMemo(() => {
    const cash = collections.reduce((sum, r) => sum + r.cash_collected, 0);
    const upi = collections.reduce((sum, r) => sum + r.upi_collected, 0);
    const cheque = collections.reduce((sum, r) => sum + r.cheque_collected, 0);
    const total = cash + upi + cheque;
    return {
      cash,
      upi,
      cheque,
      total,
      cashPercent: total > 0 ? ((cash / total) * 100).toFixed(1) : '0.0',
      upiPercent: total > 0 ? ((upi / total) * 100).toFixed(1) : '0.0',
      chequePercent: total > 0 ? ((cheque / total) * 100).toFixed(1) : '0.0',
    };
  }, [collections]);

  const changeDate = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: insets.top }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="px-6 pt-1 flex-row items-center justify-between mb-2">
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          className="w-10 h-10 bg-white rounded-[12px] items-center justify-center shadow-sm border border-slate-50"
        >
          <Feather name="menu" size={20} color="#1E293B" />
        </TouchableOpacity>
        
        <View className="flex-row items-center bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <TouchableOpacity onPress={() => changeDate(-1)} className="px-3 py-2 border-r border-slate-100 bg-slate-50 active:bg-slate-100">
            <Feather name="chevron-left" size={18} color="#475569" />
          </TouchableOpacity>
          <View className="flex-row items-center px-4 py-2">
            <Feather name="calendar" size={16} color="#475569" className="mr-2" />
            <Text className="font-bold text-slate-700 text-xs ml-2">{selectedDate}</Text>
          </View>
          <TouchableOpacity onPress={() => changeDate(1)} className="px-3 py-2 border-l border-slate-100 bg-slate-50 active:bg-slate-100">
            <Feather name="chevron-right" size={18} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-6 mb-4">
        <Text className="text-3xl font-black text-[#1E293B] tracking-tighter">
          Today Collection
        </Text>
        <Text className="text-xs font-bold text-slate-400 mt-0.5">
          Daily billing & payment summary
        </Text>
      </View>

      {/* Order Line Tabs */}
      <View className="mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}>
          {orderLines.map(ol => {
            const isActive = ol.id === selectedOlId;
            return (
              <TouchableOpacity
                key={ol.id ? ol.id.toString() : Math.random().toString()}
                onPress={() => setSelectedOlId(ol.id)}
                className={isActive 
                  ? "px-5 py-3 rounded-2xl border flex-row items-center gap-2 bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/30" 
                  : "px-5 py-3 rounded-2xl border flex-row items-center gap-2 bg-white border-slate-100"}
              >
                <Text className={isActive ? 'text-white' : 'text-slate-400'}>🗺️</Text>
                <Text className={isActive 
                  ? "font-black text-[10px] uppercase tracking-widest text-white" 
                  : "font-black text-[10px] uppercase tracking-widest text-slate-600"}
                >
                  {ol.name || 'Unknown'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {/* Summary Cards Grid */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          <View className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex-1 min-w-[45%]">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-base">🧾</Text>
              <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">Billed Today</Text>
            </View>
            <Text className="text-lg font-black text-[#1E293B]">₹{fmt(totals.todaysBillAmount)}</Text>
          </View>
          <View className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex-1 min-w-[45%]">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-base">💰</Text>
              <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">Collected</Text>
            </View>
            <Text className="text-lg font-black text-emerald-600">₹{fmt(totals.amountCollected)}</Text>
          </View>
          <View className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex-1 min-w-[45%]">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-base">⏳</Text>
              <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pending</Text>
            </View>
            <Text className={`text-lg font-black ${totals.todaysBillBalance > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>₹{fmt(totals.todaysBillBalance)}</Text>
          </View>
          <View className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex-1 min-w-[45%]">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-base">🏪</Text>
              <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">Shops</Text>
            </View>
            <Text className="text-lg font-black text-blue-600">{collections.length}</Text>
          </View>
        </View>

        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="text-slate-400 font-bold mt-4">Loading collection details...</Text>
          </View>
        ) : collections.length === 0 ? (
          <View className="bg-white p-12 rounded-[48px] items-center justify-center border border-slate-50 shadow-sm">
            <Text className="text-5xl mb-6">📭</Text>
            <Text className="text-xl font-black text-[#475569] mb-2">No collections recorded</Text>
            <Text className="text-slate-400 font-bold text-center">No billing or payment activity found for this date.</Text>
          </View>
        ) : (
          <View className="space-y-6">
            {/* Detailed List */}
            <View className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
              <View className="px-6 py-4 border-b border-slate-50">
                <Text className="text-xs font-black uppercase tracking-widest text-slate-500">📋 Collection Details</Text>
              </View>
              
              {collections.map((row, idx) => {
                const collected = row.cash_collected + row.upi_collected + row.cheque_collected;
                const billBalance = Math.max(0, row.todays_bill_amount - collected);
                return (
                  <View key={row.id} className={idx !== collections.length - 1 ? "p-6 border-b border-slate-50" : "p-6"}>
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-1 mr-2">
                        <Text className="font-black text-slate-800 text-base">{idx + 1}. {row.shop_name}</Text>
                        <Text className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">{row.owner_name || 'No Owner Name'}</Text>
                      </View>
                      <View className="flex-row gap-1">
                        {row.cash_collected > 0 && (
                          <View className="bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                            <Text className="text-[8px] font-black text-green-600">CASH</Text>
                          </View>
                        )}
                        {row.upi_collected > 0 && (
                          <View className="bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                            <Text className="text-[8px] font-black text-blue-600">UPI</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <View className="grid grid-cols-2 flex-row flex-wrap gap-y-3">
                      <View className="w-1/2">
                        <Text className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Bill Today</Text>
                        <Text className="font-black text-slate-700">₹{fmt(row.todays_bill_amount)}</Text>
                      </View>
                      <View className="w-1/2 items-end">
                        <Text className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Collected</Text>
                        <Text className={collected > 0 ? "font-black text-emerald-600" : "font-black text-slate-400"}>₹{fmt(collected)}</Text>
                      </View>
                      <View className="w-1/2">
                        <Text className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Bill Bal</Text>
                        <Text className={billBalance > 0 ? "font-black text-amber-500" : "font-black text-emerald-600"}>₹{fmt(billBalance)}</Text>
                      </View>
                      <View className="w-1/2 items-end">
                        <Text className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Total Bal</Text>
                        <Text className={row.total_balance > 0 ? "font-black text-red-500" : "font-black text-emerald-600"}>₹{fmt(row.total_balance)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
              
              {/* Grand Total Row */}
              <View className="bg-blue-50/50 p-6 border-t border-blue-100">
                <Text className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">GRAND TOTAL</Text>
                <View className="flex-row flex-wrap gap-y-3">
                   <View className="w-1/2">
                    <Text className="text-[9px] font-black uppercase text-blue-400 mb-0.5">Total Bill</Text>
                    <Text className="text-lg font-black text-blue-900">₹{fmt(totals.todaysBillAmount)}</Text>
                  </View>
                  <View className="w-1/2 items-end">
                    <Text className="text-[9px] font-black uppercase text-blue-400 mb-0.5">Total Collected</Text>
                    <Text className="text-lg font-black text-emerald-600">₹{fmt(totals.amountCollected)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Mode Breakdown */}
            {modeBreakdown.total > 0 && (
              <View className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                <View className="px-6 py-4 border-b border-slate-50">
                  <Text className="text-xs font-black uppercase tracking-widest text-slate-500">💰 Collection Breakdown</Text>
                </View>
                
                {[
                  { icon: '💵', label: 'Cash', amount: modeBreakdown.cash, percent: modeBreakdown.cashPercent, color: '#10B981' },
                  { icon: '📱', label: 'UPI', amount: modeBreakdown.upi, percent: modeBreakdown.upiPercent, color: '#2563EB' },
                  { icon: '📝', label: 'Cheque', amount: modeBreakdown.cheque, percent: modeBreakdown.chequePercent, color: '#F59E0B' },
                ].map(mode => (
                  <View key={mode.label} className="p-6 border-b border-slate-50 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <Text className="text-xl">{mode.icon}</Text>
                      <View>
                        <Text className="font-black text-slate-800">{mode.label}</Text>
                        <Text className="text-[10px] font-bold text-slate-400">{mode.percent}% Share</Text>
                      </View>
                    </View>
                    <Text className="font-black text-slate-800 text-lg">₹{fmt(mode.amount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
