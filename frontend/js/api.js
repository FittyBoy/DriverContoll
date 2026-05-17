// ── Backend URL ───────────────────────────────────────────────────────────────
// ใช้ relative path ถ้า frontend serve จาก origin เดียวกับ backend
// ถ้า dev (5500/5173) ให้ point ไป localhost:3000
const API = (() => {
  const p = window.location.port;
  if (p === '3000' || window.location.origin.includes(':3000')) return '';   // same origin
  return 'http://localhost:3000';  // dev: frontend on 5500, backend on 3000
})();

// ── Fetch wrapper ─────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  // Session expired → 401
  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    if (data.expired) {
      // soft redirect: close any open modals, then prompt login
      document.querySelectorAll('.modal-overlay.open,.modal-xl-overlay.open')
        .forEach(el => el.classList.remove('open'));
      const loginEl = document.getElementById('loginModal');
      if (loginEl) loginEl.classList.add('open');
      throw new Error('กรุณาเข้าสู่ระบบก่อน');
    }
  }

  if (!res.ok && res.status !== 200) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// ── API methods ───────────────────────────────────────────────────────────────
const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body) => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body) => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)       => apiFetch(path, { method: 'DELETE' }),

  // Auth
  me:       ()                => api.get('/api/me'),
  login:    (email, password) => api.post('/api/login', { email, password }),
  register: (data)            => api.post('/api/register', data),
  logout:   ()                => api.post('/api/logout', {}),

  // Master data
  carTypes: ()       => api.get('/api/cartypes'),
  drivers:  ()       => api.get('/api/drivers'),
  cars:     (typeId) => api.get('/api/cars' + (typeId ? `?typeId=${typeId}` : '')),

  // Bookings
  myBookings:    ()                  => api.get('/api/bookings/my'),
  bookingsByCar: (carId, weekStart)  => api.get(`/api/bookings/car/${carId}${weekStart ? '?weekStart=' + weekStart : ''}`),
  book:          (data)              => api.post('/api/bookings', data),

  // Trips
  trips:     (params) => { const q = new URLSearchParams(params || {}).toString(); return api.get('/api/trips' + (q ? '?' + q : '')); },
  tripDates: ()       => api.get('/api/trips/dates'),

  // Admin
  admin: {
    stats:         ()           => api.get('/api/admin/stats'),
    bookings:      ()           => api.get('/api/admin/bookings'),
    updateBooking: (id, data)   => api.put(`/api/admin/bookings/${id}`, data),
    patchStatus:   (id, status) => api.patch(`/api/admin/bookings/${id}/status`, { status }),
    deleteBooking: (id)         => api.delete(`/api/admin/bookings/${id}`),
    analytics:     (range)      => api.get(`/api/admin/analytics?range=${range||30}`),
    exportSchedule:(weekStart)  => { window.open(API + `/api/admin/export/schedule?weekStart=${weekStart}`, '_blank'); },

    addCarType:    (data)       => api.post('/api/cartypes', data),
    updateCarType: (id, data)   => api.put(`/api/cartypes/${id}`, data),
    deleteCarType: (id)         => api.delete(`/api/cartypes/${id}`),

    addDriver:     (data)       => api.post('/api/drivers', data),
    updateDriver:  (id, data)   => api.put(`/api/drivers/${id}`, data),
    deleteDriver:  (id)         => api.delete(`/api/drivers/${id}`),

    addCar:        (data)       => api.post('/api/cars', data),
    updateCar:     (id, data)   => api.put(`/api/cars/${id}`, data),
    deleteCar:     (id)         => api.delete(`/api/cars/${id}`),

    addTrip:       (data)       => api.post('/api/trips', data),
    updateTrip:    (id, data)   => api.put(`/api/trips/${id}`, data),
    deleteTrip:    (id)         => api.delete(`/api/trips/${id}`),
  }
};
