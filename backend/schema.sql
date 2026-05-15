-- ============================================================
--  AGC Microglass — Car Booking System
--  Schema: mass
--  PostgreSQL
-- ============================================================

-- สร้าง schema
CREATE SCHEMA IF NOT EXISTS mass;

-- ตั้ง search_path ให้ใช้ schema mass เป็นค่าเริ่มต้น
SET search_path TO mass;

-- ============================================================
--  1. car_types — ประเภทรถ (Master)
-- ============================================================
CREATE TABLE IF NOT EXISTS mass.car_types (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    icon        VARCHAR(10)  NOT NULL DEFAULT '🚗',
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
--  2. drivers — คนขับ (Master)
-- ============================================================
CREATE TABLE IF NOT EXISTS mass.drivers (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(20)  NOT NULL,
    license     VARCHAR(20),
    available   BOOLEAN      NOT NULL DEFAULT TRUE,
    note        TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
--  3. cars — รถ
-- ============================================================
CREATE TABLE IF NOT EXISTS mass.cars (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    car_type_id INT          NOT NULL REFERENCES mass.car_types(id),
    seats       SMALLINT     NOT NULL DEFAULT 4 CHECK (seats > 0),
    available   BOOLEAN      NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
--  4. users — ผู้ใช้งาน
-- ============================================================
CREATE TABLE IF NOT EXISTS mass.users (
    id          SERIAL       PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,   -- bcrypt hash
    phone       VARCHAR(20),
    role        VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
--  5. bookings — การจองรถ
-- ============================================================
CREATE TABLE IF NOT EXISTS mass.bookings (
    id               SERIAL       PRIMARY KEY,

    -- รถที่จอง
    car_id           INT          NOT NULL REFERENCES mass.cars(id),
    car_name         VARCHAR(100) NOT NULL,   -- snapshot ณ เวลาจอง
    car_type_id      INT          REFERENCES mass.car_types(id),
    car_type_name    VARCHAR(50),
    car_type_icon    VARCHAR(10),

    -- คนขับ (nullable)
    driver_id        INT          REFERENCES mass.drivers(id),
    driver_name      VARCHAR(100),

    -- ผู้จอง
    user_id          INT          NOT NULL REFERENCES mass.users(id),
    user_name        VARCHAR(100) NOT NULL,
    user_email       VARCHAR(150) NOT NULL,

    -- วันที่
    start_date       DATE         NOT NULL,
    end_date         DATE         NOT NULL,
    days             SMALLINT     NOT NULL CHECK (days > 0),

    -- สถานที่
    pickup_location  TEXT         NOT NULL,
    dropoff_location TEXT         NOT NULL,

    -- อื่นๆ
    notes            TEXT,
    status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','confirmed','cancelled','completed')),

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

-- ============================================================
--  Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_car_id     ON mass.bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id    ON mass.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON mass.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON mass.bookings(start_date);
CREATE INDEX IF NOT EXISTS idx_cars_car_type_id    ON mass.cars(car_type_id);

-- ============================================================
--  Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION mass.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drivers_updated_at ON mass.drivers;
CREATE TRIGGER trg_drivers_updated_at
    BEFORE UPDATE ON mass.drivers
    FOR EACH ROW EXECUTE FUNCTION mass.set_updated_at();

DROP TRIGGER IF EXISTS trg_cars_updated_at ON mass.cars;
CREATE TRIGGER trg_cars_updated_at
    BEFORE UPDATE ON mass.cars
    FOR EACH ROW EXECUTE FUNCTION mass.set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON mass.bookings;
CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON mass.bookings
    FOR EACH ROW EXECUTE FUNCTION mass.set_updated_at();

-- ============================================================
--  Seed Data
-- ============================================================

-- ประเภทรถ
INSERT INTO mass.car_types (id, name, icon, description) VALUES
    (1, 'Sedan',  '🚗', 'รถเก๋งทั่วไป ประหยัดน้ำมัน'),
    (2, 'SUV',    '🚙', 'รถอเนกประสงค์ขนาดใหญ่'),
    (3, 'PPV',    '🛻', 'รถขับเคลื่อน 4 ล้อ'),
    (4, 'Luxury', '🏎️', 'รถหรูพรีเมียม'),
    (5, 'Van',    '🚐', 'รถตู้โดยสาร'),
    (6, 'Pickup', '🚚', 'รถกระบะ')
ON CONFLICT (id) DO NOTHING;

SELECT setval('mass.car_types_id_seq', (SELECT MAX(id) FROM mass.car_types));

-- คนขับ
INSERT INTO mass.drivers (id, name, phone, license, available, note) VALUES
    (1, 'สมชาย มีสุข',   '081-111-1111', 'A1234567', TRUE, 'ชำนาญเส้นทางกรุงเทพฯ'),
    (2, 'วิชัย ดีงาม',    '082-222-2222', 'B2345678', TRUE, 'ประสบการณ์ 10 ปี'),
    (3, 'ประสิทธิ์ ขยัน', '083-333-3333', 'C3456789', TRUE, 'รถหรู VIP'),
    (4, 'ณัฐพล รักงาน',  '084-444-4444', 'D4567890', TRUE, 'เดินทางต่างจังหวัด')
ON CONFLICT (id) DO NOTHING;

SELECT setval('mass.drivers_id_seq', (SELECT MAX(id) FROM mass.drivers));

-- รถ
INSERT INTO mass.cars (id, name, car_type_id, seats, available, description) VALUES
    (1, 'Toyota Camry',          1, 5,  TRUE, 'รถเก๋งหรู ประหยัดน้ำมัน เหมาะสำหรับการเดินทางธุรกิจ'),
    (2, 'Honda CR-V',             2, 7,  TRUE, 'SUV สปอร์ต กว้างขวาง เหมาะสำหรับครอบครัว'),
    (3, 'Toyota Fortuner',        3, 7,  TRUE, 'PPV ขับเคลื่อน 4 ล้อ แข็งแกร่ง เหมาะสำหรับทุกเส้นทาง'),
    (4, 'Mercedes-Benz E-Class',  4, 5,  TRUE, 'รถหรูระดับพรีเมียม สำหรับผู้บริหาร'),
    (5, 'Toyota HiAce',           5, 12, TRUE, 'ตู้โดยสารขนาดใหญ่ เหมาะสำหรับกรุ๊ปทัวร์'),
    (6, 'Isuzu D-Max',            6, 4,  TRUE, 'กระบะแข็งแกร่ง รับน้ำหนักได้มาก')
ON CONFLICT (id) DO NOTHING;

SELECT setval('mass.cars_id_seq', (SELECT MAX(id) FROM mass.cars));

-- admin user  (password = admin123, bcrypt 10 rounds)
INSERT INTO mass.users (id, name, email, password, role) VALUES
    (1, 'Admin', 'admin@carbook.com',
     '$2a$10$XQEZpQmRJy3LJ5FXkJFZ.uwx.FHQiYvz5rU7RNiHZXmKPv7VKZiWu',
     'admin')
ON CONFLICT (id) DO NOTHING;

SELECT setval('mass.users_id_seq', (SELECT MAX(id) FROM mass.users));

-- ============================================================
-- รันเสร็จแล้ว: schema mass พร้อมใช้งาน
-- ============================================================
