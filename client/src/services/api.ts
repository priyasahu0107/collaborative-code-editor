import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiError } from '../types';

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  withCredentials: true, // Required for cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      // Server responded with error
      const apiError = error.response.data;
      
      // Handle 401 Unauthorized - redirect to login
      if (error.response.status === 401) {
        // Check if we're not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      
      return Promise.reject(apiError || {
        success: false,
        message: 'An error occurred',
        error: {
          code: 'UNKNOWN_ERROR',
          statusCode: error.response.status,
        },
      });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        success: false,
        message: 'Network error. Please check your connection.',
        error: {
          code: 'NETWORK_ERROR',
          statusCode: 0,
        },
      });
    } else {
      // Something else happened
      return Promise.reject({
        success: false,
        message: error.message || 'An unexpected error occurred',
        error: {
          code: 'UNKNOWN_ERROR',
          statusCode: 0,
        },
      });
    }
  }
);

export default api;
