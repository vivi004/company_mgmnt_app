import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, RefreshControl, Modal, 
    KeyboardAvoidingView, Platform, TextInput, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCollections } from './useCollections';
import { useShopActions } from './useShopActions';
import ShopActionModals from '../../../components/shop/ShopActionModals';
import { FontAwesome, MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { fetchOrderLines, addExpense } from '../../../services/collectionService';
import { fetchShopLedger } from '../../../services/shopService';
import { getUserData } from '../../../services/authService';
import { formatIST, parseIST, getTodayIST } from '../../../utils/dateUtils';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TodayCollectionScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [orderLines, setOrderLines] = useState<any[]>([]);
    const [loadingOls, setLoadingOls] = useState(true);

    const {
        selectedDate, setSelectedDate,
        selectedOlId, setSelectedOlId,
        collections, loading,
        totals, modeBreakdown,
        refresh, addExpense, updateExpense, deleteExpense, expenses
    } = useCollections(orderLines);

    const {
        selectedShop, setSelectedShop,
        showAdjustModal, setShowAdjustModal, adjData, setAdjData, submittingAdj, handleAdjustment,
        showPaymentModal, setShowPaymentModal, paymentData, setPaymentData, submittingPayment, handleCollectPayment,
    } = useShopActions(() => refresh(), selectedDate);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [shopSearch, setShopSearch] = useState('');
    const [filterType, setFilterType] = useState<'All' | 'Pending' | 'Completed'>('All');

    // Ledger Modal States
    const [showLedgerModal, setShowLedgerModal] = useState(false);
    const [ledgerData, setLedgerData] = useState<any[]>([]);
    const [loadingLedger, setLoadingLedger] = useState(false);
    const [ledgerSkip, setLedgerSkip] = useState(0);
    const [ledgerHasMore, setLedgerHasMore] = useState(true);

    const fetchLedger = async (shop: any) => {
        setSelectedShop(shop);
        setShowLedgerModal(true);
        setLoadingLedger(true);
        setLedgerSkip(0);
        setLedgerHasMore(true);
        try {
            const data = await fetchShopLedger(shop.shop_id, 20, 0);
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
            const data = await fetchShopLedger(selectedShop.shop_id, 20, newSkip);
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

    // Midnight Rollover Logic
    useEffect(() => {
        const checkMidnight = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const msUntilMidnight = tomorrow.getTime() - now.getTime();
            
            const timer = setTimeout(() => {
                const newToday = getTodayIST();
                setSelectedDate(newToday);
                refresh();
                checkMidnight(); // Re-schedule for next day
            }, msUntilMidnight);
            
            return timer;
        };

        const timerId = checkMidnight();
        return () => clearTimeout(timerId);
    }, []);

    // Expense States
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDescription, setExpenseDescription] = useState('');
    const [submittingExpense, setSubmittingExpense] = useState(false);

    const handleAddExpense = async () => {
        if (!expenseAmount || isNaN(parseFloat(expenseAmount))) {
            return Alert.alert('Error', 'Enter a valid amount');
        }
        setSubmittingExpense(true);
        try {
            await addExpense(parseFloat(expenseAmount), expenseDescription);
            setShowExpenseModal(false);
            setExpenseAmount('');
            setExpenseDescription('');
            Alert.alert('Success', 'Expense recorded');
        } catch (err) {
            Alert.alert('Error', 'Failed to record expense');
        } finally {
            setSubmittingExpense(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const allOls = await fetchOrderLines();
                const userData = await getUserData();
                let filteredOls = allOls;

                if (userData && userData.accessible_orderlines) {
                    let authorizedIds: number[] = [];
                    const raw = userData.accessible_orderlines;

                    if (typeof raw === 'string') {
                        try {
                            authorizedIds = JSON.parse(raw);
                        } catch (e) {
                            authorizedIds = raw.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
                        }
                    } else if (Array.isArray(raw)) {
                        authorizedIds = raw;
                    }

                    if (authorizedIds.length > 0) {
                        filteredOls = allOls.filter((ol: any) => authorizedIds.includes(ol.id));
                    }
                }

                setOrderLines(filteredOls);
            } catch (error) {
                console.error('Failed to load order lines:', error);
            } finally {
                setLoadingOls(false);
            }
        };

        loadInitialData();
    }, []);

    const onDateChange = (event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date.toISOString().split('T')[0]);
        }
    };

    const shiftDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    }, [refresh]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
            {/* ====== TOP PANEL — 25% compact controls ====== */}
            <View style={{ flex: 0.25, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
                {/* Header row */}
                <View className="flex-row items-center justify-between px-4 pt-2 pb-1">
                    <TouchableOpacity
                        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                        className="w-9 h-9 items-center justify-center bg-slate-50 rounded-xl border border-slate-100"
                    >
                        <Feather name="menu" size={18} color="#1e293b" />
                    </TouchableOpacity>

                    <Text className="text-base font-black tracking-tighter text-slate-900 italic">📊 Collections</Text>

                    <TouchableOpacity
                        onPress={refresh}
                        disabled={loading}
                        className="w-9 h-9 items-center justify-center bg-slate-50 rounded-xl border border-slate-100"
                    >
                        <Ionicons name="refresh" size={18} color={loading ? '#3b82f6' : '#64748b'} />
                    </TouchableOpacity>
                </View>

                {/* Date Navigator */}
                <View className="mx-3 flex-row items-center bg-slate-50 rounded-xl border border-slate-100 px-1">
                    <TouchableOpacity onPress={() => shiftDate(-1)} className="p-1.5">
                        <Ionicons name="chevron-back" size={18} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        className="flex-1 flex-row items-center justify-center py-1.5"
                    >
                        <Ionicons name="calendar-outline" size={13} color="#3b82f6" style={{ marginRight: 5 }} />
                        <Text className="text-xs font-black text-slate-800">
                            {formatIST(selectedDate, { day: '2-digit', month: 'short', year: 'numeric', hour: undefined, minute: undefined })}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => shiftDate(1)} className="p-1.5">
                        <Ionicons name="chevron-forward" size={18} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={parseIST(selectedDate)}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                )}

                {/* Order Line Tabs */}
                {loadingOls ? (
                    <View className="items-center py-1">
                        <ActivityIndicator size="small" color="#3b82f6" />
                    </View>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 6 }}>
                        {orderLines.map(ol => (
                            <TouchableOpacity
                                key={ol.id}
                                onPress={() => setSelectedOlId(ol.id)}
                                className={`mr-2 px-3 py-1.5 rounded-lg border flex-row items-center ${
                                    selectedOlId === ol.id
                                        ? 'bg-blue-600 border-blue-600'
                                        : 'bg-white border-slate-200'
                                }`}
                            >
                                <Text style={{ fontSize: 10 }} className="mr-1">🗺️</Text>
                                <Text className={`text-[9px] font-black uppercase tracking-widest ${
                                    selectedOlId === ol.id ? 'text-white' : 'text-slate-600'
                                }`}>{ol.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Summary Cards */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 6 }}>
                    {[
                        { label: 'Billed', value: `₹${fmt(totals.todaysBillAmount)}`, icon: '🧾' },
                        { label: 'Collected', value: `₹${fmt(totals.amountCollected)}`, icon: '💰' },
                        { label: 'Upcoming', value: `₹${fmt(totals.totalFutureBills)}`, icon: '📅' },
                        { label: 'Manual', value: `₹${fmt(totals.totalManualAdjust)}`, icon: '⚖️' },
                        { label: 'Pending', value: `₹${fmt(totals.todaysBillBalance)}`, icon: '⏳' },
                    ].map((card, idx) => (
                        <View key={idx} className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mr-2 min-w-[100px]">
                            <View className="flex-row items-center mb-0.5">
                                <Text style={{ fontSize: 10 }} className="mr-1">{card.icon}</Text>
                                <Text className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{card.label}</Text>
                            </View>
                            <Text className="text-sm font-black text-slate-900">{card.value}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* ====== BOTTOM PANEL — 75% collection list ====== */}
            <View style={{ flex: 0.75 }}>
                {/* --- Search Bar & Filter --- */}
                <View className="mx-4 mt-3 flex-row items-center bg-white border border-slate-200 rounded-2xl px-4 shadow-sm">
                    <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 6 }} />
                    <TextInput
                        value={shopSearch}
                        onChangeText={setShopSearch}
                        placeholder="Search shop or village..."
                        placeholderTextColor="#94a3b8"
                        style={{ flex: 1, paddingVertical: 9, fontSize: 13, fontWeight: '600', color: '#1e293b' }}
                        clearButtonMode="while-editing"
                    />
                    {shopSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setShopSearch('')}>
                            <Ionicons name="close-circle" size={16} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Pills */}
                <View className="flex-row px-4 mt-2 gap-2">
                    {['All', 'Pending', 'Completed'].map((type) => {
                        const count = collections.filter(r => {
                            const isMatch = !shopSearch || 
                                r.shop_name.toLowerCase().includes(shopSearch.toLowerCase()) ||
                                r.village_name.toLowerCase().includes(shopSearch.toLowerCase());
                            if (!isMatch) return false;
                            
                            const collected = r.cash_collected + r.upi_collected + r.cheque_collected + (r.discount_payment || 0);
                            if (type === 'Pending') return collected === 0;
                            if (type === 'Completed') return collected > 0;
                            return true;
                        }).length;

                        return (
                            <TouchableOpacity 
                                key={type}
                                onPress={() => setFilterType(type as any)}
                                className={`px-3 py-1 rounded-full border ${filterType === type ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'}`}
                            >
                                <Text className={`text-[9px] font-black uppercase tracking-tighter ${filterType === type ? 'text-white' : 'text-slate-500'}`}>
                                    {type} ({count})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Collection count label */}
                <View className="mx-4 mb-2 mt-3 flex-row items-center justify-between">
                    <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">📋 Collection Details</Text>
                    <Text className="text-[9px] font-bold text-slate-400">
                        {collections.filter(r => {
                            const isMatch = !shopSearch ||
                                r.shop_name.toLowerCase().includes(shopSearch.toLowerCase()) ||
                                r.village_name.toLowerCase().includes(shopSearch.toLowerCase());
                            if (!isMatch) return false;

                            const collected = r.cash_collected + r.upi_collected + r.cheque_collected + (r.discount_payment || 0);
                            if (filterType === 'Pending') return collected === 0;
                            if (filterType === 'Completed') return collected > 0;
                            return true;
                        }).length} Shops
                    </Text>
                </View>

                <ScrollView
                    className="flex-1 px-4"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
                >

                {loading ? (
                    <View className="py-20 items-center">
                        <ActivityIndicator color="#3b82f6" />
                    </View>
                ) : collections.length === 0 ? (
                    <View className="py-20 items-center">
                        <Text className="text-4xl mb-2">📭</Text>
                        <Text className="text-slate-600 font-bold">No collections recorded</Text>
                    </View>
                ) : (
                    collections
                        .filter(r => {
                            const isMatch = !shopSearch ||
                                r.shop_name.toLowerCase().includes(shopSearch.toLowerCase()) ||
                                r.village_name.toLowerCase().includes(shopSearch.toLowerCase());
                            if (!isMatch) return false;

                            const collected = r.cash_collected + r.upi_collected + r.cheque_collected + (r.discount_payment || 0);
                            if (filterType === 'Pending') return collected === 0;
                            if (filterType === 'Completed') return collected > 0;
                            return true;
                        })
                        .map((row, idx) => {
                        const collected = row.cash_collected + row.upi_collected + row.cheque_collected + (row.discount_payment || 0);
                        return (
                            <View key={idx} className="bg-white border border-slate-100 rounded-3xl p-4 mb-4 shadow-sm">
                                <View className="flex-row items-center justify-between mb-3">
                                    <View className="flex-1 mr-2">
                                        <Text className="text-base font-black text-slate-900">{idx + 1}. {row.shop_name}</Text>
                                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{row.owner_name || 'No Area Name'}</Text>
                                    </View>
                                    {row.pending_transactions.length > 0 && (
                                        <View className="bg-amber-500 px-2 py-0.5 rounded-full">
                                            <Text className="text-[8px] font-black text-white uppercase tracking-widest">Needs Approval</Text>
                                        </View>
                                    )}
                                </View>

                                <View className="flex-row mb-5">
                                    <View className="flex-1">
                                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Prev Bal</Text>
                                        <Text className="text-sm font-black text-slate-700">₹{fmt(row.old_balance)}</Text>
                                    </View>
                                    <View className="flex-1 items-end">
                                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Today Bill</Text>
                                        <Text className="text-sm font-black text-slate-900">₹{fmt(row.todays_bill_amount)}</Text>
                                    </View>
                                </View>

                                <View className="flex-row mb-6">
                                    <View className="flex-1">
                                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Collected</Text>
                                        <Text className="text-sm font-black text-emerald-600">₹{fmt(collected)}</Text>
                                    </View>
                                    <View className="flex-1 items-end">
                                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Bal</Text>
                                        <Text className={`text-lg font-black ${row.total_balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>₹{fmt(row.total_balance)}</Text>
                                    </View>
                                </View>

                                <View className="flex-row gap-2">
                                    <TouchableOpacity 
                                        onPress={() => { setSelectedShop(row); setShowPaymentModal(true); }}
                                        className="flex-1 bg-emerald-500 py-2.5 rounded-xl items-center shadow-sm"
                                    >
                                        <Text className="text-white font-black text-[10px] uppercase tracking-widest">Collect ₹</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => { setSelectedShop(row); setShowAdjustModal(true); }}
                                        className="flex-1 bg-blue-500 py-2.5 rounded-xl items-center shadow-sm"
                                    >
                                        <Text className="text-white font-black text-[10px] uppercase tracking-widest">Adjust ±</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => fetchLedger(row)}
                                        className="flex-1 bg-indigo-500 py-2.5 rounded-xl items-center shadow-sm"
                                    >
                                        <Text className="text-white font-black text-[10px] uppercase tracking-widest">Ledger 👁</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}

                {/* --- Mode Breakdown --- */}
                <View className="mt-6 mb-4">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">💰 Collection Breakdown</Text>
                </View>

                <View className="bg-white border border-slate-100 rounded-3xl p-5 mb-10 shadow-sm">
                    {[
                        { icon: '💵', label: 'Cash (Net)', amount: modeBreakdown.netCash, color: 'emerald' },
                        { icon: '📱', label: 'UPI', amount: modeBreakdown.upi, color: 'blue' },
                        { icon: '📝', label: 'Cheque', amount: modeBreakdown.cheque, color: 'amber' },
                        { icon: '🏷️', label: 'Discount', amount: modeBreakdown.discount, color: 'slate' },
                    ].map((mode, idx) => (
                        <View key={idx} className={`flex-row items-center justify-between py-3 ${idx !== 3 ? 'border-b border-slate-50' : ''}`}>
                            <View className="flex-row items-center">
                                <Text className="text-xl mr-3">{mode.icon}</Text>
                                <Text className="text-xs font-black uppercase tracking-widest text-slate-700">{mode.label}</Text>
                            </View>
                            <Text className="text-sm font-black text-slate-900">₹{fmt(mode.amount)}</Text>
                        </View>
                    ))}
                    
                    <View className="mt-4 pt-4 border-t-2 border-slate-100 flex-row items-center justify-between">
                        <Text className="text-sm font-black uppercase tracking-widest text-blue-600">Net Total</Text>
                        <Text className="text-xl font-black text-slate-900">₹{fmt(modeBreakdown.total)}</Text>
                    </View>
                </View>
                </ScrollView>
            </View>

            <ShopActionModals
                selectedShop={selectedShop}
                setSelectedShop={setSelectedShop}
                showAdjustModal={showAdjustModal}
                setShowAdjustModal={setShowAdjustModal}
                adjData={adjData}
                setAdjData={setAdjData}
                submittingAdj={submittingAdj}
                handleAdjustment={handleAdjustment}
                showPaymentModal={showPaymentModal}
                setShowPaymentModal={setShowPaymentModal}
                paymentData={paymentData}
                setPaymentData={setPaymentData}
                submittingPayment={submittingPayment}
                handleCollectPayment={handleCollectPayment}
            />

            {/* --- Expense Modal --- */}
            <Modal visible={showExpenseModal} animationType="slide" transparent>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1 justify-end bg-black/50"
                >
                    <View className="bg-white rounded-t-[40px] p-6 pb-10 shadow-xl">
                        <View className="flex-row items-center justify-between mb-6">
                            <View>
                                <Text className="text-xl font-black italic text-slate-900 tracking-tight">Record Expense</Text>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Operational Costs</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowExpenseModal(false)} className="p-2 bg-slate-100 rounded-full">
                                <Ionicons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View className="space-y-4">
                            <View>
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Amount (₹)</Text>
                                <TextInput
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    value={expenseAmount}
                                    onChangeText={setExpenseAmount}
                                    className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-lg font-bold text-slate-900"
                                />
                            </View>

                            <View className="mt-4">
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Description</Text>
                                <TextInput
                                    placeholder="e.g. Tea, Fuel, etc."
                                    value={expenseDescription}
                                    onChangeText={setExpenseDescription}
                                    className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900"
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleAddExpense}
                                disabled={submittingExpense}
                                className={`mt-6 py-4 rounded-2xl items-center shadow-lg ${submittingExpense ? 'bg-slate-300' : 'bg-slate-900 shadow-slate-900/30'}`}
                            >
                                {submittingExpense ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-xs uppercase tracking-widest">Save Expense</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- Add Expense Floating Button --- */}
            <View
                style={{
                    position: 'absolute',
                    bottom: Math.max(insets.bottom, 24),
                    right: 24,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    padding: 3,
                    elevation: 14,
                }}
            >
                <TouchableOpacity 
                    activeOpacity={0.9}
                    className="bg-amber-500 w-14 h-14 rounded-full items-center justify-center"
                    style={{ 
                        shadowColor: '#f59e0b',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.5,
                        shadowRadius: 10,
                    }}
                    onPress={() => setShowExpenseModal(true)}
                >
                    <Ionicons name="add" size={30} color="white" />
                </TouchableOpacity>
            </View>
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
                                    let color = isAddition ? '#EF4444' : (isReduction ? '#10B981' : '#6366F1');
                                    let bgColor = isAddition ? '#FEF2F2' : (isReduction ? '#ECFDF5' : '#F5F3FF');

                                    // Status mapping
                                    const status = (item.approval_status || 'APPROVED').toUpperCase();
                                    const isPending = status === 'PENDING';
                                    const isRejected = status === 'REJECTED';

                                    // Override style if pending or rejected to draw focus
                                    let cardBorderClass = 'border-slate-100';
                                    let cardBgClass = 'bg-white';
                                    
                                    if (isPending) {
                                        cardBorderClass = 'border-dashed border-amber-300';
                                        cardBgClass = 'bg-amber-50/10';
                                        color = '#D97706'; // Darker amber text
                                        bgColor = '#FEF3C7'; // Amber background for badge
                                    } else if (isRejected) {
                                        cardBorderClass = 'border-red-200';
                                        cardBgClass = 'bg-red-50/10';
                                        color = '#DC2626'; // Red text
                                        bgColor = '#FEE2E2'; // Red badge background
                                    }

                                    return (
                                        <View className={`border rounded-[32px] p-5 mb-4 shadow-sm ${cardBorderClass} ${cardBgClass}`}>
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-row items-center gap-4 flex-1">
                                                    <View style={{ backgroundColor: bgColor }} className="w-12 h-12 rounded-2xl items-center justify-center">
                                                        <Text style={{ color }} className="font-black text-lg">
                                                            {isBill ? 'B' : isPayment ? 'P' : 'A'}
                                                        </Text>
                                                    </View>
                                                    <View className="flex-1 pr-2">
                                                        <Text className="font-black text-slate-800 text-sm uppercase tracking-tight" numberOfLines={1}>
                                                            {item.description}
                                                        </Text>
                                                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                            {formatIST(item.transaction_date || item.created_at)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View className="items-end">
                                                    <Text style={{ color }} className="text-lg font-black">
                                                        {sign}₹{Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </Text>
                                                    <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                        {isPending ? 'Unverified' : `Bal: ₹${Number(item.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* --- Status Indicator Section --- */}
                                            <View className="mt-3.5 pt-3 border-t border-slate-50 flex-row items-center justify-between flex-wrap gap-2">
                                                {isPending ? (
                                                    <View className="flex-row items-center gap-1.5 bg-amber-100/60 px-3 py-1 rounded-full border border-amber-200">
                                                        <View className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        <Text className="text-amber-700 text-[8px] font-black uppercase tracking-wider">
                                                            Pending Admin Approval
                                                        </Text>
                                                    </View>
                                                ) : isRejected ? (
                                                    <View className="bg-red-100/60 px-3 py-1 rounded-full border border-red-200">
                                                        <Text className="text-red-700 text-[8px] font-black uppercase tracking-wider">
                                                            Rejected / Declined
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <View className="bg-emerald-100/60 px-3 py-1 rounded-full border border-emerald-200">
                                                        <Text className="text-emerald-700 text-[8px] font-black uppercase tracking-wider">
                                                            Verified & Approved
                                                        </Text>
                                                    </View>
                                                )}

                                                {/* Audit Details */}
                                                {!isPending && item.approved_by && (
                                                    <Text className="text-[9px] text-slate-400 font-bold italic">
                                                        Approved by {item.approved_by}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* --- Rejection Reason Callout --- */}
                                            {isRejected && item.rejected_reason && (
                                                <View className="mt-2.5 bg-red-50 p-3 rounded-2xl border border-red-100">
                                                    <Text className="text-red-600 text-[10px] font-black uppercase tracking-wider mb-1">
                                                        Reason for Decline:
                                                    </Text>
                                                    <Text className="text-red-700 text-xs font-semibold">
                                                        "{item.rejected_reason}"
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                }}
                            />
                         )}
                     </View>
                 </View>
             </Modal>
         </SafeAreaView>
    );
};

export default TodayCollectionScreen;
