import axios from 'axios';

// --- CONFIGURATION ---
// Base URL for the API. 
// In production (Vercel), this is set to https://hexa-net.onrender.com
// via the NEXT_PUBLIC_API_URL environment variable.
// For local development, dynamically detect the backend URL based on current hostname
const getBaseURL = () => {
  // Check for environment variable (available at build time in Next.js)
  // In production (Vercel), this will be set to https://hexa-net.onrender.com/api
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envApiUrl) {
    // Remove /api suffix if present (we add it later)
    return envApiUrl.replace(/\/api$/, '');
  }
  
  // For client-side (browser), detect the current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If accessing from localhost, use localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    
    // If accessing from Vercel domain, this shouldn't happen (env var should be set)
    // But if it does, we can't use localhost, so we'd need the Render URL
    if (hostname.includes('vercel.app')) {
      // Fallback to Render backend if env var wasn't set
      return 'https://hexa-net.onrender.com';
    }
    
    // For local network access (e.g., 192.168.43.26), use the same hostname with port 5000
    // This works when accessing from another device on the same WiFi
    return `http://${hostname}:5000`;
  }
  
  // For server-side rendering, default to localhost
  return 'http://localhost:5000';
};

const BASE_URL = getBaseURL();

// Create axios instance with the resolved baseURL
const api = axios.create({
  // Append '/api' to the BASE_URL from the environment variable 
  // (e.g., https://hexa-net.onrender.com/api)
  baseURL: `${BASE_URL}/api`, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log initial base URL (this is set at module load, may be overridden by interceptor)
if (typeof window !== 'undefined') {
  console.log('🌐 Initial Axios Base URL:', api.defaults.baseURL);
  console.log('🌐 Current hostname:', window.location.hostname);
  console.log('🌐 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || 'not set');
}

// Request interceptor: Add auth token and dynamically set baseURL
api.interceptors.request.use(
  (config) => {
    // Always recalculate baseURL for each request to handle different scenarios
    if (typeof window !== 'undefined') {
      const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
      const hostname = window.location.hostname;
      let finalBaseURL;
      
      // Priority 1: If environment variable is set (production/Vercel), use it
      if (envApiUrl) {
        finalBaseURL = envApiUrl.includes('/api') ? envApiUrl : `${envApiUrl}/api`;
        console.log('🔵 Using production API URL from env:', finalBaseURL);
      } 
      // Priority 2: Check if we're on Vercel domain (fallback)
      else if (hostname.includes('vercel.app')) {
        finalBaseURL = 'https://hexa-net.onrender.com/api';
        console.log('🟡 Using Render backend (Vercel fallback):', finalBaseURL);
      }
      // Priority 3: Local development - detect based on hostname
      else {
        let backendURL;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          backendURL = 'http://localhost:5000';
        } else {
          // Check if hostname is a local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
          const isLocalNetworkIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
          
          if (isLocalNetworkIP) {
            // When accessing from another device on the same network (e.g., Windows at 192.168.43.4),
            // the hostname will be the client's IP, not the server's IP.
            // We need to use the server's IP (192.168.43.26) instead.
            // Try to detect the server IP from the URL or use a known server IP
            const serverIP = '192.168.43.26'; // Your Kali machine IP
            backendURL = `http://${serverIP}:5000`;
            console.log('🟡 Detected local network access from', hostname, '- using server IP:', serverIP);
          } else {
            // For other cases, use the hostname as-is
            backendURL = `http://${hostname}:5000`;
          }
        }
        
        finalBaseURL = `${backendURL}/api`;
        console.log('🟢 Using local network API URL:', finalBaseURL, '(hostname:', hostname + ')');
      }
      
      config.baseURL = finalBaseURL;
    }

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
  verifyInstallation: (id, data) => api.put(`/requests/${id}/verify-installation`, data),
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
