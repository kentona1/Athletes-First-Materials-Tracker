import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import '../styles/Agents.css';

function Agents() {
  const [performance, setPerformance] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('performance'); // 'performance' or 'management'
  const [editingAgent, setEditingAgent] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', phone: '', city: '', state: '', address: '', photo_url: '' });
  const [showNewAgentForm, setShowNewAgentForm] = useState(false);
  const [newAgentForm, setNewAgentForm] = useState({ first_name: '', last_name: '', email: '', phone: '', city: '', state: '', address: '', photo_url: '' });

  useEffect(() => {
    fetchAgentsData();
    fetchAllAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgentsData = async () => {
    try {
      const perfRes = await axios.get('/api/agents/performance');
      setPerformance(perfRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching agents data:', error);
      setLoading(false);
    }
  };

  const fetchAllAgents = async () => {
    try {
      // Include inactive agents for management view
      const agentsRes = await axios.get('/api/agents?includeInactive=true');
      setAgents(agentsRes.data.data);
    } catch (error) {
      console.error('Error fetching all agents:', error);
    }
  };

  const handleEditClick = (agent) => {
    setEditingAgent(agent.id);
    setEditForm({
      first_name: agent.first_name || agent.name?.split(' ')[0] || '',
      last_name: agent.last_name || agent.name?.split(' ').slice(1).join(' ') || '',
      email: agent.email || '',
      phone: agent.phone || '',
      city: agent.city || '',
      state: agent.state || '',
      address: agent.address || '',
      photo_url: agent.photo_url || ''
    });
  };

  const handleSaveEdit = async (agentId) => {
    try {
      await axios.put(`/api/agents/${agentId}`, editForm);
      setEditingAgent(null);
      fetchAllAgents();
      fetchAgentsData();
      alert('Agent updated successfully!');
    } catch (error) {
      console.error('Error updating agent:', error);
      alert('Error updating agent');
    }
  };

  const handleCancelEdit = () => {
    setEditingAgent(null);
    setEditForm({ first_name: '', last_name: '', email: '', phone: '', city: '', state: '', address: '', photo_url: '' });
  };

  const handleToggleActive = async (agent) => {
    const newActiveStatus = agent.active ? 0 : 1;
    const action = newActiveStatus ? 'activate' : 'deactivate';

    if (!window.confirm(`Are you sure you want to ${action} ${agent.name}?`)) {
      return;
    }

    try {
      await axios.put(`/api/agents/${agent.id}`, { active: newActiveStatus });
      fetchAllAgents();
      fetchAgentsData();
      alert(`Agent ${action}d successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing agent:`, error);
      alert(`Error ${action}ing agent`);
    }
  };

  const handleCreateAgent = async () => {
    if (!newAgentForm.first_name || !newAgentForm.last_name) {
      alert('First name and last name are required');
      return;
    }

    try {
      await axios.post('/api/agents', newAgentForm);
      setShowNewAgentForm(false);
      setNewAgentForm({ first_name: '', last_name: '', email: '', phone: '', city: '', state: '', address: '', photo_url: '' });
      fetchAllAgents();
      fetchAgentsData();
      alert('Agent created successfully!');
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Error creating agent: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCancelNewAgent = () => {
    setShowNewAgentForm(false);
    setNewAgentForm({ first_name: '', last_name: '', email: '', phone: '', city: '', state: '', address: '', photo_url: '' });
  };

  if (loading) {
    return <div className="loading">Loading agents...</div>;
  }

  return (
    <div className="agents-page">
      <h2>Agents</h2>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
        <button
          className={`tab ${activeTab === 'management' ? 'active' : ''}`}
          onClick={() => setActiveTab('management')}
        >
          Management
        </button>
      </div>

      {activeTab === 'performance' && (
        <div className="agents-table">
          <h3>Agent Performance</h3>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Total Players</th>
                <th>Signed</th>
                <th>Not Signed</th>
                <th>Returned</th>
                <th>Materials</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((agent, idx) => (
                <tr key={idx}>
                  <td>
                    <Link to={`/agents/${agent.agent_id}`} className="agent-link">
                      <strong>{agent.agent}</strong>
                    </Link>
                  </td>
                  <td>{agent.total_players}</td>
                  <td className="success-text">{agent.signed}</td>
                  <td>{agent.not_signed}</td>
                  <td>{agent.returned}</td>
                  <td>{agent.total_materials}</td>
                  <td>
                    <span className="conversion-rate">
                      {agent.conversion_rate ? `${agent.conversion_rate}%` : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'management' && (
        <div className="agents-management">
          <div className="management-header">
            <h3>Manage Agents</h3>
            {!showNewAgentForm && (
              <button onClick={() => setShowNewAgentForm(true)} className="btn btn-success">
                + Add New Agent
              </button>
            )}
          </div>
          <div className="agents-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* New Agent Form Row */}
                {showNewAgentForm && (
                  <tr className="new-agent-row">
                    <td>
                      <div className="name-inputs">
                        <input
                          type="text"
                          value={newAgentForm.first_name}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, first_name: e.target.value })}
                          className="edit-input"
                          placeholder="First *"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={newAgentForm.last_name}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, last_name: e.target.value })}
                          className="edit-input"
                          placeholder="Last *"
                        />
                      </div>
                    </td>
                    <td>
                      <div className="location-inputs">
                        <input
                          type="text"
                          value={newAgentForm.city}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, city: e.target.value })}
                          className="edit-input"
                          placeholder="City"
                        />
                        <input
                          type="text"
                          value={newAgentForm.state}
                          onChange={(e) => setNewAgentForm({ ...newAgentForm, state: e.target.value })}
                          className="edit-input"
                          placeholder="State"
                          style={{ width: '60px' }}
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        type="email"
                        value={newAgentForm.email}
                        onChange={(e) => setNewAgentForm({ ...newAgentForm, email: e.target.value })}
                        className="edit-input"
                        placeholder="Email"
                      />
                    </td>
                    <td>
                      <input
                        type="tel"
                        value={newAgentForm.phone}
                        onChange={(e) => setNewAgentForm({ ...newAgentForm, phone: e.target.value })}
                        className="edit-input"
                        placeholder="Phone"
                      />
                    </td>
                    <td>
                      <span className="status-badge active">New</span>
                    </td>
                    <td>
                      <button
                        onClick={handleCreateAgent}
                        className="btn-small btn-success"
                        style={{ marginRight: '5px' }}
                      >
                        Create
                      </button>
                      <button
                        onClick={handleCancelNewAgent}
                        className="btn-small btn-secondary"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                )}
                {agents.map((agent) => (
                  <tr key={agent.id} className={!agent.active ? 'inactive-row' : ''}>
                    {editingAgent === agent.id ? (
                      <>
                        <td>
                          <div className="name-inputs">
                            <input
                              type="text"
                              value={editForm.first_name}
                              onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                              className="edit-input"
                              placeholder="First"
                            />
                            <input
                              type="text"
                              value={editForm.last_name}
                              onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                              className="edit-input"
                              placeholder="Last"
                            />
                          </div>
                        </td>
                        <td>
                          <div className="location-inputs">
                            <input
                              type="text"
                              value={editForm.city}
                              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                              className="edit-input"
                              placeholder="City"
                            />
                            <input
                              type="text"
                              value={editForm.state}
                              onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                              className="edit-input"
                              placeholder="State"
                              style={{ width: '60px' }}
                            />
                          </div>
                        </td>
                        <td>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="edit-input"
                          />
                        </td>
                        <td>
                          <span className={`status-badge ${agent.active ? 'active' : 'inactive'}`}>
                            {agent.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleSaveEdit(agent.id)}
                            className="btn-small btn-primary"
                            style={{ marginRight: '5px' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn-small btn-secondary"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <Link to={`/agents/${agent.id}`} className="agent-link">
                            <strong>{agent.name || `${agent.first_name} ${agent.last_name}`}</strong>
                          </Link>
                        </td>
                        <td>{[agent.city, agent.state].filter(Boolean).join(', ') || '-'}</td>
                        <td>{agent.email || '-'}</td>
                        <td>{agent.phone || '-'}</td>
                        <td>
                          <span className={`status-badge ${agent.active ? 'active' : 'inactive'}`}>
                            {agent.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleEditClick(agent)}
                            className="btn-small btn-primary"
                            style={{ marginRight: '5px' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(agent)}
                            className={`btn-small ${agent.active ? 'btn-warning' : 'btn-success'}`}
                          >
                            {agent.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Agents;
