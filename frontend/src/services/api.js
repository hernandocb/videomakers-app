import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado, tentar refresh
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          localStorage.setItem('access_token', data.access_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(error.config);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/admin/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getConfig: () => api.get('/admin/config'),
  updateConfig: (config) => api.put('/admin/config', config),
  getUsers: (params) => api.get('/admin/users', { params }),
  banUser: (userId, reason) => api.put(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId) => api.put(`/admin/users/${userId}/unban`),
  verifyUser: (userId) => api.put(`/admin/users/${userId}/verify`),
  getJobs: (params) => api.get('/admin/jobs', { params }),
  getPayments: (params) => api.get('/admin/payments', { params }),
  getModerationLogs: (params) => api.get('/admin/moderation-logs', { params }),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

// Users
export const usersAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  getVideomakers: (params) => api.get('/users/videomakers', { params }),
};

// Jobs
export const jobsAPI = {
  create: (jobData) => api.post('/jobs', jobData),
  list: (params) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  cancel: (id) => api.delete(`/jobs/${id}`),
};

// Proposals
export const proposalsAPI = {
  create: (data) => api.post('/proposals', data),
  getByJob: (jobId) => api.get(`/proposals/job/${jobId}`),
  accept: (id) => api.put(`/proposals/${id}/accept`),
  reject: (id) => api.put(`/proposals/${id}/reject`),
  getMyProposals: () => api.get('/proposals/my-proposals'),
};

// Payments
export const paymentsAPI = {
  hold: (data) => api.post('/payments/hold', data),
  release: (id) => api.post(`/payments/${id}/release`),
  refund: (id) => api.post(`/payments/${id}/refund`),
  getStatus: (id) => api.get(`/payments/${id}`),
};

// Ratings
export const ratingsAPI = {
  create: (data) => api.post('/ratings', data),
  getUserRatings: (userId) => api.get(`/ratings/user/${userId}`),
  getJobRatings: (jobId) => api.get(`/ratings/job/${jobId}`),
};

export default api;
