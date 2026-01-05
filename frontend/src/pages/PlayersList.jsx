import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import '../styles/PlayersList.css';

const ITEMS_PER_PAGE = 50;

function PlayersList() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('lastName'); // 'lastName' or 'firstName'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

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
  }, [filters, sortBy, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy]);

  const fetchPlayers = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      params.append('sortBy', sortBy);
      params.append('page', currentPage);
      params.append('limit', ITEMS_PER_PAGE);

      const response = await axios.get(`/api/players?${params}`);
      setPlayers(response.data.data);
      setTotalPlayers(response.data.total || response.data.data.length);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalPlayers / ITEMS_PER_PAGE);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          {isAdmin && (
            <Link to="/positions" className="btn btn-outline">
              Position Manager
            </Link>
          )}
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
        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalPlayers)} of {totalPlayers} player{totalPlayers !== 1 ? 's' : ''}
      </div>

      <div className="players-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>School / Team</th>
              <th>Agent(s)</th>
              <th>Status</th>
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
                <td>{player.school || player.team || '-'}</td>
                <td>{player.agents || '-'}</td>
                <td>
                  <span className={`status-badge ${(player.outcome_status || player.status)?.toLowerCase().replace(/\s+/g, '-')}`}>
                    {player.outcome_status || player.status}
                  </span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </button>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Prev
          </button>

          <div className="pagination-numbers">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`pagination-num ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </button>

          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

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
