import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  TextInput, ActivityIndicator, Alert, Modal,
  ScrollView, Image, BackHandler
} from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { fetchShopsByVillage, createShop, collectPayment, fetchShopLedger, adjustBalance, Shop } from '../../services/shopService';
import { getUserData } from '../../services/authService';

export default function ShopListScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderLineId, villageName, areaName } = useLocalSearchParams<{ orderLineId: string; villageName: string; areaName: string }>();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ shop_name: '', owner_name: '', shop_owner: '', phone: '', phone2: '', balance: '' });
  const [submitting, setSubmitting] = useState(false);

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'status'>('status');
  const [showSortModal, setShowSortModal] = useState(false);
  
  // Payment Collection States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  const [upiApp, setUpiApp] = useState<'PhonePe' | 'GPay' | 'Paytm' | 'Other'>('PhonePe');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [collecting, setCollecting] = useState(false);

  // Ledger States
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerSkip, setLedgerSkip] = useState(0);
  const [ledgerHasMore, setLedgerHasMore] = useState(true);

  // Adjustment States
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDescription, setAdjDescription] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Define loadShops FIRST (as useCallback so it's stable and can be used in hooks below)
  const loadShops = useCallback(async () => {
    if (!orderLineId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchShopsByVillage(Number(orderLineId));
      // Normalize MySQL 0/1 integers to real booleans
      const normalized = data.map(s => ({
        ...s,
        has_order_today: s.has_order_today === true || (s.has_order_today as any) === 1,
      }));
      setShops(normalized);
    } catch {
      Alert.alert('Error', 'Failed to load shops. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [orderLineId]);

  // (Removed scrollToOffset to prevent React Native FlatList layout errors during fast filtering)

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  // Refresh shop statuses and handle hardware back on screen focus
  useFocusEffect(
    useCallback(() => {
      loadShops();

      const backAction = () => {
        router.navigate('/(drawer)/order-lines');
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }, [loadShops, router])
  );

  const filteredShops = useMemo(() => {
    let result = [...shops];

    // Search filter
    if (search.trim()) {
      result = result.filter(s =>
        s.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.shop_owner?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search)
      );
    }

    // Status filter — has_order_today is now a real boolean
    if (filterStatus === 'pending') {
      result = result.filter(s => !s.has_order_today);
    } else if (filterStatus === 'completed') {
      result = result.filter(s => !!s.has_order_today);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'balance') return b.balance - a.balance;
      if (sortBy === 'status') {
        // Pending (false) first, completed (true) last
        if (!!a.has_order_today === !!b.has_order_today) return a.shop_name.localeCompare(b.shop_name);
        return a.has_order_today ? 1 : -1;
      }
      return a.shop_name.localeCompare(b.shop_name);
    });

    return result;
  }, [shops, search, filterStatus, sortBy]);

  const handleAddShop = async () => {
    if (submitting) return;
    if (!formData.shop_name.trim()) {
      Alert.alert('Error', 'Shop name is required.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await getUserData();
      const userName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Staff');
      
      await createShop({
        order_line_id: Number(orderLineId),
        village_name: villageName,
        shop_name: formData.shop_name,
        owner_name: formData.owner_name,
        shop_owner: formData.shop_owner,
        phone: formData.phone,
        phone2: formData.phone2,
        balance: parseFloat(formData.balance) || 0,
        created_by: userName,
      });
      setShowModal(false);
      setFormData({ shop_name: '', owner_name: '', shop_owner: '', phone: '', phone2: '', balance: '' });
      loadShops();
    } catch {
      Alert.alert('Error', 'Failed to add shop. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchLedger = async (shop: Shop) => {
    setSelectedShop(shop);
    setShowLedgerModal(true);
    setLoadingLedger(true);
    setLedgerSkip(0);
    setLedgerHasMore(true);
    try {
      const data = await fetchShopLedger(shop.id, 20, 0);
      setLedgerData(data);
      if (data.length < 20) setLedgerHasMore(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch ledger');
    } finally {
      setLoadingLedger(false);
    }
  };

  const loadMoreLedger = async () => {
    if (!selectedShop || loadingLedger || !ledgerHasMore) return;
    const newSkip = ledgerSkip + 20;
    setLoadingLedger(true);
    try {
      const data = await fetchShopLedger(selectedShop.id, 20, newSkip);
      if (data.length > 0) {
        setLedgerData(prev => [...prev, ...data]);
        setLedgerSkip(newSkip);
      }
      if (data.length < 20) setLedgerHasMore(false);
    } catch (error) {
      console.warn('Failed to load more ledger data', error);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (adjusting) return;
    if (!selectedShop || !adjAmount || isNaN(parseFloat(adjAmount))) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    setAdjusting(true);
    try {
      const user = await getUserData();
      const userName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Staff');
      await adjustBalance(selectedShop.id, parseFloat(adjAmount), adjDescription, userName);
      Alert.alert('Success', 'Balance adjusted successfully!');
      setShowAdjustModal(false);
      setAdjAmount('');
      setAdjDescription('');
      // Refresh ledger
      fetchLedger(selectedShop);
      loadShops();
    } catch (error) {
      Alert.alert('Error', 'Failed to adjust balance');
    } finally {
      setAdjusting(false);
    }
  };

  const handleCollectPayment = async () => {
    if (collecting) return;
    const payAmount = parseFloat(paymentAmount);
    if (!selectedShop || !paymentAmount || payAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    const currentBalance = Number(selectedShop.balance) || 0;
    if (payAmount > currentBalance) {
      Alert.alert(
        'Invalid Payment', 
        `Total balance is ₹${currentBalance.toLocaleString('en-IN')}, invalid to collect.`
      );
      return;
    }

    setCollecting(true);
    try {
      const user = await getUserData();
      const userName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Staff');
      
      await collectPayment(
        selectedShop.id,
        parseFloat(paymentAmount),
        paymentMethod === 'UPI' ? upiApp : 'Cash',
        paymentDescription || `${paymentMethod === 'UPI' ? upiApp : 'Cash'} payment collected by ${userName}`,
        userName
      );
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentDescription('');
      Alert.alert('Success', 'Payment recorded successfully.');
      loadShops();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record payment.');
    } finally {
      setCollecting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View className="flex-1">
      {/* Header */}
      <View className="px-6 pt-2 pb-1 flex-row items-center">
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          className="p-2.5 border border-slate-200 rounded-2xl bg-white shadow-sm mr-4"
        >
          <Feather name="menu" size={22} color="#1E293B" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.navigate('/(drawer)/order-lines')}
          className="p-2.5 border border-slate-200 rounded-2xl bg-white shadow-sm"
        >
          <Feather name="arrow-left" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Daily Progress Dashboard */}
      {shops.length > 0 ? (
        <View className="px-6 mt-3">
            <View className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                    <View>
                        <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Daily Progress</Text>
                        <Text className="text-slate-900 text-lg font-black">
                            {shops.filter(s => s.has_order_today).length} / {shops.length} Shops
                        </Text>
                    </View>
                    <View className="bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                        <Text className="text-emerald-600 text-[10px] font-black">
                            {shops.length > 0 ? Math.round((shops.filter(s => s.has_order_today).length / shops.length) * 100) : 0}% Done
                        </Text>
                    </View>
                </View>
                <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <View 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${shops.length > 0 ? (shops.filter(s => s.has_order_today).length / shops.length) * 100 : 0}%` }} 
                    />
                </View>
            </View>
        </View>
      ) : null}

      {/* Filter Chips & Sorting */}
      <View className="px-6 mt-3 flex-row items-center gap-3">
          <View className="flex-1 flex-row bg-slate-100/50 rounded-[14px] p-1 border border-slate-200/50">
                {(['all', 'pending', 'completed'] as const).map((status) => {
                    const isActive = filterStatus === status;
                    return (
                        <TouchableOpacity
                            key={status}
                            onPress={() => setFilterStatus(status)}
                            style={{
                                flex: 1,
                                paddingVertical: 6,
                                borderRadius: 10,
                                alignItems: 'center',
                                backgroundColor: isActive ? 'white' : 'transparent',
                                ...(isActive ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {})
                            }}
                        >
                            <Text style={{
                                fontSize: 9,
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                letterSpacing: 1.5,
                                color: isActive ? '#2563EB' : '#94A3B8'
                            }}>
                                {status}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
          </View>
          <TouchableOpacity 
            onPress={() => setShowSortModal(true)}
            activeOpacity={0.7}
            className={`w-9 h-9 border rounded-xl items-center justify-center shadow-sm ${sortBy !== 'name' ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}
          >
              <Feather name="sliders" size={16} color={sortBy !== 'name' ? 'white' : '#64748B'} />
          </TouchableOpacity>
      </View>

      {/* Title + Badges Section */}
      <View className="px-6 pt-3 pb-1">
        <View className="flex-row items-end justify-between mb-1">
          <View>
            <Text className="text-3xl font-black tracking-tighter text-slate-900 italic leading-[32px]">Select Shop</Text>
            <Text className="text-slate-400 font-bold text-[10px] uppercase tracking-[1.5px] mt-0.5">
              Area: <Text className="text-emerald-500 font-black">{villageName}</Text>
            </Text>
          </View>
          <View className="items-end gap-2">
             <View className="border border-emerald-100 bg-emerald-50/50 px-3 py-1 rounded-full">
                <Text className="text-emerald-600 font-black text-[9px] uppercase tracking-widest">
                {shops.length} SHOPS AVAILABLE
                </Text>
            </View>
            <TouchableOpacity
                onPress={() => setShowModal(true)}
                className="bg-[#10B981] px-4 py-2.5 rounded-[16px] shadow-md shadow-emerald-500/20 border-b-2 border-emerald-700"
            >
                <Text className="text-white font-black text-[10px] uppercase tracking-widest">+ Add Shop</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search */}
      <View className="px-6 py-2 pb-3">
        <View className="bg-white border border-slate-100 rounded-[16px] flex-row items-center px-4 shadow-sm shadow-slate-200/50">
          <Feather name="search" size={16} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search shops by name, owner, or ph..."
            placeholderTextColor="#CBD5E1"
            className="flex-1 py-3 px-3 text-sm font-bold text-slate-700"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Shop List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
          <Text className="text-emerald-500 font-black italic uppercase tracking-widest mt-4">Syncing Shop Data...</Text>
        </View>
      ) : filteredShops.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl mb-4">{search ? '🔍' : '🏪'}</Text>
          <Text className="text-slate-900 font-black text-xl italic text-center">
            {search ? `No shops matching "${search}"` : `No shops in ${villageName}`}
          </Text>
          <Text className="text-slate-500 mt-2 font-medium text-center">
            {search ? 'Try a different search term' : 'Tap "+ Add Shop" to get started'}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredShops}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 24, paddingTop: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className={`border rounded-[32px] mb-4 overflow-hidden ${item.has_order_today ? 'bg-emerald-50 border-emerald-100 shadow-none' : 'bg-white border-slate-100 shadow-sm'}`}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push({
                  pathname: '/(drawer)/ordering',
                  params: { 
                    shopId: item.id.toString(), 
                    shopName: item.shop_name,
                    orderLineId: orderLineId,
                    villageName: villageName,
                    areaName: item.area_name || areaName || villageName,
                    specificArea: item.owner_name || '',
                    phone: item.phone || '',
                    phone2: item.phone2 || ''
                  }
                } as any)}
              >
                <View className="p-6 pb-4">
                  <View className="flex-row justify-between items-start mb-4">
                      <View className="flex-1 mr-4">
                          <Text className="text-xl font-black text-slate-900 tracking-tight leading-tight" numberOfLines={2}>
                              {item.shop_name}
                          </Text>
                          <Text className="text-slate-400 font-bold text-[11px] uppercase tracking-[1px] mt-1.5">
                              {item.owner_name || 'No Owner Name'}
                          </Text>
                      </View>
                      {item.has_order_today ? (
                          <View className="bg-emerald-500 px-3 py-2 rounded-2xl flex-row items-center gap-1.5 shadow-sm shadow-emerald-200">
                              <Feather name="check-circle" size={12} color="white" />
                              <Text className="text-white font-black text-[9px] uppercase tracking-widest">ORDER TAKEN</Text>
                          </View>
                      ) : (
                          <View className="bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
                              <Text className="text-slate-400 font-black text-[9px] uppercase tracking-widest">PENDING</Text>
                          </View>
                      )}
                  </View>

                  <View className="flex-row items-center gap-2.5">
                      <View className="w-8 h-8 rounded-xl bg-slate-50 items-center justify-center border border-slate-100">
                          <Feather name="phone" size={12} color="#64748B" />
                      </View>
                      <Text className="text-slate-600 font-bold text-sm tracking-tight">{item.phone || 'No phone'}</Text>
                      {item.phone2 ? <Text className="text-slate-300 mx-1">•</Text> : null}
                      {item.phone2 ? <Text className="text-slate-600 font-bold text-sm tracking-tight">{item.phone2}</Text> : null}
                  </View>
                </View>
              </TouchableOpacity>

              <View className="border-t border-slate-50 pt-4 px-6 pb-6 bg-slate-50/30">
                  <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                          <TouchableOpacity 
                            onPress={() => {
                                setSelectedShop(item);
                                setShowPaymentModal(true);
                            }}
                            className="bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl flex-row items-center gap-1.5"
                          >
                              <Feather name="plus-circle" size={12} color="#059669" />
                              <Text className="text-emerald-700 font-black text-[10px] uppercase tracking-widest">Collect</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => fetchLedger(item)}
                            className="bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-xl flex-row items-center gap-1.5"
                          >
                              <Feather name="list" size={12} color="#4F46E5" />
                              <Text className="text-indigo-700 font-black text-[10px] uppercase tracking-widest">Ledger</Text>
                          </TouchableOpacity>
                      </View>
                      <View className="items-end">
                          <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-0.5">Balance</Text>
                          <Text className={`text-lg font-black ${item.balance > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                              ₹{Number(item.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                          </Text>
                      </View>
                  </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Ledger Modal */}
      <Modal visible={showLedgerModal} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)' }}>
          <View style={{ flex: 1, marginTop: 80, backgroundColor: '#FFFFFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24 }}>
            <View className="flex-row items-center justify-between mb-8">
              <View>
                <Text className="text-2xl font-black italic tracking-tight text-slate-900">Shop Ledger</Text>
                <Text className="text-xs font-black text-emerald-500 uppercase tracking-widest mt-1">{selectedShop?.shop_name}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity 
                  onPress={() => setShowAdjustModal(true)}
                  className="px-4 py-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20"
                >
                  <Text className="text-white font-black text-[10px] uppercase tracking-widest">Adjust</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShowLedgerModal(false)}
                  className="w-10 h-10 items-center justify-center bg-slate-50 rounded-full"
                >
                  <Feather name="x" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {loadingLedger && ledgerSkip === 0 ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text className="text-slate-400 font-black text-[10px] uppercase tracking-widest mt-4">Syncing Ledger...</Text>
              </View>
            ) : ledgerData.length === 0 ? (
              <View className="flex-1 items-center justify-center px-12">
                <Text className="text-slate-300 text-6xl mb-6">📄</Text>
                <Text className="text-slate-400 font-bold text-center text-lg">No transactions recorded for this shop yet.</Text>
              </View>
            ) : (
              <FlatList
                data={ledgerData}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                onEndReached={loadMoreLedger}
                onEndReachedThreshold={0.5}
                ListFooterComponent={ledgerHasMore && ledgerData.length >= 20 ? <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 10 }} /> : null}
                renderItem={({ item }) => {
                  const isBill = item.type === 'Bill';
                  const isPayment = item.type === 'Payment';
                  const isAdjustment = item.type === 'Adjustment';
                  
                  const isAddition = isBill || (isAdjustment && item.amount > 0);
                  const isReduction = isPayment || (isAdjustment && item.amount < 0);
                  
                  const sign = isAddition ? '+' : (isReduction ? '-' : '');
                  const color = isAddition ? '#EF4444' : (isReduction ? '#10B981' : '#6366F1');
                  const bgColor = isAddition ? '#FEF2F2' : (isReduction ? '#ECFDF5' : '#F5F3FF');

                  return (
                    <View className="bg-white border border-slate-100 rounded-3xl p-5 mb-4 shadow-sm">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-4">
                          <View style={{ backgroundColor: bgColor }} className="w-12 h-12 rounded-2xl items-center justify-center">
                            <Text style={{ color }} className="font-black text-lg">
                              {isBill ? 'B' : isPayment ? 'P' : 'A'}
                            </Text>
                          </View>
                          <View>
                            <Text className="font-black text-slate-800 text-sm uppercase tracking-tight max-w-[150px]" numberOfLines={1}>
                              {item.description}
                            </Text>
                            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                              {(() => {
                                const ds = item.transaction_date || item.created_at;
                                let iso = ds;
                                if (typeof ds === 'string' && !ds.includes('Z') && !ds.includes('+')) {
                                  iso = ds.includes('T') ? ds + 'Z' : ds.replace(' ', 'T') + 'Z';
                                }
                                return new Date(iso).toLocaleString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit', hour12: true,
                                  timeZone: 'Asia/Kolkata'
                                }).toUpperCase();
                              })()}
                            </Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text style={{ color }} className="text-lg font-black">
                            {sign}₹{Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>
                          <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            Bal: ₹{Number(item.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Adjust Balance Modal */}
      <Modal visible={showAdjustModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 40, padding: 32 }}>
            <View className="flex-row items-center justify-between mb-8">
              <View>
                <Text className="text-2xl font-black italic tracking-tight text-slate-900">Manual Adjustment</Text>
                <Text className="text-xs font-black text-indigo-500 uppercase tracking-widest mt-1">{selectedShop?.shop_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAdjustModal(false)}>
                <Feather name="x" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View className="mb-6">
                <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Amount (Use minus for deduction)</Text>
                <TextInput
                    keyboardType="numeric"
                    value={adjAmount}
                    onChangeText={setAdjAmount}
                    placeholder="0.00"
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-lg font-black text-slate-900"
                />
            </View>

            <View className="mb-8">
                <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Reason / Description</Text>
                <TextInput
                    multiline
                    value={adjDescription}
                    onChangeText={setAdjDescription}
                    placeholder="Reason for adjustment..."
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-900 min-h-[100px]"
                    textAlignVertical="top"
                />
            </View>

            <TouchableOpacity
                onPress={handleAdjustBalance}
                disabled={adjusting}
                className="bg-indigo-600 py-5 rounded-3xl items-center shadow-xl shadow-indigo-600/40"
            >
                {adjusting ? <ActivityIndicator color="white" /> : <Text className="text-white font-black uppercase tracking-widest text-sm">Apply Adjustment</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setShowSortModal(false)}
            className="flex-1 bg-slate-900/40 justify-end"
        >
            <View className="bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl">
                <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
                <Text className="text-slate-900 text-2xl font-black mb-6 tracking-tighter italic">Sort Shops By</Text>
                
                {[
                    { id: 'name', label: 'Alphabetical (A-Z)', icon: 'type' },
                    { id: 'balance', label: 'Highest Balance First', icon: 'trending-up' },
                    { id: 'status', label: 'Pending Shops First', icon: 'clock' },
                ].map((option) => (
                    <TouchableOpacity
                        key={option.id}
                        onPress={() => {
                            setSortBy(option.id as any);
                            setShowSortModal(false);
                        }}
                        className={`flex-row items-center p-4 rounded-[24px] mb-3 border ${sortBy === option.id ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}
                    >
                        <View className={`w-11 h-11 rounded-2xl items-center justify-center mr-4 ${sortBy === option.id ? 'bg-blue-600 shadow-lg shadow-blue-500/40' : 'bg-white border border-slate-200'}`}>
                            <Feather name={option.icon as any} size={18} color={sortBy === option.id ? 'white' : '#64748B'} />
                        </View>
                        <View className="flex-1">
                            <Text className={`text-base font-black tracking-tight ${sortBy === option.id ? 'text-blue-900' : 'text-slate-700'}`}>{option.label}</Text>
                        </View>
                        {sortBy === option.id && (
                            <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
                                <Feather name="check" size={14} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Collection Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent presentationStyle="overFullScreen">
          <View className="flex-1 justify-end bg-slate-950/80">
              <View className="bg-white rounded-t-[40px] p-8">
                  <View className="flex-row items-center justify-between mb-6">
                      <View>
                          <Text className="text-2xl font-black italic tracking-tight text-slate-900">Collect Payment</Text>
                          <Text className="text-xs font-black text-emerald-500 uppercase tracking-widest mt-1">{selectedShop?.shop_name}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                          <Feather name="x" size={24} color="#94A3B8" />
                      </TouchableOpacity>
                  </View>

                  <View className="mb-6">
                      <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Amount to Collect (₹)</Text>
                      <TextInput
                          value={paymentAmount}
                          onChangeText={setPaymentAmount}
                          placeholder="0.00"
                          keyboardType="numeric"
                          autoFocus
                          className="bg-slate-50 border border-emerald-100 rounded-3xl px-6 py-5 text-2xl font-black text-emerald-600 shadow-inner"
                      />
                  </View>

                  <View className="mb-6">
                      <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Payment Method</Text>
                      <View className="flex-row">
                          {(['Cash', 'UPI'] as const).map((m, idx) => (
                              <TouchableOpacity
                                  key={m}
                                  onPress={() => setPaymentMethod(m)}
                                  style={{
                                      flex: 1,
                                      paddingVertical: 16,
                                      borderRadius: 16,
                                      borderWidth: 1,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      marginLeft: idx > 0 ? 12 : 0,
                                      backgroundColor: paymentMethod === m ? '#059669' : '#F8FAFC',
                                      borderColor: paymentMethod === m ? '#059669' : '#F1F5F9',
                                      elevation: paymentMethod === m ? 4 : 0,
                                      shadowColor: paymentMethod === m ? '#059669' : 'transparent',
                                      shadowOffset: { width: 0, height: 4 },
                                      shadowOpacity: paymentMethod === m ? 0.3 : 0,
                                      shadowRadius: 6,
                                  }}
                              >
                                  <Text style={{ 
                                      fontWeight: '900', 
                                      textTransform: 'uppercase', 
                                      letterSpacing: 1.5, 
                                      fontSize: 12, 
                                      color: paymentMethod === m ? '#FFFFFF' : '#94A3B8' 
                                  }}>
                                      {m}
                                  </Text>
                              </TouchableOpacity>
                          ))}
                      </View>
                  </View>

                  {paymentMethod === 'UPI' && (
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1.5, marginLeft: 4, marginBottom: 8 }}>Select UPI App</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {(['PhonePe', 'GPay', 'Paytm', 'Other'] as const).map((app, idx) => (
                                <TouchableOpacity
                                    key={app}
                                    onPress={() => setUpiApp(app)}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 8,
                                        marginRight: 8,
                                        backgroundColor: upiApp === app ? '#2563EB' : '#F8FAFC',
                                        borderColor: upiApp === app ? '#2563EB' : '#F1F5F9',
                                        shadowColor: upiApp === app ? '#2563EB' : 'transparent',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: upiApp === app ? 0.2 : 0,
                                        shadowRadius: 4,
                                        elevation: upiApp === app ? 3 : 0
                                    }}
                                >
                                    <Text style={{ fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, color: upiApp === app ? '#FFFFFF' : '#94A3B8' }}>{app}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                  )}

                  <View className="mb-8">
                      <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Notes (Optional)</Text>
                      <TextInput
                          value={paymentDescription}
                          onChangeText={setPaymentDescription}
                          placeholder="e.g. Paid via PhonePe"
                          className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-900"
                      />
                  </View>

                  <TouchableOpacity
                      onPress={handleCollectPayment}
                      disabled={collecting}
                      className="bg-emerald-600 py-5 rounded-3xl items-center mb-10 shadow-xl shadow-emerald-600/40"
                      style={collecting ? { opacity: 0.7 } : {}}
                  >
                      {collecting ? <ActivityIndicator color="white" /> : <Text className="text-white font-black uppercase tracking-widest text-sm">Confirm Collection</Text>}
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      {/* Add Shop Modal */}
      <Modal visible={showModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View className="flex-1 justify-end bg-slate-950/80">
          <View className="bg-white rounded-t-[40px] p-8">
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className="text-2xl font-black italic tracking-tight text-slate-900">Add New Shop</Text>
                <Text className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">{villageName}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Shop Name *', key: 'shop_name', placeholder: 'e.g. Annai Store' },
                { label: 'Area Name', key: 'owner_name', placeholder: 'e.g. Entrance' },
                { label: 'Owner Name', key: 'shop_owner', placeholder: 'e.g. Ravi' },
                { label: 'Phone 1', key: 'phone', placeholder: 'e.g. 9876543210' },
                { label: 'Phone 2', key: 'phone2', placeholder: 'e.g. 9876543211' },
                { label: 'Balance (₹)', key: 'balance', placeholder: '0.00' },
              ].map(({ label, key, placeholder }) => (
                <View key={key} className="mb-4">
                  <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1">{label}</Text>
                  <TextInput
                    value={(formData as any)[key]}
                    onChangeText={(v) => setFormData({ ...formData, [key]: v })}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType={key === 'balance' ? 'numeric' : 'default'}
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-900"
                  />
                </View>
              ))}
              <TouchableOpacity
                onPress={handleAddShop}
                disabled={submitting}
                className="bg-emerald-600 py-4 rounded-2xl items-center mt-2 mb-8"
                style={submitting ? { opacity: 0.7 } : {}}
              >
                {submitting
                  ? <ActivityIndicator color="white" />
                  : <Text className="text-white font-black uppercase tracking-widest text-sm">Add Shop</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
}
