import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import '../styles/PositionManager.css';

const STANDARD_POSITIONS = [
  'QB', 'RB', 'FB', 'WR', 'TE',
  'OL', 'OL (OT)', 'OL (OG)', 'OL (OC)',
  'IDL', 'EDGE', 'LB',
  'DB', 'DB (CB)', 'DB (SAF)',
  'SPEC', 'SPEC (K)', 'SPEC (P)'
];

// Position group mappings for suggestions
const POSITION_GROUPS = {
  'Offensive Line': ['OL', 'OL (OT)', 'OL (OG)', 'OL (OC)'],
  'Defensive Back': ['DB', 'DB (CB)', 'DB (SAF)'],
  'Defensive Line': ['IDL', 'EDGE'],
  'Specialist': ['SPEC', 'SPEC (K)', 'SPEC (P)']
};

function PositionManager() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [targetPosition, setTargetPosition] = useState('');
  const [message, setMessage] = useState(null);

  const fetchPositions = useCallback(async () => {
    try {
      const response = await axios.get('/api/players/positions');
      setPositions(response.data.data.positions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching positions:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const fetchPlayersByPosition = async (position) => {
    setPlayersLoading(true);
    setSelectedPlayers([]);
    try {
      const response = await axios.get(`/api/players/positions/${encodeURIComponent(position)}`);
      setPlayers(response.data.data);
      setPlayersLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
      setPlayersLoading(false);
    }
  };

  const handlePositionClick = (position) => {
    setSelectedPosition(position);
    setTargetPosition('');
    fetchPlayersByPosition(position);
  };

  const handleMapAll = async () => {
    if (!selectedPosition || !targetPosition) return;

    if (!window.confirm(`Map ALL players from "${selectedPosition}" to "${targetPosition}"?`)) {
      return;
    }

    try {
      const response = await axios.post('/api/players/positions/map', {
        fromPosition: selectedPosition,
        toPosition: targetPosition
      });

      setMessage({ type: 'success', text: response.data.message });
      setSelectedPosition(null);
      setPlayers([]);
      fetchPositions();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to map positions' });
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedPlayers.length === 0 || !targetPosition) return;

    try {
      await axios.post('/api/players/positions/bulk-update', {
        playerIds: selectedPlayers,
        newPosition: targetPosition
      });

      setMessage({ type: 'success', text: `Updated ${selectedPlayers.length} players to ${targetPosition}` });
      setSelectedPlayers([]);

      // Refresh players list
      if (selectedPosition) {
        fetchPlayersByPosition(selectedPosition);
      }
      fetchPositions();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update positions' });
    }
  };

  const handleSelectAll = () => {
    if (selectedPlayers.length === players.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(players.map(p => p.id));
    }
  };

  const togglePlayerSelection = (playerId) => {
    setSelectedPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  // Get suggested target positions based on current position
  const getSuggestedPositions = (position) => {
    const suggestions = [];
    const posLower = position.toLowerCase();

    // Check for OL variants
    if (posLower.includes('ol') || posLower.includes('ot') || posLower.includes('og') || posLower.includes('oc') || posLower.includes('interior') || posLower.includes('tackle') || posLower.includes('guard') || posLower.includes('center')) {
      suggestions.push(...POSITION_GROUPS['Offensive Line']);
    }

    // Check for DB variants
    if (posLower.includes('db') || posLower.includes('cb') || posLower.includes('saf') || posLower.includes('corner') || posLower.includes('safety')) {
      suggestions.push(...POSITION_GROUPS['Defensive Back']);
    }

    // Check for DL/EDGE variants
    if (posLower.includes('dl') || posLower.includes('de') || posLower.includes('dt') || posLower.includes('nt') || posLower.includes('edge') || posLower.includes('idl') || posLower.includes('olb')) {
      suggestions.push(...POSITION_GROUPS['Defensive Line']);
    }

    // Check for specialists
    if (posLower.includes('spec') || posLower.includes('k') || posLower.includes('p') || posLower.includes('kick') || posLower.includes('punt')) {
      suggestions.push(...POSITION_GROUPS['Specialist']);
    }

    // Check for LB
    if (posLower.includes('lb') || posLower.includes('ilb')) {
      suggestions.push('LB', 'EDGE');
    }

    return [...new Set(suggestions)];
  };

  const standardPositions = positions.filter(p => p.isStandard);
  const nonStandardPositions = positions.filter(p => !p.isStandard);
  const totalNonStandard = nonStandardPositions.reduce((sum, p) => sum + p.count, 0);

  if (loading) {
    return <div className="loading">Loading positions...</div>;
  }

  return (
    <div className="position-manager">
      <div className="page-header">
        <h2>Position Manager</h2>
        <p className="subtitle">Normalize player positions to standard format</p>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="close-btn">&times;</button>
        </div>
      )}

      <div className="position-manager-grid">
        {/* Left Panel - Position List */}
        <div className="positions-panel">
          <div className="panel-section">
            <h3 className="section-title standard">
              Standard Positions
              <span className="count-badge">{standardPositions.length}</span>
            </h3>
            <div className="position-list standard">
              {standardPositions.map(pos => (
                <div
                  key={pos.position}
                  className={`position-item ${selectedPosition === pos.position ? 'selected' : ''}`}
                  onClick={() => handlePositionClick(pos.position)}
                >
                  <span className="position-name">{pos.position}</span>
                  <span className="position-count">{pos.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <h3 className="section-title non-standard">
              Non-Standard Positions
              <span className="count-badge warning">{totalNonStandard} players</span>
            </h3>
            <div className="position-list non-standard">
              {nonStandardPositions.map(pos => (
                <div
                  key={pos.position}
                  className={`position-item needs-fix ${selectedPosition === pos.position ? 'selected' : ''}`}
                  onClick={() => handlePositionClick(pos.position)}
                >
                  <span className="position-name">{pos.position}</span>
                  <span className="position-count">{pos.count}</span>
                </div>
              ))}
              {nonStandardPositions.length === 0 && (
                <div className="empty-state">All positions are normalized!</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Players & Actions */}
        <div className="players-panel">
          {selectedPosition ? (
            <>
              <div className="panel-header">
                <h3>
                  Players with position: <span className="highlight">{selectedPosition}</span>
                </h3>
                <span className="player-count">{players.length} players</span>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <div className="action-row">
                  <label>Map to:</label>
                  <select
                    value={targetPosition}
                    onChange={(e) => setTargetPosition(e.target.value)}
                    className="position-select"
                  >
                    <option value="">Select target position...</option>
                    <optgroup label="Suggested">
                      {getSuggestedPositions(selectedPosition).map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </optgroup>
                    <optgroup label="All Standard Positions">
                      {STANDARD_POSITIONS.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="action-buttons">
                  <button
                    className="btn btn-primary"
                    onClick={handleMapAll}
                    disabled={!targetPosition}
                  >
                    Map All ({players.length})
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleBulkUpdate}
                    disabled={selectedPlayers.length === 0 || !targetPosition}
                  >
                    Map Selected ({selectedPlayers.length})
                  </button>
                </div>
              </div>

              {/* Player List */}
              <div className="player-list-container">
                {playersLoading ? (
                  <div className="loading-inline">Loading players...</div>
                ) : (
                  <>
                    <div className="select-all-row">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedPlayers.length === players.length && players.length > 0}
                          onChange={handleSelectAll}
                        />
                        Select All
                      </label>
                    </div>
                    <div className="player-list">
                      {players.map(player => (
                        <div
                          key={player.id}
                          className={`player-item ${selectedPlayers.includes(player.id) ? 'selected' : ''}`}
                        >
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedPlayers.includes(player.id)}
                              onChange={() => togglePlayerSelection(player.id)}
                            />
                            <span className="player-info">
                              <Link to={`/players/${player.id}`} className="player-name">
                                {player.name}
                              </Link>
                              <span className="player-school">{player.school}</span>
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="empty-panel">
              <div className="empty-icon">&#9881;</div>
              <h3>Select a position</h3>
              <p>Click on a position from the left panel to view players and make changes.</p>
              <p className="tip">Non-standard positions are highlighted and need to be mapped to standard positions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PositionManager;
