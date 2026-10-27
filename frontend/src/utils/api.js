import axios from 'axios';
import { getUnlockToken, lockAdminPanel } from './adminUnlock';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
});

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Admin panel unlock token (valid ho tabhi)
    const unlock = getUnlockToken();
    if (unlock) {
      config.headers['X-Admin-Unlock'] = unlock;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    // Server ne kaha panel locked hai (token expire ho gaya ya galat hai): gate dobara dikhao
    if (error.response?.status === 403 && error.response?.data?.code === 'ADMIN_LOCKED') {
      lockAdminPanel();
    }
    return Promise.reject(error);
  }
);

export default API;
