import api from './axiosInstance.js';
export const fetchAnalytics = () => api.get('/analytics');
