import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config/api';
import { authenticatedFetch } from '../config/authenticatedFetch';



// Order Lines
export interface OrderLine {
  id: number;
  name: string;
  area_name?: string;
  node_id: string;
}

export const fetchOrderLines = async (): Promise<OrderLine[]> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/order-lines`);
  if (!res.ok) throw new Error('Failed to fetch order lines');
  return res.json();
};

// Shops
export interface Shop {
  id: number;
  order_line_id: number;
  shop_name: string;
  village_name: string;
  area_name?: string;
  owner_name: string;
  shop_owner: string;
  phone: string;
  phone2: string;
  balance: number;
  has_order_today?: boolean | number;
  last_order_time?: string;
  created_by?: string;
}

export const fetchShopsByVillage = async (orderLineId: number): Promise<Shop[]> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/shops/by-village/${orderLineId}`);
  if (!res.ok) throw new Error('Failed to fetch shops');
  return res.json();
};

export const createShop = async (payload: Partial<Shop>): Promise<Shop> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/shops`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create shop');
  return res.json();
};

export const collectPayment = async (shopId: number, amount: number, method: string, description: string, createdBy: string): Promise<any> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/shops/${shopId}/collect-payment`, {
    method: 'POST',
    body: JSON.stringify({ amount, payment_method: method, description, created_by: createdBy }),
  });
  if (!res.ok) throw new Error('Failed to record payment');
  return res.json();
};

export const fetchShopLedger = async (shopId: number, limit: number = 20, skip: number = 0): Promise<any[]> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/shops/${shopId}/ledger?limit=${limit}&skip=${skip}`);
  if (!res.ok) throw new Error('Failed to fetch ledger');
  return res.json();
};
export const adjustBalance = async (shopId: number, amount: number, description: string, createdBy: string): Promise<any> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/shops/${shopId}/adjust-balance`, {
    method: 'POST',
    body: JSON.stringify({ amount, description, created_by: createdBy }),
  });
  if (!res.ok) throw new Error('Failed to adjust balance');
  return res.json();
};
