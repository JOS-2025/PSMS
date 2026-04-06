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

async function testMeterReading() {
  console.log('🚀 Starting Meter Reading Test...');

  try {
    // 1. Fetch sample data for the test
    const { data: pump, error: pumpError } = await supabase
      .from('pumps')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (pumpError || !pump) {
      throw new Error(`Could not find an active pump: ${pumpError?.message}`);
    }

    const { data: staff, error: staffError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (staffError || !staff) {
      throw new Error(`Could not find a staff member: ${staffError?.message}`);
    }

    // 2. Success Case
    // We use a random closing reading to ensure it's not a duplicate for the first run
    const randomClosing = Math.floor(Math.random() * 1000000) + 1000;
    const opening = randomClosing - 100;

    console.log(`\n--- Testing Success Case (Opening: ${opening}, Closing: ${randomClosing}) ---`);
    const { data: successData, error: successError } = await supabase.rpc('record_meter_reading', {
      p_pump_id: pump.id,
      p_opening: opening,
      p_closing: randomClosing,
      p_staff_id: staff.id
    });

    if (successError) throw successError;

    if (successData.success) {
      console.log('✅ Meter Reading Success Case Passed');
      console.log(`   ✔ success: ${successData.success}`);
      console.log(`   ✔ reading_id: ${successData.reading_id}`);
    } else {
      console.error('❌ Meter Reading Success Case Failed:', successData.error);
    }

    // 3. Duplicate Case (should FAIL)
    console.log(`\n--- Testing Duplicate Case (Closing: ${randomClosing}) ---`);
    const { data: duplicateData, error: duplicateError } = await supabase.rpc('record_meter_reading', {
      p_pump_id: pump.id,
      p_opening: opening,
      p_closing: randomClosing, // Same closing value
      p_staff_id: staff.id
    });

    if (duplicateError) throw duplicateError;

    if (!duplicateData.success) {
      console.log('❌ Meter Reading Duplicate Prevented');
      console.log(`   ✔ error: ${duplicateData.error}`);
    } else {
      console.error('❌ Meter Reading Duplicate Test Failed (It should have failed but succeeded)');
    }

    // 4. Validation Case (Closing < Opening)
    console.log('\n--- Testing Validation Case (Closing < Opening) ---');
    const { data: validationData, error: validationError } = await supabase.rpc('record_meter_reading', {
      p_pump_id: pump.id,
      p_opening: 1000,
      p_closing: 500, // Invalid
      p_staff_id: staff.id
    });

    if (validationError) throw validationError;

    if (!validationData.success) {
      console.log('❌ Meter Reading Validation Error Caught');
      console.log(`   ✔ error: ${validationData.error}`);
    } else {
      console.error('❌ Meter Reading Validation Test Failed');
    }

  } catch (err: any) {
    console.error('❌ Meter Reading Test Failed with Error:');
    console.error(err.message || err);
    process.exit(1);
  }
}

testMeterReading();
