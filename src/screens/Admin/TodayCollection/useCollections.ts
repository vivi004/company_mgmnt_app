import { useState, useEffect, useMemo } from 'react';
import { 
    fetchCollectionsByOrderLine, 
    fetchOrderLines, 
    addExpense as apiAddExpense, 
    updateExpense as apiUpdateExpense, 
    deleteExpense as apiDeleteExpense,
    recordProductReturn as apiRecordProductReturn,
    DailyCollection,
    Expense
} from '../../../services/collectionService';
import { collectPayment as apiCollectPayment, adjustBalance as apiAdjustBalance } from '../../../services/shopService';
import { getTodayIST } from '../../../utils/dateUtils';

export const useCollections = (orderLines: any[]) => {
    const [selectedDate, setSelectedDate] = useState(() => getTodayIST());
    const [selectedOlId, setSelectedOlId] = useState<number | null>(null);
    const [collections, setCollections] = useState<DailyCollection[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(false);

    // Auto-select first order line when orderLines load
    useEffect(() => {
        if (orderLines.length > 0 && selectedOlId === null) {
            setSelectedOlId(orderLines[0].id);
        }
    }, [orderLines, selectedOlId]);

    // Fetch collections when date or order line changes
    useEffect(() => {
        if (!selectedOlId || !selectedDate) return;
        fetchCollections();
    }, [selectedOlId, selectedDate]);

    const fetchCollections = async (silent = false) => {
        if (!selectedOlId || !selectedDate) return;
        if (!silent) setLoading(true);
        try {
            const data = await fetchCollectionsByOrderLine(selectedOlId, selectedDate);
            const sortedCollections = (data.collections || []).sort((a, b) => {
                const villageCompare = (a.village_name || '').localeCompare(b.village_name || '');
                if (villageCompare !== 0) return villageCompare;
                return (a.shop_name || '').localeCompare(b.shop_name || '');
            });
            setCollections(sortedCollections);
            setExpenses(data.expenses);
        } catch (err) {
            console.error('Failed to fetch collections:', err);
            if (!silent) {
                setCollections([]);
                setExpenses([]);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const collectPayment = async (shopId: number, amount: number, method: string, description: string, userName: string) => {
        const originalCollections = [...collections];
        
        setCollections(prev => prev.map(row => {
            if (row.shop_id !== shopId) return row;
            
            const cashAdd = method === 'Cash' ? amount : 0;
            const upiAdd = ['UPI', 'PhonePe', 'GPay', 'Paytm', 'Other UPI'].includes(method) ? amount : 0;
            const chequeAdd = method === 'Cheque' ? amount : 0;
            const discountAdd = method === 'Discount' ? amount : 0;
            
            const newCash = row.cash_collected + cashAdd;
            const newUpi = row.upi_collected + upiAdd;
            const newCheque = row.cheque_collected + chequeAdd;
            const newDiscount = (row.discount_payment || 0) + discountAdd;
            const newTotalBalance = Math.max(0, row.total_balance - amount);
            
            return {
                ...row,
                cash_collected: newCash,
                upi_collected: newUpi,
                cheque_collected: newCheque,
                discount_payment: newDiscount,
                total_balance: newTotalBalance
            };
        }));

        try {
            const cash_amount = method === 'Cash' ? amount : 0;
            const upi_amount = ['UPI', 'PhonePe', 'GPay', 'Paytm', 'Other UPI'].includes(method) ? amount : 0;
            const cheque_amount = method === 'Cheque' ? amount : 0;

            await apiCollectPayment(shopId, {
                amount: amount,
                payment_method: method,
                cash_amount,
                upi_amount,
                cheque_amount,
                description: description || `${method} payment collected by ${userName}`,
                created_by: userName,
                collection_date: selectedDate
            });
            await fetchCollections(true);
        } catch (err: any) {
            setCollections(originalCollections);
            throw err;
        }
    };

    const adjustBalance = async (shopId: number, amount: number, method: string, description: string, adminName: string) => {
        const originalCollections = [...collections];
        
        setCollections(prev => prev.map(row => {
            if (row.shop_id !== shopId) return row;
            
            const newManualAdjust = (row.manual_adjustments || 0) + amount;
            const newTotalBalance = Math.max(0, row.total_balance + amount);
            
            return {
                ...row,
                manual_adjustments: newManualAdjust,
                total_balance: newTotalBalance
            };
        }));

        try {
            await apiAdjustBalance(shopId, {
                amount: amount,
                description: description,
                payment_method: amount < 0 ? method : null,
                created_by: adminName,
                collection_date: selectedDate
            });
            await fetchCollections(true);
        } catch (err: any) {
            setCollections(originalCollections);
            throw err;
        }
    };

    const addExpense = async (amount: number, description: string) => {
        if (!selectedOlId || !selectedDate) return;
        const originalExpenses = [...expenses];

        const tempId = -Date.now();
        const newExpense: Expense = {
            id: tempId,
            amount: amount,
            description: description,
            order_line_id: selectedOlId,
            expense_date: selectedDate
        };

        setExpenses(prev => [...prev, newExpense]);

        try {
            await apiAddExpense(selectedOlId, amount, description, selectedDate);
            await fetchCollections(true);
        } catch (err) {
            setExpenses(originalExpenses);
            throw err;
        }
    };

    const updateExpense = async (id: number, amount: number, description: string) => {
        const originalExpenses = [...expenses];

        setExpenses(prev => prev.map(e => {
            if (e.id !== id) return e;
            return { ...e, amount, description };
        }));

        try {
            await apiUpdateExpense(id, amount, description);
            await fetchCollections(true);
        } catch (err) {
            setExpenses(originalExpenses);
            throw err;
        }
    };

    const deleteExpense = async (id: number) => {
        const originalExpenses = [...expenses];

        setExpenses(prev => prev.filter(e => e.id !== id));

        try {
            await apiDeleteExpense(id);
            await fetchCollections(true);
        } catch (err) {
            setExpenses(originalExpenses);
            throw err;
        }
    };

    const recordProductReturn = async (shopId: number, productName: string, amount: number) => {
        if (!selectedDate) return;
        const originalCollections = [...collections];

        setCollections(prev => prev.map(row => {
            if (row.shop_id !== shopId) return row;
            
            const newReturn = (row.return_amount || 0) + amount;
            const newTotalBalance = Math.max(0, row.total_balance - amount);
            
            return {
                ...row,
                return_amount: newReturn,
                total_balance: newTotalBalance
            };
        }));

        try {
            await apiRecordProductReturn(shopId, productName, amount, selectedDate);
            await fetchCollections(true);
        } catch (err) {
            setCollections(originalCollections);
            throw err;
        }
    };

    // Computed totals for Summary Cards
    const totals = useMemo(() => {
        return collections.reduce(
            (acc, row) => {
                const rowCollected = row.cash_collected + row.upi_collected + row.cheque_collected + (row.discount_payment || 0);
                return {
                    amountCollected: acc.amountCollected + rowCollected,
                    todaysBillAmount: acc.todaysBillAmount + row.todays_bill_amount,
                    todaysBillBalance: row.todays_bill_amount > 0
                        ? acc.todaysBillBalance + Math.max(0, row.todays_bill_amount - rowCollected)
                        : acc.todaysBillBalance,
                    totalManualAdjust: acc.totalManualAdjust + ((row.manual_adjustments || 0) + (row.discount_payment || 0)),
                    totalFutureBills: acc.totalFutureBills + (row.future_bills || 0),
                    totalBalance: acc.totalBalance + row.total_balance,
                    totalOldBalance: acc.totalOldBalance + (row.old_balance || 0),
                    totalReturnAmount: acc.totalReturnAmount + (row.return_amount || 0),
                };
            },
            { amountCollected: 0, todaysBillAmount: 0, todaysBillBalance: 0, totalManualAdjust: 0, totalFutureBills: 0, totalBalance: 0, totalOldBalance: 0, totalReturnAmount: 0 }
        );
    }, [collections]);

    // Computed mode breakdown
    const modeBreakdown = useMemo(() => {
        const regCash = collections.reduce((sum, r) => sum + r.cash_collected, 0);
        const regUpi = collections.reduce((sum, r) => sum + r.upi_collected, 0);
        const regCheque = collections.reduce((sum, r) => sum + r.cheque_collected, 0);

        const manCash = collections.reduce((sum, r) => sum + r.manual_cash, 0);
        const manUpi = collections.reduce((sum, r) => sum + r.manual_upi, 0);
        const manCheque = collections.reduce((sum, r) => sum + r.manual_cheque, 0);

        const rawCash = regCash + manCash;
        const upi = regUpi + manUpi;
        const cheque = regCheque + manCheque;
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const discountPayment = collections.reduce((sum, r) => sum + r.discount_payment, 0);
        const discountAdjustment = collections.reduce((sum, r) => sum + r.discount_adjustment, 0);
        const totalDiscount = discountPayment + discountAdjustment;
        
        const netCash = rawCash - totalExpenses;
        const total = netCash + upi + cheque;

        return {
            regCash, regUpi, regCheque,
            manCash, manUpi, manCheque,
            rawCash,
            netCash,
            totalExpenses,
            upi,
            cheque,
            discount: totalDiscount,
            discountPayment,
            discountAdjustment,
            total,
            cashPercent: total > 0 ? ((netCash / total) * 100).toFixed(1) : '0.0',
            upiPercent: total > 0 ? ((upi / total) * 100).toFixed(1) : '0.0',
            chequePercent: total > 0 ? ((cheque / total) * 100).toFixed(1) : '0.0',
        };
    }, [collections, expenses]);

    return {
        selectedDate,
        setSelectedDate,
        selectedOlId,
        setSelectedOlId,
        collections,
        expenses,
        loading,
        totals,
        modeBreakdown,
        refresh: fetchCollections,
        addExpense,
        updateExpense,
        deleteExpense,
        recordProductReturn,
        collectPayment,
        adjustBalance
    };
};
