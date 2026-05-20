import API_BASE_URL from '../config/api';
import { authenticatedFetch } from '../config/authenticatedFetch';

export interface DailyCollection {
    id: number;
    shop_id: number;
    shop_name: string;
    village_name: string;
    owner_name?: string;
    order_line_id: number;
    order_line_name: string;
    collection_date: string;
    todays_bill_amount: number;
    cash_collected: number;
    upi_collected: number;
    cheque_collected: number;
    manual_adjustments: number;
    future_bills: number;
    past_bills: number;
    old_balance: number;
    total_balance: number;
    manual_cash: number;
    manual_upi: number;
    manual_cheque: number;
    manual_pos: number;
    discount_payment: number;
    discount_adjustment: number;
    pending_transactions: any[];
}

export interface Expense {
    id: number;
    order_line_id: number;
    amount: number;
    description: string;
    expense_date: string;
}

export const fetchCollectionsByOrderLine = async (olId: number, date: string): Promise<{ collections: DailyCollection[], expenses: Expense[] }> => {
    try {
        const res = await authenticatedFetch(`${API_BASE_URL}/collections/by-orderline/${olId}?date=${date}`);
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Fetch Collections Error [${res.status}]:`, errorText);
            throw new Error(`Failed to fetch collections (${res.status})`);
        }
        const data = await res.json();
        
        const rawCollections = data.collections || [];
        const rawExpenses = data.expenses || [];

        // Parse numeric fields (they may come as strings from MySQL)
        const parsedCollections = rawCollections.map((row: any) => ({
            ...row,
            todays_bill_amount: parseFloat(row.todays_bill_amount) || 0,
            cash_collected: parseFloat(row.cash_collected) || 0,
            upi_collected: parseFloat(row.upi_collected) || 0,
            cheque_collected: parseFloat(row.cheque_collected) || 0,
            manual_adjustments: parseFloat(row.manual_adjustments) || 0,
            manual_cash: parseFloat(row.manual_cash) || 0,
            manual_upi: parseFloat(row.manual_upi) || 0,
            manual_cheque: parseFloat(row.manual_cheque) || 0,
            manual_pos: parseFloat(row.manual_pos) || 0,
            discount_payment: parseFloat(row.discount_payment) || 0,
            discount_adjustment: parseFloat(row.discount_adjustment) || 0,
            future_bills: parseFloat(row.future_bills) || 0,
            past_bills: parseFloat(row.past_bills) || 0,
            old_balance: parseFloat(row.old_balance) || 0,
            total_balance: parseFloat(row.total_balance) || 0,
            pending_transactions: typeof row.pending_transactions === 'string' ? JSON.parse(row.pending_transactions) : (row.pending_transactions || [])
        }));

        const parsedExpenses = rawExpenses.map((ex: any) => ({
            ...ex,
            amount: parseFloat(ex.amount) || 0
        }));

        return { collections: parsedCollections, expenses: parsedExpenses };
    } catch (error) {
        console.error('fetchCollectionsByOrderLine exception:', error);
        throw error;
    }
};

export const fetchOrderLines = async () => {
    const res = await authenticatedFetch(`${API_BASE_URL}/order-lines`);
    if (!res.ok) throw new Error('Failed to fetch order lines');
    return res.json();
};

export const addExpense = async (order_line_id: number, amount: number, description: string, date: string) => {
    const res = await authenticatedFetch(`${API_BASE_URL}/collections/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_line_id, amount, description, date })
    });
    if (!res.ok) throw new Error('Failed to add expense');
    return res.json();
};

export const updateExpense = async (id: number, amount: number, description: string) => {
    const res = await authenticatedFetch(`${API_BASE_URL}/collections/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description })
    });
    if (!res.ok) throw new Error('Failed to update expense');
    return res.json();
};

export const deleteExpense = async (id: number) => {
    const res = await authenticatedFetch(`${API_BASE_URL}/collections/expenses/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete expense');
    return res.json();
};
