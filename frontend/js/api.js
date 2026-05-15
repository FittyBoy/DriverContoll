const API = 'http://localhost:3000';

// ── Fetch interceptor ────────────────────────────────────────────────────────
// Patches window.fetch so that any relative /api/ call in inline scripts
// automatically gets the correct base URL and credentials: 'include'.
(function () {
  const _fetch = window.fetch.bind(window);
  window.fetch = function (url, opts = {}) {
    if (typeof url === 'string' && url.startsWith('/api/')) {
      url = API + url;
      opts = { credentials: 'include', ...opts };
    }
    return _fetch(url, opts);
  };
})();

// ── Typed API client (used by pages that import api.js explicitly) ───────────
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  return res.json();
}

const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body) => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)       => apiFetch(path, { method: 'DELETE' }),

  me:       ()                => api.get('/api/me'),
  login:    (email, password) => api.post('/api/login', { email, password }),
  register: (data)            => api.post('/api/register', data),
  logout:   ()                => api.post('/api/logout', {}),

  carTypes: ()          => api.get('/api/cartypes'),
  drivers:  ()          => api.get('/api/drivers'),
  cars:     (typeId)    => api.get('/api/cars' + (typeId ? `?typeId=${typeId}` : '')),

  myBookings:    ()     => api.get('/api/bookings/my'),
  bookingsByCar: (carId, weekStart) =>
    api.get(`/api/bookings/car/${carId}${weekStart ? '?weekStart='+weekStart : ''}`),
  book: (data)          => api.post('/api/bookings', data),

  admin: {
    stats:         ()         => api.get('/api/admin/stats'),
    bookings:      ()         => api.get('/api/admin/bookings'),
    updateBooking: (id, data) => api.put(`/api/admin/bookings/${id}`, data),
    deleteBooking: (id)       => api.delete(`/api/admin/bookings/${id}`),
    addCarType:    (data)     => api.post('/api/cartypes', data),
    updateCarType: (id, data) => api.put(`/api/cartypes/${id}`, data),
    deleteCarType: (id)       => api.delete(`/api/cartypes/${id}`),
    addDriver:     (data)     => api.post('/api/drivers', data),
    updateDriver:  (id, data) => api.put(`/api/drivers/${id}`, data),
    deleteDriver:  (id)       => api.delete(`/api/drivers/${id}`),
    addCar:        (data)     => api.post('/api/cars', data),
    updateCar:     (id, data) => api.put(`/api/cars/${id}`, data),
    deleteCar:     (id)       => api.delete(`/api/cars/${id}`),
  }
};
