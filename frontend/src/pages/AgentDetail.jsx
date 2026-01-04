import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axios';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/AgentDetail.css';

const COLORS = ['#28a745', '#dc3545', '#17a2b8', '#ffc107', '#6f42c1', '#fd7e14'];

function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAgentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAgentData = async () => {
    try {
      const response = await axios.get(`/api/agents/${id}`);
      setAgent(response.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching agent:', err);
      setError('Agent not found');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading agent details...</div>;
  }

  if (error || !agent) {
    return <div className="error">{error || 'Agent not found'}</div>;
  }

  const stats = agent.stats || {};
  const conversionRate = stats.total_players > 0
    ? ((stats.signed / stats.total_players) * 100).toFixed(1)
    : 0;

  const outcomeData = [
    { name: 'Signed', value: stats.signed || 0 },
    { name: 'Not Signed', value: stats.not_signed || 0 },
    { name: 'Active', value: stats.active || 0 }
  ].filter(item => item.value > 0);

  return (
    <div className="agent-detail">
      {/* Agent Header with Contact Card */}
      <div className="agent-header">
        <div className="agent-profile">
          <div className="agent-photo">
            {agent.photo_url ? (
              <img src={agent.photo_url} alt={agent.name} />
            ) : (
              <div className="photo-placeholder">
                <span>{agent.name?.split(' ').map(n => n[0]).join('') || 'A'}</span>
              </div>
            )}
          </div>
          <div className="agent-info">
            <h1>{agent.name}</h1>
            {(agent.city || agent.state) && (
              <p className="agent-location">
                <span className="location-icon">📍</span>
                {[agent.city, agent.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="contact-card">
          <h3>Contact Information</h3>
          <div className="contact-details">
            {agent.email && (
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <a href={`mailto:${agent.email}`}>{agent.email}</a>
              </div>
            )}
            {agent.phone && (
              <div className="contact-item">
                <span className="contact-icon">📱</span>
                <a href={`tel:${agent.phone}`}>{agent.phone}</a>
              </div>
            )}
            {agent.address && (
              <div className="contact-item">
                <span className="contact-icon">🏠</span>
                <span>{agent.address}</span>
              </div>
            )}
            {!agent.email && !agent.phone && !agent.address && (
              <p className="no-contact">No contact information available</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-summary">
        <div className="stat-card total">
          <h3>Total Players</h3>
          <p className="stat-number">{stats.total_players || 0}</p>
        </div>
        <div className="stat-card signed">
          <h3>Signed</h3>
          <p className="stat-number">{stats.signed || 0}</p>
        </div>
        <div className="stat-card not-signed">
          <h3>Not Signed</h3>
          <p className="stat-number">{stats.not_signed || 0}</p>
        </div>
        <div className="stat-card active">
          <h3>Active</h3>
          <p className="stat-number">{stats.active || 0}</p>
        </div>
        <div className="stat-card conversion">
          <h3>Conversion Rate</h3>
          <p className="stat-number">{conversionRate}%</p>
        </div>
        <div className="stat-card materials">
          <h3>Materials Sent</h3>
          <p className="stat-number">{stats.total_materials || 0}</p>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="analytics-section">
        <div className="chart-card">
          <h3>Outcomes Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={outcomeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {outcomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>By Position</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agent.byPosition?.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="position" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0088FE" name="Total" />
              <Bar dataKey="signed" fill="#00C49F" name="Signed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>By Conference</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agent.byConference?.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="conference" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#FFBB28" name="Total" />
              <Bar dataKey="signed" fill="#00C49F" name="Signed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Player List */}
      <div className="players-section">
        <h3>Players ({agent.players?.length || 0})</h3>
        <div className="players-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>School</th>
                <th>Status</th>
                <th>Draft</th>
              </tr>
            </thead>
            <tbody>
              {agent.players?.map(player => (
                <tr key={player.id}>
                  <td>
                    <Link to={`/players/${player.id}`} className="player-link">
                      {player.name}
                    </Link>
                  </td>
                  <td>{player.position}</td>
                  <td>{player.school}</td>
                  <td>
                    <span className={`status-badge ${player.outcome_status?.toLowerCase().replace(/\s+/g, '-')}`}>
                      {player.outcome_status || player.status || 'Unknown'}
                    </span>
                  </td>
                  <td>
                    {player.draft_round
                      ? `Round ${player.draft_round}`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AgentDetail;
