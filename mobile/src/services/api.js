import axios from 'axios';
import { API_URL } from '../utils/constants';
import StorageService from './storage';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor para adicionar token
api.interceptors.request.use(
  async (config) => {
    const token = await StorageService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor para tratar erros e refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se erro 401 e não é retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await StorageService.getRefreshToken();
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          await StorageService.saveTokens(data.access_token, refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;

          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout
        await StorageService.clearAll();
        // Navigate to login (handled by AuthContext)
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  googleSignIn: (googleToken) => api.post('/auth/google', { token: googleToken }),
};

// User endpoints
export const usersAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  uploadPortfolio: (formData) =>
    api.post('/users/portfolio/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getVideomakers: (params) => api.get('/users/videomakers', { params }),
};

// Jobs endpoints
export const jobsAPI = {
  create: (jobData) => api.post('/jobs', jobData),
  list: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  cancel: (id) => api.delete(`/jobs/${id}`),
};

// Proposals endpoints
export const proposalsAPI = {
  create: (data) => api.post('/proposals', data),
  getByJob: (jobId) => api.get(`/proposals/job/${jobId}`),
  accept: (id) => api.put(`/proposals/${id}/accept`),
  reject: (id) => api.put(`/proposals/${id}/reject`),
  getMyProposals: () => api.get('/proposals/my-proposals'),
};

// Payments endpoints
export const paymentsAPI = {
  hold: (data) => api.post('/payments/hold', data),
  release: (id) => api.post(`/payments/${id}/release`),
  getStatus: (id) => api.get(`/payments/${id}`),
};

// Ratings endpoints
export const ratingsAPI = {
  create: (data) => api.post('/ratings', data),
  getUserRatings: (userId) => api.get(`/ratings/user/${userId}`),
};

// Chat endpoints
export const chatAPI = {
  sendMessage: (data) => api.post('/chat/message', data),
  getMessages: (chatId) => api.get(`/chat/${chatId}/messages`),
  getMyChats: () => api.get('/chat/my-chats'),
  uploadAttachment: (chatId, formData) =>
    api.post(`/chat/attachment?chat_id=${chatId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default api;
