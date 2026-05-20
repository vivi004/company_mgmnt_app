import { useState, useEffect, useMemo } from 'react';
import { 
    fetchCollectionsByOrderLine, 
    fetchOrderLines, 
    addExpense as apiAddExpense, 
    updateExpense as apiUpdateExpense, 
    deleteExpense as apiDeleteExpense,
    DailyCollection,
    Expense
} from '../../../services/collectionService';
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

    const fetchCollections = async () => {
        if (!selectedOlId || !selectedDate) return;
        setLoading(true);
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
            setCollections([]);
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    const addExpense = async (amount: number, description: string) => {
        if (!selectedOlId || !selectedDate) return;
        try {
            await apiAddExpense(selectedOlId, amount, description, selectedDate);
            await fetchCollections();
        } catch (err) {
            console.error('Failed to add expense:', err);
            throw err;
        }
    };

    const updateExpense = async (id: number, amount: number, description: string) => {
        try {
            await apiUpdateExpense(id, amount, description);
            await fetchCollections();
        } catch (err) {
            console.error('Failed to update expense:', err);
            throw err;
        }
    };

    const deleteExpense = async (id: number) => {
        try {
            await apiDeleteExpense(id);
            await fetchCollections();
        } catch (err) {
            console.error('Failed to delete expense:', err);
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
                };
            },
            { amountCollected: 0, todaysBillAmount: 0, todaysBillBalance: 0, totalManualAdjust: 0, totalFutureBills: 0, totalBalance: 0, totalOldBalance: 0 }
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
        deleteExpense
    };
};
