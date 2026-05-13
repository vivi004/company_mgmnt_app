import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  BackHandler,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHOP_CATEGORIES, Product, fetchAndCacheRatesFromServer } from '../../src/services/productService';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 80;

function RepeatableButton({
  onPress,
  children,
  className,
  disabled
}: {
  onPress: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [isRepeating, setIsRepeating] = React.useState(false);
  const onPressRef = React.useRef(onPress);
  const repeatIntervalRef = React.useRef<NodeJS.Timeout|null>(null);

  React.useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  React.useEffect(() => {
    if (isRepeating && !disabled) {
      repeatIntervalRef.current = setInterval(() => {
        onPressRef.current();
      }, 70);
    } else {
      if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
    }
    return () => {
      if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
    };
  }, [isRepeating, disabled]);

  return (
    <TouchableOpacity
      onPress={() => {
        if (!disabled && !isRepeating) {
          onPressRef.current();
        }
      }}
      onLongPress={() => {
        if (!disabled) {
          setIsRepeating(true);
        }
      }}
      onPressOut={() => setIsRepeating(false)}
      delayLongPress={400}
      disabled={disabled}
      className={className}
      activeOpacity={0.7}
      style={disabled ? { opacity: 0.3 } : {}}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function OrderingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { shopId, shopName, orderLineId, villageName, areaName, specificArea, editBillId, initialCart, initialCustomPrices, phone, phone2, invoiceNo } = useLocalSearchParams<{
    shopId: string;
    shopName: string;
    orderLineId: string;
    villageName: string;
    areaName: string;
    specificArea?: string;
    editBillId?: string;
    initialCart?: string;
    initialCustomPrices?: string;
    phone?: string;
    phone2?: string;
    invoiceNo?: string;
  }>();

  const [activeCatId, setActiveCatId] = useState(SHOP_CATEGORIES[0].id);
  const [activeSubcatId, setActiveSubcatId] = useState(SHOP_CATEGORIES[0].subcategories[0].id);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [ratesRevision, setRatesRevision] = useState(0);
  const flatListRef = React.useRef<FlatList>(null);

  // Scroll to top when category or subcategory changes
  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [activeCatId, activeSubcatId]);

  // Pre-load cart and custom prices if in edit mode
  useEffect(() => {
    if (initialCart) {
      try {
        setCart(JSON.parse(initialCart));
      } catch (e) {
        console.error('Failed to parse initial cart', e);
      }
    }
    if (initialCustomPrices) {
      try {
        setCustomPrices(JSON.parse(initialCustomPrices));
      } catch (e) {
        console.error('Failed to parse initial custom prices', e);
      }
    }
  }, [initialCart, initialCustomPrices]);

  // Handle hardware back button and ensure it goes to the shop list
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.navigate({
          pathname: '/(drawer)/shop-list',
          params: { orderLineId, villageName, areaName }
        } as any);
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }, [router, orderLineId, villageName])
  );
  
  // Refresh rates when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchAndCacheRatesFromServer().then((newRates) => {
        if (newRates) setRatesRevision(v => v + 1);
      });
    }, [])
  );

  const activeCat = useMemo(() => {
    return SHOP_CATEGORIES.find((c) => c.id === activeCatId) || SHOP_CATEGORIES[0];
  }, [activeCatId]);

  const allProducts = useMemo(() => activeCat.getProducts(), [activeCat, ratesRevision]);

  const filteredProducts = useMemo(() => {
    let products = allProducts;

    // Subcategory filter
    if (activeSubcatId !== 'ALL') {
      products = products.filter(p =>
        p.name === activeSubcatId || p.id.startsWith(activeSubcatId.toLowerCase() + '-')
      );
      // Fallback if no direct match found (e.g. for subcats like GN, GG)
      if (products.length === 0) {
        products = allProducts.filter(p => {
          const sub = activeCat.subcategories.find(s => s.id === activeSubcatId);
          return sub ? p.name.includes(sub.name) : true;
        });
      }
    }

    if (search.trim()) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.size.toLowerCase().includes(search.toLowerCase())
      );
    }
    return products;
  }, [allProducts, activeSubcatId, search, activeCat]);

  const handleCatChange = (catId: string) => {
    const cat = SHOP_CATEGORIES.find((c) => c.id === catId)!;
    setActiveCatId(catId);
    setActiveSubcatId(cat.subcategories[0].id);
    setSearch('');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const setAbsoluteQuantity = (id: string, val: number) => {
    setCart((prev) => {
      const next = Math.max(0, val);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const handlePriceChange = (productId: string, newPrice: string) => {
    const parsed = parseFloat(newPrice);
    setCustomPrices((prev) => {
      // Create a shallow copy to modify
      const updated = { ...prev };
      
      // When base product price is changed, we MUST clear any stale variant prices 
      // so they recalculate correctly (e.g. base * 20 for a box).
      delete updated[`${productId}_box`];
      delete updated[`${productId}_ltr`];

      if (isNaN(parsed) || newPrice === '') {
        delete updated[productId];
      } else {
        updated[productId] = parsed;
      }
      return updated;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View className="flex-1">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-100">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => router.navigate({
              pathname: '/(drawer)/shop-list',
              params: { orderLineId, villageName, areaName }
            } as any)}
            className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 items-center justify-center mr-4"
          >
            <Feather name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-black italic tracking-tight text-slate-900" numberOfLines={1}>
              {shopName}
            </Text>
            <Text className="text-[10px] font-bold uppercase tracking-[2px] text-blue-500">
              {editBillId ? `Editing Bill #${editBillId}` : activeCat.name}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowSearch(!showSearch)}
          className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 items-center justify-center"
        >
          <Feather name={showSearch ? "x" : "search"} size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Search Bar Overlay */}
      {showSearch && (
        <View className="px-6 py-2 bg-white border-b border-slate-100">
          <TextInput
            autoFocus
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            className="bg-slate-50 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-900"
          />
        </View>
      )}

      {/* Top Root Categories Tabs */}
      <View className="bg-white border-b border-slate-50">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <View className="flex-row gap-3">
            {SHOP_CATEGORIES.map((cat) => {
              const isActive = cat.id === activeCatId;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => handleCatChange(cat.id)}
                  className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full border ${isActive ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'
                    }`}
                >
                  <Text className="text-sm">{cat.icon}</Text>
                  <Text
                    className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'
                      }`}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View className="flex-1 flex-row">
        {/* Left Subcategory Sidebar */}
        <View className="w-20 bg-slate-50 border-r border-slate-100">
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {activeCat.subcategories.map((sub) => {
              const isActive = sub.id === activeSubcatId;
              return (
                <TouchableOpacity
                  key={sub.id}
                  onPress={() => setActiveSubcatId(sub.id)}
                  className={`py-6 items-center border-b border-slate-100 relative ${isActive ? 'bg-blue-50' : 'bg-transparent'
                    }`}
                >
                  <Text className="text-2xl mb-1">{sub.icon}</Text>
                  <Text
                    numberOfLines={2}
                    className={`text-[9px] text-center px-1 font-bold uppercase tracking-widest ${isActive ? 'text-blue-600' : 'text-slate-400'
                      }`}
                  >
                    {sub.name}
                  </Text>
                  {isActive && (
                    <View className="absolute right-0 top-6 bottom-6 w-1 bg-blue-600 rounded-l-full" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Product List */}
        <View className="flex-1">
          <FlatList
            ref={flatListRef}
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                cart={cart}
                customPrices={customPrices}
                updateQuantity={updateQuantity}
                setAbsoluteQuantity={setAbsoluteQuantity}
                handlePriceChange={handlePriceChange}
              />
            )}
            ListEmptyComponent={() => (
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-4xl mb-4">🔍</Text>
                <Text className="text-slate-400 font-bold italic uppercase tracking-widest">
                  No products found
                </Text>
              </View>
            )}
            ListFooterComponent={() => filteredProducts.length > 0 ? (
              <View className="items-center py-6">
                <Text className="text-[10px] font-black text-slate-300 uppercase tracking-[3px]">
                  {filteredProducts.length} items • End of list
                </Text>
              </View>
            ) : null}
          />
        </View>
      </View>

      {/* Sticky Place Order Button */}
      {totalItems > 0 && (
        <View
          className="absolute right-6 z-50"
          style={{
            bottom: Math.max(insets.bottom, 20),
            left: SIDEBAR_WIDTH + 20 // Align with product list
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push({
              pathname: '/review-order',
              params: {
                cart: JSON.stringify(cart),
                customPrices: JSON.stringify(customPrices),
                shopId,
                shopName,
                orderLineId,
                villageName,
                areaName,
                specificArea,
                editBillId,
                phone,
                phone2,
                invoiceNo
              }
            } as any)}
            className="w-full bg-blue-600 flex-row items-center justify-between p-4 rounded-[32px] shadow-2xl border border-white/20"
            style={{ elevation: 12 }}
          >
            <View className="flex-row items-center gap-4 ml-2">
              <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
                <Feather name="shopping-bag" size={24} color="white" />
              </View>
              <View>
                <Text className="text-white font-black text-lg italic uppercase tracking-tighter">
                  {editBillId ? 'Update Bill Now' : 'Place Order Now'}
                </Text>
                <Text className="text-blue-100 text-xs font-bold uppercase tracking-widest">
                  {totalItems} items in cart
                </Text>
              </View>
            </View>
            <View className="w-12 h-12 rounded-full bg-white items-center justify-center shadow-sm ml-2">
              <Feather name="arrow-right" size={24} color="#2563EB" />
            </View>
          </TouchableOpacity>
        </View>
      )}
      {/* System Bar Shield */}
      <View style={{ height: insets.bottom, backgroundColor: '#FFFFFF' }} />
      </View>
    </SafeAreaView>
  );
}

// Memoize ProductCard to prevent alignment "bugs" and re-renders when editing other products
const ProductCard = memo(({ product, cart, customPrices, updateQuantity, setAbsoluteQuantity, handlePriceChange }: {
  product: Product;
  cart: Record<string, number>;
  customPrices: Record<string, number>;
  updateQuantity: (id: string, delta: number) => void;
  setAbsoluteQuantity: (id: string, val: number) => void;
  handlePriceChange: (id: string, val: string) => void;
}) => {
  const [localQty, setLocalQty] = useState<string | null>(null);
  const [localPrice, setLocalPrice] = useState<string>(
    customPrices[product.id] !== undefined ? String(customPrices[product.id]) : String(product.price)
  );

  const qty = cart[product.id] || 0;

  // Sync local states when external values change
  useEffect(() => {
    setLocalQty(String(qty));
  }, [qty]);

  useEffect(() => {
    const currentPrice = customPrices[product.id];
    const defaultPrice = product.price;
    const priceToShow = currentPrice !== undefined ? String(currentPrice) : String(defaultPrice);
    
    // Only sync if the user is not actively typing (localPrice is not empty)
    // or if the underlying data changed to something different than what we have
    if (localPrice !== "" && localPrice !== priceToShow) {
      setLocalPrice(priceToShow);
    }
  }, [customPrices[product.id], product.price]);

  const handleTextChange = (id: string, val: string) => {
    let finalVal = val;
    if (finalVal === "") finalVal = "0";
    if (finalVal.length > 1 && finalVal.startsWith('0') && finalVal[1] !== '.') {
      finalVal = finalVal.substring(1);
    }

    setLocalQty(finalVal);
    const parsed = parseFloat(finalVal);
    if (!isNaN(parsed)) {
      setAbsoluteQuantity(id, parsed);
    } else {
      setAbsoluteQuantity(id, 0);
    }
  };

  const isInCart = (cart[product.id] || 0) > 0 || (cart[product.id + '_box'] || 0) > 0 || (cart[product.id + '_ltr'] || 0) > 0;

  const renderQuantityControls = () => {
    const size = product.size.toLowerCase();
    const isNisha = product.brand === 'Nisha';

    if (isNisha) {
      if (size === '100 ml') return <BoxLitreControls product={product} cart={cart} customPrices={customPrices} updateQuantity={updateQuantity} setAbsoluteQuantity={setAbsoluteQuantity} handlePriceChange={handlePriceChange} boxMult={50} ltrMult={10} ltrLabel="LTR" ltrStep={1} />;
      if (size === '200 ml') return <BoxLitreControls product={product} cart={cart} customPrices={customPrices} updateQuantity={updateQuantity} setAbsoluteQuantity={setAbsoluteQuantity} handlePriceChange={handlePriceChange} boxMult={25} ltrMult={5} ltrLabel="LTR" ltrStep={1} />;
      if (size === '500 ml') return <BoxLitreControls product={product} cart={cart} customPrices={customPrices} updateQuantity={updateQuantity} setAbsoluteQuantity={setAbsoluteQuantity} handlePriceChange={handlePriceChange} boxMult={20} ltrMult={1} ltrLabel="PCS" ltrStep={1} />;
      if (size === '1 litre' || size === '1 ltr' || size === '1 ltr-pet') return <BoxLitreControls product={product} cart={cart} customPrices={customPrices} updateQuantity={updateQuantity} setAbsoluteQuantity={setAbsoluteQuantity} handlePriceChange={handlePriceChange} boxMult={10} ltrMult={1} ltrLabel="PCS" ltrStep={1} />;
      if (size === '2 ltr') return <BoxLitreControls product={product} cart={cart} customPrices={customPrices} updateQuantity={updateQuantity} setAbsoluteQuantity={setAbsoluteQuantity} handlePriceChange={handlePriceChange} boxMult={5} ltrMult={1} ltrLabel="2L-PCS" ltrStep={1} />;
    }

    return (
      <View className="flex-row items-center bg-blue-100/50 rounded-3xl p-1.5 mt-3 w-full border border-blue-200 shadow-inner">
        <RepeatableButton
          onPress={() => updateQuantity(product.id, -1)}
          disabled={qty === 0}
          className="p-4 rounded-2xl bg-white shadow-sm border border-blue-100"
        >
          <Feather name="minus" size={20} color={qty > 0 ? "#1E40AF" : "#CBD5E1"} />
        </RepeatableButton>
        <TextInput
          value={localQty ?? String(qty)}
          keyboardType="numeric"
          onChangeText={(val) => handleTextChange(product.id, val)}
          selectTextOnFocus={true}
          className="flex-1 text-center font-black text-blue-900 text-2xl py-2"
        />
        <RepeatableButton
          onPress={() => updateQuantity(product.id, 1)}
          className="p-4 rounded-2xl bg-blue-600 shadow-md border border-blue-500"
        >
          <Feather name="plus" size={20} color="white" />
        </RepeatableButton>
      </View>
    );
  };

  return (
    <View
      className={`mb-4 p-4 rounded-[32px] border ${isInCart ? 'border-blue-600 bg-blue-100' : 'border-blue-100 bg-blue-50/70 shadow-sm'
        }`}
      style={isInCart ? { elevation: 10, shadowOpacity: 0.15, shadowRadius: 20 } : { elevation: 2 }}
    >
      <View className="flex-1">
        {/* Brand & Size */}
        <View className="flex-row items-center gap-3 mb-2">
          <View className="bg-blue-600 px-3 py-1 rounded-lg">
            <Text className="text-[12px] font-black text-white uppercase tracking-widest italic">{product.brand}</Text>
          </View>
          <Text className="text-xl text-blue-600 font-extrabold uppercase tracking-tight">{product.size}</Text>
        </View>

        {/* Product Name & Unit Price */}
        <View className="flex-row items-start justify-between mb-4">
          <Text className="flex-1 text-xl font-black text-slate-900 leading-tight mr-4">
            {product.name}
          </Text>
          <View className="items-end">
            <View className="flex-row items-center border-b border-blue-200">
              <Text className="text-xl font-black italic tracking-tighter text-blue-900 leading-none">₹</Text>
              <TextInput
                value={localPrice}
                keyboardType="numeric"
                onChangeText={(val) => {
                  let finalVal = val;
                  if (finalVal === "") finalVal = "0";
                  if (finalVal.length > 1 && finalVal.startsWith('0') && finalVal[1] !== '.') {
                    finalVal = finalVal.substring(1);
                  }
                  
                  if (finalVal === "" || /^\d*\.?\d*$/.test(finalVal)) {
                    setLocalPrice(finalVal);
                    handlePriceChange(product.id, finalVal);
                  }
                }}
                onBlur={() => {
                  // If left as 0 or invalid, restore product price
                  if (localPrice === "" || parseFloat(localPrice) === 0 || isNaN(parseFloat(localPrice))) {
                    const resetPrice = String(product.price);
                    setLocalPrice(resetPrice);
                    handlePriceChange(product.id, resetPrice);
                  }
                }}
                className="text-2xl font-black italic tracking-tighter text-blue-900 leading-none min-w-[60px] text-right"
              />
            </View>
            <Text className="text-[11px] font-black text-blue-400 uppercase tracking-widest mt-1">Unit Price</Text>
          </View>
        </View>

        {/* Dynamic Controls Grid */}
        <View className="mt-1 pt-3 border-t border-slate-100">
          {renderQuantityControls()}
        </View>
      </View>
    </View>
  );
});

const BoxLitreControls = memo(({ product, cart, customPrices, updateQuantity, setAbsoluteQuantity, handlePriceChange, boxMult, ltrMult, ltrLabel, ltrStep }: {
  product: Product;
  cart: Record<string, number>;
  customPrices: Record<string, number>;
  updateQuantity: (id: string, delta: number) => void;
  setAbsoluteQuantity: (id: string, val: number) => void;
  handlePriceChange: (id: string, val: string) => void;
  boxMult: number;
  ltrMult: number;
  ltrLabel: string;
  ltrStep: number;
}) => {
  const boxId = product.id + '_box';
  const ltrId = product.id + (['PCS', '2L-PCS'].includes(ltrLabel) ? '' : '_ltr');

  const boxQty = cart[boxId] || 0;
  const ltrQty = cart[ltrId] || 0;

  const [localBox, setLocalBox] = useState<string | null>(null);
  const [localLtr, setLocalLtr] = useState<string | null>(null);

  useEffect(() => { setLocalBox(String(boxQty)); }, [boxQty]);
  useEffect(() => { setLocalLtr(String(ltrQty)); }, [ltrQty]);

  const handleTextChange = (id: string, val: string, setter: (v: string) => void) => {
    let finalVal = val;
    if (finalVal === "") finalVal = "0";
    if (finalVal.length > 1 && finalVal.startsWith('0') && finalVal[1] !== '.') {
      finalVal = finalVal.substring(1);
    }
    
    setter(finalVal);
    const parsed = parseFloat(finalVal);
    if (!isNaN(parsed)) {
      setAbsoluteQuantity(id, parsed);
    } else {
      setAbsoluteQuantity(id, 0);
    }
  };

  const rawUnitPrice = customPrices[product.id];
  const currentUnitPrice = (rawUnitPrice !== undefined) ? rawUnitPrice : product.price;
  
  // Safety check for calculations to prevent UI "bug" (NaN or crashes)
  const displayBoxPrice = isNaN(currentUnitPrice) ? 0 : (currentUnitPrice * boxMult);
  const displayLtrPrice = isNaN(currentUnitPrice) ? 0 : (currentUnitPrice * ltrMult);

  return (
    <View className="flex-col gap-4 mt-2">
      <View className="w-full">
        <View className="flex-row items-center justify-between mb-2 px-1 gap-2">
          <Text className="text-[12px] font-black text-blue-800 uppercase tracking-widest">Qty. Box</Text>
          <Text className="text-[14px] font-black text-blue-600">₹{displayBoxPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
        </View>
        <View className="flex-row items-center bg-white/60 border border-blue-200/50 rounded-2xl p-1 shadow-sm">
          <RepeatableButton 
              onPress={() => updateQuantity(boxId, -1)} 
              disabled={boxQty === 0}
              className="py-3.5 px-2.5 rounded-xl bg-white shadow-sm border border-blue-100"
          >
            <Feather name="minus" size={16} color={boxQty > 0 ? "#1E40AF" : "#CBD5E1"} />
          </RepeatableButton>
          <TextInput
              value={localBox ?? String(boxQty)}
              keyboardType="numeric"
              onChangeText={(val) => handleTextChange(boxId, val, setLocalBox)}
              selectTextOnFocus={true}
              className="flex-1 text-center font-black text-blue-900 text-xl py-2"
          />
          <RepeatableButton onPress={() => updateQuantity(boxId, 1)} className="py-3.5 px-2.5 rounded-xl bg-blue-600 shadow-md">
            <Feather name="plus" size={16} color="white" />
          </RepeatableButton>
        </View>
      </View>

      <View className="w-full">
        <View className="flex-row items-center justify-between mb-2 px-1 gap-2">
          <Text className="text-[12px] font-black text-blue-800 uppercase tracking-widest">Qty. {ltrLabel}</Text>
          <Text className="text-[14px] font-black text-blue-600">₹{displayLtrPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
        </View>
        <View className="flex-row items-center bg-white/60 border border-blue-200/50 rounded-2xl p-1 shadow-sm">
          <RepeatableButton 
              onPress={() => updateQuantity(ltrId, -ltrStep)} 
              disabled={ltrQty === 0}
              className="py-3.5 px-2.5 rounded-xl bg-white shadow-sm border border-blue-100"
          >
            <Feather name="minus" size={16} color={ltrQty > 0 ? "#1E40AF" : "#CBD5E1"} />
          </RepeatableButton>
          <TextInput
              value={localLtr ?? String(ltrQty)}
              keyboardType="numeric"
              onChangeText={(val) => handleTextChange(ltrId, val, setLocalLtr)}
              selectTextOnFocus={true}
              className="flex-1 text-center font-black text-blue-900 text-xl py-2"
          />
          <RepeatableButton onPress={() => updateQuantity(ltrId, ltrStep)} className="py-3.5 px-2.5 rounded-xl bg-blue-600 shadow-md">
            <Feather name="plus" size={16} color="white" />
          </RepeatableButton>
        </View>
      </View>
    </View>
  );
});



