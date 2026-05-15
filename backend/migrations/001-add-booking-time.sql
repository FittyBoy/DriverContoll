-- ============================================================
--  Migration: Add time support to bookings table
--  Created: May 15, 2026
-- ============================================================

-- Add new columns for start_time and end_time
ALTER TABLE mass.bookings
ADD COLUMN IF NOT EXISTS start_time TIME NOT NULL DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS end_time TIME NOT NULL DEFAULT '17:00';

-- Create index for faster conflict checking
CREATE INDEX IF NOT EXISTS idx_bookings_car_dates_times 
ON mass.bookings(car_id, start_date, end_date, start_time, end_time);

-- ============================================================
--  How to run this migration:
--  psql -h 172.18.106.190 -U postgres -d prod -f migrations/001-add-booking-time.sql
-- ============================================================
