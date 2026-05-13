import API_BASE_URL from '../config/api';
import { authenticatedFetch } from '../config/authenticatedFetch';

export interface DailyCollection {
    id: number;
    shop_id: number;
    shop_name: string;
    village_name: string;
    order_line_id: number;
    order_line_name: string;
    collection_date: string;
    todays_bill_amount: number;
    cash_collected: number;
    upi_collected: number;
    cheque_collected: number;
    old_balance: number;
    total_balance: number;
}

export const fetchCollectionsByOrderLine = async (olId: number, date: string): Promise<DailyCollection[]> => {
    try {
        const res = await authenticatedFetch(`${API_BASE_URL}/collections/by-orderline/${olId}?date=${date}`);
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Fetch Collections Error [${res.status}]:`, errorText);
            throw new Error(`Failed to fetch collections (${res.status})`);
        }
        const data = await res.json();
        
        // Parse numeric fields (they may come as strings from MySQL)
        return data.map((row: any) => ({
            ...row,
            todays_bill_amount: parseFloat(row.todays_bill_amount) || 0,
            cash_collected: parseFloat(row.cash_collected) || 0,
            upi_collected: parseFloat(row.upi_collected) || 0,
            cheque_collected: parseFloat(row.cheque_collected) || 0,
            old_balance: parseFloat(row.old_balance) || 0,
            total_balance: parseFloat(row.total_balance) || 0,
        }));
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
