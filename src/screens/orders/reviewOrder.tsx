import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getCartItems, getAllProducts, fetchAndCacheRatesFromServer } from '../../services/productService';
import * as billService from '../../services/billService';
import { getUserData } from '../../services/authService';
import DateTimePicker from '@react-native-community/datetimepicker';

function ReviewItemRow({ item, index, cart, updateQuantity, setAbsoluteQuantity }: { 
    item: any; 
    index: number;
    cart: Record<string, number>; 
    updateQuantity: (id: string, delta: number) => void;
    setAbsoluteQuantity: (id: string, val: number) => void;
}) {
    const [localQty, setLocalQty] = useState<string | null>(null);
    const qty = cart[item.id] || 0;

    useEffect(() => {
        setLocalQty(String(qty));
    }, [qty]);

    const handleTextChange = (id: string, val: string) => {
        setLocalQty(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) {
            setAbsoluteQuantity(id, parsed);
        } else if (val === '') {
            setAbsoluteQuantity(id, 0);
        }
    };

    // Determine display unit - exactly like web
    let displayUnit = (item.unit || 'NOS').toUpperCase();
    if (item.id === 'vs-gn-500ml-box' || item.id === 'vs-gn-1l-box' || item.id.endsWith('-box')) {
        displayUnit = 'BOX';
    }
    const fullDesc = `${item.name} ${item.size}`.toUpperCase();
    
    if (/\b15\s*(LTR|KG|L|T|TIN)\b/i.test(fullDesc)) {
        displayUnit = 'TIN';
    } else if (/\b5\s*(LTR|KG|L|CAN)\b/i.test(fullDesc)) {
        displayUnit = 'CAN';
    } else if (/\bBOX\b/i.test(fullDesc) || item.id.includes('_box')) {
        displayUnit = 'BOX';
    } else if (/\b(100|200|500)\s*ML\b/i.test(fullDesc)) {
        displayUnit = 'PCS';
    } else if (displayUnit === 'LITRE') {
        displayUnit = 'PCS';
    }

    const isLtrVariant = item.id.endsWith('_ltr');
    const sizeLower = item.size.toLowerCase();
    const is100ml = sizeLower === '100 ml';
    const is200ml = sizeLower === '200 ml';
    const is500ml = sizeLower === '500 ml';
    const isConvertibleLtr = isLtrVariant && (is100ml || is200ml || is500ml);
    const ltrMultiplier = is100ml ? 10 : is200ml ? 5 : is500ml ? 2 : 1;

    const displayUnitFinal = isConvertibleLtr ? 'LTR' : displayUnit;
    const displayRate = isConvertibleLtr ? item.price * ltrMultiplier : item.price;
    const cartDelta = isConvertibleLtr ? (1 / ltrMultiplier) : (item.id.includes('_ltr') ? 0.5 : 1);

    return (
        <View className="px-6 py-5 border-b border-slate-50">
            <View className="flex-row items-center">
                <Text className="w-10 font-black text-slate-400">{index + 1}</Text>
                <View className="flex-1">
                    <Text className="font-black text-base text-slate-900" numberOfLines={1}>
                        {item.id === 'vs-gn-500ml-box' || item.id === 'vs-gn-1l-box' ? `${item.name} ${item.size.replace(/\s*box$/i, '')}` : `${item.name} ${item.size}`}
                    </Text>
                    <Text className="text-xs font-bold text-slate-500 mt-0.5">{item.brand}</Text>
                </View>
            </View>

            {/* Controls & Price Row */}
            <View className="flex-row items-center justify-between mt-4">
                <View className="flex-row items-center bg-slate-50 rounded-2xl p-1 border border-slate-100">
                     <TouchableOpacity 
                        onPress={() => updateQuantity(item.id, -cartDelta)}
                        className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
                     >
                        <Feather name="minus" size={14} color="#EF4444" />
                     </TouchableOpacity>
                      <View className="px-2 items-center justify-center">
                         <TextInput
                            value={localQty ?? String(qty)}
                            keyboardType="numeric"
                            onChangeText={(val) => handleTextChange(item.id, val)}
                            selectTextOnFocus={true}
                            className="font-black text-slate-900 text-sm leading-tight text-center w-10 py-1"
                         />
                        <Text className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{displayUnitFinal}</Text>
                      </View>
                     <TouchableOpacity 
                        onPress={() => updateQuantity(item.id, cartDelta)}
                        className="w-8 h-8 rounded-full bg-emerald-500 items-center justify-center shadow-md shadow-emerald-500/30"
                     >
                        <Feather name="plus" size={14} color="white" />
                     </TouchableOpacity>
                </View>

                <View className="items-end">
                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Rate ₹{displayRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                    <Text className="text-lg font-black text-slate-900">₹{(displayRate * qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </View>
            </View>
        </View>
    );
}

export default function ReviewOrder() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    cart: string;
    shopId: string;
    shopName: string;
    orderLineId: string;
    villageName: string;
    areaName: string;
    specificArea?: string;
    editBillId?: string;
    customPrices?: string;
    phone?: string;
    phone2?: string;
    invoiceNo?: string;
  }>();

  const [cart, setCart] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(params.cart || '{}');
    } catch {
      return {};
    }
  });

  const [customPrices, setCustomPrices] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(params.customPrices || '{}');
    } catch {
      return {};
    }
  });

  const [placing, setPlacing] = useState(false);

  // Safety timeout to prevent stuck buttons
  useEffect(() => {
    if (placing) {
      const t = setTimeout(() => setPlacing(false), 15000);
      return () => clearTimeout(t);
    }
  }, [placing]);

  const [ratesRevision, setRatesRevision] = useState(0);
  
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default to tomorrow
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Refresh rates when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchAndCacheRatesFromServer().then((newRates) => {
        if (newRates) setRatesRevision(v => v + 1);
      });
    }, [])
  );

  const cartItems = useMemo(() => getCartItems(cart, customPrices), [cart, customPrices, ratesRevision]);

  const totalItems = useMemo(() => 
    cartItems.reduce((acc, item) => acc + item.quantity, 0), 
    [cartItems, ratesRevision]
  );
  
  const totalPrice = useMemo(() => 
    cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0), 
    [cartItems, ratesRevision]
  );

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      // Logic for 2L and 500ML steps similar to the ordering screen if needed
      // But for simplicity in review, we use 1 unit or the specific product's logic
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      const roundedNext = Math.round(next * 1000) / 1000;
      if (roundedNext === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: roundedNext };
    });
  };

  const setAbsoluteQuantity = (id: string, val: number) => {
    setCart((prev) => {
      const next = Math.max(0, val);
      const roundedNext = Math.round(next * 1000) / 1000;
      if (roundedNext === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: roundedNext };
    });
  };

  const handlePlaceOrder = async () => {
    if (placing) return;
    setPlacing(true);
    try {
      const user = await getUserData();
      
      // 1. Precise Date Handling (Prevent Timezone Shift)
      // We send raw YYYY-MM-DD to match the backend expectations and prevent UTC shifts.
      const deliveryDateStr = [
        deliveryDate.getFullYear(),
        String(deliveryDate.getMonth() + 1).padStart(2, '0'),
        String(deliveryDate.getDate()).padStart(2, '0')
      ].join('-');
      
      // 2. Robust Price Snapshotting
      // We capture the exact price overrides for all items in the cart to ensure historical accuracy.
      const finalCustomRates: Record<string, number> = {};
      let hasEditedPrice = false;
      
      const allProds = getAllProducts();
      allProds.forEach(p => {
          if (p.id.endsWith('_box') || p.id.endsWith('_ltr')) return;
          if (cart[p.id] > 0 || cart[`${p.id}_box`] > 0 || cart[`${p.id}_ltr`] > 0) {
              const basePrice = customPrices[p.id] ?? p.price;
              finalCustomRates[p.id] = basePrice;
              if (customPrices[p.id] !== undefined && customPrices[p.id] !== p.price) {
                  hasEditedPrice = true;
              }
          }
      });

      if (params.editBillId) {
        // UPDATE EXISTING BILL
        await billService.updateBill(Number(params.editBillId), { 
          cart: cart,
          custom_rates: finalCustomRates,
          total_amount: totalPrice,
          delivery_date: deliveryDateStr,
          is_edited_price: hasEditedPrice
        });
        
        Alert.alert('Updated!', 'Invoice updated successfully.', [
          { 
            text: 'OK', 
            onPress: () => router.push({
              pathname: '/invoice',
              params: {
                cart: JSON.stringify(cart),
                customRates: JSON.stringify(finalCustomRates),
                shopId: params.shopId,
                shopName: params.shopName,
                villageName: params.villageName,
                areaName: params.areaName,
                specificArea: params.specificArea,
                orderLineId: params.orderLineId,
                invoiceNo: params.invoiceNo || '',
                date: new Date().toISOString(),
                deliveryDate: deliveryDateStr,
                phone: params.phone || '',
                phone2: params.phone2 || '',
                editBillId: params.editBillId,
              }
            } as any)
          }
        ]);
      } else {
        // SUBMIT NEW BILL
        const billData = {
          shop_id: Number(params.shopId),
          shop_name: params.shopName,
          village_name: params.villageName,
          cart: cart,
          custom_rates: finalCustomRates,
          bill_date: new Date().toISOString(),
          delivery_date: deliveryDateStr,
          created_by: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Mobile App'),
          total_amount: totalPrice,
          is_edited_price: hasEditedPrice
        };

        const result = await billService.submitBill(billData);

        // Navigate to invoice screen
        router.replace({
          pathname: '/invoice',
          params: {
            cart: JSON.stringify(cart),
            customRates: JSON.stringify(finalCustomRates),
            shopId: params.shopId,
            shopName: params.shopName,
            villageName: params.villageName,
            areaName: params.areaName,
            orderLineId: params.orderLineId,
            phone: params.phone || '',
            phone2: params.phone2 || '',
            specificArea: params.specificArea,
            date: billData.bill_date,
            deliveryDate: billData.delivery_date,
            invoiceNo: result.invoice_no.toString(),
            editBillId: result.id.toString(),
          }
        } as any);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar style="dark" />
      {/* Header */}
      <View className="px-6 pt-4 pb-10 flex-row items-center gap-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-14 h-14 flex items-center justify-center rounded-[20px] bg-white border border-slate-200 shadow-lg shadow-slate-200/50"
        >
          <Feather name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View>
          <Text className="text-4xl font-black italic tracking-tighter text-slate-900 leading-tight">
            Review Order
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-sm font-black text-emerald-500 uppercase tracking-widest">
              {params.shopName}
            </Text>
            <View className="w-1 h-1 rounded-full bg-slate-300 mx-2" />
            <Text className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              {params.areaName || params.villageName}
            </Text>
          </View>
        </View>
      </View>

      {/* Order Content */}
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {cartItems.length === 0 ? (
          <View className="bg-white rounded-[40px] border border-slate-100 p-10 items-center justify-center shadow-xl shadow-slate-200/30">
            <Text className="text-5xl mb-4">🛒</Text>
            <Text className="font-black text-xl italic text-slate-900">Cart is empty</Text>
            <Text className="text-slate-500 mt-2 font-medium">Go back and add items to your order</Text>
          </View>
        ) : (
          <View className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/40">
            {/* Table Header */}
            <View className="flex-row bg-slate-50 border-b border-slate-100 px-6 py-5">
              <Text className="w-10 text-[10px] font-black uppercase tracking-widest text-slate-500">S.No</Text>
              <Text className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Description of Goods</Text>
            </View>

            {/* Item Rows */}
            {cartItems.map((item, index) => (
              <ReviewItemRow 
                key={item.id} 
                item={item} 
                index={index}
                cart={cart} 
                updateQuantity={updateQuantity}
                setAbsoluteQuantity={setAbsoluteQuantity}
              />
            ))}

            {/* Total Section */}
            <View className="bg-emerald-50/50 px-6 py-6 flex-row items-center justify-between">
                <View className="bg-emerald-100 px-4 py-1.5 rounded-full">
                    <Text className="text-emerald-700 font-black text-xs uppercase tracking-widest">{cartItems.length} Groups</Text>
                </View>
                <View className="items-end">
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Amount</Text>
                    <Text className="text-3xl font-black tracking-tight text-slate-900">
                      ₹{totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                </View>
            </View>
          </View>
        )}

        {cartItems.length > 0 ? (
          <View className="mt-6 mb-4 bg-white p-5 rounded-[24px] border border-slate-100 shadow-md shadow-slate-200/50 flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-sm font-black text-slate-900">Delivery / Bill Date</Text>
                {(() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const isTomorrow = deliveryDate.getDate() === tomorrow.getDate() && 
                                   deliveryDate.getMonth() === tomorrow.getMonth() && 
                                   deliveryDate.getFullYear() === tomorrow.getFullYear();
                  return isTomorrow ? (
                    <View className="bg-emerald-500 px-1.5 py-0.5 rounded-md">
                      <Text className="text-white text-[7px] font-black">TOMORROW</Text>
                    </View>
                  ) : null;
                })()}
              </View>
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select official invoice date</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-[16px] flex-row items-center gap-2"
            >
              <Feather name="calendar" size={16} color="#475569" />
              <Text className="font-black text-slate-700">
                {deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {showDatePicker && (
          <DateTimePicker
            value={deliveryDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDeliveryDate(selectedDate);
            }}
          />
        )}

        <View className="h-10" />
      </ScrollView>

      {/* Footer Buttons */}
      <View className="px-6 py-8 bg-[#F8FAFC] border-t border-slate-100 flex-row gap-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-1 bg-white border border-slate-200 py-4 rounded-[24px] items-center justify-center shadow-lg shadow-slate-200/50"
        >
          <Text className="text-slate-700 font-black text-[12px] uppercase tracking-[2px] text-center">
            ← BACK{'\n'}TO{'\n'}ITEMS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={placing || cartItems.length === 0}
          className={`flex-[1.5] bg-emerald-600 py-5 rounded-[24px] items-center justify-center shadow-xl shadow-emerald-600/30 ${placing ? 'opacity-70' : ''}`}
        >
          {placing ? (
            <ActivityIndicator color="white" />
          ) : (
          <Text className="text-white font-black text-[12px] uppercase tracking-[2px]">
            {params.editBillId ? 'Update Bill Now' : 'Place Order Now →'}
          </Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={{ height: insets.bottom, backgroundColor: '#F8FAFC' }} />
    </SafeAreaView>
  );
}
