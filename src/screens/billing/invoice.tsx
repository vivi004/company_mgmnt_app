import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { EncodingType } from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateInvoiceHTML } from '../../utils/invoiceUtils';
import { fetchCollectionsByOrderLine } from '../../services/collectionService';
import { getAllProducts } from '../../services/productService';

const BILL_CONTAINER_WIDTH = 1000;
const BILL_CONTAINER_HEIGHT = 1600; // Large height to avoid WebView internal scrolling issues

export default function InvoiceScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    cart: string;
    customRates: string;
    shopId: string;
    shopName: string;
    villageName: string;
    areaName: string;
    orderLineId: string;
    date: string;
    deliveryDate: string;
    invoiceNo: string;
    phone: string;
    phone2: string;
    specificArea?: string;
    editBillId: string;
    oldBalance?: string;
    initialCart?: string;
    initialDeliveryDate?: string;
  }>();

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

  const [oldBalance, setOldBalance] = useState<number>(() => Number(params.oldBalance || 0));

  useEffect(() => {
    if (params.oldBalance !== undefined) {
      setOldBalance(Number(params.oldBalance));
      return;
    }
    const loadBalanceInfo = async () => {
      if (!params.shopId || !params.orderLineId || !params.deliveryDate) return;
      try {
        const datePart = params.deliveryDate.split('T')[0];
        const { collections } = await fetchCollectionsByOrderLine(Number(params.orderLineId), datePart);
        const shopColl = collections.find(c => c.shop_id === Number(params.shopId));
        if (shopColl) {
          setOldBalance(shopColl.old_balance);
        }
      } catch (err) {
        console.error('Failed to load balance info for invoice', err);
      }
    };
    loadBalanceInfo();
  }, [params.shopId, params.orderLineId, params.deliveryDate, params.oldBalance]);

  const invoiceData = useMemo(() => ({
    shopName: params.shopName || 'Unknown Shop',
    villageName: params.villageName || 'Unknown village',
    areaName: params.areaName || '',
    specificArea: params.specificArea || '',
    cart: JSON.parse(params.cart || '{}'),
    customRates: JSON.parse(params.customRates || '{}'),
    invoiceNo: Number(params.invoiceNo || 0),
    date: params.date || new Date().toISOString(),
    deliveryDate: params.deliveryDate || params.date || new Date().toISOString(),
    phone: params.phone || '',
    phone2: params.phone2 || '',
    oldBalance,
    initialCart: params.initialCart || '',
    initialDeliveryDate: params.initialDeliveryDate || '',
    ...upiSettings
  }), [params, upiSettings, oldBalance]);

  const isEditedPrice = useMemo(() => {
    try {
      const customRates = JSON.parse(params.customRates || '{}');
      const cart = JSON.parse(params.cart || '{}');
      const allProducts = getAllProducts();
      const productMap = new Map(allProducts.map(p => [p.id, p]));
      
      return Object.keys(cart).some(pid => {
        const cleanPid = pid.replace(/_wl$/, '').replace(/_box_wl$/, '_box').replace(/_ltr_wl$/, '_ltr');
        const p = productMap.get(cleanPid);
        if (!p) return false;
        const basePid = cleanPid.replace(/_box$|_ltr$/, '');
        const customRate = customRates[pid] ?? customRates[cleanPid] ?? customRates[basePid];
        return customRate !== undefined && customRate !== p.price;
      });
    } catch {
      return false;
    }
  }, [params.cart, params.customRates]);

  const isEditedQty = useMemo(() => {
    try {
      if (!params.initialCart) return false;
      const initCart = JSON.parse(params.initialCart);
      const cart = JSON.parse(params.cart || '{}');
      const finalKeys = Object.keys(cart).filter(k => cart[k] > 0);
      const initKeys = Object.keys(initCart).filter(k => initCart[k] > 0);
      
      if (finalKeys.length !== initKeys.length) return true;
      return finalKeys.some(k => cart[k] !== initCart[k]);
    } catch {
      return false;
    }
  }, [params.cart, params.initialCart]);

  const isEditedDate = useMemo(() => {
    try {
      if (!params.initialDeliveryDate || !params.deliveryDate) return false;
      const initDate = new Date(params.initialDeliveryDate);
      const deliveryDate = new Date(params.deliveryDate);
      const initStr = [initDate.getFullYear(), String(initDate.getMonth() + 1).padStart(2, '0'), String(initDate.getDate()).padStart(2, '0')].join('-');
      const delivStr = [deliveryDate.getFullYear(), String(deliveryDate.getMonth() + 1).padStart(2, '0'), String(deliveryDate.getDate()).padStart(2, '0')].join('-');
      return initStr !== delivStr;
    } catch {
      return false;
    }
  }, [params.deliveryDate, params.initialDeliveryDate]);

  const htmlContent = useMemo(() => generateInvoiceHTML(invoiceData), [invoiceData]);
  const webViewRef = useRef<WebView>(null);
  const [downloadingImage, setDownloadingImage] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleDownloadImage = () => {
    if (downloadingImage) return;
    setDownloadingImage(true);
    webViewRef.current?.injectJavaScript('captureAsImage(); void(0);');
  };

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CAPTURE_IMAGE') {
        const base64Data = data.dataUrl.split(',')[1];
        const filename = `Invoice_${invoiceData.invoiceNo}.png`;
        const fileUri = `${FileSystem.documentDirectory || ''}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: EncodingType.Base64,
        });
        setDownloadingImage(false);
        await Sharing.shareAsync(fileUri, { mimeType: 'image/png', dialogTitle: 'Download Invoice Image' });
      } else if (data.type === 'CAPTURE_ERROR') {
        setDownloadingImage(false);
        Alert.alert('Error', data.error);
      }
    } catch (err) {
      setDownloadingImage(false);
      console.error('onMessage error:', err);
      Alert.alert('Error', 'Failed to generate image');
    }
  };

  const handleNewOrder = () => {
    // Use replace so shop-list ALWAYS mounts fresh and useFocusEffect fires
    // This guarantees the completed/pending status is refreshed after placing an order
    router.replace({
        pathname: '/(drawer)/shop-list',
        params: { 
            orderLineId: params.orderLineId, 
            villageName: params.villageName,
            areaName: params.areaName 
        }
    } as any);
  };

  const handleEdit = () => {
    // Navigate to the ordering screen with the current cart pre-loaded
    // and editBillId so it updates the same bill/invoice
    router.push({
      pathname: '/(drawer)/ordering',
      params: {
        shopId: params.shopId,
        shopName: params.shopName,
        villageName: params.villageName,
        areaName: params.areaName,
        orderLineId: params.orderLineId,
        phone: params.phone,
        phone2: params.phone2,
        specificArea: params.specificArea,
        editBillId: params.editBillId,
        initialCart: params.cart,
        initialCustomPrices: params.customRates,
        invoiceNo: params.invoiceNo,
      }
    } as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F1F5F9]">
      <StatusBar style="dark" />
      
      {/* Header Bar */}
      <View className="px-6 pt-2 pb-4 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          className="p-2.5 border border-slate-200 rounded-2xl bg-white shadow-sm"
        >
          <Feather name="menu" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text className="text-3xl font-black text-slate-900 italic tracking-tighter">
          Invoice Generated <Text className="text-emerald-500">✓</Text>
        </Text>
        <View className="w-10" /> 
      </View>
      {/* Success Banner */}
      <View className="mx-6 mb-2 bg-emerald-500 px-5 py-4 rounded-[24px] flex-row items-center gap-4 shadow-lg shadow-emerald-500/30">
        <View className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center">
          <Feather name="check-circle" size={22} color="white" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-white font-black text-sm tracking-tight">Order Placed Successfully!</Text>
          </View>
          <Text className="text-emerald-100 text-[11px] font-bold mt-0.5">
            {invoiceData.shopName} • Invoice #{invoiceData.invoiceNo}
          </Text>
          {(isEditedPrice || isEditedQty || isEditedDate) && (
            <View className="flex-row flex-wrap items-center gap-1.5 mt-1.5">
              {isEditedPrice && (
                <View className="bg-red-600 border border-red-700 px-1.5 py-0.5 rounded-md">
                  <Text className="text-white text-[8px] font-black uppercase tracking-wider">Edited Price</Text>
                </View>
              )}
              {isEditedQty && (
                <View className="bg-amber-600 border border-amber-700 px-1.5 py-0.5 rounded-md">
                  <Text className="text-white text-[8px] font-black uppercase tracking-wider">Edited Qty</Text>
                </View>
              )}
              {isEditedDate && (
                <View className="bg-blue-600 border border-blue-700 px-1.5 py-0.5 rounded-md">
                  <Text className="text-white text-[8px] font-black uppercase tracking-wider">Edited Date</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <View className="px-6 py-4">
        <View className="flex-row gap-4 mb-4">
          <TouchableOpacity
            onPress={handleDownloadPDF}
            className="flex-1 bg-emerald-600 flex-row items-center justify-center p-4 rounded-[24px] shadow-lg shadow-emerald-600/30"
          >
            <View className="mr-2 border border-white/30 p-1 rounded-lg bg-white/20">
                <Feather name="file-text" size={18} color="white" />
            </View>
            <Text className="text-white font-black text-[11px] uppercase tracking-[1px] text-center">
              Download{'\n'}PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDownloadImage}
            disabled={downloadingImage}
            className="flex-1 bg-blue-600 flex-row items-center justify-center p-4 rounded-[24px] shadow-lg shadow-blue-600/30"
          >
            {downloadingImage ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <View className="mr-2 border border-white/30 p-1 rounded-lg bg-white/20">
                    <Feather name="image" size={18} color="white" />
                </View>
                <Text className="text-white font-black text-[11px] uppercase tracking-[1px] text-center">
                  Download{'\n'}Image
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-4">
          <TouchableOpacity
            onPress={handleEdit}
            className="flex-1 bg-white border border-slate-200 flex-row items-center justify-center py-4 rounded-[24px] shadow-lg shadow-slate-200/50"
          >
            <Feather name="edit-3" size={18} color="#64748B" className="mr-2" />
            <Text className="text-slate-600 font-black text-[13px] uppercase tracking-[2px]">Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNewOrder}
            className="flex-1 bg-white border border-slate-200 flex-row items-center justify-center py-4 rounded-[24px] shadow-lg shadow-slate-200/50"
          >
            <Feather name="plus-circle" size={18} color="#64748B" className="mr-2" />
            <Text className="text-slate-600 font-black text-[13px] uppercase tracking-[2px]">New Order</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nested Scroll Area for both H and V scrolling */}
      <View className="flex-1 mt-2 mb-6 mx-4">
          <View className="flex-1 bg-white rounded-[40px] overflow-hidden border border-slate-200 shadow-2xl">
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
                      <View style={{ width: BILL_CONTAINER_WIDTH, height: BILL_CONTAINER_HEIGHT }}>
                          <WebView
                            ref={webViewRef}
                            originWhitelist={['*']}
                            source={{ html: htmlContent }}
                            style={{ flex: 1, backgroundColor: 'white' }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            scalesPageToFit={false}
                            scrollEnabled={false} // Let native ScrollViews handle gestures
                            overScrollMode="never"
                            onMessage={handleMessage}
                          />
                      </View>
                  </ScrollView>
              </ScrollView>
          </View>
      </View>

    </SafeAreaView>
  );
}
