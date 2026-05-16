-- ============================================================
--  AGC Microglass - Migration + Seed from Excel
--  9 May - 15 May 2026
--  Run: psql -U postgres -d <db> -f seed_excel.sql
-- ============================================================
SET search_path TO mass;

-- -- 1. Add registration_plate column to drivers & cars ------
ALTER TABLE mass.drivers ADD COLUMN IF NOT EXISTS registration_plate VARCHAR(60);
ALTER TABLE mass.cars    ADD COLUMN IF NOT EXISTS registration_plate VARCHAR(60);

-- -- 2. Create trips table ------------------------------------
CREATE TABLE IF NOT EXISTS mass.trips (
    id                   SERIAL       PRIMARY KEY,
    trip_date            DATE         NOT NULL,
    car_type_label       VARCHAR(100) NOT NULL DEFAULT '',
    driver_name          VARCHAR(100),
    registration_plate   VARCHAR(60),
    phone                VARCHAR(20),
    passenger_name       VARCHAR(200) NOT NULL,
    pickup_location      TEXT         NOT NULL,
    dropoff_location     TEXT         NOT NULL,
    pickup_time          VARCHAR(20),
    remarks              TEXT,
    status               VARCHAR(20)  NOT NULL DEFAULT 'scheduled'
                             CHECK (status IN ('scheduled','completed','cancelled')),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_date        ON mass.trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_driver_name ON mass.trips(driver_name);

DROP TRIGGER IF EXISTS trg_trips_updated_at ON mass.trips;
CREATE TRIGGER trg_trips_updated_at
    BEFORE UPDATE ON mass.trips
    FOR EACH ROW EXECUTE FUNCTION mass.set_updated_at();

-- -- 3. Clear old fake seed data, insert real drivers ---------
TRUNCATE mass.drivers RESTART IDENTITY CASCADE;

INSERT INTO mass.drivers (name, phone, registration_plate, available, note) VALUES
  ('Mr. Wasan (Yui)',        '082-1912729', '1ขฮ 7519 กรุงเทพฯ', TRUE, 'Camry'),
  ('Mr. Nakorn (Nakorn)',    '080-8542988', '4ขฬ 4901 กรุงเทพฯ', TRUE, 'Altis 1'),
  ('Mr. Rungrote (Rung)',    '061-2649494', '4ขฬ 4901 กรุงเทพฯ', TRUE, 'Altis 1 Tem driver'),
  ('Mr. Wittaya (Bump)',     '083-2098228', '3ขจ7075 กรุงเทพฯ',  TRUE, 'Altis 2'),
  ('Mr. Awut (Jo)',          '090-4618129', '4ขอ 2750 กรุงเทพฯ', TRUE, 'Altis 3'),
  ('Mr. Kittirote (Pan)',    '063-0758226', '7ขท 7261 กรุงเทพฯ', TRUE, 'Altis 4'),
  ('Mr. Suttidech (Dech)',   '081-3522563', '4ขอ 1264 กรุงเทพฯ', TRUE, 'Altis 5'),
  ('Mr. Nuttapon (A)',       '086-4050575', 'ษ 5255 กรุงเทพฯ',   TRUE, 'Minibus 1'),
  ('Mr. Walut (Diw)',        '064-1457741', 'ษ 5265 กรุงเทพฯ',   TRUE, 'Minibus 2'),
  ('Mr. Chuchat (Chu)',      '096-2058093', 'พ 2169 กรุงเทพฯ',   TRUE, 'Minibus 3'),
  ('Mr. Apiwat (Tor)',       '085-7310899', '1นญ 6300 กรุงเทพฯ', TRUE, 'Minibus 4'),
  ('Mr. Pramote (Mote)',     '088-4068101', '1นฉ 5272 กรุงเทพฯ', TRUE, 'Minibus 5'),
  ('Mr. Wittaya (Note)',     '062-6738647', '1นญ 6522 กรุงเทพฯ', TRUE, 'Minibus 6'),
  ('Mr. Weerawat',           '089-8367765', '1นฆ-2874 กรุงเทพฯ', TRUE, 'Temporary Minibus 01'),
  ('Mr. Pong',               '092-5800560', 'นจ-5266 เชียงใหม่', TRUE, 'Temporary Minibus 02'),
  ('Mr. Max',                '093-2185801', 'นจ-875 เชียงใหม่',  TRUE, 'Temporary Minibus 03'),
  ('Mr. Somchai',            '081-7461452', 'กห-9656 เชียงใหม่', TRUE, 'Temporary Car 04'),
  ('Mr. Boy',                '083-3226560', 'นจ-2415 เชียงใหม่', TRUE, 'Temporary Minibus 05'),
  ('Mr. Pornthep',           '084-3780239', 'นง-3993 เชียงใหม่', TRUE, 'Temporary Minibus 06');

SELECT setval('mass.drivers_id_seq', (SELECT MAX(id) FROM mass.drivers));

-- -- 4. Clear old fake cars, insert real fleet -----------------
TRUNCATE mass.cars RESTART IDENTITY CASCADE;

INSERT INTO mass.cars (name, car_type_id, seats, available, registration_plate, description) VALUES
  ('Toyota Camry',            1, 5,  TRUE, '1ขฮ 7519 กรุงเทพฯ', 'VIP Camry'),
  ('Altis 1',                 1, 5,  TRUE, '4ขฬ 4901 กรุงเทพฯ', 'Toyota Altis เบอร์ 1'),
  ('Altis 2',                 1, 5,  TRUE, '3ขจ7075 กรุงเทพฯ',  'Toyota Altis เบอร์ 2'),
  ('Altis 3',                 1, 5,  TRUE, '4ขอ 2750 กรุงเทพฯ', 'Toyota Altis เบอร์ 3'),
  ('Altis 4',                 1, 5,  TRUE, '7ขท 7261 กรุงเทพฯ', 'Toyota Altis เบอร์ 4'),
  ('Altis 5',                 1, 5,  TRUE, '4ขอ 1264 กรุงเทพฯ', 'Toyota Altis เบอร์ 5'),
  ('Minibus 1',               5, 12, TRUE, 'ษ 5255 กรุงเทพฯ',   'Minibus เบอร์ 1'),
  ('Minibus 2',               5, 12, TRUE, 'ษ 5265 กรุงเทพฯ',   'Minibus เบอร์ 2'),
  ('Minibus 3',               5, 12, TRUE, 'พ 2169 กรุงเทพฯ',   'Minibus เบอร์ 3'),
  ('Minibus 4',               5, 12, TRUE, '1นญ 6300 กรุงเทพฯ', 'Minibus เบอร์ 4'),
  ('Minibus 5',               5, 12, TRUE, '1นฉ 5272 กรุงเทพฯ', 'Minibus เบอร์ 5'),
  ('Minibus 6',               5, 12, TRUE, '1นญ 6522 กรุงเทพฯ', 'Minibus เบอร์ 6'),
  ('Temporary Minibus 01',    5, 12, TRUE, '1นฆ-2874 กรุงเทพฯ', 'Temporary รถตู้ 01 (BKK)'),
  ('Temporary Minibus 02',    5, 12, TRUE, 'นจ-5266 เชียงใหม่', 'Temporary รถตู้ 02 (CNX)'),
  ('Temporary Minibus 03',    5, 12, TRUE, 'นจ-875 เชียงใหม่',  'Temporary รถตู้ 03 (CNX)'),
  ('Temporary Car 04',        1, 5,  TRUE, 'กห-9656 เชียงใหม่', 'Temporary รถเก๋ง 04 (CNX)'),
  ('Temporary Minibus 05',    5, 12, TRUE, 'นจ-2415 เชียงใหม่', 'Temporary รถตู้ 05 (CNX)'),
  ('Temporary Minibus 06',    5, 12, TRUE, 'นง-3993 เชียงใหม่', 'Temporary รถตู้ 06 (CNX)');

SELECT setval('mass.cars_id_seq', (SELECT MAX(id) FROM mass.cars));

-- -- 5. Reset admin user ---------------------------------------
TRUNCATE mass.users RESTART IDENTITY CASCADE;
INSERT INTO mass.users (name, email, password, role) VALUES
  ('Admin', 'admin@carbook.com',
   '$2a$10$XQEZpQmRJy3LJ5FXkJFZ.uwx.FHQiYvz5rU7RNiHZXmKPv7VKZiWu',
   'admin');
SELECT setval('mass.users_id_seq', (SELECT MAX(id) FROM mass.users));

-- -- 6. Seed trips from 9 May - 15 May 2026 -------------------
TRUNCATE mass.trips RESTART IDENTITY;

INSERT INTO mass.trips
  (trip_date, car_type_label, driver_name, registration_plate, phone, passenger_name, pickup_location, dropoff_location, pickup_time, remarks)
VALUES
-- 9 May 2026 (Saturday)
('2026-05-09','Camry','Mr. Wasan (Yui)','1ขฮ 7519 กรุงเทพฯ','082-1912729','Mr. Nitani','Play condo','Ibis','07.30',''),
('2026-05-09','Camry','Mr. Wasan (Yui)','1ขฮ 7519 กรุงเทพฯ','082-1912729','Mr. Fukushi (ATSC)','Ibis','AMGT','07.35',''),
('2026-05-09','Altis 4','Mr. Kittirote (Pan)','7ขท 7261 กรุงเทพฯ','063-0758226','Mr. Masuda','Astra sky','Bangkok Hospital','07.50',''),
('2026-05-09','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Sasaya (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-09','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Miyada (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-09','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Nakahata (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-09','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Fukushima (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-09','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Nakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-09','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Sakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-09','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Hoshino','Nimmana','AMGT','06.50',''),
('2026-05-09','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Takahashi','Nimmana','AMGT','06.50',''),
('2026-05-09','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Maeda','Unique 2','Kantary','05.50','***Private***'),
('2026-05-09','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Ishibashi','Kantary','Play condo','05.53','***Private***'),
('2026-05-09','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Hagiwara','Play condo','Ibis','05.57','***Private***'),
('2026-05-09','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Soramoto','Ibis','Summit Green Valley Chiangmai','06.00','***Private***'),
('2026-05-09','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Shimano','Ibis','Summit Green Valley Chiangmai','06.00','***Private***'),
('2026-05-09','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Kamata (AGEL)','Ibis','AMGT','07.30',''),
-- 10 May 2026 (Sunday)
('2026-05-10','Altis 2','Mr. Wittaya (Bump)','3ขจ7075 กรุงเทพฯ','083-2098228','Mr. Shimizu','Unique 2','AMGT','08.00',''),
('2026-05-10','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. & Mrs. Hagiwara','Play condo','Unique 1','07.00','***Private***'),
('2026-05-10','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. Tokuda','Unique 1','North Hill','07.05','***Private***'),
-- 11 May 2026 (Monday)
('2026-05-11','Camry','Mr. Wasan (Yui)','1ขฮ 7519 กรุงเทพฯ','082-1912729','Mr. Hagiwara','Play condo','AMGT','06.20',''),
('2026-05-11','Altis 1','Mr. Nakorn (Nakorn)','4ขฬ 4901 กรุงเทพฯ','080-8542988','Mr. Tokuda','Unique 1','AMGT','06.50',''),
('2026-05-11','Altis 2','Mr. Wittaya (Bump)','3ขจ7075 กรุงเทพฯ','083-2098228','Mr. Nitani','Play condo','AMGT','06.50',''),
('2026-05-11','Altis 3','Mr. Awut (Jo)','4ขอ 2750 กรุงเทพฯ','090-4618129','Mr. Ishibashi','Kantary','AMGT','06.40',''),
('2026-05-11','Altis 4','Mr. Kittirote (Pan)','7ขท 7261 กรุงเทพฯ','063-0758226','Mr. Koguchi','Unique 2','AMGT','06.50',''),
('2026-05-11','Altis 5','Mr. Suttidech (Dech)','4ขอ 1264 กรุงเทพฯ','081-3522563','Mr. Sako','Astra sky','AMGT','06.50',''),
('2026-05-11','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. Maeda','Unique 2','AMGT','06.50',''),
('2026-05-11','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. Shimizu','Unique 2','AMGT','06.50',''),
('2026-05-11','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Fukushi (ATSC)','Ibis','AMGT','06.50',''),
('2026-05-11','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Deguchi (AGC)','Ibis','AMGT','06.50',''),
('2026-05-11','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Shimano','Ibis','Moda','06.45',''),
('2026-05-11','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Ogawa','Ibis','Moda','06.45',''),
('2026-05-11','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Konno','Moda','AMGT','06.50',''),
('2026-05-11','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Takahashi','Nimmana','AMGT','06.50',''),
('2026-05-11','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Wada','Nimmana','AMGT','06.50',''),
('2026-05-11','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Hoshino','Nimmana','AMGT','06.50',''),
('2026-05-11','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Higuchi','Peaks Garden','Astra sky','06.45',''),
('2026-05-11','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Nonaka','Astra sky','AMGT','06.50',''),
('2026-05-11','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Masuda','Astra sky','AMGT','06.50',''),
('2026-05-11','Minibus 6','Mr. Wittaya (Note)','1นญ 6522 กรุงเทพฯ','062-6738647','Mr. Ohumura','Erawan','AMGT','06.30',''),
('2026-05-11','Temporary Minibus 05','Mr. Boy','นจ-2415 เชียงใหม่','083-3226560','MG Staff','AMGT','-','17.00~','Standby at evening for MG staff'),
('2026-05-11','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Yanai (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-11','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Imaizumi (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-11','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Soramoto (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-11','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Sekimoto (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-11','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Kamata (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-11','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Honda (AGC)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-11','Temporary Car 04','Mr. Somchai','กห-9656 เชียงใหม่','081-7461452','OE Staff','AMGT','-','17.00~','Standby at evening for OE staff'),
('2026-05-11','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Sasaya (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-11','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Miyada (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-11','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Nakahata (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-11','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Apichat (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-11','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Fukushima (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-11','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Nakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-11','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Sakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
-- 12 May 2026 (Tuesday)
('2026-05-12','Camry','Mr. Wasan (Yui)','1ขฮ 7519 กรุงเทพฯ','082-1912729','Mr. Hagiwara','Play condo','AMGT','06.20',''),
('2026-05-12','Altis 1','Mr. Nakorn (Nakorn)','4ขฬ 4901 กรุงเทพฯ','080-8542988','Mr. Tokuda','Unique 1','AMGT','06.50',''),
('2026-05-12','Altis 2','Mr. Wittaya (Bump)','3ขจ7075 กรุงเทพฯ','083-2098228','Mr. Nitani','Play condo','AMGT','06.50',''),
('2026-05-12','Altis 3','Mr. Awut (Jo)','4ขอ 2750 กรุงเทพฯ','090-4618129','Mr. Ishibashi','Kantary','AMGT','06.40',''),
('2026-05-12','Altis 4','Mr. Kittirote (Pan)','7ขท 7261 กรุงเทพฯ','063-0758226','Mr. Koguchi','Unique 2','AMGT','06.50',''),
('2026-05-12','Altis 5','Mr. Suttidech (Dech)','4ขอ 1264 กรุงเทพฯ','081-3522563','Mr. Sako','Astra sky','AMGT','06.50',''),
('2026-05-12','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. Maeda','Unique 2','AMGT','06.50',''),
('2026-05-12','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. Shimizu','Unique 2','AMGT','06.50',''),
('2026-05-12','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Fukushi (ATSC)','Ibis','AMGT','06.50',''),
('2026-05-12','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Deguchi (AGC)','Ibis','AMGT','06.50',''),
('2026-05-12','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Yamane (AMGC)','Ibis','AMGT','06.50',''),
('2026-05-12','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Yoshida (AMGC)','Ibis','AMGT','06.50',''),
('2026-05-12','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Shimano','Ibis','Moda','06.45',''),
('2026-05-12','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Ogawa','Ibis','Moda','06.45',''),
('2026-05-12','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Konno','Moda','AMGT','06.50',''),
('2026-05-12','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Takahashi','Nimmana','AMGT','06.50',''),
('2026-05-12','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Wada','Nimmana','AMGT','06.50',''),
('2026-05-12','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Hoshino','Nimmana','AMGT','06.50',''),
('2026-05-12','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Higuchi','Peaks Garden','Astra sky','06.45',''),
('2026-05-12','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Nonaka','Astra sky','AMGT','06.50',''),
('2026-05-12','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Masuda','Astra sky','AMGT','06.50',''),
('2026-05-12','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Sako','Astra sky','AMGT','06.50',''),
('2026-05-12','Minibus 6','Mr. Wittaya (Note)','1นญ 6522 กรุงเทพฯ','062-6738647','Mr. Ohumura','Erawan','AMGT','06.30',''),
('2026-05-12','Temporary Minibus 05','Mr. Boy','นจ-2415 เชียงใหม่','083-3226560','MG Staff','AMGT','-','17.00~','Standby at evening for MG staff'),
('2026-05-12','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Yanai (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-12','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Imaizumi (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-12','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Soramoto (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-12','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Sekimoto (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-12','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Kamata (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-12','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Honda (AGC)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-12','Temporary Car 04','Mr. Somchai','กห-9656 เชียงใหม่','081-7461452','OE Staff','AMGT','-','17.00~','Standby at evening for OE staff'),
('2026-05-12','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Sasaya (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-12','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Miyada (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-12','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Nakahata (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-12','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Apichat (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-12','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Fukushima (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-12','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Nakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-12','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Sakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-12','Temporary Minibus 06','Mr. Pornthep','นง-3993 เชียงใหม่','084-3780239','Mr. Mizumoto (Seishin)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-12','Temporary Minibus 06','Mr. Pornthep','นง-3993 เชียงใหม่','084-3780239','Mr. Yoshitake (Seishin)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
-- 13 May 2026 (Wednesday)
('2026-05-13','Camry','Mr. Wasan (Yui)','1ขฮ 7519 กรุงเทพฯ','082-1912729','Mr. Hagiwara','Play condo','AMGT','06.20',''),
('2026-05-13','Altis 1','Mr. Nakorn (Nakorn)','4ขฬ 4901 กรุงเทพฯ','080-8542988','Mr. Tokuda','Unique 1','AMGT','06.50',''),
('2026-05-13','Altis 2','Mr. Wittaya (Bump)','3ขจ7075 กรุงเทพฯ','083-2098228','Mr. Nitani','Play condo','AMGT','06.50',''),
('2026-05-13','Altis 3','Mr. Awut (Jo)','4ขอ 2750 กรุงเทพฯ','090-4618129','Mr. Ishibashi','Kantary','AMGT','06.40',''),
('2026-05-13','Altis 4','Mr. Kittirote (Pan)','7ขท 7261 กรุงเทพฯ','063-0758226','Mr. Koguchi','Unique 2','AMGT','06.50',''),
('2026-05-13','Altis 5','Mr. Suttidech (Dech)','4ขอ 1264 กรุงเทพฯ','081-3522563','Mr. Sako','Astra sky','AMGT','06.50',''),
('2026-05-13','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. Maeda','Unique 2','AMGT','06.50',''),
('2026-05-13','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. Shimizu','Unique 2','AMGT','06.50',''),
('2026-05-13','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Fukushi (ATSC)','Ibis','AMGT','06.50',''),
('2026-05-13','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Deguchi (AGC)','Ibis','AMGT','06.50',''),
('2026-05-13','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Yamane (AMGC)','Ibis','AMGT','06.50',''),
('2026-05-13','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Yoshida (AMGC)','Ibis','AMGT','06.50',''),
('2026-05-13','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Shimano','Ibis','Moda','06.45',''),
('2026-05-13','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Ogawa','Ibis','Moda','06.45',''),
('2026-05-13','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Konno','Moda','AMGT','06.50',''),
('2026-05-13','Minibus 4','Mr. Chuchat (Chu)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Takahashi','Nimmana','AMGT','06.50',''),
('2026-05-13','Minibus 4','Mr. Chuchat (Chu)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Wada','Nimmana','AMGT','06.50',''),
('2026-05-13','Minibus 4','Mr. Chuchat (Chu)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Hoshino','Nimmana','AMGT','06.50',''),
('2026-05-13','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Higuchi','Peaks Garden','Astra sky','06.45',''),
('2026-05-13','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Nonaka','Astra sky','AMGT','06.50',''),
('2026-05-13','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Masuda','Astra sky','AMGT','06.50',''),
('2026-05-13','Minibus 6','Mr. Wittaya (Note)','1นญ 6522 กรุงเทพฯ','062-6738647','Mr. Ohumura','Erawan','AMGT','06.30',''),
('2026-05-13','Temporary Minibus 05','Mr. Boy','นจ-2415 เชียงใหม่','083-3226560','MG Staff','AMGT','-','17.00~','Standby at evening for MG staff'),
('2026-05-13','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Yanai (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-13','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Imaizumi (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-13','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Soramoto (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-13','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Sekimoto (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-13','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Kamata (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-13','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Honda (AGC)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-13','Temporary Car 04','Mr. Somchai','กห-9656 เชียงใหม่','081-7461452','OE Staff','AMGT','-','17.00~','Standby at evening for OE staff'),
('2026-05-13','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Apichat (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-13','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Fukushima (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-13','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Nakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-13','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Sakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-13','Temporary Minibus 06','Mr. Pornthep','นง-3993 เชียงใหม่','084-3780239','Mr. Mizumoto (Seishin)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-13','Temporary Minibus 06','Mr. Pornthep','นง-3993 เชียงใหม่','084-3780239','Mr. Yoshitake (Seishin)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-13','Temporary Minibus 06','Mr. Pornthep','นง-3993 เชียงใหม่','084-3780239','Mrs. Hagiwara','Play condo','Chiang Mai','10.00','Minibus, arrange by driver'),
-- 14 May 2026 (Thursday)
('2026-05-14','Camry','Mr. Wasan (Yui)','1ขฮ 7519 กรุงเทพฯ','082-1912729','Mr. Hagiwara','Play condo','AMGT','06.20',''),
('2026-05-14','Altis 1','Mr. Nakorn (Nakorn)','4ขฬ 4901 กรุงเทพฯ','080-8542988','Mr. Tokuda','Unique 1','AMGT','06.50',''),
('2026-05-14','Altis 2','Mr. Wittaya (Bump)','3ขจ7075 กรุงเทพฯ','083-2098228','Mr. Nitani','Play condo','AMGT','06.50',''),
('2026-05-14','Altis 3','Mr. Awut (Jo)','4ขอ 2750 กรุงเทพฯ','090-4618129','Mr. Ishibashi','Kantary','AMGT','06.40',''),
('2026-05-14','Altis 4','Mr. Kittirote (Pan)','7ขท 7261 กรุงเทพฯ','063-0758226','Mr. Koguchi','Unique 2','AMGT','06.50',''),
('2026-05-14','Altis 5','Mr. Suttidech (Dech)','4ขอ 1264 กรุงเทพฯ','081-3522563','Mr. Sako','Astra sky','AMGT','06.50',''),
('2026-05-14','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. Maeda','Unique 2','AMGT','06.50',''),
('2026-05-14','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. Shimizu','Unique 2','AMGT','06.50',''),
('2026-05-14','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Fukushi (ATSC)','Ibis','AMGT','06.50',''),
('2026-05-14','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Deguchi (AGC)','Ibis','AMGT','06.50',''),
('2026-05-14','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Yamane (AMGC)','Ibis','AMGT','06.50',''),
('2026-05-14','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Yoshida (AMGC)','Ibis','AMGT','06.50',''),
('2026-05-14','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Shimano','Ibis','Moda','06.45',''),
('2026-05-14','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Ogawa','Ibis','Moda','06.45',''),
('2026-05-14','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Konno','Moda','AMGT','06.50',''),
('2026-05-14','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Takahashi','Nimmana','AMGT','06.50',''),
('2026-05-14','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Wada','Nimmana','AMGT','06.50',''),
('2026-05-14','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Hoshino','Nimmana','AMGT','06.50',''),
('2026-05-14','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Higuchi','Peaks Garden','Astra sky','06.45',''),
('2026-05-14','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Nonaka','Astra sky','AMGT','06.50',''),
('2026-05-14','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Masuda','Astra sky','AMGT','06.50',''),
('2026-05-14','Minibus 6','Mr. Wittaya (Note)','1นญ 6522 กรุงเทพฯ','062-6738647','Mr. Ohumura','Erawan','AMGT','06.30',''),
('2026-05-14','Temporary Minibus 05','Mr. Boy','นจ-2415 เชียงใหม่','083-3226560','MG Staff','AMGT','-','17.00~','Standby at evening for MG staff'),
('2026-05-14','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Yanai (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-14','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Imaizumi (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-14','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Soramoto (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-14','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Sekimoto (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-14','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Kamata (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-14','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Honda (AGC)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-14','Temporary Car 04','Mr. Somchai','กห-9656 เชียงใหม่','081-7461452','OE Staff','AMGT','-','17.00~','Standby at evening for OE staff'),
('2026-05-14','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Apichat (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-14','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Fukushima (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-14','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Nakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-14','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Sakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-14','Temporary Minibus 06','Mr. Pornthep','นง-3993 เชียงใหม่','084-3780239','Mr. Mizumoto (Seishin)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-14','Temporary Minibus 06','Mr. Pornthep','นง-3993 เชียงใหม่','084-3780239','Mr. Yoshitake (Seishin)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
-- 15 May 2026 (Friday)
('2026-05-15','Camry','Mr. Wasan (Yui)','1ขฮ 7519 กรุงเทพฯ','082-1912729','Mr. Hagiwara','Play condo','AMGT','06.20',''),
('2026-05-15','Altis 1','Mr. Nakorn (Nakorn)','4ขฬ 4901 กรุงเทพฯ','080-8542988','Mr. Tokuda','Unique 1','AMGT','06.50',''),
('2026-05-15','Altis 2','Mr. Wittaya (Bump)','3ขจ7075 กรุงเทพฯ','083-2098228','Mr. Nitani','Play condo','AMGT','06.50',''),
('2026-05-15','Altis 3','Mr. Awut (Jo)','4ขอ 2750 กรุงเทพฯ','090-4618129','Mr. Ishibashi','Kantary','AMGT','06.40',''),
('2026-05-15','Altis 4','Mr. Kittirote (Pan)','7ขท 7261 กรุงเทพฯ','063-0758226','Mr. Koguchi','Unique 2','AMGT','06.50',''),
('2026-05-15','Altis 5','Mr. Suttidech (Dech)','4ขอ 1264 กรุงเทพฯ','081-3522563','Mr. Sako','Astra sky','AMGT','06.50',''),
('2026-05-15','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. Maeda','Unique 2','AMGT','06.50',''),
('2026-05-15','Minibus 1','Mr. Nuttapon (A)','ษ 5255 กรุงเทพฯ','086-4050575','Mr. Shimizu','Unique 2','AMGT','06.50',''),
('2026-05-15','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Fukushi (ATSC)','Ibis','AMGT','06.50',''),
('2026-05-15','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Deguchi (AGC)','Ibis','AMGT','06.50',''),
('2026-05-15','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Yamane (AMGC)','Ibis','AMGT','06.50',''),
('2026-05-15','Minibus 2','Mr. Walut (Diw)','ษ 5265 กรุงเทพฯ','064-1457741','Mr. Yoshida (AMGC)','Ibis','AMGT','06.50',''),
('2026-05-15','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Shimano','Ibis','Moda','06.45',''),
('2026-05-15','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Ogawa','Ibis','Moda','06.45',''),
('2026-05-15','Minibus 3','Mr. Chuchat (Chu)','พ 2169 กรุงเทพฯ','096-2058093','Mr. Konno','Moda','AMGT','06.50',''),
('2026-05-15','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Takahashi','Nimmana','AMGT','06.50',''),
('2026-05-15','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Wada','Nimmana','AMGT','06.50',''),
('2026-05-15','Minibus 4','Mr. Apiwat (Tor)','1นญ 6300 กรุงเทพฯ','085-7310899','Mr. Hoshino','Nimmana','AMGT','06.50',''),
('2026-05-15','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Higuchi','Peaks Garden','Astra sky','06.45',''),
('2026-05-15','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Nonaka','Astra sky','AMGT','06.50',''),
('2026-05-15','Minibus 5','Mr. Pramote (Mote)','1นฉ 5272 กรุงเทพฯ','088-4068101','Mr. Masuda','Astra sky','AMGT','06.50',''),
('2026-05-15','Minibus 6','Mr. Wittaya (Note)','1นญ 6522 กรุงเทพฯ','062-6738647','Mr. Ohumura','Erawan','AMGT','06.30',''),
('2026-05-15','Temporary Minibus 05','Mr. Boy','นจ-2415 เชียงใหม่','083-3226560','MG Staff','AMGT','-','17.00~','Standby at evening for MG staff'),
('2026-05-15','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Yanai (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-15','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Imaizumi (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-15','Temporary Minibus 02','Mr. Pong','นจ-5266 เชียงใหม่','092-5800560','Mr. Soramoto (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-15','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Sekimoto (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-15','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Kamata (AGEL)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-15','Temporary Minibus 03','Mr. Max','นจ-875 เชียงใหม่','093-2185801','Mr. Honda (AGC)','Ibis','AMGT','06.50','*For OE Staff*'),
('2026-05-15','Temporary Car 04','Mr. Somchai','กห-9656 เชียงใหม่','081-7461452','OE Staff','AMGT','-','17.00~','Standby at evening for OE staff'),
('2026-05-15','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Apichat (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-15','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Fukushima (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-15','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Nakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-15','Temporary Minibus 01','Mr. Weerawat','1นฆ-2874 กรุงเทพฯ','089-8367765','Mr. Sakamoto (Shibuya)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-15','Temporary Minibus 06','Mr. Pornthep','นง-3993 เชียงใหม่','084-3780239','Mr. Mizumoto (Seishin)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-15','Temporary Minibus 06','Mr. Pornthep','นง-3993 เชียงใหม่','084-3780239','Mr. Yoshitake (Seishin)','Ibis','AMGT','07.30','*Card* *For vendor Only*'),
('2026-05-15','Temporary Minibus 06','Mr. Pornthep','นง-3993 เชียงใหม่','084-3780239','Mrs. Hagiwara','Play condo','Chiang Mai','10.00','Minibus, arrange by driver');

SELECT setval('mass.trips_id_seq', (SELECT MAX(id) FROM mass.trips));

-- Done
DO $$ BEGIN RAISE NOTICE 'Seed complete: drivers=19, cars=18, trips imported'; END $$;