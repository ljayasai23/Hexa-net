import axios from 'axios';

// --- CONFIGURATION ---
// Base URL for the API. 
// In production (Vercel), this is set to https://hexa-net.onrender.com
// via the NEXT_PUBLIC_API_URL environment variable.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// --- REMOVED: getApiUrl function and dynamic hostname/port logic. ---
// This prevents the incorrect construction of: http://hexa-net.vercel.app:5000

// Create axios instance with the resolved baseURL
const api = axios.create({
  // Append '/api' to the BASE_URL from the environment variable 
  // (e.g., https://hexa-net.onrender.com/api)
  baseURL: `${BASE_URL}/api`, 
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🌐 Axios Base URL set to:', api.defaults.baseURL);

// Request interceptor: Add auth token
api.interceptors.request.use(
  (config) => {
    // Note: Since we are using a static BASE_URL, we don't need to recalculate 
    // it here, only add the token.

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
      // Redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/'; 
      }
    }
    return Promise.reject(error);
  }
);

// --- API ENDPOINTS (No changes needed below here) ---

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
  deleteDevice: (id) => api.delete('/admin/devices/${id}'),
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

export default api;
