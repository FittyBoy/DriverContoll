const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'data/db.json'));
const db = low(adapter);

// Default data
db.defaults({
  cars: [
    { id: 1, name: 'Toyota Camry', type: 'Sedan', seats: 5, price: 1200, image: 'camry', available: true, description: 'รถเก๋งหรู ประหยัดน้ำมัน เหมาะสำหรับการเดินทางธุรกิจ' },
    { id: 2, name: 'Honda CR-V', type: 'SUV', seats: 7, price: 1800, image: 'crv', available: true, description: 'SUV สปอร์ต กว้างขวาง เหมาะสำหรับครอบครัว' },
    { id: 3, name: 'Toyota Fortuner', type: 'PPV', seats: 7, price: 2200, image: 'fortuner', available: true, description: 'PPV ขับเคลื่อน 4 ล้อ แข็งแกร่ง เหมาะสำหรับทุกเส้นทาง' },
    { id: 4, name: 'Mercedes-Benz E-Class', type: 'Luxury', seats: 5, price: 3500, image: 'mercedes', available: true, description: 'รถหรูระดับพรีเมียม สำหรับผู้บริหารและโอกาสพิเศษ' },
    { id: 5, name: 'Toyota HiAce', type: 'Van', seats: 12, price: 2800, image: 'hiace', available: true, description: 'ตู้โดยสารขนาดใหญ่ เหมาะสำหรับกรุ๊ปทัวร์และการเดินทางหมู่' },
    { id: 6, name: 'Isuzu D-Max', type: 'Pickup', seats: 4, price: 1500, image: 'dmax', available: true, description: 'กระบะแข็งแกร่ง รับน้ำหนักได้มาก เหมาะสำหรับงานหนัก' }
  ],
  bookings: [],
  users: [
    { id: 1, name: 'Admin', email: 'admin@carbook.com', password: '$2a$10$XQEZpQmRJy3LJ5FXkJFZ.uwx.FHQiYvz5rU7RNiHZXmKPv7VKZiWu', role: 'admin' }
  ],
  nextBookingId: 1,
  nextUserId: 2
}).write();

module.exports = db;
