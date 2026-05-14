const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'carbook-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// =========== AUTH ROUTES ===========
app.post('/api/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  const existing = db.get('users').find({ email }).value();
  if (existing) return res.json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
  const hashed = await bcrypt.hash(password, 10);
  const id = db.get('nextUserId').value();
  const user = { id, name, email, password: hashed, phone: phone || '', role: 'user', createdAt: new Date().toISOString() };
  db.get('users').push(user).write();
  db.set('nextUserId', id + 1).write();
  req.session.user = { id, name, email, role: 'user' };
  res.json({ success: true, message: 'สมัครสมาชิกสำเร็จ' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.get('users').find({ email }).value();
  if (!user) return res.json({ success: false, message: 'ไม่พบบัญชีผู้ใช้' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ success: true, role: user.role });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (req.session.user) return res.json({ loggedIn: true, user: req.session.user });
  res.json({ loggedIn: false });
});

// =========== CAR ROUTES ===========
app.get('/api/cars', (req, res) => {
  const { type, seats, maxPrice } = req.query;
  let cars = db.get('cars').value();
  if (type && type !== 'all') cars = cars.filter(c => c.type === type);
  if (seats) cars = cars.filter(c => c.seats >= parseInt(seats));
  if (maxPrice) cars = cars.filter(c => c.price <= parseInt(maxPrice));
  res.json(cars);
});

app.get('/api/cars/:id', (req, res) => {
  const car = db.get('cars').find({ id: parseInt(req.params.id) }).value();
  if (!car) return res.status(404).json({ message: 'ไม่พบรถ' });
  res.json(car);
});

// =========== BOOKING ROUTES ===========
app.post('/api/bookings', (req, res) => {
  if (!req.session.user) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' });
  const { carId, startDate, endDate, pickupLocation, dropoffLocation, driverNeeded, notes } = req.body;
  if (!carId || !startDate || !endDate || !pickupLocation) return res.json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });

  const car = db.get('cars').find({ id: parseInt(carId) }).value();
  if (!car) return res.json({ success: false, message: 'ไม่พบรถที่เลือก' });

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) return res.json({ success: false, message: 'วันคืนรถต้องมากกว่าวันรับรถ' });

  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const driverFee = driverNeeded ? 500 * days : 0;
  const totalPrice = (car.price * days) + driverFee;

  const id = db.get('nextBookingId').value();
  const booking = {
    id, carId: parseInt(carId), carName: car.name, carType: car.type,
    userId: req.session.user.id, userName: req.session.user.name, userEmail: req.session.user.email,
    startDate, endDate, days, pickupLocation, dropoffLocation: dropoffLocation || pickupLocation,
    driverNeeded: !!driverNeeded, notes: notes || '',
    carPrice: car.price, driverFee, totalPrice,
    status: 'pending', createdAt: new Date().toISOString()
  };
  db.get('bookings').push(booking).write();
  db.set('nextBookingId', id + 1).write();
  res.json({ success: true, booking, message: 'จองรถสำเร็จ' });
});

app.get('/api/bookings/my', (req, res) => {
  if (!req.session.user) return res.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
  const bookings = db.get('bookings').filter({ userId: req.session.user.id }).value();
  res.json(bookings);
});

// =========== ADMIN ROUTES ===========
const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
  next();
};

app.get('/api/admin/bookings', isAdmin, (req, res) => {
  const bookings = db.get('bookings').value();
  res.json(bookings);
});

app.put('/api/admin/bookings/:id', isAdmin, (req, res) => {
  const { status } = req.body;
  const id = parseInt(req.params.id);
  db.get('bookings').find({ id }).assign({ status }).write();
  res.json({ success: true });
});

app.delete('/api/admin/bookings/:id', isAdmin, (req, res) => {
  db.get('bookings').remove({ id: parseInt(req.params.id) }).write();
  res.json({ success: true });
});

app.get('/api/admin/stats', isAdmin, (req, res) => {
  const bookings = db.get('bookings').value();
  const total = bookings.length;
  const pending = bookings.filter(b => b.status === 'pending').length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const revenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.totalPrice, 0);
  res.json({ total, pending, confirmed, revenue });
});

// =========== PAGE ROUTES ===========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/booking', (req, res) => res.sendFile(path.join(__dirname, 'public', 'booking.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => console.log(`🚗 Car Booking Server running on http://localhost:${PORT}`));
