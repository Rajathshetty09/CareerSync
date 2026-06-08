import axiosInstance from './axiosInstance.js';

export const searchJobs = (params) => axiosInstance.get('/jobs', { params });
export const getJobById = (id) => axiosInstance.get(`/jobs/${id}`);
export const getSavedJobs = (params) => axiosInstance.get('/jobs/saved', { params });
export const getSavedJobIds = () => axiosInstance.get('/jobs/saved/ids');
export const saveJob = (jobId) => axiosInstance.post('/jobs/save', { jobId });
export const unsaveJob = (jobId) => axiosInstance.delete(`/jobs/save/${jobId}`);
