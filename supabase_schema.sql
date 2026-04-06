-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. General Schema Permissions (Fix for 42501 error)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Create stations table
CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  location TEXT,
  phone TEXT,
  email TEXT,
  currency TEXT DEFAULT 'KES',
  tax_rate DECIMAL(5, 2) DEFAULT 16,
  timezone TEXT DEFAULT 'Africa/Nairobi',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stations' AND column_name='address') THEN
    ALTER TABLE stations ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stations' AND column_name='location') THEN
    ALTER TABLE stations ADD COLUMN location TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stations' AND column_name='phone') THEN
    ALTER TABLE stations ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stations' AND column_name='email') THEN
    ALTER TABLE stations ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stations' AND column_name='currency') THEN
    ALTER TABLE stations ADD COLUMN currency TEXT DEFAULT 'KES';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stations' AND column_name='tax_rate') THEN
    ALTER TABLE stations ADD COLUMN tax_rate DECIMAL(5, 2) DEFAULT 16;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stations' AND column_name='timezone') THEN
    ALTER TABLE stations ADD COLUMN timezone TEXT DEFAULT 'Africa/Nairobi';
  END IF;
END $$;

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read stations" ON stations;
CREATE POLICY "Allow all users to read stations" ON stations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to insert stations" ON stations;
CREATE POLICY "Allow authenticated users to insert stations" ON stations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated users to update stations" ON stations;
CREATE POLICY "Allow authenticated users to update stations" ON stations FOR UPDATE TO authenticated USING (true);

-- 3. Create fuel_products table
CREATE TABLE IF NOT EXISTS fuel_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fuel_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read fuel_products" ON fuel_products;
CREATE POLICY "Allow all users to read fuel_products" ON fuel_products FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage fuel_products" ON fuel_products;
CREATE POLICY "Allow authenticated users to manage fuel_products" ON fuel_products FOR ALL TO authenticated USING (true);

-- 4. Create tanks table
CREATE TABLE IF NOT EXISTS tanks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  fuel_product_id UUID REFERENCES fuel_products(id) ON DELETE CASCADE,
  name TEXT,
  capacity DECIMAL(12, 2) NOT NULL,
  current_level_liters DECIMAL(12, 2) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure current_level_liters and last_updated exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tanks' AND column_name='current_level_liters') THEN
    ALTER TABLE tanks ADD COLUMN current_level_liters DECIMAL(12, 2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tanks' AND column_name='last_updated') THEN
    ALTER TABLE tanks ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

ALTER TABLE tanks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read tanks" ON tanks;
CREATE POLICY "Allow all users to read tanks" ON tanks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage tanks" ON tanks;
CREATE POLICY "Allow authenticated users to manage tanks" ON tanks FOR ALL TO authenticated USING (true);

-- 5. Create pumps table
CREATE TABLE IF NOT EXISTS pumps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  tank_id UUID REFERENCES tanks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE pumps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read pumps" ON pumps;
CREATE POLICY "Allow all users to read pumps" ON pumps FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage pumps" ON pumps;
CREATE POLICY "Allow authenticated users to manage pumps" ON pumps FOR ALL TO authenticated USING (true);

-- 6. Create fuel_prices table
CREATE TABLE IF NOT EXISTS fuel_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  fuel_product_id UUID REFERENCES fuel_products(id) ON DELETE CASCADE,
  price_per_liter DECIMAL(12, 2) NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read fuel_prices" ON fuel_prices;
CREATE POLICY "Allow all users to read fuel_prices" ON fuel_prices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage fuel_prices" ON fuel_prices;
CREATE POLICY "Allow authenticated users to manage fuel_prices" ON fuel_prices FOR ALL TO authenticated USING (true);

-- 7. Create fuel_sales table
CREATE TABLE IF NOT EXISTS fuel_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  pump_id UUID REFERENCES pumps(id) ON DELETE CASCADE,
  fuel_product_id UUID REFERENCES fuel_products(id) ON DELETE CASCADE,
  volume_liters DECIMAL(12, 2) NOT NULL,
  price_per_liter DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  recorded_by UUID REFERENCES profiles(id),
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fuel_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read fuel_sales" ON fuel_sales;
CREATE POLICY "Allow all users to read fuel_sales" ON fuel_sales FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to insert fuel_sales" ON fuel_sales;
CREATE POLICY "Allow authenticated users to insert fuel_sales" ON fuel_sales FOR INSERT TO authenticated WITH CHECK (true);

-- 8. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by UUID REFERENCES profiles(id),
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure expense_date exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='expense_date') THEN
    ALTER TABLE expenses ADD COLUMN expense_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read expenses" ON expenses;
