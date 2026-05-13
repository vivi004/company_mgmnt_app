import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Product } from '../../services/productService';

interface ProductCardProps {
  product: Product;
  variantId: string;
  variantName: string;
  variantSize: string;
  quantity: number;
  rate: number;
  updateQuantity: (id: string, delta: number) => void;
  onRateChange?: (id: string, rate: number) => void;
  showRateEdit?: boolean;
}

/**
 * RepeatableButton: Triggers an action repeatedly while pressed.
 */
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
  const [isRepeating, setIsRepeating] = useState(false);
  const onPressRef = useRef(onPress);
  const repeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => {
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
      activeOpacity={0.7}
      disabled={disabled}
      style={disabled ? { opacity: 0.3 } : {}}
      className={className}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function ProductCard({ 
  product, 
  variantId, 
  variantName, 
  variantSize, 
  quantity, 
  rate, 
  updateQuantity, 
  onRateChange,
  showRateEdit = false
}: ProductCardProps) {
  const itemTotal = rate * quantity;
  const isInCart = quantity > 0;

  return (
    <View 
      className={`p-6 rounded-[40px] border mb-4 bg-white transition-all ${
        isInCart ? 'border-blue-100 shadow-xl shadow-blue-500/10' : 'border-slate-50'
      }`}
    >
      {/* Top Row: Name and Rate */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="font-black text-[16px] text-slate-900 uppercase tracking-tight">
            {variantName}
          </Text>
          <Text className="text-[11px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest leading-none">
            {product.brand} • {variantSize}
          </Text>
        </View>

        {showRateEdit && (
          <View className="flex-row items-center">
            <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">RATE: ₹</Text>
            <View className="bg-slate-50 border border-slate-100 rounded-[20px] px-4 py-2.5 shadow-inner">
                <TextInput
                  keyboardType="numeric"
                  className="w-12 p-0 text-[13px] font-black text-slate-900 text-center"
                  value={rate.toString()}
                  onChangeText={(val) => onRateChange?.(variantId, parseFloat(val) || 0)}
                  selectTextOnFocus
                />
            </View>
          </View>
        )}
      </View>

      {/* Bottom Row: Price and Controls */}
      <View className="flex-row items-center justify-between mt-8">
        <View>
            <Text className="text-[26px] font-black text-[#2563EB] tracking-tighter">
            ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            {quantity > 0 && (
                <Text className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-[-2px]">Revised Total</Text>
            )}
        </View>

        <View className="flex-row items-center bg-slate-100/50 border border-slate-100 rounded-[28px] p-1 shadow-sm">
          <RepeatableButton 
            onPress={() => updateQuantity(variantId, -1)}
            disabled={quantity === 0}
            className="w-11 h-11 rounded-full bg-white items-center justify-center shadow-sm"
          >
            <Feather name="minus" size={16} color={quantity > 0 ? "#1E293B" : "#CBD5E1"} />
          </RepeatableButton>
          
          <View className="min-w-[44px] items-center">
            <Text className="text-[17px] font-black text-[#0F172A]">{quantity}</Text>
          </View>

          <RepeatableButton 
            onPress={() => updateQuantity(variantId, 1)}
            className="w-11 h-11 rounded-full bg-white items-center justify-center shadow-sm"
          >
            <Feather name="plus" size={16} color="#0F172A" />
          </RepeatableButton>
        </View>
      </View>
    </View>
  );
}
