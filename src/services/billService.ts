import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config/api';
import { authenticatedFetch } from '../config/authenticatedFetch';



export interface Bill {
  id: number;
  shop_name: string;
  village_name: string;
  area_name?: string;
  specific_area?: string;
  cart: Record<string, number>;
  custom_rates?: Record<string, number>;
  bill_date: string;
  invoice_no: number;
  created_by?: string;
  is_verified?: boolean;
  total_amount?: number;
  phone?: string;
  phone2?: string;
  delivery_date?: string;
  order_line_id?: number;
  shop_id?: number;
  is_edited_price?: boolean;
}

export const submitBill = async (billData: Partial<Bill>): Promise<Bill> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/bills`, {
    method: 'POST',
    body: JSON.stringify(billData),
  });
  if (!res.ok) throw new Error('Failed to submit bill');
  return res.json();
};

export const fetchUnverifiedBills = async (): Promise<Bill[]> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/bills/unverified`);
  if (!res.ok) throw new Error('Failed to fetch unverified bills');
  return res.json();
};

export const fetchAllBills = async (): Promise<Bill[]> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/bills`);
  if (!res.ok) throw new Error('Failed to fetch bills');
  return res.json();
};

export const verifyBill = async (id: number): Promise<void> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/bills/verify/${id}`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error('Failed to verify bill');
};

export const updateBill = async (id: number, billData: Partial<Bill>): Promise<Bill> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/bills/${id}`, {
    method: 'PUT',
    body: JSON.stringify(billData),
  });
  if (!res.ok) throw new Error('Failed to update bill');
  return res.json();
};

export const rejectBill = async (id: number): Promise<void> => {
  const res = await authenticatedFetch(`${API_BASE_URL}/bills/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to discard bill');
  }
};
