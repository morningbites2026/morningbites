import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const UPI_ID = import.meta.env.VITE_UPI_ID as string || 'mansisheth174-1@oksbi';

// ─── Helper types matching Supabase tables ───

export interface Customer {
  id: number;
  name: string;
  phone: string;
  type: string;
  total: number;
  used: number;
  join_date: string;
  renew_count: number;
  last_renewed: string | null;
  pack_start_date: string;
  status: 'active' | 'cancelled';
  is_deleted: boolean;
  preferred_days: number[];
  package_id: number | null;
  payment_mode: 'cash' | 'upi' | 'scanpay';
  created_at: string;
}

export interface Walkin {
  id: number;
  name: string;
  phone: string;
  visit_date: string;
  is_deleted: boolean;
  created_at: string;
}

export interface MenuItem {
  id: number;
  name: string;
  options: Array<{ name: string; price: number }>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Bill {
  id: number;
  customer_name: string | null;
  items: Array<{ name: string; option: string; price: number; qty: number }>;
  total_amount: number;
  payment_mode: 'cash' | 'upi' | 'scanpay';
  notes: string | null;
  bill_date: string;
  created_at: string;
}

export interface MealSkip {
  id: number;
  customer_id: number;
  skip_date: string;
  notified: boolean;
  unskipped: boolean;
  created_at: string;
}

export interface Package {
  id: number;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
}

// ─── DB helpers ───

export async function dbGet<T>(table: string, query?: string): Promise<T[]> {
  const url = `${supabaseUrl}/rest/v1/${table}?${query || 'select=*'}&order=created_at.desc`;
  const r = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text);
  return JSON.parse(text);
}

export async function dbIns<T>(table: string, data: Partial<T>): Promise<T[]> {
  const url = `${supabaseUrl}/rest/v1/${table}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(text);
  return JSON.parse(text);
}

export async function dbUpd(table: string, id: number, data: Record<string, unknown>): Promise<void> {
  const url = `${supabaseUrl}/rest/v1/${table}?id=eq.${id}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text);
  }
}

export async function dbDel(table: string, id: number): Promise<void> {
  const url = `${supabaseUrl}/rest/v1/${table}?id=eq.${id}`;
  const r = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text);
  }
}
