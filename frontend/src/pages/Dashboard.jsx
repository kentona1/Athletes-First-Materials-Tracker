import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import '../styles/Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentPlayers, setRecentPlayers] = useState([]);
  const [expandedConference, setExpandedConference] = useState(null);
  const [conferenceSchools, setConferenceSchools] = useState({});

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

  const handleConferenceClick = async (conference) => {
    if (expandedConference === conference) {
      setExpandedConference(null);
      return;
    }

    setExpandedConference(conference);

    // Fetch schools for this conference if not already cached
    if (!conferenceSchools[conference]) {
      try {
        const response = await axios.get(`/api/schools?conference=${encodeURIComponent(conference)}`);
        const schools = response.data.data || [];

        // Get player counts per school for this conference
        const playersRes = await axios.get(`/api/players?conference=${encodeURIComponent(conference)}`);
        const players = playersRes.data.data || [];

        // Count signed players per school
        const schoolStats = {};
        players.forEach(player => {
          const schoolName = player.school || 'Unknown';
          if (!schoolStats[schoolName]) {
            schoolStats[schoolName] = { total: 0, signed: 0, logo: null, schoolId: null };
          }
          schoolStats[schoolName].total++;
          if (player.status === 'Signed' || player.outcome_status === 'Signed') {
            schoolStats[schoolName].signed++;
          }
        });

        // Match with school logos - prioritize exact matches
        Object.keys(schoolStats).forEach(playerSchool => {
          const nameLower = playerSchool.toLowerCase().trim();

          // First try exact match
          let matchedSchool = schools.find(s => {
            const schoolLower = s.school?.toLowerCase() || '';
            const abbrLower = s.abbreviation?.toLowerCase() || '';
            const alt1Lower = s.alt_name1?.toLowerCase() || '';
            const alt2Lower = s.alt_name2?.toLowerCase() || '';
            const alt3Lower = s.alt_name3?.toLowerCase() || '';

            return nameLower === schoolLower || nameLower === abbrLower ||
                   nameLower === alt1Lower || nameLower === alt2Lower || nameLower === alt3Lower;
          });

          // Only try fuzzy match if no exact match found
          if (!matchedSchool) {
            matchedSchool = schools.find(s => {
              const schoolLower = s.school?.toLowerCase() || '';
              // Only match if player school contains database school name
              // and it's a significant portion (avoid "Washington" matching "Washington State")
              return schoolLower.length >= 4 &&
                     nameLower.includes(schoolLower) &&
                     nameLower.length <= schoolLower.length + 10;
            });
          }

          if (matchedSchool) {
            schoolStats[playerSchool].logo = matchedSchool.logo;
            schoolStats[playerSchool].schoolId = matchedSchool.id;
          }
        });

        setConferenceSchools(prev => ({
          ...prev,
          [conference]: schoolStats
        }));
      } catch (error) {
        console.error('Error fetching conference schools:', error);
      }
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
          <div className="conference-list">
            {stats?.byPosition?.slice(0, 8).map((pos, idx) => (
              <div key={idx} className="conference-wrapper">
                <div className="conference-item position-only">
                  <span className="conference-name">{pos.position || 'Unknown'}</span>
                  <div className="conference-stats">
                    <span className="count">{pos.count}</span>
                    <span className="signed-count">({pos.signed} signed)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h3>Top Conferences</h3>
          <div className="conference-list">
            {stats?.byConference
              ?.filter(conf => conf.conference && conf.conference !== 'Unknown' && conf.conference !== 'Veteran')
              .slice(0, 8)
              .map((conf, idx) => (
              <div key={idx} className="conference-wrapper">
                <div
                  className={`conference-item ${expandedConference === conf.conference ? 'expanded' : ''}`}
                  onClick={() => handleConferenceClick(conf.conference)}
                >
                  <span className="conference-name">{conf.conference}</span>
                  <div className="conference-stats">
                    <span className="count">{conf.count}</span>
                    <span className="signed-count">({conf.signed} signed)</span>
                    <span className="expand-icon">{expandedConference === conf.conference ? '−' : '+'}</span>
                  </div>
                </div>
                {expandedConference === conf.conference && conferenceSchools[conf.conference] && (
                  <div className="conference-schools">
                    {Object.entries(conferenceSchools[conf.conference])
                      .sort((a, b) => b[1].signed - a[1].signed)
                      .map(([schoolName, data]) => (
                      <div key={schoolName} className="school-item">
                        {data.logo ? (
                          <img src={data.logo} alt={schoolName} className="school-logo" />
                        ) : (
                          <div className="school-logo-placeholder">{schoolName.charAt(0)}</div>
                        )}
                        <span className="school-name">{schoolName}</span>
                        <span className="school-signed">{data.signed} signed</span>
                      </div>
                    ))}
                  </div>
                )}
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
                  <td>
                    <Link to={`/players/${player.id}`} className="player-link">
                      {player.name}
                    </Link>
                  </td>
                  <td>{player.position}</td>
                  <td>{player.school || player.team || '-'}</td>
                  <td>
                    <span className={`status-badge ${player.status?.toLowerCase().replace(/\s+/g, '-')}`}>
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
