import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Helps with CORS
  },
  withCredentials: true, // Important for CORS with credentials
  timeout: 10000, // 10 second timeout
});

// Enhanced request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    console.log("TOKEN", token);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug logging
    console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error:`, {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized - redirecting to login');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
};

export const dronesAPI = {
  // FIXED: Consistent URL patterns (no trailing slashes)
  getDrones: () => api.get('/drones/'),
  getDrone: (id) => api.get(`/drones/${id}/`),
  createDrone: (data) => api.post('/drones/', data),
  updateDrone: (id, data) => api.put(`/drones/${id}/`, data),
  deleteDrone: (id) => api.delete(`/drones/${id}/`),
  getStats: () => api.get('/drones/stats/'),
};

export const missionsAPI = {
  getMissions: () => api.get('/missions/'),
  getMission: (id) => api.get(`/missions/${id}/`),
  createMission: (data) => api.post('/missions/', data),
  startMission: (id) => api.post(`/missions/${id}/start/`),
  pauseMission: (id) => api.post(`/missions/${id}/pause/`),
  resumeMission: (id) => api.post(`/missions/${id}/resume/`),
  abortMission: (id) => api.post(`/missions/${id}/abort/`),
  updateProgress: (id, data) => api.put(`/missions/${id}/progress/`, data),
  getStats: () => api.get('/missions/stats/'),
};

export default api;
