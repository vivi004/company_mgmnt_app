import { useState } from 'react';
import { collectPayment as apiCollectPayment, adjustBalance as apiAdjustBalance } from '../../../services/shopService';
import { getUserData } from '../../../services/authService';
import { Alert } from 'react-native';

export const useShopActions = (
    onSuccess?: () => void, 
    collectionDate?: string,
    collectPaymentOptimistic?: (shopId: number, amount: number, method: string, description: string, userName: string) => Promise<void>,
    adjustBalanceOptimistic?: (shopId: number, amount: number, method: string, description: string, adminName: string) => Promise<void>
) => {
    const [selectedShop, setSelectedShop] = useState<any | null>(null);
    
    // Adjustment States
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjData, setAdjData] = useState({ amount: '', description: '', method: 'Cash' });
    const [submittingAdj, setSubmittingAdj] = useState(false);

    // Payment States
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({ 
        amount: '', 
        method: 'Cash', 
        upiApp: 'PhonePe', 
        description: '' 
    });
    const [submittingPayment, setSubmittingPayment] = useState(false);

    const handleAdjustment = async () => {
        if (!selectedShop || submittingAdj) return;
        const amount = parseFloat(adjData.amount);
        if (isNaN(amount)) return Alert.alert('Error', 'Enter a valid amount');
        
        setSubmittingAdj(true);

        // Close modal and reset fields instantly
        setShowAdjustModal(false);
        const prevShop = selectedShop;
        setSelectedShop(null);
        setAdjData({ amount: '', description: '', method: 'Cash' });

        try {
            const userData = await getUserData();
            const adminName = userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : 'Admin';

            if (adjustBalanceOptimistic) {
                await adjustBalanceOptimistic(prevShop.shop_id, amount, amount < 0 ? adjData.method : 'Cash', adjData.description, adminName);
            } else {
                await apiAdjustBalance(prevShop.shop_id, {
                    amount: amount,
                    description: adjData.description,
                    payment_method: amount < 0 ? adjData.method : null,
                    created_by: adminName,
                    collection_date: collectionDate
                });
                if (onSuccess) onSuccess();
            }
            Alert.alert('Success', 'Balance adjusted!');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to adjust balance');
        } finally {
            setSubmittingAdj(false);
        }
    };

    const handleCollectPayment = async () => {
        if (!selectedShop || submittingPayment) return;
        
        let amount = parseFloat(paymentData.amount);

        if (isNaN(amount) || amount <= 0) {
            return Alert.alert('Error', 'Please enter a valid amount');
        }

        const currentBalance = Number(selectedShop.total_balance) || 0;
        if (amount > currentBalance) {
            return Alert.alert('Error', `Total balance is ₹${currentBalance.toLocaleString('en-IN')}, invalid to collect`);
        }

        setSubmittingPayment(true);

        // Close modal and reset fields instantly
        setShowPaymentModal(false);
        const prevShop = selectedShop;
        setSelectedShop(null);
        const method = paymentData.method === 'UPI' ? paymentData.upiApp : paymentData.method;
        const description = paymentData.description;
        setPaymentData({ amount: '', method: 'Cash', upiApp: 'PhonePe', description: '' });

        try {
            const userData = await getUserData();
            const userName = userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : 'Admin';
            
            let finalMethod = method;
            let finalDescription = description;
            
            if (method === 'Discount') {
                if (!finalDescription) {
                    finalDescription = `Discount Applied — ₹${amount.toLocaleString('en-IN')}`;
                }
            } else if (!finalDescription) {
                finalDescription = `${method} payment collected by ${userName}`;
            }

            if (collectPaymentOptimistic) {
                await collectPaymentOptimistic(prevShop.shop_id, amount, finalMethod, finalDescription, userName);
            } else {
                const cash_amount = finalMethod === 'Cash' ? amount : 0;
                const upi_amount = ['UPI', 'PhonePe', 'GPay', 'Paytm', 'Other UPI'].includes(finalMethod) ? amount : 0;
                const cheque_amount = finalMethod === 'Cheque' ? amount : 0;

                await apiCollectPayment(prevShop.shop_id, {
                    amount: amount,
                    payment_method: finalMethod,
                    cash_amount,
                    upi_amount,
                    cheque_amount,
                    description: finalDescription,
                    created_by: userName,
                    collection_date: collectionDate
                });
                if (onSuccess) onSuccess();
            }
            Alert.alert('Success', 'Payment recorded!');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to record payment');
        } finally {
            setSubmittingPayment(false);
        }
    };

    return {
        selectedShop, setSelectedShop,
        showAdjustModal, setShowAdjustModal, adjData, setAdjData, submittingAdj, handleAdjustment,
        showPaymentModal, setShowPaymentModal, paymentData, setPaymentData, submittingPayment, handleCollectPayment,
    };
};
