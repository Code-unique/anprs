import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

// Create axios instance with better configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    })
    
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please try again.'
    } else if (!error.response) {
      error.message = 'Network error. Please check your connection.'
    } else if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    } else if (error.response?.status === 403) {
      error.message = 'You do not have permission to access this resource.'
    } else if (error.response?.status === 404) {
      error.message = 'Resource not found.'
    } else if (error.response?.status >= 500) {
      error.message = 'Server error. Please try again later.'
    }
    
    // Use server error message if available
    if (error.response?.data?.detail) {
      error.message = error.response.data.detail
    } else if (error.response?.data?.error) {
      error.message = error.response.data.error
    }
    
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', null, {
      params: { username, password }
    }).then(res => res.data),

  register: (userData: any) =>
    api.post('/auth/register', userData).then(res => res.data),

  getCurrentUser: () =>
    api.get('/auth/me').then(res => res.data),

  logout: () =>
    api.post('/auth/logout').then(res => res.data)
}

// Scan API
export const scanApi = {
  scanImage: (file: File, cameraId?: string, location?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (cameraId) formData.append('camera_id', cameraId)
    if (location) formData.append('location', location)

    return api.post('/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data)
  },

  getScans: (params?: any) =>
    api.get('/scans', { params }).then(res => res.data),

  getScan: (id: number) =>
    api.get(`/scans/${id}`).then(res => res.data),

  getStats: () =>
    api.get('/stats').then(res => res.data),

  validatePlate: (plate: string) =>
    api.post('/validate', { plate }).then(res => res.data),

  updateScan: (id: number, data: any) =>
    api.put(`/scans/${id}`, data).then(res => res.data),

  deleteScan: (id: number) =>
    api.delete(`/scans/${id}`).then(res => res.data),

  batchScan: (files: File[], cameraId?: string) => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })
    
    if (cameraId) formData.append('camera_id', cameraId)

    return api.post('/batch-scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data)
  },

  exportCSV: (params?: any) =>
    api.get('/export/csv', { 
      params, 
      responseType: 'blob' 
    }),
}

// Blacklist API
export const blacklistApi = {
  addToBlacklist: (plateNumber: string, reason?: string) =>
    api.post('/blacklist', { plate_number: plateNumber, reason }).then(res => res.data),

  getBlacklist: (params?: any) =>
    api.get('/blacklist', { params }).then(res => res.data),

  removeFromBlacklist: (id: number) =>
    api.delete(`/blacklist/${id}`).then(res => res.data)
}

// Users API
export const usersApi = {
  getUsers: (params?: any) =>
    api.get('/users', { params }).then(res => res.data),

  updateUser: (id: number, data: any) =>
    api.put(`/users/${id}`, data).then(res => res.data),

  deleteUser: (id: number) =>
    api.delete(`/users/${id}`).then(res => res.data)
}

export default api