// API Configuration
// In development: uses proxy from package.json
// In production: uses REACT_APP_API_URL environment variable

export const API_URL = process.env.REACT_APP_API_URL || '';

// For development, the proxy in package.json handles the API calls
// For production on Railway, set REACT_APP_API_URL to your backend URL
// Example: REACT_APP_API_URL=https://your-backend-abc123.up.railway.app

export default API_URL;
