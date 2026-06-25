import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as billService from '../../services/billService';
import { getUserData } from '../../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCartItems } from '../../services/productService';
import { formatIST, parseIST } from '../../utils/dateUtils';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateLoadingSheetHTML } from '../../utils/loadingSheetGenerator';
import { generateInvoiceHTML } from '../../utils/invoiceUtils';

export default function BillCheckScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [bills, setBills] = useState<billService.Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('staff');
  const [userName, setUserName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading sheet preview states
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const role = await AsyncStorage.getItem('userRole');
      const user = await getUserData();
      setUserRole(role || 'staff');
      setUserName(user?.username || '');

      const fetchedBills = await billService.fetchUnverifiedBills();

      // Filter for staff - check for both username and full name for compatibility
      let filtered = fetchedBills;
      if (role === 'staff' && user) {
        const fullName = `${user.first_name} ${user.last_name || ''}`.trim();
        filtered = fetchedBills.filter(b => 
          b.created_by === user.username || 
          b.created_by === fullName ||
          b.created_by === user.first_name // also check just first name for safety
        );
      }
      setBills(filtered);
    } catch (error) {
      console.error('Failed to load bills:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [upiSettings, setUpiSettings] = useState({
    upiId1: 'nishaoilmills@ybl',
    upiName1: 'NISHA OIL MILL',
    upiId2: 'nishaoilmills@okaxis',
    upiName2: 'NISHA OIL MILL',
  });

  useEffect(() => {
    const loadUpiSettings = async () => {
      try {
        const storedUpiId1 = await AsyncStorage.getItem('upiId1');
        const storedUpiName1 = await AsyncStorage.getItem('upiName1');
        const storedUpiId2 = await AsyncStorage.getItem('upiId2');
        const storedUpiName2 = await AsyncStorage.getItem('upiName2');
        
        setUpiSettings({
          upiId1: storedUpiId1 || 'nishaoilmills@ybl',
          upiName1: storedUpiName1 || 'NISHA OIL MILL',
          upiId2: storedUpiId2 || 'nishaoilmills@okaxis',
          upiName2: storedUpiName2 || 'NISHA OIL MILL',
        });
      } catch (e) {
        console.error('Failed to load UPI settings', e);
      }
    };
    loadUpiSettings();
  }, []);

  const handleShowBillPreview = (bill: billService.Bill) => {
    try {
      const invoiceData = {
        shopName: bill.shop_name || 'Unknown Shop',
        villageName: bill.village_name || 'Unknown village',
        areaName: bill.area_name || '',
        specificArea: bill.specific_area || '',
        cart: bill.cart || {},
        customRates: bill.custom_rates || {},
        invoiceNo: Number(bill.invoice_no || 0),
        date: bill.bill_date || new Date().toISOString(),
        deliveryDate: bill.delivery_date || bill.bill_date || new Date().toISOString(),
        phone: bill.phone || '',
        phone2: bill.phone2 || '',
        oldBalance: Number(bill.old_balance ?? bill.oldBalance ?? 0),
        ...upiSettings
      };
      const html = generateInvoiceHTML(invoiceData);
      setPreviewHtml(html);
      setPreviewTitle(`Bill Preview - INV-${bill.invoice_no}`);
      setIsPreviewVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate Bill HTML');
      console.error(error);
    }
  };

  const handleVerify = (id: number) => {
    Alert.alert(
      'Verify Bill',
      'Verify and push this bill to the primary ledger?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            try {
              await billService.verifyBill(id);
              Alert.alert('Success', 'Bill verified successfully!', [
                { text: 'OK', onPress: () => loadData() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to verify bill');
            }
          }
        }
      ]
    );
  };

  const handleReject = (id: number) => {
    Alert.alert(
      'Discard Bill',
      'Are you sure you want to permanently discard this unverified bill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await billService.rejectBill(id);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to discard bill');
            }
          }
        }
      ]
    );
  };

  const handleVerifyAll = () => {
    if (bills.length === 0) return;
    Alert.alert(
      'Verify All',
      `Verify ALL ${bills.length} bills and push them to the primary ledger?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify All',
          onPress: async () => {
            try {
              const billIds = bills.map(b => b.id);
              await billService.verifyBillsBatch(billIds);
              Alert.alert('Success', `${bills.length} bills verified successfully!`, [
                { text: 'OK', onPress: () => loadData() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to verify bills batch. Please check your network connection and try again.');
              loadData();
            }
          }
        }
      ]
    );
  };

  const handleNavigateToEdit = (bill: billService.Bill) => {
    router.push({
      pathname: '/(drawer)/ordering',
      params: {
        editBillId: bill.id.toString(),
        initialCart: JSON.stringify(bill.cart),
        initialCustomPrices: bill.custom_rates ? JSON.stringify(bill.custom_rates) : '{}',
        shopId: (bill.shop_id || 0).toString(),
        shopName: bill.shop_name,
        villageName: bill.village_name,
        areaName: bill.area_name || bill.village_name,
        specificArea: bill.specific_area || '',
        orderLineId: (bill.order_line_id || 0).toString(),
        phone: bill.phone || '',
        phone2: bill.phone2 || '',
        invoiceNo: bill.invoice_no.toString(),
      }
    } as any);
  };

  const handleShowAllLoadingSheetPreview = () => {
    if (filteredBills.length === 0) return;
    try {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const html = generateLoadingSheetHTML(filteredBills, today, '', userRole?.toLowerCase() === 'player');
      setPreviewHtml(html);
      setPreviewTitle('All Loading Sheets');
      setIsPreviewVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate Loading Sheet HTML');
      console.error(error);
    }
  };

  const handleShowSingleLoadingSheetPreview = (bill: billService.Bill) => {
    try {
      const datePart = (bill.delivery_date || bill.bill_date || '').split('T')[0];
      const html = generateLoadingSheetHTML([bill], datePart, '', userRole?.toLowerCase() === 'player');
      setPreviewHtml(html);
      setPreviewTitle(`Loading Sheet - INV-${bill.invoice_no}`);
      setIsPreviewVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate Loading Sheet HTML');
      console.error(error);
    }
  };

  const handleSharePreviewPdf = async () => {
    if (!previewHtml) return;
    try {
      const { uri } = await Print.printToFileAsync({ html: previewHtml });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
      console.error(error);
    }
  };

  const getItemCount = (cart: Record<string, number>) =>
    getCartItems(cart).reduce((sum, item) => sum + item.quantity, 0);

  const getTotalValue = (cart: Record<string, number>, rates?: Record<string, number>) =>
    getCartItems(cart, rates).reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const filteredBills = bills.filter(b => {
    const q = searchQuery.toLowerCase();
    const dateStr = b.delivery_date || b.bill_date;
    return b.shop_name.toLowerCase().includes(q) ||
      b.village_name.toLowerCase().includes(q) ||
      (b.area_name && b.area_name.toLowerCase().includes(q)) ||
      b.invoice_no.toString().includes(q) ||
      (dateStr && dateStr.includes(q));
  });

  const groupedBills = React.useMemo(() => {
    const groups: Record<string, billService.Bill[]> = {};
    filteredBills.forEach(bill => {
      const creator = bill.created_by || 'Unknown';
      if (!groups[creator]) groups[creator] = [];
      groups[creator].push(bill);
    });
    return groups;
  }, [filteredBills]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View className="px-6 pt-1">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={() => {
              try {
                navigation.dispatch(DrawerActions.toggleDrawer());
              } catch (e) {
                console.warn('Navigation state error', e);
              }
            }}
            className="w-10 h-10 bg-white rounded-[12px] items-center justify-center shadow-2xl shadow-slate-300 border border-slate-50"
          >
            <Feather name="menu" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>

        <View>
          <Text className="text-3xl font-black text-[#1E293B] tracking-tighter">
            My Pending Bills
          </Text>
          <Text className="text-xs font-bold text-slate-400 mt-0.5">
            Orders awaiting Admin/Manager verification
          </Text>
        </View>

        <View className="mt-4 flex-row items-center bg-white rounded-xl px-4 py-2 border border-slate-100 shadow-sm">
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Search by shop, village or invoice..."
            className="flex-1 ml-3 font-bold text-slate-600"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ) : null}
        </View>

        {bills.length > 0 ? (
          <View className="mt-3 flex-row gap-2">
            {userRole?.toLowerCase() !== 'player' && userRole?.toLowerCase() !== 'viewer' && (
              <TouchableOpacity
                onPress={handleVerifyAll}
                className="flex-1 py-3 bg-emerald-600 rounded-[16px] shadow-lg shadow-emerald-600/20 flex-row items-center justify-center gap-2"
              >
                <Feather name="check-circle" size={16} color="white" />
                <Text className="text-white font-black text-[9px] uppercase tracking-widest">Verify All</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleShowAllLoadingSheetPreview}
              className="flex-1 py-3 bg-blue-600 rounded-[16px] shadow-lg shadow-blue-600/20 flex-row items-center justify-center gap-2"
            >
              <Feather name="file-text" size={16} color="white" />
              <Text className="text-white font-black text-[9px] uppercase tracking-widest">Loading Sheet</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View className="px-6 py-2 pb-3">
        <View className="px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-100 self-start">
          <Text className="text-amber-600 font-black text-[10px] uppercase tracking-widest">
            {filteredBills.length} IN QUEUE
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} colors={['#4F46E5']} />
        }
      >
        {loading ? (
          <View className="py-20">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : filteredBills.length === 0 ? (
          <View
            className="mx-6 p-12 bg-white rounded-[48px] items-center justify-center border border-slate-50"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.1,
              shadowRadius: 40,
              elevation: 10
            }}
          >
            <View className="w-24 h-24 bg-slate-50 rounded-full items-center justify-center mb-8">
              <Text className="text-5xl text-slate-300">🕒</Text>
            </View>
            <Text className="font-black text-2xl text-[#475569] mb-4 text-center">No bills in queue</Text>
            <Text className="text-slate-400 font-bold text-center px-6 leading-7 text-lg">
              Your submitted orders will appear here until verified.
            </Text>
          </View>
        ) : (
          <View className="px-4">
            {Object.entries(groupedBills).map(([staffName, staffBills]) => (
              <View key={staffName} className="mb-6">
                <View className="flex-row items-center justify-between px-5 py-3 bg-slate-100 rounded-3xl mb-4 border border-slate-200">
                  <TouchableOpacity
                    onPress={() => setExpandedGroups(prev => ({ ...prev, [staffName]: !prev[staffName] }))}
                    className="flex-row items-center gap-2 flex-1 py-1"
                  >
                    <Feather 
                      name={expandedGroups[staffName] ? "chevron-up" : "chevron-down"} 
                      size={18} 
                      color="#2563EB" 
                    />
                    <Text className="text-xs font-black text-blue-600 uppercase tracking-widest">{staffName}'s Bills</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        const d = new Date();
                        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        const html = generateLoadingSheetHTML(staffBills, today, '', userRole?.toLowerCase() === 'player');
                        setPreviewHtml(html);
                        setPreviewTitle(`Loading Sheet - ${staffName}`);
                        setIsPreviewVisible(true);
                      } catch (error) {
                        Alert.alert('Error', 'Failed to generate Loading Sheet HTML');
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
                  >
                    <Text className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Loading Sheet</Text>
                  </TouchableOpacity>
                </View>

                {expandedGroups[staffName] && staffBills.map(bill => {
                  const isPlayer = userRole?.toLowerCase() === 'player';
                  return (
                    <View key={bill.id} className={`bg-white rounded-[32px] border border-slate-100 mb-4 shadow-xl shadow-slate-200/50 ${isPlayer ? 'p-4' : 'p-6'}`}>
                      <View className="flex-row flex-wrap items-center gap-2 mb-2">
                        <Text className="text-xl font-black text-[#1E293B]">
                          {bill.shop_name} {bill.created_by && <Text className="text-xs font-bold text-slate-500 normal-case font-normal">({bill.created_by})</Text>}
                        </Text>
                        <View className="px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                          <Text className="text-[10px] font-black text-slate-500">INV-{bill.invoice_no}</Text>
                        </View>
                        {bill.is_edited_price ? (
                          <View className="px-2 py-1 bg-red-100/50 rounded-lg border border-red-200">
                            <Text className="text-[10px] font-black text-red-600 uppercase tracking-widest">Edited Price</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4">
                        {bill.specific_area || bill.area_name || bill.village_name}
                      </Text>

                      {!isPlayer && (
                        <>
                          <View className="mb-4">
                            <Text className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Status</Text>
                            <Text className="text-base font-black text-amber-600 uppercase tracking-tighter">
                              Awaiting Verification
                            </Text>
                            <View className="mt-2">
                              <View className="flex-row items-center gap-2">
                                {(() => {
                                  const d = parseIST(bill.delivery_date || bill.bill_date);
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  const isTomorrow = d.getDate() === tomorrow.getDate() &&
                                    d.getMonth() === tomorrow.getMonth() &&
                                    d.getFullYear() === tomorrow.getFullYear();

                                  return (
                                    <View className="flex-row items-center">
                                      <Text className="text-sm font-black text-blue-600">
                                        {formatIST(d, { hour: undefined, minute: undefined })}
                                      </Text>
                                      {isTomorrow ? (
                                        <View className="ml-2 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                                          <Text className="text-[9px] font-black text-emerald-500">TOMORROW</Text>
                                        </View>
                                      ) : null}
                                    </View>
                                  );
                                })()}
                              </View>
                              <Text className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                                Order Taken: {formatIST(bill.bill_date)}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row items-center justify-between py-5 border-t border-b border-slate-50 border-dashed mb-4">
                            <View>
                              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Items</Text>
                              <Text className="text-2xl font-black text-[#1E293B]">{getItemCount(bill.cart)}</Text>
                            </View>
                            <View className="items-end">
                              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</Text>
                              <Text className="text-2xl font-black text-[#1E293B]">
                                ₹{getTotalValue(bill.cart, bill.custom_rates).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                            </View>
                          </View>
                        </>
                      )}

                      <View className="flex-row items-center justify-between mt-2">
                        <View className="flex-row items-center gap-2">
                          <TouchableOpacity
                            onPress={() => handleShowBillPreview(bill)}
                            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 items-center justify-center shadow-sm"
                          >
                            <Feather name="eye" size={20} color="#64748B" />
                          </TouchableOpacity>

                          {userRole?.toLowerCase() !== 'player' && userRole?.toLowerCase() !== 'viewer' && (
                            <TouchableOpacity
                              onPress={() => handleNavigateToEdit(bill)}
                              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 items-center justify-center shadow-sm"
                            >
                              <Feather name="edit-2" size={20} color="#64748B" />
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            onPress={() => handleShowSingleLoadingSheetPreview(bill)}
                            className="w-12 h-12 rounded-2xl bg-white border border-slate-200 items-center justify-center shadow-sm"
                          >
                            <Feather name="file-text" size={20} color="#10B981" />
                          </TouchableOpacity>
                        </View>

                        {userRole?.toLowerCase() !== 'player' && userRole?.toLowerCase() !== 'viewer' && (
                          <View className="flex-row items-center gap-3">
                            <TouchableOpacity onPress={() => handleReject(bill.id)} className="px-2">
                              <Text className="text-red-500 font-black text-[10px] uppercase tracking-widest">Reject</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleVerify(bill.id)}
                              className="px-6 py-4 bg-[#2563EB] rounded-2xl shadow-lg shadow-blue-600/30"
                            >
                              <Text className="text-white font-black text-[10px] uppercase tracking-widest font-bold">Verify ✓</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Loading Sheet Preview Modal */}
      <Modal
        visible={isPreviewVisible}
        animationType="slide"
        onRequestClose={() => setIsPreviewVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F1F5F9', paddingTop: insets.top }}>
          <StatusBar style="dark" />
          
          {/* Header Bar */}
          <View className="px-6 pt-2 pb-4 flex-row items-center justify-between border-b border-slate-200 bg-white">
            <TouchableOpacity
              onPress={() => setIsPreviewVisible(false)}
              className="p-2.5 border border-slate-200 rounded-2xl bg-white shadow-sm"
            >
              <Feather name="x" size={22} color="#1E293B" />
            </TouchableOpacity>
            
            <Text className="text-xl font-black text-slate-900 italic tracking-tighter text-center flex-1 mx-4" numberOfLines={1}>
              {previewTitle}
            </Text>
            
            <TouchableOpacity
              onPress={handleSharePreviewPdf}
              className="p-2.5 border border-blue-200 rounded-2xl bg-blue-50 shadow-sm flex-row items-center justify-center"
            >
              <Feather name="share-2" size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {/* WebView Container */}
          <View className="flex-1 mt-4 mb-6 mx-4">
            <View className="flex-1 bg-white rounded-[40px] overflow-hidden border border-slate-200 shadow-2xl">
              {(() => {
                const isPlayerLoadingSheet = previewTitle.includes('Loading Sheet') && userRole?.toLowerCase() === 'player';
                if (isPlayerLoadingSheet) {
                  return (
                    <View style={{ flex: 1, width: '100%', height: '100%' }}>
                      {previewHtml ? (
                        <WebView
                          originWhitelist={['*']}
                          source={{ html: previewHtml }}
                          style={{ flex: 1, backgroundColor: 'white' }}
                          javaScriptEnabled={true}
                          domStorageEnabled={true}
                          scalesPageToFit={false}
                        />
                      ) : null}
                    </View>
                  );
                }

                return (
                  <ScrollView 
                    className="flex-1"
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    <ScrollView 
                      horizontal={true} 
                      showsHorizontalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      <View style={{ width: previewTitle.startsWith('Bill Preview') ? 1000 : 900, height: previewTitle.startsWith('Bill Preview') ? 1800 : 2400 }}>
                        {previewHtml ? (
                          <WebView
                            originWhitelist={['*']}
                            source={{ html: previewHtml }}
                            style={{ flex: 1, backgroundColor: 'white' }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            scalesPageToFit={false}
                            scrollEnabled={false} // Let native ScrollViews handle gestures
                            overScrollMode="never"
                          />
                        ) : null}
                      </View>
                    </ScrollView>
                  </ScrollView>
                );
              })()}
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: insets.bottom, backgroundColor: '#F8FAFC' }} />
    </View>
  );
}
