import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
    selectedShop: any | null;
    setSelectedShop: (shop: any | null) => void;
    
    // Adjustment
    showAdjustModal: boolean;
    setShowAdjustModal: (show: boolean) => void;
    adjData: { amount: string; description: string; method: string };
    setAdjData: (data: any) => void;
    submittingAdj: boolean;
    handleAdjustment: () => void;
    
    // Payment
    showPaymentModal: boolean;
    setShowPaymentModal: (show: boolean) => void;
    paymentData: { amount: string; method: string; upiApp: string; description: string };
    setPaymentData: (data: any) => void;
    submittingPayment: boolean;
    handleCollectPayment: () => void;

    // Return
    showReturnModal?: boolean;
    setShowReturnModal?: (show: boolean) => void;
    returnProductName?: string;
    setReturnProductName?: (name: string) => void;
    returnAmount?: string;
    setReturnAmount?: (amount: string) => void;
    submittingReturn?: boolean;
    handleSaveProductReturn?: () => void;
}

const ShopActionModals: React.FC<Props> = ({
    selectedShop, setSelectedShop,
    showAdjustModal, setShowAdjustModal, adjData, setAdjData, submittingAdj, handleAdjustment,
    showPaymentModal, setShowPaymentModal, paymentData, setPaymentData, submittingPayment, handleCollectPayment,
    showReturnModal, setShowReturnModal, returnProductName, setReturnProductName, returnAmount, setReturnAmount, submittingReturn, handleSaveProductReturn,
}) => {

    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
            (e) => {
                if (Platform.OS === 'android') {
                    setKeyboardHeight(e.endCoordinates.height);
                }
            }
        );
        const hideListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
            () => {
                setKeyboardHeight(0);
            }
        );

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    const closeAll = () => {
        setShowAdjustModal(false);
        setShowPaymentModal(false);
        if (setShowReturnModal) setShowReturnModal(false);
        setSelectedShop(null);
    };

    return (
        <>
            {/* --- Adjust Balance Modal --- */}
            <Modal
                visible={showAdjustModal}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={closeAll}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1 justify-end bg-black/50"
                >
                    <View 
                        className="bg-white rounded-t-[40px] p-6 pb-10 shadow-xl"
                        style={{ paddingBottom: Platform.OS === 'android' ? Math.max(keyboardHeight, 40) : 40 }}
                    >
                        <View className="flex-row items-center justify-between mb-6">
                            <View>
                                <Text className="text-xl font-black italic text-slate-900 tracking-tight">Manual Adjustment</Text>
                                <Text className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">{selectedShop?.shop_name}</Text>
                            </View>
                            <TouchableOpacity onPress={closeAll} className="p-2 bg-slate-100 rounded-full">
                                <Ionicons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View className="space-y-4">
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Amount (±)</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        placeholder="0.00"
                                        value={adjData.amount}
                                        onChangeText={text => setAdjData({ ...adjData, amount: text })}
                                        className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-lg font-bold text-slate-900"
                                    />
                                </View>

                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Reason</Text>
                                    <TextInput
                                        multiline
                                        numberOfLines={3}
                                        placeholder="Reason for adjustment..."
                                        value={adjData.description}
                                        onChangeText={text => setAdjData({ ...adjData, description: text })}
                                        className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 min-h-[100px]"
                                        textAlignVertical="top"
                                    />
                                </View>

                                {parseFloat(adjData.amount) < 0 && (
                                    <View>
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3 text-center">Set as Collection Mode</Text>
                                        <View className="flex-row flex-wrap gap-2 justify-center">
                                            {(['Cash', 'UPI', 'Cheque', 'Discount'] as const).map((m) => (
                                                <TouchableOpacity
                                                    key={m}
                                                    onPress={() => setAdjData({ ...adjData, method: m })}
                                                    className={`px-4 py-2.5 rounded-xl border ${adjData.method === m ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}
                                                >
                                                    <Text className={`text-[10px] font-black uppercase tracking-widest ${adjData.method === m ? 'text-white' : 'text-slate-500'}`}>{m}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <TouchableOpacity
                                    onPress={handleAdjustment}
                                    disabled={submittingAdj}
                                    className={`mt-4 py-4 rounded-2xl items-center shadow-lg ${submittingAdj ? 'bg-slate-300' : 'bg-blue-600 shadow-blue-500/30'}`}
                                >
                                    {submittingAdj ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-xs uppercase tracking-widest">Apply Adjustment</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- Collect Payment Modal --- */}
            <Modal
                visible={showPaymentModal}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={closeAll}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1 justify-end bg-black/50"
                >
                    <View 
                        className="bg-white rounded-t-[40px] p-6 pb-10 shadow-xl max-h-[90%]"
                        style={{ paddingBottom: Platform.OS === 'android' ? Math.max(keyboardHeight, 40) : 40 }}
                    >
                        <View className="flex-row items-center justify-between mb-6">
                            <View>
                                <Text className="text-xl font-black italic text-slate-900 tracking-tight">Collect Payment</Text>
                                <Text className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">{selectedShop?.shop_name}</Text>
                            </View>
                            <TouchableOpacity onPress={closeAll} className="p-2 bg-slate-100 rounded-full">
                                <Ionicons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View className="space-y-6">
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Amount to Collect (₹)</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        placeholder="0.00"
                                        value={paymentData.amount}
                                        onChangeText={text => setPaymentData({ ...paymentData, amount: text })}
                                        className="bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-5 text-3xl font-black text-emerald-600"
                                    />
                                </View>

                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3">Payment Method</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {(['Cash', 'UPI', 'Cheque', 'Discount'] as const).map((m) => (
                                            <TouchableOpacity
                                                key={m}
                                                onPress={() => setPaymentData({ ...paymentData, method: m })}
                                                className={`px-3 py-2.5 rounded-xl border ${paymentData.method === m ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-200'}`}
                                            >
                                                <Text className={`text-[9px] font-black uppercase tracking-widest ${paymentData.method === m ? 'text-white' : 'text-slate-500'}`}>{m}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {paymentData.method === 'UPI' && (
                                    <View>
                                        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3">UPI App</Text>
                                        <View className="flex-row flex-wrap gap-2">
                                            {(['PhonePe', 'GPay', 'Paytm', 'Other'] as const).map((app) => (
                                                <TouchableOpacity
                                                    key={app}
                                                    onPress={() => setPaymentData({ ...paymentData, upiApp: app })}
                                                    className={`px-3 py-2.5 rounded-xl border ${paymentData.upiApp === app ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}
                                                >
                                                    <Text className={`text-[9px] font-black uppercase tracking-widest ${paymentData.upiApp === app ? 'text-white' : 'text-slate-500'}`}>{app}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Notes</Text>
                                    <TextInput
                                        placeholder="e.g. Paid via GPay"
                                        value={paymentData.description}
                                        onChangeText={text => setPaymentData({ ...paymentData, description: text })}
                                        className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900"
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleCollectPayment}
                                    disabled={submittingPayment}
                                    className={`mt-4 py-5 rounded-[24px] items-center shadow-xl ${submittingPayment ? 'bg-slate-300' : 'bg-emerald-600 shadow-emerald-500/40'}`}
                                >
                                    {submittingPayment ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-sm uppercase tracking-widest">Confirm Collection</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- Product Return Modal --- */}
            <Modal
                visible={showReturnModal}
                animationType="slide"
                transparent={true}
                statusBarTranslucent={true}
                onRequestClose={closeAll}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1 justify-end bg-black/50"
                >
                    <View 
                        className="bg-white rounded-t-[40px] p-6 pb-10 shadow-xl max-h-[90%]"
                        style={{ paddingBottom: Platform.OS === 'android' ? Math.max(keyboardHeight, 40) : 40 }}
                    >
                        <View className="flex-row items-center justify-between mb-6">
                            <View>
                                <Text className="text-xl font-black italic text-slate-900 tracking-tight">Record Product Return</Text>
                                <Text className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">{selectedShop?.shop_name}</Text>
                            </View>
                            <TouchableOpacity onPress={closeAll} className="p-2 bg-slate-100 rounded-full">
                                <Ionicons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View className="space-y-6">
                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Product Name</Text>
                                    <TextInput
                                        placeholder="e.g. Groundnut Oil 1 ltr"
                                        value={returnProductName}
                                        onChangeText={setReturnProductName}
                                        className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900"
                                    />
                                    
                                    {/* Quick suggestion pills */}
                                    <View className="flex-row flex-wrap gap-1.5 mt-2.5 px-1">
                                        {['Groundnut Oil 1L', 'Coconut Oil 500ml', 'Lamp Oil 1L', 'Gingelly Oil 1L', 'Castor Oil'].map((item) => (
                                            <TouchableOpacity 
                                                key={item} 
                                                onPress={() => setReturnProductName && setReturnProductName(item)}
                                                className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1"
                                            >
                                                <Text className="text-[9px] font-black text-amber-600 uppercase tracking-tight">{item}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View>
                                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Return Value (₹)</Text>
                                    <TextInput
                                        keyboardType="numeric"
                                        placeholder="0.00"
                                        value={returnAmount}
                                        onChangeText={setReturnAmount}
                                        className="bg-amber-50 border border-amber-100 rounded-2xl px-6 py-5 text-3xl font-black text-amber-600"
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleSaveProductReturn}
                                    disabled={submittingReturn}
                                    className={`mt-4 py-5 rounded-[24px] items-center shadow-xl ${submittingReturn ? 'bg-slate-300' : 'bg-amber-600 shadow-amber-500/40'}`}
                                >
                                    {submittingReturn ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-sm uppercase tracking-widest">Confirm Return</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
};

export default ShopActionModals;
