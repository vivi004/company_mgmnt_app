import { useState } from 'react';
import { collectPayment as apiCollectPayment, adjustBalance as apiAdjustBalance } from '../../../services/shopService';
import { getUserData } from '../../../services/authService';
import { Alert } from 'react-native';

export const useShopActions = (onSuccess?: () => void, collectionDate?: string) => {
    const [selectedShop, setSelectedShop] = useState<any | null>(null);
    
    // Adjustment States
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjData, setAdjData] = useState({ amount: '', description: '', method: 'Cash' });
    const [submittingAdj, setSubmittingAdj] = useState(false);

    // Payment States
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({ 
        amount: '', 
        dualCashAmount: '',
        dualUpiAmount: '',
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
        try {
            const userData = await getUserData();
            const adminName = userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : 'Admin';

            await apiAdjustBalance(selectedShop.shop_id, {
                amount: amount,
                description: adjData.description,
                payment_method: amount < 0 ? adjData.method : null,
                created_by: adminName,
                collection_date: collectionDate
            });
            
            Alert.alert('Success', 'Balance adjusted!');
            setShowAdjustModal(false);
            setSelectedShop(null);
            setAdjData({ amount: '', description: '', method: 'Cash' });
            if (onSuccess) onSuccess();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to adjust balance');
        } finally {
            setSubmittingAdj(false);
        }
    };

    const handleCollectPayment = async () => {
        if (!selectedShop || submittingPayment) return;
        
        let amount = parseFloat(paymentData.amount);
        if (paymentData.method === 'Dual Mode') {
            amount = (parseFloat(paymentData.dualCashAmount) || 0) + (parseFloat(paymentData.dualUpiAmount) || 0);
        }

        if (isNaN(amount) || amount <= 0) {
            return Alert.alert('Error', 'Please enter a valid amount');
        }

        const currentBalance = Number(selectedShop.total_balance) || 0;
        if (amount > currentBalance) {
            return Alert.alert('Error', `Total balance is ₹${currentBalance.toLocaleString('en-IN')}, invalid to collect`);
        }

        setSubmittingPayment(true);
        try {
            const userData = await getUserData();
            const userName = userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : 'Admin';
            
            let method = paymentData.method;
            let description = paymentData.description;
            
            if (paymentData.method === 'UPI') {
                method = paymentData.upiApp;
            } else if (paymentData.method === 'Dual Mode') {
                const cashAmt = parseFloat(paymentData.dualCashAmount) || 0;
                const upiAmt = parseFloat(paymentData.dualUpiAmount) || 0;
                method = `Cash + ${paymentData.upiApp}`;
                if (!description) {
                    description = `Split Payment: Cash (₹${cashAmt}) + ${paymentData.upiApp} (₹${upiAmt})`;
                }
            } else if (paymentData.method === 'Discount') {
                method = 'Discount';
                if (!description) {
                    description = `Discount Applied — ₹${amount.toLocaleString('en-IN')}`;
                }
            }

            const cash_amount = paymentData.method === 'Dual Mode' ? parseFloat(paymentData.dualCashAmount) || 0 : (paymentData.method === 'Cash' ? amount : 0);
            const upi_amount = paymentData.method === 'Dual Mode' ? parseFloat(paymentData.dualUpiAmount) || 0 : (paymentData.method === 'UPI' ? amount : 0);
            const cheque_amount = paymentData.method === 'Cheque' ? amount : 0;

            await apiCollectPayment(selectedShop.shop_id, {
                amount: amount,
                payment_method: method,
                cash_amount,
                upi_amount,
                cheque_amount,
                description: description || `${method} payment collected by ${userName}`,
                created_by: userName,
                collection_date: collectionDate
            });
            
            Alert.alert('Success', 'Payment recorded!');
            setShowPaymentModal(false);
            setSelectedShop(null);
            setPaymentData({ amount: '', dualCashAmount: '', dualUpiAmount: '', method: 'Cash', upiApp: 'PhonePe', description: '' });
            if (onSuccess) onSuccess();
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
