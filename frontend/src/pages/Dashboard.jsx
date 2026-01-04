import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import '../styles/Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentPlayers, setRecentPlayers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, playersRes] = await Promise.all([
        axios.get('/api/players/analytics'),
        axios.get('/api/players?limit=10')
      ]);

      setStats(analyticsRes.data.data);
      setRecentPlayers(playersRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const overall = stats?.overall || {};

  return (
    <div className="dashboard">
      <h2>Dashboard Overview</h2>
      
      <div className="stats-grid">
        <div className="stat-card total">
          <h3>Total Prospects</h3>
          <p className="stat-number">{overall.total_players || 0}</p>
        </div>

        <div className="stat-card signed">
          <h3>Signed</h3>
          <p className="stat-number">{overall.signed || 0}</p>
          <span className="stat-percentage">
            {overall.total_players > 0
              ? `${((overall.signed / overall.total_players) * 100).toFixed(1)}%`
              : '0%'}
          </span>
        </div>

        <div className="stat-card not-signed">
          <h3>Not Signed</h3>
          <p className="stat-number">{overall.not_signed || 0}</p>
          <span className="stat-percentage">
            {overall.total_players > 0
              ? `${((overall.not_signed / overall.total_players) * 100).toFixed(1)}%`
              : '0%'}
          </span>
        </div>

        <div className="stat-card active">
          <h3>Active</h3>
          <p className="stat-number">{overall.returned || 0}</p>
          <span className="stat-percentage">
            {overall.total_players > 0
              ? `${((overall.returned / overall.total_players) * 100).toFixed(1)}%`
              : '0%'}
          </span>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section">
          <h3>Top Positions</h3>
          <div className="position-list">
            {stats?.byPosition?.slice(0, 8).map((pos, idx) => (
              <div key={idx} className="position-item">
                <span className="position-name">{pos.position || 'Unknown'}</span>
                <div className="position-stats">
                  <span className="count">{pos.count}</span>
                  <span className="signed-count">({pos.signed} signed)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>Top Conferences</h3>
          <div className="conference-list">
            {stats?.byConference?.slice(0, 8).map((conf, idx) => (
              <div key={idx} className="conference-item">
                <span className="conference-name">{conf.conference || 'Unknown'}</span>
                <div className="conference-stats">
                  <span className="count">{conf.count}</span>
                  <span className="signed-count">({conf.signed} signed)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section recent-activity">
        <h3>Recent Players</h3>
        <div className="players-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>School</th>
                <th>Status</th>
                <th>Materials</th>
              </tr>
            </thead>
            <tbody>
              {recentPlayers.map(player => (
                <tr key={player.id}>
                  <td>{player.name}</td>
                  <td>{player.position}</td>
                  <td>{player.school}</td>
                  <td>
                    <span className={`status-badge ${player.status?.toLowerCase()}`}>
                      {player.status}
                    </span>
                  </td>
                  <td>{player.materials_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
