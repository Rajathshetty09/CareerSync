import api from './axiosInstance.js';

export const fetchApplications = (params) =>
  api.get('/applications', { params });

export const fetchApplicationById = (id) =>
  api.get(`/applications/${id}`);

export const createApplication = (data) =>
  api.post('/applications', data);

export const updateApplication = (id, data) =>
  api.patch(`/applications/${id}`, data);

export const deleteApplication = (id) =>
  api.delete(`/applications/${id}`);

export const fetchApplicationStats = () =>
  api.get('/applications/stats');
