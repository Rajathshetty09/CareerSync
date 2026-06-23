import axios from 'axios';
import store from '../app/store.js';
import { setCredentials, clearCredentials } from '../features/auth/authSlice.js';

const axiosInstance = axios.create({
  baseURL: 'http://54.198.178.77:5000/api/v1',
  withCredentials: true, // send refresh token cookie automatically
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token on every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Silently refresh the access token when the API responds with 401
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token)));
  refreshQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Never intercept the refresh endpoint itself — prevents infinite reload loop
    if (original?.url?.includes('refresh-token')) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(original);
        })
        .catch(Promise.reject);
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/refresh-token`,
        {},
        { withCredentials: true },
      );

      const { accessToken, user } = data.data;
      store.dispatch(setCredentials({ user, accessToken }));
      processQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return axiosInstance(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      store.dispatch(clearCredentials());
      // Let ProtectedRoute's <Navigate to="/login"> handle redirection via React Router
      // — do NOT use window.location.href here, which causes a full-page reload loop
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
