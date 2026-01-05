import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import '../styles/ImportPlayers.css';

function ImportPlayers() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fetchingPhotos, setFetchingPhotos] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(null);
      setResult(null);
      setError(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreview(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error previewing file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/import/players', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data.data);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error importing players');
    } finally {
      setImporting(false);
    }
  };

  const handleFetchPhotos = async () => {
    setFetchingPhotos(true);
    setError(null);

    try {
      const response = await axios.post('/api/import/fetch-photos?limit=100');
      setResult(prev => ({
        ...prev,
        photosFetched: response.data.data.updated,
        photosNotFound: response.data.data.notFound
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Error fetching photos');
    } finally {
      setFetchingPhotos(false);
    }
  };

  const formatDraftRound = (round) => {
    if (round === null || round === undefined) return '-';
    if (round === 0) return 'UDFA';
    return `Rd ${round}`;
  };

  return (
    <div className="import-players">
      <div className="page-header">
        <button onClick={() => navigate('/players')} className="btn btn-secondary">
          ← Back to Players
        </button>
        <h1>Bulk Import Players</h1>
      </div>

      <div className="import-container">
        {/* Upload Section */}
        <div className="upload-section">
          <h2>Upload CSV File</h2>
          <p className="upload-description">
            Upload a CSV file with player data. The system will parse:
          </p>
          <ul className="feature-list">
            <li><strong>Player Info:</strong> Name, Position, School, Conference, Class Year</li>
            <li><strong>Draft Data:</strong> Draft Round (RESULT), Draft Year</li>
            <li><strong>Outcome:</strong> Commit status (Signed, Missed, Returned to School)</li>
            <li><strong>Materials:</strong> All materials with dates, delivery methods, and copy counts</li>
            <li><strong>Agent Assignment:</strong> Auto-matches agents by name</li>
          </ul>
          <p className="upload-note">
            <strong>Tip:</strong> Import files from newest to oldest year. Newer data takes priority,
            but materials from older years will still be added.
          </p>

          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              id="csv-file"
              className="file-input"
            />
            <label htmlFor="csv-file" className="file-label">
              {file ? file.name : 'Choose CSV file...'}
            </label>
          </div>

          {file && !preview && (
            <button
              onClick={handlePreview}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Loading Preview...' : 'Preview Import'}
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Preview Section */}
        {preview && (
          <div className="preview-section">
            <div className="preview-header">
              <div>
                <h2>Preview: {preview.filename}</h2>
                <p className="preview-meta">
                  Recruiting Year: <strong>{preview.recruitingYear || 'Unknown'}</strong> |
                  Total Players: <strong>{preview.totalRows}</strong>
                </p>
              </div>
              <div className="preview-actions">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="btn btn-success"
                >
                  {importing ? 'Importing...' : `Import ${preview.totalRows} Players`}
                </button>
                <button
                  onClick={() => {
                    setPreview(null);
                    setFile(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* School Mismatch Warning */}
            {preview.unmatchedSchools?.length > 0 && (
              <div className="school-warning-banner">
                <span className="warning-icon">⚠️</span>
                <div className="warning-content">
                  <strong>{preview.unmatchedSchools.length} school name(s) don't match the database:</strong>
                  <ul className="unmatched-schools-list">
                    {preview.unmatchedSchools.slice(0, 5).map((school, i) => (
                      <li key={i}>{school}</li>
                    ))}
                    {preview.unmatchedSchools.length > 5 && (
                      <li>...and {preview.unmatchedSchools.length - 5} more</li>
                    )}
                  </ul>
                  <p className="warning-tip">
                    These will be imported as-is. Use{' '}
                    <Link to="/schools/cleanup">School Name Cleanup</Link>{' '}
                    to normalize them after import.
                  </p>
                </div>
              </div>
            )}

            <p className="preview-note">
              Showing first {preview.preview.length} of {preview.totalRows} players
            </p>

            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Name</th>
                    <th>Position</th>
                    <th>Type</th>
                    <th>School/Team</th>
                    <th>Class</th>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Draft</th>
                    <th>Year</th>
                    <th>Materials</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.preview.map((player, index) => (
                    <tr key={index} className={player.agent_id ? '' : 'no-agent'}>
                      <td>{player.row}</td>
                      <td className="name-cell">{player.name}</td>
                      <td>{player.position}</td>
                      <td>
                        <span className={`type-badge ${player.player_type}`}>
                          {player.player_type === 'veteran' ? 'NFL' :
                           player.player_type === 'high_school' ? 'HS' : 'CFB'}
                        </span>
                      </td>
                      <td>
                        {player.school}
                        {player.school && !player.school_matched && (
                          <span className="warning-badge" title="School not found in database">⚠</span>
                        )}
                      </td>
                      <td>{player.class_year || '-'}</td>
                      <td>
                        {player.agent}
                        {player.agent && !player.agent_id && (
                          <span className="warning-badge" title="Agent not found in system">⚠</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${player.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                          {player.status}
                        </span>
                      </td>
                      <td>
                        <span className={`draft-badge ${player.draft_round !== null ? 'drafted' : ''}`}>
                          {formatDraftRound(player.draft_round)}
                        </span>
                      </td>
                      <td>{player.draft_year || '-'}</td>
                      <td>
                        <span className="materials-count" title={player.materials_preview || 'No materials'}>
                          {player.total_materials || 0} items
                          {player.material_events > 0 && (
                            <span className="events-count">({player.material_events} events)</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="preview-legend">
              <div className="legend-item">
                <span className="warning-badge">⚠</span> Agent or school not found in system
              </div>
              <div className="legend-item">
                <span className="draft-badge drafted">Rd 1</span> = Drafted (Round shown)
              </div>
              <div className="legend-item">
                <span className="draft-badge drafted">UDFA</span> = Undrafted Free Agent
              </div>
            </div>
          </div>
        )}

        {/* Result Section */}
        {result && (
          <div className="result-section">
            <h2>Import Complete!</h2>
            <p className="result-filename">File: {result.filename} (Year: {result.recruitingYear || 'Unknown'})</p>

            <div className="result-stats">
              <div className="stat-card success">
                <span className="stat-number">{result.imported}</span>
                <span className="stat-label">New Players</span>
              </div>
              <div className="stat-card info">
                <span className="stat-number">{result.updated || 0}</span>
                <span className="stat-label">Updated</span>
              </div>
              <div className="stat-card warning">
                <span className="stat-number">{result.skipped}</span>
                <span className="stat-label">Skipped</span>
              </div>
              <div className="stat-card primary">
                <span className="stat-number">{result.materialsAdded || 0}</span>
                <span className="stat-label">Materials Added</span>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="errors-list">
                <h3>Errors ({result.errors.length})</h3>
                <ul>
                  {result.errors.map((err, i) => (
                    <li key={i}><strong>{err.name}:</strong> {err.error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Photo Fetching Section */}
            <div className="photo-fetch-section">
              <h3>Fetch Player Photos</h3>
              <p>After importing, you can fetch player photos from ESPN:</p>
              <button
                onClick={handleFetchPhotos}
                disabled={fetchingPhotos}
                className="btn btn-primary"
              >
                {fetchingPhotos ? 'Fetching Photos...' : 'Fetch ESPN Photos (100 players)'}
              </button>
              {result.photosFetched !== undefined && (
                <p className="photo-result">
                  <span className="success-text">{result.photosFetched} photos found</span>,
                  <span className="muted-text"> {result.photosNotFound} not found</span>
                </p>
              )}
            </div>

            <div className="result-actions">
              <button onClick={() => navigate('/players')} className="btn btn-primary">
                View Players
              </button>
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setResult(null);
                }}
                className="btn btn-secondary"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportPlayers;
