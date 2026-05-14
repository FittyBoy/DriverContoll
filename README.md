# 🚘 DriveElite — ระบบจองรถออนไลน์

ระบบจองรถพรีเมียมสำหรับธุรกิจให้เช่ารถ พัฒนาด้วย Node.js + Express + Lowdb

## ✨ ฟีเจอร์หลัก

- 🚗 **แสดงรถทั้งหมด** กรองตามประเภท (Sedan, SUV, PPV, Van, Luxury, Pickup)
- 📅 **จองรถออนไลน์** เลือกวันรับ-คืน, จุดรับส่ง, เลือกคนขับ
- 👤 **ระบบสมาชิก** สมัคร/เข้าสู่ระบบ ดูประวัติการจอง
- ⚙️ **Admin Dashboard** จัดการการจอง ยืนยัน/ยกเลิก ดูสถิติรายได้

## 🚀 เริ่มใช้งาน

```bash
# ติดตั้ง dependencies
npm install

# รันเซิร์ฟเวอร์
npm start
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000`

## 👤 บัญชีเริ่มต้น

| บทบาท | Email | Password |
|-------|-------|----------|
| Admin | admin@carbook.com | admin123 |

## 📁 โครงสร้างโปรเจค

```
DriverContoll/
├── server.js          # เซิร์ฟเวอร์หลัก (Express)
├── db.js              # ฐานข้อมูล (Lowdb JSON)
├── package.json
├── data/
│   └── db.json        # ไฟล์ฐานข้อมูล (สร้างอัตโนมัติ)
└── public/
    ├── index.html     # หน้าแรก
    ├── booking.html   # หน้าจองรถ
    ├── admin.html     # แผงควบคุม Admin
    └── css/
        └── style.css  # สไตล์ทั้งหมด
```

## 🛠 เทคโนโลยีที่ใช้

- **Backend**: Node.js, Express.js
- **Database**: Lowdb (JSON file-based)
- **Auth**: express-session, bcryptjs
- **Frontend**: Vanilla HTML/CSS/JS (ไม่ใช้ framework)

## 📡 API Endpoints

| Method | URL | คำอธิบาย |
|--------|-----|-----------|
| POST | `/api/register` | สมัครสมาชิก |
| POST | `/api/login` | เข้าสู่ระบบ |
| POST | `/api/logout` | ออกจากระบบ |
| GET | `/api/cars` | ดูรถทั้งหมด |
| GET | `/api/cars/:id` | ดูรถตาม ID |
| POST | `/api/bookings` | สร้างการจอง |
| GET | `/api/bookings/my` | ดูการจองของฉัน |
| GET | `/api/admin/bookings` | [Admin] ดูการจองทั้งหมด |
| PUT | `/api/admin/bookings/:id` | [Admin] อัปเดตสถานะ |
| DELETE | `/api/admin/bookings/:id` | [Admin] ลบการจอง |
| GET | `/api/admin/stats` | [Admin] สถิติ |
