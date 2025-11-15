import axios from 'axios';

// Dynamically determine API URL based on current hostname
// This function runs at runtime in the browser, not at build time
const getApiUrl = () => {
  // If running in browser, detect the hostname and use it for API
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = '5000';
    
    // If accessing via IP address (not localhost), use that IP for API
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const apiUrl = `http://${hostname}:${port}/api`;
      console.log('🌐 Using API URL:', apiUrl);
      return apiUrl;
    }
  }
  
  // Check if we have an explicit API URL in environment (for build time)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Default fallback
  const defaultUrl = 'http://localhost:5000/api';
  console.log('🌐 Using default API URL:', defaultUrl);
  return defaultUrl;
};

// Create axios instance with dynamic baseURL
const api = axios.create({
  baseURL: typeof window !== 'undefined' ? getApiUrl() : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: dynamically set API URL and add auth token
api.interceptors.request.use(
  (config) => {
    // Recalculate API URL on each request to handle dynamic hostname changes
    // This ensures it works when accessing from different machines
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const port = '5000';
      
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        config.baseURL = `http://${hostname}:${port}/api`;
        console.log('🌐 API Request to:', config.baseURL + config.url);
      } else {
        config.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      }
    }
    
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';// Redirect to home page
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/me', profileData),
  changePassword: (passwordData) => api.put('/auth/password', passwordData),
};

// Requests API
export const requestsAPI = {
  create: (requestData) => api.post('/requests', requestData),
  getAll: () => api.get('/requests'),
  getById: (id) => api.get(`/requests/${id}`),
  assign: (id, assignmentData) => api.put(`/requests/${id}/assign`, assignmentData),
  addResponse: (id, responseData) => api.put(`/requests/${id}/response`, responseData),
  updateStatus: (id, status) => api.put(`/requests/${id}/status`, { status }),
  // --- NEW: Client marks as complete ---
  markClientComplete: (id) => api.put(`/requests/${id}/complete-by-client`),
  // --- NEW: Installer endpoints ---
  scheduleInstallation: (id, data) => api.put(`/requests/${id}/schedule-installation`, data),
  updateInstallationProgress: (id, data) => api.put(`/requests/${id}/installation-progress`, data),
  completeInstallation: (id, data) => api.put(`/requests/${id}/complete-installation`, data),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Admin API
export const adminAPI = {
  getDevices: (params = {}) => api.get('/admin/devices', { params }),
  getDevice: (id) => api.get(`/admin/devices/${id}`),
  createDevice: (deviceData) => api.post('/admin/devices', deviceData),
  updateDevice: (id, deviceData) => api.put(`/admin/devices/${id}`, deviceData),
  deleteDevice: (id) => api.delete(`/admin/devices/${id}`),
  seedDevices: () => api.post('/admin/devices/seed'),
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getStats: () => api.get('/admin/stats'),
};

// Designs API
export const designsAPI = {
  generate: (requestId) => api.post(`/designs/generate/${requestId}`),
  getById: (id) => api.get(`/designs/${id}`),
  getByRequest: (requestId) => api.get(`/designs/request/${requestId}`),
  submitForReview: (id) => api.put(`/designs/submit/${id}`), // Designer Submits
  adminApprove: (id, notes) => api.put(`/designs/admin-approve/${id}`, { designNotes: notes }),
}; // Admin Approves
  // --------------------------------};

export default api;
