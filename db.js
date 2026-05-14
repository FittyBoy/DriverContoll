const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'data/db.json'));
const db = low(adapter);

db.defaults({
  carTypes: [
    { id: 1, name: 'Sedan',  icon: '🚗', description: 'รถเก๋งทั่วไป ประหยัดน้ำมัน' },
    { id: 2, name: 'SUV',    icon: '🚙', description: 'รถอเนกประสงค์ขนาดใหญ่' },
    { id: 3, name: 'PPV',    icon: '🛻', description: 'รถขับเคลื่อน 4 ล้อ' },
    { id: 4, name: 'Luxury', icon: '🏎️', description: 'รถหรูพรีเมียม' },
    { id: 5, name: 'Van',    icon: '🚐', description: 'รถตู้โดยสาร' },
    { id: 6, name: 'Pickup', icon: '🚚', description: 'รถกระบะ' }
  ],
  drivers: [
    { id: 1, name: 'สมชาย มีสุข',   phone: '081-111-1111', license: 'A1234567', available: true, note: 'ชำนาญเส้นทางกรุงเทพฯ' },
    { id: 2, name: 'วิชัย ดีงาม',    phone: '082-222-2222', license: 'B2345678', available: true, note: 'ประสบการณ์ 10 ปี' },
    { id: 3, name: 'ประสิทธิ์ ขยัน', phone: '083-333-3333', license: 'C3456789', available: true, note: 'รถหรู VIP' },
    { id: 4, name: 'ณัฐพล รักงาน',  phone: '084-444-4444', license: 'D4567890', available: true, note: 'เดินทางต่างจังหวัด' }
  ],
  cars: [
    { id: 1, name: 'Toyota Camry',         carTypeId: 1, seats: 5,  available: true, description: 'รถเก๋งหรู ประหยัดน้ำมัน เหมาะสำหรับการเดินทางธุรกิจ' },
    { id: 2, name: 'Honda CR-V',            carTypeId: 2, seats: 7,  available: true, description: 'SUV สปอร์ต กว้างขวาง เหมาะสำหรับครอบครัว' },
    { id: 3, name: 'Toyota Fortuner',       carTypeId: 3, seats: 7,  available: true, description: 'PPV ขับเคลื่อน 4 ล้อ แข็งแกร่ง เหมาะสำหรับทุกเส้นทาง' },
    { id: 4, name: 'Mercedes-Benz E-Class', carTypeId: 4, seats: 5,  available: true, description: 'รถหรูระดับพรีเมียม สำหรับผู้บริหาร' },
    { id: 5, name: 'Toyota HiAce',          carTypeId: 5, seats: 12, available: true, description: 'ตู้โดยสารขนาดใหญ่ เหมาะสำหรับกรุ๊ปทัวร์' },
    { id: 6, name: 'Isuzu D-Max',           carTypeId: 6, seats: 4,  available: true, description: 'กระบะแข็งแกร่ง รับน้ำหนักได้มาก' }
  ],
  bookings: [],
  users: [
    { id: 1, name: 'Admin', email: 'admin@carbook.com',
      password: '$2a$10$XQEZpQmRJy3LJ5FXkJFZ.uwx.FHQiYvz5rU7RNiHZXmKPv7VKZiWu', role: 'admin' }
  ],
  nextCarTypeId: 7,
  nextDriverId:  5,
  nextCarId:     7,
  nextBookingId: 1,
  nextUserId:    2
}).write();

module.exports = db;