CREATE POLICY "Allow all users to read expenses" ON expenses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage expenses" ON expenses;
CREATE POLICY "Allow authenticated users to manage expenses" ON expenses FOR ALL TO authenticated USING (true);

-- 9. Create fuel_deliveries table
CREATE TABLE IF NOT EXISTS fuel_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  tank_id UUID REFERENCES tanks(id) ON DELETE CASCADE,
  fuel_product_id UUID REFERENCES fuel_products(id) ON DELETE CASCADE,
  quantity_liters DECIMAL(12, 2),
  liters_delivered DECIMAL(12, 2), -- Alias
  total_cost DECIMAL(12, 2),
  recorded_by UUID REFERENCES profiles(id),
  delivery_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure liters_delivered and delivery_date exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fuel_deliveries' AND column_name='liters_delivered') THEN
    ALTER TABLE fuel_deliveries ADD COLUMN liters_delivered DECIMAL(12, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fuel_deliveries' AND column_name='delivery_date') THEN
    ALTER TABLE fuel_deliveries ADD COLUMN delivery_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

ALTER TABLE fuel_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read fuel_deliveries" ON fuel_deliveries;
CREATE POLICY "Allow all users to read fuel_deliveries" ON fuel_deliveries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage fuel_deliveries" ON fuel_deliveries;
CREATE POLICY "Allow authenticated users to manage fuel_deliveries" ON fuel_deliveries FOR ALL TO authenticated USING (true);

-- 11. Create lubricants table
CREATE TABLE IF NOT EXISTS lubricants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  unit_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE lubricants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read lubricants" ON lubricants;
CREATE POLICY "Allow all users to read lubricants" ON lubricants FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage lubricants" ON lubricants;
CREATE POLICY "Allow authenticated users to manage lubricants" ON lubricants FOR ALL TO authenticated USING (true);

-- 12. Create lubricant_inventory table
CREATE TABLE IF NOT EXISTS lubricant_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  lubricant_id UUID REFERENCES lubricants(id) ON DELETE CASCADE,
  current_stock INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 5,
  unit_size TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE lubricant_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read lubricant_inventory" ON lubricant_inventory;
CREATE POLICY "Allow all users to read lubricant_inventory" ON lubricant_inventory FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage lubricant_inventory" ON lubricant_inventory;
CREATE POLICY "Allow authenticated users to manage lubricant_inventory" ON lubricant_inventory FOR ALL TO authenticated USING (true);

-- 13. Create lubricant_sales table
CREATE TABLE IF NOT EXISTS lubricant_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  lubricant_id UUID REFERENCES lubricants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  staff_id UUID REFERENCES profiles(id),
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE lubricant_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read lubricant_sales" ON lubricant_sales;
CREATE POLICY "Allow all users to read lubricant_sales" ON lubricant_sales FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to insert lubricant_sales" ON lubricant_sales;
CREATE POLICY "Allow authenticated users to insert lubricant_sales" ON lubricant_sales FOR INSERT TO authenticated WITH CHECK (true);

-- 14. Create lubricant_deliveries table
CREATE TABLE IF NOT EXISTS lubricant_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  lubricant_id UUID REFERENCES lubricants(id) ON DELETE CASCADE,
  quantity_delivered INTEGER NOT NULL,
  delivery_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE lubricant_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read lubricant_deliveries" ON lubricant_deliveries;
CREATE POLICY "Allow all users to read lubricant_deliveries" ON lubricant_deliveries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage lubricant_deliveries" ON lubricant_deliveries;
CREATE POLICY "Allow authenticated users to manage lubricant_deliveries" ON lubricant_deliveries FOR ALL TO authenticated USING (true);

-- 15. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  related_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure related_id exists if table already exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='related_id') THEN
    ALTER TABLE audit_logs ADD COLUMN related_id TEXT;
  END IF;
END $$;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to read audit_logs" ON audit_logs;
CREATE POLICY "Allow authenticated users to read audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to insert audit_logs" ON audit_logs;
CREATE POLICY "Allow authenticated users to insert audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 16. Create meter_readings table
CREATE TABLE IF NOT EXISTS meter_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) NOT NULL,
  pump_id UUID REFERENCES pumps(id) NOT NULL,
  fuel_product_id UUID REFERENCES fuel_products(id) NOT NULL,
  opening_reading DECIMAL(12, 2) NOT NULL,
  closing_reading DECIMAL(12, 2) NOT NULL,
  liters_sold DECIMAL(12, 2) NOT NULL,
  price_per_liter DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  recorded_by UUID REFERENCES profiles(id) NOT NULL,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pump_id, closing_reading)
);

-- Ensure shift_id column exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meter_readings' AND column_name='shift_id') THEN
    ALTER TABLE meter_readings ADD COLUMN shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read meter readings" ON meter_readings;
