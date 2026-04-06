import { supabase } from '../lib/supabase';

export interface MeterReadingInput {
  stationId: string;
  pumpId: string;
  staffId: string;
  openingReading: number;
  closingReading: number;
  shiftId?: string;
  shift?: 'morning' | 'evening' | 'night';
}

export interface PumpReconciliation {
  pump_id: string;
  pump_name: string;
  station_id: string;
  date: string;
  meter_dispensed: number;
  actual_sales: number;
  variance: number;
}

export interface MeterReading {
  id: string;
  created_at: string;
  pump_id: string;
  opening_reading: number;
  closing_reading: number;
  liters_sold: number;
  price_per_liter: number;
  total_amount: number;
  stations: { name: string };
  pumps: { name: string };
  fuel_products: { name: string };
  profiles: { full_name: string };
}

export const meterService = {
  async recordMeterReading(input: MeterReadingInput) {
    const { data, error } = await supabase.rpc('record_meter_reading', {
      p_pump_id: input.pumpId,
      p_opening: input.openingReading,
      p_closing: input.closingReading,
      p_staff_id: input.staffId,
      p_shift_id: input.shiftId || null
    });

    if (error) {
      console.error('Error recording meter reading:', error.message);
      return { success: false, error: error.message };
    }

    return data as { 
      success: boolean; 
      error?: string; 
      reading_id?: string; 
      liters_sold?: number; 
      total_amount?: number; 
    };
  },

  async getPumpReconciliation(stationId: string, date: string): Promise<PumpReconciliation[]> {
    const { data, error } = await supabase
      .from('daily_pump_reconciliation')
      .select('*')
      .eq('station_id', stationId)
      .eq('date', date);

    if (error) {
      console.error('Error fetching pump reconciliation:', error.message);
      return [];
    }

    return data || [];
  },

  async getRecentReadings(stationId?: string, limit = 20): Promise<MeterReading[]> {
    let query = supabase
      .from('meter_readings')
      .select(`
        id,
        created_at,
        pump_id,
        opening_reading,
        closing_reading,
        liters_sold,
        price_per_liter,
        total_amount,
        stations(name),
        pumps(name),
        fuel_products(name),
        profiles:recorded_by(full_name)
      `);
    
    if (stationId) {
      query = query.eq('station_id', stationId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent readings:', error.message);
      return [];
    }

    return (data || []).map((r: any) => ({
      ...r,
      stations: Array.isArray(r.stations) ? r.stations[0] : r.stations,
      pumps: Array.isArray(r.pumps) ? r.pumps[0] : r.pumps,
      fuel_products: Array.isArray(r.fuel_products) ? r.fuel_products[0] : r.fuel_products,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    })) as any[];
  }
};
