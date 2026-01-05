import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import './Schools.css';

function Schools() {
  const [schools, setSchools] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [conferences, setConferences] = useState([]);
  const [selectedConference, setSelectedConference] = useState('');
  const [editingSchool, setEditingSchool] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalSchools, setTotalSchools] = useState(0);
  const LIMIT = 50;

  const loadConferences = useCallback(async () => {
    try {
      const response = await axios.get('/api/schools/conferences');
      setConferences(response.data.data || []);
    } catch (error) {
      console.error('Error loading conferences:', error);
    }
  }, []);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: LIMIT,
        offset: page * LIMIT
      };
      if (selectedConference) {
        params.conference = selectedConference;
      }

      const response = await axios.get('/api/schools', { params });
      setSchools(response.data.data || []);
      setTotalSchools(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Error loading schools:', error);
      alert('Failed to load schools');
    } finally {
      setLoading(false);
    }
  }, [page, selectedConference, LIMIT]);

  useEffect(() => {
    loadConferences();
    loadSchools();
  }, [loadConferences, loadSchools]);

  const searchSchools = async (query) => {
    if (!query || query.length < 2) {
      loadSchools();
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('/api/schools/search', {
        params: { query }
      });
      setSchools(response.data.data || []);
      setTotalSchools(response.data.data?.length || 0);
    } catch (error) {
      console.error('Error searching schools:', error);
      alert('Failed to search schools');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Debounce search
    clearTimeout(window.schoolSearchTimeout);
    window.schoolSearchTimeout = setTimeout(() => {
      searchSchools(query);
    }, 300);
  };

  const startEditing = (school) => {
    setEditingSchool({
      ...school,
      newConference: school.conference || ''
    });
  };

  const cancelEditing = () => {
    setEditingSchool(null);
  };

  const saveSchool = async () => {
    if (!editingSchool) return;

    try {
      await axios.put(`/api/schools/${editingSchool.id}`, {
        conference: editingSchool.newConference
      });

      alert('School updated successfully!');
      setEditingSchool(null);
      loadSchools();
    } catch (error) {
      console.error('Error updating school:', error);
      alert('Failed to update school');
    }
  };

  return (
    <div className="schools-container">
      <div className="schools-header">
        <div className="schools-header-left">
          <h1>Schools Management</h1>
          <p className="schools-subtitle">
            Manage school data and conference assignments
          </p>
        </div>
        <Link to="/schools/cleanup" className="btn btn-primary cleanup-link">
          School Name Cleanup
        </Link>
      </div>

      <div className="schools-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search schools..."
            value={searchQuery}
            onChange={handleSearch}
            className="school-search-input"
          />
        </div>

        <div className="filter-box">
          <select
            value={selectedConference}
            onChange={(e) => {
              setSelectedConference(e.target.value);
              setPage(0);
            }}
            className="conference-filter"
          >
            <option value="">All Conferences</option>
            {conferences.map(conf => (
              <option key={conf} value={conf}>{conf}</option>
            ))}
          </select>
        </div>

        <div className="stats-box">
          Showing {schools.length} of {totalSchools} schools
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading schools...</div>
      ) : (
        <>
          <div className="schools-table-container">
            <table className="schools-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>School</th>
                  <th>Mascot</th>
                  <th>Abbreviation</th>
                  <th>Conference</th>
                  <th>Division</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map(school => (
                  <tr key={school.id}>
                    <td>{school.id}</td>
                    <td>
                      <div className="school-name-cell">
                        {school.logo && (
                          <img
                            src={school.logo}
                            alt={school.school}
                            className="school-logo-small"
                          />
                        )}
                        {school.school}
                      </div>
                    </td>
                    <td>{school.mascot}</td>
                    <td>{school.abbreviation}</td>
                    <td>
                      {editingSchool?.id === school.id ? (
                        <input
                          type="text"
                          value={editingSchool.newConference}
                          onChange={(e) =>
                            setEditingSchool({
                              ...editingSchool,
                              newConference: e.target.value
                            })
                          }
                          className="conference-input"
                        />
                      ) : (
                        <span className={!school.conference ? 'no-conference' : ''}>
                          {school.conference || '(none)'}
                        </span>
                      )}
                    </td>
                    <td>{school.division}</td>
                    <td>
                      {editingSchool?.id === school.id ? (
                        <div className="edit-actions">
                          <button
                            onClick={saveSchool}
                            className="btn-save"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="btn-cancel"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(school)}
                          className="btn-edit"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-page"
            >
              Previous
            </button>
            <span className="page-info">
              Page {page + 1} of {Math.ceil(totalSchools / LIMIT)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * LIMIT >= totalSchools}
              className="btn-page"
            >
              Next
            </button>
          </div>
        </>
      )}

      {editingSchool && (
        <div className="edit-modal-overlay" onClick={cancelEditing}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit School</h3>
            <div className="edit-modal-content">
              <p><strong>{editingSchool.school}</strong> ({editingSchool.mascot})</p>

              <label>
                Conference:
                <input
                  type="text"
                  value={editingSchool.newConference}
                  onChange={(e) =>
                    setEditingSchool({
                      ...editingSchool,
                      newConference: e.target.value
                    })
                  }
                  placeholder="e.g., SEC, Big Ten, ACC"
                  className="modal-input"
                />
              </label>

              <div className="modal-actions">
                <button onClick={saveSchool} className="btn-save">
                  Save Changes
                </button>
                <button onClick={cancelEditing} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schools;
