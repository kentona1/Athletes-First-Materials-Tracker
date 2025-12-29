import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import './styles/App.css';

// Import pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PlayersList from './pages/PlayersList';
import PlayerDetail from './pages/PlayerDetail';
import AddPlayer from './pages/AddPlayer';
import Analytics from './pages/Analytics';
import Materials from './pages/Materials';
import Agents from './pages/Agents';
import UserManagement from './pages/UserManagement';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>Athletes First</h1>
            <span className="nav-subtitle">Recruiting Tracker</span>
          </div>
          <ul className="nav-links">
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/players">Players</Link></li>
            <li><Link to="/materials">Materials</Link></li>
            <li><Link to="/agents">Agents</Link></li>
            <li><Link to="/analytics">Analytics</Link></li>
            {user.role === 'admin' && (
              <li><Link to="/users">Users</Link></li>
            )}
          </ul>
          <div className="nav-user">
            <span className="user-name">{user.username}</span>
            <span className="user-role">({user.role})</span>
            <button onClick={handleLogout} className="btn btn-small btn-secondary">
              Logout
            </button>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/players" element={<PlayersList />} />
            <Route path="/players/new" element={<AddPlayer />} />
            <Route path="/players/:id" element={<PlayerDetail />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/analytics" element={<Analytics />} />
            {user.role === 'admin' && (
              <Route path="/users" element={<UserManagement />} />
            )}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
