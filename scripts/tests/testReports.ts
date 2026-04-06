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

async function testReports() {
  console.log('🚀 Starting Reports Test...');

  try {
    // 1. Fetch Daily Summary
    console.log('\n--- Daily Sales Summary ---');
    const { data: summary, error: summaryError } = await supabase
      .from('daily_sales_summary')
      .select('*')
      .limit(5);

    if (summaryError) throw summaryError;
    
    if (summary && summary.length > 0) {
      summary.forEach(row => {
        console.log(`📊 Date: ${row.date} | Revenue: ${row.total_revenue} | Liters: ${row.total_liters} | Txns: ${row.total_transactions}`);
      });
    } else {
      console.log('No daily summary data found.');
    }

    // 2. Fetch Fuel Breakdown
    console.log('\n--- Fuel Sales Breakdown ---');
    const { data: breakdown, error: breakdownError } = await supabase
      .from('fuel_sales_breakdown')
      .select('*')
      .limit(5);

    if (breakdownError) throw breakdownError;

    if (breakdown && breakdown.length > 0) {
      breakdown.forEach(row => {
        console.log(`⛽ Product: ${row.product_name} | Date: ${row.date} | Liters: ${row.total_liters} | Amount: ${row.total_amount}`);
      });
    } else {
      console.log('No fuel breakdown data found.');
    }

    // 3. Fetch Payment Breakdown
    console.log('\n--- Payment Method Breakdown ---');
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_method_breakdown')
      .select('*')
      .limit(5);

    if (paymentsError) throw paymentsError;

    if (payments && payments.length > 0) {
      payments.forEach(row => {
        console.log(`💳 Method: ${row.payment_method} | Date: ${row.date} | Amount: ${row.total_amount}`);
      });
    } else {
      console.log('No payment breakdown data found.');
    }

    console.log('\n✅ Reports Test Passed');

  } catch (err: any) {
    console.error('❌ Reports Test Failed with Error:');
    console.error(err.message || err);
    process.exit(1);
  }
}

testReports();
