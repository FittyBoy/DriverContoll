# CLAUDE.md — DriverContoll (DriveElite Car Booking)

## Overview
ระบบจองรถบริษัท AGC Microglass แบบ full-stack
- **Frontend**: Static HTML/CSS/JS (http-server, port 5500)
- **Backend**: Node.js + Express REST API (port 3000)
- **Database**: PostgreSQL (schema `mass`)

---

## Project Structure

```
DriverContoll/
├── package.json          # Root — npm-run-all, dev scripts
├── CLAUDE.md
│
├── backend/
│   ├── server.js         # Express app + all API routes
│   ├── db.js             # PostgreSQL pool (search_path = mass)
│   ├── schema.sql        # DDL + seed data (run once)
│   ├── package.json
│   └── .env              # ← ต้องสร้างเอง (gitignored)
│
└── frontend/
    ├── index.html        # Landing / home page
    ├── booking.html      # จองรถ
    ├── schedule.html     # ตารางการจอง
    ├── admin.html        # Admin dashboard
    ├── css/style.css
    ├── js/api.js         # Fetch interceptor + typed API client
    └── package.json
```

---

## Dev Setup

### 1. สร้าง `backend/.env`
```dotenv
PG_HOST=172.18.106.190
PG_PORT=5432
PG_DATABASE=prod
PG_USER=postgres
PG_PASSWORD=Si@postgres#2025!

PORT=3000
FRONTEND_URL=http://localhost:5500
SESSION_SECRET=agc-mass-secret-change-me
```
> **หมายเหตุ**: อย่าใส่ `"` ล้อม password — dotenv จะรวม quote เข้าไปด้วย
> `db.js` มีโค้ด strip quotes อยู่แล้ว แต่ปลอดภัยกว่าถ้าไม่ใส่

### 2. ติดตั้ง dependencies
```bash
npm install              # root (npm-run-all)
cd backend && npm install
cd ../frontend && npm install
```

### 3. สร้าง DB schema (ครั้งแรกอย่างเดียว)
```bash
psql -h 172.18.106.190 -U postgres -d prod -f backend/schema.sql
```

### 4. รัน dev
```bash
npm run dev
# → backend  : http://localhost:3000
# → frontend : http://localhost:5500  (เปิด browser อัตโนมัติ)
```

---

## npm Scripts

| Script | คำอธิบาย |
|---|---|
| `npm run dev` | รัน backend + frontend พร้อมกัน (npm-run-all) |
| `npm run dev:backend` | รันแค่ backend |
| `npm run dev:frontend` | รันแค่ frontend static server |

---

## API Routes

### Auth
| Method | Path | Guard | คำอธิบาย |
|---|---|---|---|
| POST | `/api/register` | — | สมัครสมาชิก |
| POST | `/api/login` | — | เข้าสู่ระบบ |
| POST | `/api/logout` | — | ออกจากระบบ |
| GET | `/api/me` | — | ดึงข้อมูล session ปัจจุบัน |

### Car Types
| Method | Path | Guard |
|---|---|---|
| GET | `/api/cartypes` | — |
| POST | `/api/cartypes` | admin |
| PUT | `/api/cartypes/:id` | admin |
| DELETE | `/api/cartypes/:id` | admin |

### Drivers
| Method | Path | Guard |
|---|---|---|
| GET | `/api/drivers` | — |
| POST | `/api/drivers` | admin |
| PUT | `/api/drivers/:id` | admin |
| DELETE | `/api/drivers/:id` | admin |

### Cars
| Method | Path | Guard |
|---|---|---|
| GET | `/api/cars?typeId=` | — |
| GET | `/api/cars/:id` | — |
| POST | `/api/cars` | admin |
| PUT | `/api/cars/:id` | admin |
| DELETE | `/api/cars/:id` | admin |

### Bookings
| Method | Path | Guard |
|---|---|---|
| POST | `/api/bookings` | auth |
| GET | `/api/bookings/my` | auth |
| GET | `/api/bookings/car/:carId?weekStart=` | — |

### Admin
| Method | Path | Guard |
|---|---|---|
| GET | `/api/admin/bookings` | admin |
| PUT | `/api/admin/bookings/:id` | admin |
| DELETE | `/api/admin/bookings/:id` | admin |
| GET | `/api/admin/stats` | admin |

---

## Database Schema (`mass`)

```
car_types   id, name, icon, description
drivers     id, name, phone, license, available, note
cars        id, name, car_type_id→car_types, seats, available, description
users       id, name, email, password(bcrypt), phone, role(user|admin)
bookings    id, car_id→cars, driver_id→drivers, user_id→users,
            start_date, end_date, days, pickup_location, dropoff_location,
            notes, status(pending|confirmed|cancelled|completed)
```

Connection: `db.js` ใช้ `search_path=mass` ทุก query ไม่ต้องใส่ prefix `mass.` ใน SQL

---

## Frontend Architecture

### `js/api.js` (โหลดใน booking.html, admin.html, index.html, schedule.html)
มี 2 ส่วน:

1. **Fetch interceptor** — patch `window.fetch` ให้ทุก request ที่ขึ้นต้นด้วย `/api/`
   - เปลี่ยน URL เป็น `{location.protocol}//{location.hostname}:3000/api/...`
   - เพิ่ม `credentials: 'include'` อัตโนมัติ (สำคัญมากสำหรับ session cookie)

2. **Typed client `api.*`** — wrapper สำหรับ page ที่อยากเรียกแบบ typed

### Pages
- `index.html` — landing, login/register modal
- `booking.html` — เลือกรถ → เลือกคนขับ → กรอกวันที่/สถานที่ → ยืนยัน
- `schedule.html` — ดูตารางจองรายสัปดาห์ (calendar view)
- `admin.html` — จัดการ bookings / cars / car types / drivers + stats dashboard

---

## Auth & Session

- Session-based (express-session) เก็บใน memory
- Cookie: `maxAge 24h`, `sameSite: lax`, `secure: false` (dev เท่านั้น)
- Role: `user` | `admin`
- Admin seed: `admin@carbook.com` / `admin123`

---

## Known Issues / Notes

- Session store เป็น in-memory → restart แล้ว logout ทุก user
- `sameSite: lax` + `secure: false` ใช้ได้แค่ dev (HTTP localhost)
  → Production ต้องเปลี่ยนเป็น `sameSite: none`, `secure: true` + HTTPS
- CORS ตั้งเป็น `origin: true` (รับทุก origin) — ปรับก่อน deploy จริง
- ไม่มี rate limiting / input sanitization ฝั่ง SQL injection prevention ใช้ parameterized query แล้ว
