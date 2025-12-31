import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import '../styles/Agents.css';

function Agents() {
  const [performance, setPerformance] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('performance'); // 'performance' or 'management'
  const [editingAgent, setEditingAgent] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });

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
      const agentsRes = await axios.get('/api/agents');
      setAgents(agentsRes.data.data);
    } catch (error) {
      console.error('Error fetching all agents:', error);
    }
  };

  const handleEditClick = (agent) => {
    setEditingAgent(agent.id);
    setEditForm({
      name: agent.name,
      email: agent.email || '',
      phone: agent.phone || ''
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
    setEditForm({ name: '', email: '', phone: '' });
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
                <th>Missed</th>
                <th>Walked Away</th>
                <th>Returned</th>
                <th>No Meeting</th>
                <th>Materials</th>
                <th>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((agent, idx) => (
                <tr key={idx}>
                  <td><strong>{agent.agent}</strong></td>
                  <td>{agent.total_players}</td>
                  <td className="success-text">{agent.signed}</td>
                  <td>{agent.missed}</td>
                  <td>{agent.walked_away}</td>
                  <td>{agent.returned}</td>
                  <td>{agent.no_meeting}</td>
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
          <h3>Manage Agents</h3>
          <div className="agents-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className={!agent.active ? 'inactive-row' : ''}>
                    {editingAgent === agent.id ? (
                      <>
                        <td>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="edit-input"
                          />
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
                        <td><strong>{agent.name}</strong></td>
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
