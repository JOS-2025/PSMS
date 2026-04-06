import { supabase } from '../lib/supabase';

export interface DailySummary {
  station_id: string;
  date: string;
  total_revenue: number;
  total_liters: number;
  total_transactions: number;
}

export interface FuelBreakdown {
  station_id: string;
  date: string;
  fuel_product_id: string;
  product_name: string;
  total_liters: number;
  total_amount: number;
}

export interface PaymentBreakdown {
  station_id: string;
  date: string;
  payment_method: string;
  total_amount: number;
}

export const reportService = {
  async getDailySummary(stationId: string, date: string): Promise<DailySummary | null> {
    try {
      const { data, error } = await supabase
        .from('daily_sales_summary')
        .select('*')
        .eq('station_id', stationId)
        .eq('date', date)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No data
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching daily summary:', error.message || error);
      return null;
    }
  },

  async getFuelBreakdown(stationId: string, date: string): Promise<FuelBreakdown[]> {
    try {
      const { data, error } = await supabase
        .from('fuel_sales_breakdown')
        .select('*')
        .eq('station_id', stationId)
        .eq('date', date);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching fuel breakdown:', error.message || error);
      return [];
    }
  },

  async getPaymentBreakdown(stationId: string, date: string): Promise<PaymentBreakdown[]> {
    try {
      const { data, error } = await supabase
        .from('payment_method_breakdown')
        .select('*')
        .eq('station_id', stationId)
        .eq('date', date);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching payment breakdown:', error.message || error);
      return [];
    }
  }
};
