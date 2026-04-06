-- Remaining Features SQL
-- 1. Create tank_dip_readings table
CREATE TABLE IF NOT EXISTS tank_dip_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_id UUID REFERENCES tanks(id) ON DELETE CASCADE,
  dip_reading_liters DECIMAL(12, 2) NOT NULL,
  system_reading_liters DECIMAL(12, 2) NOT NULL,
  variance_liters DECIMAL(12, 2) NOT NULL,
  recorded_by UUID REFERENCES profiles(id),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE tank_dip_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all users to read tank_dip_readings" ON tank_dip_readings;
CREATE POLICY "Allow all users to read tank_dip_readings" ON tank_dip_readings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to manage tank_dip_readings" ON tank_dip_readings;
CREATE POLICY "Allow authenticated users to manage tank_dip_readings" ON tank_dip_readings FOR ALL TO authenticated USING (true);

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('low_stock', 'variance_alert', 'system')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. Update fuel_deliveries and lubricant_deliveries
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lubricant_deliveries' AND column_name='total_cost') THEN
    ALTER TABLE lubricant_deliveries ADD COLUMN total_cost DECIMAL(12, 2);
  END IF;
END $$;
