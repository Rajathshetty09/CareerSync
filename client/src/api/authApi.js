import axiosInstance from './axiosInstance.js';

export const registerUser = (payload) => axiosInstance.post('/auth/register', payload);
export const loginUser = (credentials) => axiosInstance.post('/auth/login', credentials);
export const logoutUser = () => axiosInstance.post('/auth/logout');
export const refreshTokenApi = () => axiosInstance.post('/auth/refresh-token');
export const verifyEmail = (token) => axiosInstance.get(`/auth/verify-email?token=${token}`);
export const resendVerification = (email) =>
  axiosInstance.post('/auth/resend-verification', { email });