CREATE POLICY "Allow all users to read meter readings" ON meter_readings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to insert meter readings" ON meter_readings;
CREATE POLICY "Allow authenticated users to insert meter readings" ON meter_readings FOR INSERT TO authenticated WITH CHECK (true);

-- 17. Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  opening_meter_reading DECIMAL(12, 2) NOT NULL,
  closing_meter_reading DECIMAL(12, 2),
  volume_sold DECIMAL(12, 2),
  cash_collected DECIMAL(12, 2) DEFAULT 0,
  cash_on_hand DECIMAL(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read shifts" ON shifts;
CREATE POLICY "Allow all users to read shifts" ON shifts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage shifts" ON shifts;
CREATE POLICY "Allow authenticated users to manage shifts" ON shifts FOR ALL TO authenticated USING (true);

-- 18. Create shift_lubricants table
CREATE TABLE IF NOT EXISTS shift_lubricants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  lubricant_id UUID REFERENCES lubricants(id) ON DELETE CASCADE,
  opening_stock INTEGER NOT NULL,
  closing_stock INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE shift_lubricants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read shift_lubricants" ON shift_lubricants;
CREATE POLICY "Allow all users to read shift_lubricants" ON shift_lubricants FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage shift_lubricants" ON shift_lubricants;
CREATE POLICY "Allow authenticated users to manage shift_lubricants" ON shift_lubricants FOR ALL TO authenticated USING (true);

-- 3. Create the record_meter_reading RPC
CREATE OR REPLACE FUNCTION record_meter_reading(
  p_pump_id UUID,
  p_opening DECIMAL,
  p_closing DECIMAL,
  p_staff_id UUID,
  p_shift_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_station_id UUID;
  v_fuel_product_id UUID;
  v_tank_id UUID;
  v_price DECIMAL;
  v_liters DECIMAL;
  v_total DECIMAL;
  v_reading_id UUID;
BEGIN
  -- 1. Calculations
  v_liters := p_closing - p_opening;
  IF v_liters <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Closing reading must be greater than opening reading');
  END IF;

  -- 2. Get Pump/Tank/Station Info
  SELECT station_id, tank_id INTO v_station_id, v_tank_id
  FROM pumps WHERE id = p_pump_id AND status = 'active';
  
  IF v_station_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Pump not found or inactive');
  END IF;

  SELECT fuel_product_id INTO v_fuel_product_id
  FROM tanks WHERE id = v_tank_id;

  -- 3. Get Current Price
  SELECT price_per_liter INTO v_price
  FROM fuel_prices
  WHERE station_id = v_station_id AND fuel_product_id = v_fuel_product_id
  AND effective_from <= NOW()
  ORDER BY effective_from DESC LIMIT 1;

  IF v_price IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Fuel price not set for this product');
  END IF;

  v_total := v_liters * v_price;

  -- 4. Check Inventory
  IF NOT EXISTS (SELECT 1 FROM tanks WHERE id = v_tank_id AND current_level_liters >= v_liters) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient fuel in tank');
  END IF;

  -- 5. Insert Reading
  BEGIN
    INSERT INTO meter_readings (
      station_id, pump_id, fuel_product_id, 
      opening_reading, closing_reading, 
      liters_sold, price_per_liter, total_amount, 
      recorded_by, shift_id
    ) VALUES (
      v_station_id, p_pump_id, v_fuel_product_id,
      p_opening, p_closing,
      v_liters, v_price, v_total,
      p_staff_id, p_shift_id
    ) RETURNING id INTO v_reading_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'A reading with this closing value already exists for this pump');
  END;

  -- 6. Update Inventory
  UPDATE tanks 
  SET current_level_liters = current_level_liters - v_liters,
      last_updated = NOW()
  WHERE id = v_tank_id;

  RETURN json_build_object(
    'success', true, 
    'reading_id', v_reading_id,
    'liters_sold', v_liters,
    'total_amount', v_total
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION record_meter_reading(UUID, DECIMAL, DECIMAL, UUID, UUID) TO authenticated;

-- 4. Create the record_fuel_sale_transaction RPC
CREATE OR REPLACE FUNCTION record_fuel_sale_transaction(
  p_pump_id UUID,
  p_fuel_product_id UUID,
  p_liters DECIMAL,
  p_station_id UUID,
  p_staff_id UUID,
  p_payment_method TEXT,
  p_shift_id UUID DEFAULT NULL,
  p_external_ref TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_tank_id UUID;
  v_price DECIMAL;
  v_total DECIMAL;
  v_sale_id UUID;
BEGIN
  -- 1. Get Tank Info
  SELECT tank_id INTO v_tank_id
  FROM pumps WHERE id = p_pump_id AND status = 'active';
  
  IF v_tank_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Pump not found or inactive');
  END IF;

  -- 2. Get Current Price
  SELECT price_per_liter INTO v_price
  FROM fuel_prices
  WHERE station_id = p_station_id AND fuel_product_id = p_fuel_product_id
  AND effective_from <= NOW()
  ORDER BY effective_from DESC LIMIT 1;

  IF v_price IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Fuel price not set for this product');
  END IF;

  v_total := p_liters * v_price;

  -- 3. Check Inventory
  IF NOT EXISTS (SELECT 1 FROM tanks WHERE id = v_tank_id AND current_level_liters >= p_liters) THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient fuel in tank');
  END IF;

  -- 4. Insert Sale
  INSERT INTO fuel_sales (
    station_id, pump_id, fuel_product_id, 
    volume_liters, price_per_liter, total_amount, 
    payment_method, recorded_by, shift_id
  ) VALUES (
    p_station_id, p_pump_id, p_fuel_product_id,
    p_liters, v_price, v_total,
    p_payment_method, p_staff_id, p_shift_id
  ) RETURNING id INTO v_sale_id;

  -- 5. Insert Transaction
  INSERT INTO transactions (
    sale_id, amount, payment_method
  ) VALUES (
    v_sale_id, v_total, p_payment_method
  );

  -- 6. Update Inventory
  UPDATE tanks 
  SET current_level_liters = current_level_liters - p_liters,
      last_updated = NOW()
  WHERE id = v_tank_id;

  RETURN json_build_object(
    'success', true, 
    'sale_id', v_sale_id,
    'total_amount', v_total
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION record_fuel_sale_transaction(UUID, UUID, DECIMAL, UUID, UUID, TEXT, UUID, TEXT) TO authenticated;

-- 5. Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES fuel_sales(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure amount column exists (Fix for 42703 error)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='amount') THEN
    ALTER TABLE transactions ADD COLUMN amount DECIMAL(12, 2) NOT NULL DEFAULT 0;
  END IF;
END $$;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read transactions" ON transactions;
CREATE POLICY "Allow all users to read transactions" ON transactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON transactions;
CREATE POLICY "Allow authenticated users to insert transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (true);

-- 6. Create Views for Reports
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
  station_id,
  created_at::date as date,
  SUM(total_amount) as total_revenue,
  SUM(volume_liters) as total_liters,
  COUNT(*) as total_transactions
FROM fuel_sales
GROUP BY station_id, created_at::date;

GRANT SELECT ON daily_sales_summary TO authenticated, anon;

CREATE OR REPLACE VIEW fuel_sales_breakdown AS
SELECT 
  fs.station_id,
  fs.created_at::date as date,
  fs.fuel_product_id,
  fp.name as product_name,
  SUM(fs.volume_liters) as total_liters,
  SUM(fs.total_amount) as total_amount
FROM fuel_sales fs
JOIN fuel_products fp ON fs.fuel_product_id = fp.id
GROUP BY fs.station_id, fs.created_at::date, fs.fuel_product_id, fp.name;

GRANT SELECT ON fuel_sales_breakdown TO authenticated, anon;

CREATE OR REPLACE VIEW payment_method_breakdown AS
SELECT 
  station_id,
  created_at::date as date,
  payment_method,
  SUM(total_amount) as total_amount
FROM fuel_sales
GROUP BY station_id, created_at::date, payment_method;

GRANT SELECT ON payment_method_breakdown TO authenticated, anon;

CREATE OR REPLACE VIEW daily_pump_reconciliation AS
WITH meter_totals AS (
  SELECT 
    station_id,
    pump_id,
    created_at::date as date,
    SUM(liters_sold) as meter_dispensed
  FROM meter_readings
  GROUP BY station_id, pump_id, created_at::date
),
sale_totals AS (
  SELECT 
    station_id,
    pump_id,
    created_at::date as date,
    SUM(volume_liters) as actual_sales
  FROM fuel_sales
  GROUP BY station_id, pump_id, created_at::date
)
SELECT 
  COALESCE(m.station_id, s.station_id) as station_id,
  COALESCE(m.pump_id, s.pump_id) as pump_id,
  p.name as pump_name,
  COALESCE(m.date, s.date) as date,
  COALESCE(m.meter_dispensed, 0) as meter_dispensed,
  COALESCE(s.actual_sales, 0) as actual_sales,
  COALESCE(m.meter_dispensed, 0) - COALESCE(s.actual_sales, 0) as variance
FROM meter_totals m
FULL OUTER JOIN sale_totals s ON m.pump_id = s.pump_id AND m.date = s.date
JOIN pumps p ON COALESCE(m.pump_id, s.pump_id) = p.id;

GRANT SELECT ON daily_pump_reconciliation TO authenticated, anon;
