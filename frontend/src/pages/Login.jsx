import React, { useState } from 'react';
import axios from '../api/axios';
import '../styles/Login.css';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  console.log('🔵 Login component loaded');
  console.log('🔵 Backend URL:', axios.defaults.baseURL);

  const handleSubmit = async (e) => {
    console.log('🟢 Form submitted!');
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🟢 Attempting login with:', { username, password: '***' });
    console.log('🟢 Making request to:', axios.defaults.baseURL + '/api/auth/login');

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      console.log('✅ Login response:', response);

      if (response.data.success) {
        console.log('✅ Login successful!');
        // Store token
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

        // Call parent callback
        console.log('✅ Calling onLogin callback');
        onLogin(response.data.user);
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      console.error('❌ Error response:', err.response);
      console.error('❌ Error message:', err.message);
      setError(err.response?.data?.error || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
      console.log('🔵 Login attempt complete');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Athletes First</h1>
          <p>Recruiting Materials Tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="Enter your username"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p className="default-credentials">
            <strong>Default Login:</strong><br />
            Username: <code>admin</code><br />
            Password: <code>admin123</code><br />
            <em>Please change this after first login!</em>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
