import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import '../styles/SchoolCleanup.css';

function SchoolCleanup() {
  const [loading, setLoading] = useState(true);
  const [mismatches, setMismatches] = useState([]);
  const [matched, setMatched] = useState([]);
  const [stats, setStats] = useState({ totalMismatched: 0, totalMatched: 0, totalUnique: 0 });
  const [selectedFixes, setSelectedFixes] = useState({}); // { oldSchoolName: selectedSchoolId }
  const [searchQueries, setSearchQueries] = useState({}); // { oldSchoolName: searchQuery }
  const [searchResults, setSearchResults] = useState({}); // { oldSchoolName: [results] }
  const [fixing, setFixing] = useState(false);
  const [fixResults, setFixResults] = useState([]);
  const [showMatched, setShowMatched] = useState(false);

  useEffect(() => {
    fetchMismatches();
  }, []);

  const fetchMismatches = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/schools/mismatches');
      const data = response.data.data;
      setMismatches(data.mismatches);
      setMatched(data.matched);
      setStats({
        totalMismatched: data.totalMismatched,
        totalMatched: data.totalMatched,
        totalUnique: data.totalUnique
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching mismatches:', error);
      setLoading(false);
    }
  };

  const handleSearch = async (oldSchoolName, query) => {
    setSearchQueries(prev => ({ ...prev, [oldSchoolName]: query }));

    if (query.length < 2) {
      setSearchResults(prev => ({ ...prev, [oldSchoolName]: [] }));
      return;
    }

    try {
      const response = await axios.get(`/api/schools/search?query=${encodeURIComponent(query)}`);
      setSearchResults(prev => ({
        ...prev,
        [oldSchoolName]: response.data.data || []
      }));
    } catch (error) {
      console.error('Error searching schools:', error);
    }
  };

  const handleSelectSchool = (oldSchoolName, school) => {
    setSelectedFixes(prev => ({
      ...prev,
      [oldSchoolName]: { id: school.id, name: school.school, conference: school.conference, logo: school.logo }
    }));
    setSearchQueries(prev => ({ ...prev, [oldSchoolName]: '' }));
    setSearchResults(prev => ({ ...prev, [oldSchoolName]: [] }));
  };

  const handleClearSelection = (oldSchoolName) => {
    setSelectedFixes(prev => {
      const newFixes = { ...prev };
      delete newFixes[oldSchoolName];
      return newFixes;
    });
  };

  const handleFixSingle = async (oldSchoolName) => {
    const fix = selectedFixes[oldSchoolName];
    if (!fix) return;

    setFixing(true);
    try {
      const response = await axios.post('/api/schools/mismatches/fix', {
        oldSchoolName,
        newSchoolId: fix.id
      });

      setFixResults(prev => [...prev, {
        success: true,
        oldSchoolName,
        newSchoolName: response.data.data.newSchoolName,
        playersUpdated: response.data.data.playersUpdated
      }]);

      // Remove from mismatches list
      setMismatches(prev => prev.filter(m => m.playerSchool !== oldSchoolName));
      handleClearSelection(oldSchoolName);
    } catch (error) {
      setFixResults(prev => [...prev, {
        success: false,
        oldSchoolName,
        error: error.message
      }]);
    }
    setFixing(false);
  };

  const handleFixAll = async () => {
    const fixes = Object.entries(selectedFixes).map(([oldSchoolName, fix]) => ({
      oldSchoolName,
      newSchoolId: fix.id
    }));

    if (fixes.length === 0) return;

    setFixing(true);
    try {
      const response = await axios.post('/api/schools/mismatches/fix-multiple', { fixes });

      setFixResults(response.data.data.results.map(r => ({
        success: true,
        oldSchoolName: r.oldSchoolName,
        newSchoolName: r.newSchoolName,
        playersUpdated: r.playersUpdated
      })));

      // Refresh the mismatches list
      await fetchMismatches();
      setSelectedFixes({});
    } catch (error) {
      console.error('Error fixing multiple:', error);
    }
    setFixing(false);
  };

  if (loading) {
    return <div className="loading">Loading school data...</div>;
  }

  return (
    <div className="school-cleanup">
      <div className="page-header">
        <h2>School Name Cleanup</h2>
        <p className="page-subtitle">
          Normalize school names to ensure consistent data across all players
        </p>
      </div>

      <div className="cleanup-stats">
        <div className="stat-card">
          <span className="stat-number">{stats.totalUnique}</span>
          <span className="stat-label">Unique Schools</span>
        </div>
        <div className="stat-card success">
          <span className="stat-number">{stats.totalMatched}</span>
          <span className="stat-label">Matched</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-number">{stats.totalMismatched}</span>
          <span className="stat-label">Need Review</span>
        </div>
        <div className="stat-card info">
          <span className="stat-number">{Object.keys(selectedFixes).length}</span>
          <span className="stat-label">Ready to Fix</span>
        </div>
      </div>

      {fixResults.length > 0 && (
        <div className="fix-results">
          <h3>Recent Fixes</h3>
          <div className="results-list">
            {fixResults.slice(-5).map((result, idx) => (
              <div key={idx} className={`result-item ${result.success ? 'success' : 'error'}`}>
                {result.success ? (
                  <>
                    <span className="result-icon">✓</span>
                    <span>"{result.oldSchoolName}" → "{result.newSchoolName}" ({result.playersUpdated} players)</span>
                  </>
                ) : (
                  <>
                    <span className="result-icon">✗</span>
                    <span>Failed to fix "{result.oldSchoolName}": {result.error}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={() => setFixResults([])}>
            Clear Results
          </button>
        </div>
      )}

      {Object.keys(selectedFixes).length > 0 && (
        <div className="bulk-actions">
          <h3>Selected Fixes ({Object.keys(selectedFixes).length})</h3>
          <div className="selected-fixes-preview">
            {Object.entries(selectedFixes).slice(0, 5).map(([oldName, fix]) => (
              <span key={oldName} className="fix-preview">
                {oldName} → {fix.name}
              </span>
            ))}
            {Object.keys(selectedFixes).length > 5 && (
              <span className="fix-preview">+{Object.keys(selectedFixes).length - 5} more</span>
            )}
          </div>
          <button
            className="btn btn-primary"
            onClick={handleFixAll}
            disabled={fixing}
          >
            {fixing ? 'Fixing...' : `Fix All ${Object.keys(selectedFixes).length} Schools`}
          </button>
        </div>
      )}

      <div className="mismatches-section">
        <div className="section-header">
          <h3>Schools Needing Review ({mismatches.length})</h3>
        </div>

        {mismatches.length === 0 ? (
          <div className="no-mismatches">
            <span className="success-icon">✓</span>
            <p>All school names are properly matched!</p>
          </div>
        ) : (
          <div className="mismatches-list">
            {mismatches.map((mismatch) => (
              <div key={mismatch.playerSchool} className="mismatch-card">
                <div className="mismatch-header">
                  <div className="mismatch-info">
                    <span className="school-name">{mismatch.playerSchool}</span>
                    <span className="player-count">{mismatch.playerCount} player{mismatch.playerCount !== 1 ? 's' : ''}</span>
                  </div>
                  {selectedFixes[mismatch.playerSchool] && (
                    <div className="selected-school">
                      <span className="arrow">→</span>
                      {selectedFixes[mismatch.playerSchool].logo && (
                        <img
                          src={selectedFixes[mismatch.playerSchool].logo}
                          alt=""
                          className="school-logo-small"
                        />
                      )}
                      <span className="selected-name">{selectedFixes[mismatch.playerSchool].name}</span>
                      <button
                        className="clear-btn"
                        onClick={() => handleClearSelection(mismatch.playerSchool)}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                <div className="mismatch-body">
                  <div className="search-section">
                    <input
                      type="text"
                      placeholder="Search for correct school..."
                      value={searchQueries[mismatch.playerSchool] || ''}
                      onChange={(e) => handleSearch(mismatch.playerSchool, e.target.value)}
                      className="school-search-input"
                    />
                    {searchResults[mismatch.playerSchool]?.length > 0 && (
                      <div className="search-results">
                        {searchResults[mismatch.playerSchool].map(school => (
                          <div
                            key={school.id}
                            className="search-result-item"
                            onClick={() => handleSelectSchool(mismatch.playerSchool, school)}
                          >
                            {school.logo && (
                              <img src={school.logo} alt="" className="school-logo-small" />
                            )}
                            <span className="school-name">{school.school}</span>
                            <span className="school-conf">{school.conference}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {mismatch.suggestions?.length > 0 && !searchQueries[mismatch.playerSchool] && (
                    <div className="suggestions">
                      <span className="suggestions-label">Suggestions:</span>
                      <div className="suggestions-list">
                        {mismatch.suggestions.map(suggestion => (
                          <button
                            key={suggestion.id}
                            className="suggestion-btn"
                            onClick={() => handleSelectSchool(mismatch.playerSchool, suggestion)}
                          >
                            {suggestion.logo && (
                              <img src={suggestion.logo} alt="" className="school-logo-tiny" />
                            )}
                            {suggestion.school}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedFixes[mismatch.playerSchool] && (
                  <div className="mismatch-actions">
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => handleFixSingle(mismatch.playerSchool)}
                      disabled={fixing}
                    >
                      Fix Now
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="matched-section">
        <div className="section-header">
          <h3>Properly Matched Schools ({matched.length})</h3>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setShowMatched(!showMatched)}
          >
            {showMatched ? 'Hide' : 'Show'}
          </button>
        </div>

        {showMatched && (
          <div className="matched-list">
            {matched.map((m) => (
              <div key={m.playerSchool} className="matched-item">
                <span className="matched-check">✓</span>
                <span className="matched-school">{m.playerSchool}</span>
                <span className="matched-count">{m.playerCount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SchoolCleanup;
