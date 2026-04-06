import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and a valid key (SERVICE_ROLE or ANON) must be set in .env');
  process.exit(1);
}

const isServiceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY) ? '✅ Service Role' : '⚠️ Anon Key (RLS active)';
console.log(`🔗 Connecting to: ${supabaseUrl}`);
console.log(`🔑 Using Key: ${isServiceRole}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFuelSale() {
  console.log('🚀 Starting Fuel Sale Test...');

  try {
    // 1. Fetch sample data for the test
    const { data: pump, error: pumpError } = await supabase
      .from('pumps')
      .select('id, station_id, tank_id')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (pumpError || !pump) {
      throw new Error(`Could not find an active pump: ${pumpError?.message}`);
    }

    const { data: tank, error: tankError } = await supabase
      .from('tanks')
      .select('fuel_product_id')
      .eq('id', pump.tank_id)
      .single();

    if (tankError || !tank) {
      throw new Error(`Could not find tank info: ${tankError?.message}`);
    }

    const { data: staff, error: staffError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (staffError || !staff) {
      throw new Error(`Could not find a staff member: ${staffError?.message}`);
    }

    // 2. Call the RPC
    const { data, error } = await supabase.rpc('record_fuel_sale_transaction', {
      p_pump_id: pump.id,
      p_fuel_product_id: tank.fuel_product_id,
      p_liters: 5.5,
      p_station_id: pump.station_id,
      p_staff_id: staff.id,
      p_payment_method: 'Cash'
    });

    if (error) {
      throw error;
    }

    if (data.success) {
      console.log('✅ Fuel Sale Test Passed');
      console.log(`   ✔ success: ${data.success}`);
      console.log(`   ✔ sale_id: ${data.sale_id}`);
      console.log(`   ✔ total_amount: ${data.total_amount}`);
    } else {
      console.error('❌ Fuel Sale Test Failed:', data.error);
    }
  } catch (err: any) {
    console.error('❌ Fuel Sale Test Failed with Error:');
    console.error(err.message || err);
    process.exit(1);
  }
}

testFuelSale();
