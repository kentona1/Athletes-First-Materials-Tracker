import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import '../styles/PlayersList.css';

function PlayersList() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('lastName'); // 'lastName' or 'firstName'
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    position: '',
    school: '',
    conference: '',
    agent: '',
    year: ''
  });

  const [positions, setPositions] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [years, setYears] = useState([]);

  useEffect(() => {
    fetchPlayers();
    fetchFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sortBy]);

  const fetchPlayers = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      params.append('sortBy', sortBy);

      const response = await axios.get(`/api/players?${params}`);
      setPlayers(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const analyticsRes = await axios.get('/api/players/analytics');

      const analytics = analyticsRes.data.data;
      setPositions(analytics.byPosition?.map(p => p.position) || []);
      setConferences(analytics.byConference?.map(c => c.conference) || []);

      // Use recruiting years from analytics (from player_recruiting_cycles table)
      setYears(analytics.recruitingYears || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      position: '',
      school: '',
      conference: '',
      agent: '',
      year: ''
    });
  };

  if (loading) {
    return <div className="loading">Loading players...</div>;
  }

  return (
    <div className="players-list">
      <div className="page-header">
        <h2>Players</h2>
        <div className="header-actions">
          <Link to="/import" className="btn btn-secondary">
            Import CSV
          </Link>
          <Link to="/players/new" className="btn btn-primary">
            + Add New Player
          </Link>
        </div>
      </div>

      <div className="filters-section">
        <input
          type="text"
          placeholder="Search by name..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="search-input"
        />

        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Signed">Signed</option>
          <option value="Not Signed">Not Signed</option>
          <option value="Returned to School">Returned to School</option>
        </select>

        <select
          value={filters.position}
          onChange={(e) => handleFilterChange('position', e.target.value)}
          className="filter-select"
        >
          <option value="">All Positions</option>
          {positions.filter(Boolean).map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>

        <select
          value={filters.conference}
          onChange={(e) => handleFilterChange('conference', e.target.value)}
          className="filter-select"
        >
          <option value="">All Conferences</option>
          {conferences.filter(Boolean).map(conf => (
            <option key={conf} value={conf}>{conf}</option>
          ))}
        </select>

        <select
          value={filters.year}
          onChange={(e) => handleFilterChange('year', e.target.value)}
          className="filter-select"
        >
          <option value="">All Years</option>
          {years.map(year => (
            <option key={year} value={year}>{year - 1} - {year}</option>
          ))}
        </select>

        <button onClick={clearFilters} className="btn btn-secondary">
          Clear Filters
        </button>

        <div className="sort-toggle">
          <span className="sort-label">Sort by:</span>
          <button
            className={`sort-btn ${sortBy === 'lastName' ? 'active' : ''}`}
            onClick={() => setSortBy('lastName')}
          >
            Last Name
          </button>
          <button
            className={`sort-btn ${sortBy === 'firstName' ? 'active' : ''}`}
            onClick={() => setSortBy('firstName')}
          >
            First Name
          </button>
        </div>
      </div>

      <div className="players-count">
        Showing {players.length} player{players.length !== 1 ? 's' : ''}
      </div>

      <div className="players-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>School</th>
              <th>Conference</th>
              <th>Class</th>
              <th>Agent(s)</th>
              <th>Materials</th>
              <th>Status</th>
              <th>Draft</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <tr key={player.id}>
                <td>
                  <Link to={`/players/${player.id}`} className="player-link">
                    {player.name}
                  </Link>
                </td>
                <td>{player.position}</td>
                <td>{player.school}</td>
                <td>{player.conference}</td>
                <td>{player.class_year}</td>
                <td>{player.agents || '-'}</td>
                <td className="text-center">{player.materials_count || 0}</td>
                <td>
                  <span className={`status-badge ${(player.outcome_status || player.status)?.toLowerCase().replace(/\s+/g, '-')}`}>
                    {player.outcome_status || player.status}
                  </span>
                </td>
                <td className="text-center">
                  {player.draft_round !== null && player.draft_round !== undefined
                    ? (player.draft_round === 0 ? 'UDFA' : `Rd ${player.draft_round}`)
                    : '-'}
                </td>
                <td>
                  <Link to={`/players/${player.id}`} className="btn-small btn-primary">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {players.length === 0 && (
        <div className="no-results">
          <p>No players found matching your filters.</p>
          <button onClick={clearFilters} className="btn btn-secondary">
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default PlayersList;
