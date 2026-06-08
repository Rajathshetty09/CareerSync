import api from './axiosInstance.js';

// Credentials
export const saveCredentials  = (data)          => api.post('/automation/credentials', data);
export const getCredentials   = (portal)        => api.get(`/automation/credentials/${portal}`);
export const deleteCredentials = (portal)       => api.delete(`/automation/credentials/${portal}`);
export const testLogin        = (portal)        => api.post('/automation/test-login', { portal });

// Trigger
export const triggerAutoApply = (data)          => api.post('/automation/trigger', data);

// History
export const getRunHistory    = (params = {})   => api.get('/automation/runs', { params });
export const getRunProgress   = (id)            => api.get(`/automation/runs/${id}/progress`);
export const getRunById       = (id)            => api.get(`/automation/runs/${id}`);
export const cancelRun        = (id)            => api.patch(`/automation/runs/${id}/cancel`);
