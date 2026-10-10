import axios from 'axios';
import API from '../utils/api';

// Delivery partners have their OWN token (separate from the customer login)
const KEY = 'deliveryToken';
export const tokenStore = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(KEY, t); } catch { /* ignore */ } },
  clear: () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
};

const base = (API?.defaults?.baseURL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const D = axios.create({ baseURL: `${base}/delivery` });

D.interceptors.request.use((cfg) => {
  const t = tokenStore.get();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

D.interceptors.response.use(
  (r) => r,
  (err) => {
    const hadToken = !!tokenStore.get();
    if (err.response?.status === 401 && hadToken && !err.config?.url?.includes('/login')) {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/delivery/login')) window.location.assign('/delivery/login');
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e, fallback = 'Something went wrong') => e?.response?.data?.message || fallback;

export const dv = {
  login: (b) => D.post('/login', b).then((r) => r.data),
  register: (b) => D.post('/register', b).then((r) => r.data),
  me: () => D.get('/me').then((r) => r.data.partner),
  updateMe: (b) => D.put('/me', b).then((r) => r.data),
  updatePassword: (b) => D.put('/password', b).then((r) => r.data),
  setAvailability: (isAvailable) => D.put('/availability', { isAvailable }).then((r) => r.data),
  stats: () => D.get('/stats').then((r) => r.data),
  orders: (status) => D.get('/orders', { params: { status } }).then((r) => r.data.orders),
  pickup: (id) => D.put(`/orders/${id}/pickup`).then((r) => r.data),
  outForDelivery: (id) => D.put(`/orders/${id}/out-for-delivery`).then((r) => r.data),
  resendOtp: (id) => D.post(`/orders/${id}/resend-otp`).then((r) => r.data),
  deliver: (id, otp) => D.put(`/orders/${id}/deliver`, { otp }).then((r) => r.data),
  fail: (id, reason) => D.put(`/orders/${id}/fail`, { reason }).then((r) => r.data),
};
