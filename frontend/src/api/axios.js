import axios from 'axios';

// Configure axios with the backend URL
let API_URL = process.env.REACT_APP_API_URL || 'https://athletes-first-materials-tracker-back-end.up.railway.app';

// Ensure URL has protocol
if (API_URL && !API_URL.startsWith('http://') && !API_URL.startsWith('https://')) {
  API_URL = 'https://' + API_URL;
}

console.log('🔧 Configured API URL:', API_URL);

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Add token to requests if it exists
axiosInstance.interceptors.request.use(
  (config) => {
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

export default axiosInstance;
