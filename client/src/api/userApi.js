import axiosInstance from './axiosInstance.js';

export const getProfile = () => axiosInstance.get('/users/me');

export const updateProfile = (payload) => axiosInstance.put('/users/me', payload);

export const updateSkills = (skills) =>
  axiosInstance.patch('/users/me/skills', { skills });

export const addExperience = (expData) =>
  axiosInstance.post('/users/me/experience', expData);

export const updateExperience = (expId, expData) =>
  axiosInstance.put(`/users/me/experience/${expId}`, expData);

export const deleteExperience = (expId) =>
  axiosInstance.delete(`/users/me/experience/${expId}`);

export const updatePreferences = (prefs) =>
  axiosInstance.patch('/users/me/preferences', prefs);

export const uploadAvatar = (formData) =>
  axiosInstance.patch('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteAvatar = () => axiosInstance.delete('/users/me/avatar');
