// ── API Base URL ─────────────────────────────────────────────────────────────
// เปลี่ยนที่นี่ที่เดียวเมื่อ deploy จริง
const API = 'http://localhost:3000';

// ── fetch wrapper — ส่ง credentials (cookie session) ทุก request ──────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    credentials: 'include',          // ต้องส่งทุกครั้งเพื่อให้ session ทำงาน
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  return res.json();
}

const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, body)   => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),

  // Auth
  me:       ()           => api.get('/api/me'),
  login:    (email, password) => api.post('/api/login',    { email, password }),
  register: (data)       => api.post('/api/register', data),
  logout:   ()           => api.post('/api/logout', {}),

  // Master data
  carTypes: ()           => api.get('/api/cartypes'),
  drivers:  ()           => api.get('/api/drivers'),
  cars:     (typeId)     => api.get('/api/cars' + (typeId ? `?typeId=${typeId}` : '')),

  // Bookings
  myBookings: ()         => api.get('/api/bookings/my'),
  bookingsByCar: (carId, weekStart) =>
    api.get(`/api/bookings/car/${carId}${weekStart ? '?weekStart='+weekStart : ''}`),
  book:     (data)       => api.post('/api/bookings', data),

  // Admin
  admin: {
    stats:          ()             => api.get('/api/admin/stats'),
    bookings:       ()             => api.get('/api/admin/bookings'),
    updateBooking:  (id, data)     => api.put(`/api/admin/bookings/${id}`, data),
    deleteBooking:  (id)           => api.delete(`/api/admin/bookings/${id}`),

    addCarType:     (data)         => api.post('/api/cartypes', data),
    updateCarType:  (id, data)     => api.put(`/api/cartypes/${id}`, data),
    deleteCarType:  (id)           => api.delete(`/api/cartypes/${id}`),

    addDriver:      (data)         => api.post('/api/drivers', data),
    updateDriver:   (id, data)     => api.put(`/api/drivers/${id}`, data),
    deleteDriver:   (id)           => api.delete(`/api/drivers/${id}`),

    addCar:         (data)         => api.post('/api/cars', data),
    updateCar:      (id, data)     => api.put(`/api/cars/${id}`, data),
    deleteCar:      (id)           => api.delete(`/api/cars/${id}`),
  }
};
