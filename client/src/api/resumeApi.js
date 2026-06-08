import axiosInstance from './axiosInstance.js';

export const fetchResumes = () => axiosInstance.get('/resumes');

export const fetchResumeById = (id) => axiosInstance.get(`/resumes/${id}`);

export const uploadResume = (formData, onProgress) =>
  axiosInstance.post('/resumes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });

export const deleteResume = (id) => axiosInstance.delete(`/resumes/${id}`);

export const setDefaultResume = (id) => axiosInstance.patch(`/resumes/${id}/default`);
