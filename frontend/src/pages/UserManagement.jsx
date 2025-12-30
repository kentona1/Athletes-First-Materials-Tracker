import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import '../styles/UserManagement.css';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'viewer',
    agentId: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchAgents();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/auth/users');
      setUsers(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await axios.get('/api/agents');
      setAgents(response.data.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/register', formData);
      alert('User created successfully!');
      setShowForm(false);
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'viewer',
        agentId: ''
      });
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Error creating user');
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      await axios.delete(`/api/auth/users/${userId}`);
      alert('User deactivated');
      fetchUsers();
    } catch (error) {
      alert('Error deactivating user');
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'role-badge-admin',
      agent: 'role-badge-agent',
      viewer: 'role-badge-viewer'
    };
    return badges[role] || 'role-badge-viewer';
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <h2>User Management</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? 'Cancel' : '+ Add New User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-row">
            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                minLength="8"
              />
              <small>Minimum 8 characters</small>
            </div>

            <div className="form-group">
              <label>Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                required
              >
                <option value="viewer">Viewer (Read-only)</option>
                <option value="agent">Agent (Can edit their players)</option>
                <option value="admin">Admin (Full access)</option>
              </select>
            </div>
          </div>

          {formData.role === 'agent' && (
            <div className="form-group">
              <label>Link to Agent</label>
              <select
                value={formData.agentId}
                onChange={(e) => setFormData({...formData, agentId: e.target.value})}
              >
                <option value="">Select agent...</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary">
            Create User
          </button>
        </form>
      )}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Linked Agent</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={!user.active ? 'inactive-user' : ''}>
                <td><strong>{user.username}</strong></td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.agent_name || '-'}</td>
                <td>
                  <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  {user.last_login 
                    ? new Date(user.last_login).toLocaleDateString()
                    : 'Never'
                  }
                </td>
                <td>
                  {user.active && user.username !== 'admin' && (
                    <button
                      onClick={() => handleDeactivate(user.id)}
                      className="btn-small btn-danger"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="role-descriptions">
        <h3>Role Descriptions</h3>
        <div className="role-cards">
          <div className="role-card">
            <h4>👁️ Viewer</h4>
            <p>Can view all data but cannot make any changes.</p>
          </div>
          <div className="role-card">
            <h4>🎯 Agent</h4>
            <p>Can add/edit players and materials for their assigned prospects.</p>
          </div>
          <div className="role-card">
            <h4>⚡ Admin</h4>
            <p>Full access to all features including user management.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
