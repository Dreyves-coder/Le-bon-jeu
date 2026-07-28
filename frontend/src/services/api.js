import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    if (error.response?.status === 401 && requestUrl.includes('/admin/') && !requestUrl.includes('/admin/login')) {
      if (window.location.pathname !== '/admin/login') window.location.assign('/admin/login');
    }
    return Promise.reject(error);
  },
);

export default api;
