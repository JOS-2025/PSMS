import { supabase } from '../lib/supabase';

// --- Types ---

export type PaymentMethod = 'cash' | 'm-pesa' | 'card' | 'credit';

export interface FuelSaleInput {
  pumpId: string;
  fuelProductId: string;
  liters: number;
  stationId: string;
  staffId: string;
  paymentMethod: PaymentMethod;
  shiftId?: string;
  externalRef?: string;
}

export interface FuelSaleResponse {
  success: boolean;
  sale_id?: string;
  total_amount?: number;
  liters?: number;
  error?: string;
}

/**
 * Fuel Sale Service
 * 
 * This service handles the core business logic for recording fuel sales.
 * It utilizes a PostgreSQL RPC (Stored Procedure) to ensure atomicity.
 * If any step fails (e.g., price fetch, inventory deduction), the entire transaction rolls back.
 */
export const fuelSaleService = {
  /**
   * Records a fuel sale atomically.
   * 
   * @param input - The sale details (pump, fuel type, liters, etc.)
   * @returns A promise that resolves to the sale response or throws an error.
   */
  async recordFuelSale(input: FuelSaleInput): Promise<FuelSaleResponse> {
    try {
      // 1. Validate Input
      if (input.liters <= 0) {
        throw new Error('Volume must be greater than zero.');
      }

      // 2. Call the Atomic Stored Procedure (RPC)
      const { data, error } = await supabase.rpc('record_fuel_sale_transaction', {
        p_pump_id: input.pumpId,
        p_fuel_product_id: input.fuelProductId,
        p_liters: input.liters,
        p_station_id: input.stationId,
        p_staff_id: input.staffId,
        p_payment_method: input.paymentMethod,
        p_shift_id: input.shiftId || null,
        p_external_ref: input.externalRef || null
      });

      // 3. Handle Database Errors
      if (error) {
        console.error('Database Transaction Failed:', error.message);
        return {
          success: false,
          error: error.message
        };
      }

      // 4. Return Success Data
      return data as FuelSaleResponse;

    } catch (err) {
      // 5. Handle Service-Level Errors
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during the sale.';
      console.error('Fuel Sale Service Error:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * Fetches the current fuel price for a specific product at a station.
   */
  async getCurrentPrice(stationId: string, fuelProductId: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('fuel_prices')
      .select('price_per_liter')
      .eq('station_id', stationId)
      .eq('fuel_product_id', fuelProductId)
      .lte('effective_from', new Date().toISOString())
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.warn('Could not fetch current price:', error?.message);
      return null;
    }

    return data.price_per_liter;
  }
};
