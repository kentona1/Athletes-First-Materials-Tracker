import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

function AddPlayer() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    school: '',
    conference: '',
    hometown: '',
    state: '',
    height: '',
    weight: '',
    class_year: '',
    eligibility_year: new Date().getFullYear(),
    espn_id: '',
    photo_url: ''
  });

  // Search ESPN for players
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await axios.get('/api/players/search-espn', {
        params: { name: searchQuery }
      });

      console.log('Search results:', response.data);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching ESPN:', error);
      alert('Error searching ESPN. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Fetch detailed player data and populate form
  const selectPlayer = async (player) => {
    try {
      // Extract ESPN ID from the player object or URL
      const espnId = player.id || player.url?.match(/\/id\/(\d+)\//)?.[1];

      if (!espnId) {
        console.error('No ESPN ID found for player');
        return;
      }

      console.log('Fetching details for ESPN ID:', espnId);

      // Try to fetch detailed data, but fall back to search data if it fails
      try {
        const response = await axios.get(`/api/players/espn-details/${espnId}`);
        const playerData = response.data.data;

        console.log('✅ Got detailed player data:', playerData);

        // Auto-populate form with detailed data
        setFormData({
          name: playerData.name || player.name || '',
          position: playerData.position || '',
          school: playerData.school || player.school || '',
          conference: playerData.conference || '',
          hometown: playerData.hometown || '',
          state: playerData.state || '',
          height: playerData.height || '',
          weight: playerData.weight ? parseInt(playerData.weight) : '',
          class_year: playerData.class_year || '',
          eligibility_year: new Date().getFullYear(),
          espn_id: espnId || '',
          photo_url: playerData.photo_url || player.image || ''
        });

        setSelectedPlayer({
          ...playerData,
          photo_url: playerData.photo_url || player.image
        });
      } catch (detailError) {
        console.warn('⚠️ ESPN details API failed, trying CFBD:', detailError.message);

        // Try to get detailed data from CFBD
        try {
          console.log('🔍 Searching CFBD for:', player.name);
          const cfbdResponse = await axios.get('/api/players/search-cfbd', {
            params: { name: player.name }
          });

          const cfbdPlayers = cfbdResponse.data.data || [];
          console.log('📊 CFBD returned', cfbdPlayers.length, 'players');

          // Try to find exact match by school
          let cfbdPlayer = cfbdPlayers.find(p =>
            p.school?.toLowerCase() === player.school?.toLowerCase()
          );

          // If no exact school match, use first result
          if (!cfbdPlayer && cfbdPlayers.length > 0) {
            cfbdPlayer = cfbdPlayers[0];
          }

          if (cfbdPlayer) {
            console.log('✅ Found CFBD data:', cfbdPlayer);

            // Merge ESPN data (photo, ESPN ID) with CFBD data (details)
            setFormData({
              name: player.name || '',
              position: cfbdPlayer.position || player.position || '',
              school: cfbdPlayer.school || player.school || '',
              conference: '', // Still need to add this
              hometown: cfbdPlayer.hometown || '',
              state: cfbdPlayer.state || '',
              height: cfbdPlayer.height || '',
              weight: cfbdPlayer.weight || '',
              class_year: '', // Not available in CFBD player search
              eligibility_year: new Date().getFullYear(),
              espn_id: espnId || '',
              photo_url: player.image || ''
            });

            setSelectedPlayer({
              name: player.name,
              school: cfbdPlayer.school || player.school,
              photo_url: player.image,
              espn_id: espnId,
              ...cfbdPlayer
            });
          } else {
            throw new Error('No CFBD data found');
          }
        } catch (cfbdError) {
          console.warn('⚠️ CFBD also failed, using ESPN search data only:', cfbdError.message);

          // Final fallback: use ESPN search data only
          setFormData({
            name: player.name || '',
            position: player.position || '',
            school: player.school || '',
            conference: '',
            hometown: '',
            state: '',
            height: '',
            weight: '',
            class_year: '',
            eligibility_year: new Date().getFullYear(),
            espn_id: espnId || '',
            photo_url: player.image || ''
          });

          setSelectedPlayer({
            name: player.name,
            school: player.school,
            photo_url: player.image,
            espn_id: espnId
          });
        }
      }

      setSearchResults([]); // Clear search results
      setSearchQuery(''); // Clear search
    } catch (error) {
      console.error('Error selecting player:', error);
      alert('Error loading player data. You can still enter manually.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/players', formData);
      alert('Player added successfully!');
      navigate(`/players/${response.data.data.id}`);
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Error adding player');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const clearSelection = () => {
    setSelectedPlayer(null);
    setFormData({
      name: '',
      position: '',
      school: '',
      conference: '',
      hometown: '',
      state: '',
      height: '',
      weight: '',
      class_year: '',
      eligibility_year: new Date().getFullYear(),
      espn_id: '',
      photo_url: ''
    });
  };

  return (
    <div className="add-player">
      <h2>Add New Player</h2>

      {/* ESPN Search Section */}
      <div className="espn-search-section" style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0 }}>🔍 Search ESPN</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search for a player (e.g., Caleb Banks)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={searching || !searchQuery.trim()}
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4>Results ({searchResults.length})</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {searchResults.map((player, index) => (
                <div
                  key={index}
                  onClick={() => selectPlayer(player)}
                  style={{
                    padding: '15px',
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ddd'}
                >
                  {player.image && (
                    <img
                      src={player.image}
                      alt={player.name}
                      style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{player.name}</div>
                    <div style={{ color: '#666', fontSize: '14px' }}>
                      {player.position} • {player.school}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ pointerEvents: 'none' }}
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Show selected player preview */}
      {selectedPlayer && (
        <div style={{ marginBottom: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px', border: '1px solid #4caf50' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {selectedPlayer.photo_url && (
              <img
                src={selectedPlayer.photo_url}
                alt={selectedPlayer.name}
                style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: '#2e7d32' }}>✓ Selected from ESPN</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedPlayer.name}</div>
              <div style={{ color: '#666' }}>
                {selectedPlayer.position} • {selectedPlayer.school}
              </div>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="btn btn-secondary btn-sm"
            >
              Clear & Search Again
            </button>
          </div>
        </div>
      )}

      {/* Player Form */}
      <form onSubmit={handleSubmit} className="player-form">
        <div className="form-group">
          <label>Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Position *</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Class Year *</label>
            <select
              name="class_year"
              value={formData.class_year}
              onChange={handleChange}
              required
            >
              <option value="">Select...</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Fifth Year">Fifth Year</option>
              <option value="RS-Sophomore">RS-Sophomore</option>
              <option value="RS-Junior">RS-Junior</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>School *</label>
            <input
              type="text"
              name="school"
              value={formData.school}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Conference</label>
            <input
              type="text"
              name="conference"
              value={formData.conference}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Height</label>
            <input
              type="text"
              name="height"
              value={formData.height}
              onChange={handleChange}
              placeholder="e.g., 6'6&quot;"
            />
          </div>

          <div className="form-group">
            <label>Weight (lbs)</label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              placeholder="e.g., 330"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Hometown</label>
            <input
              type="text"
              name="hometown"
              value={formData.hometown}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
            />
          </div>
        </div>

        {formData.espn_id && (
          <div className="form-group">
            <label>ESPN ID</label>
            <input
              type="text"
              name="espn_id"
              value={formData.espn_id}
              onChange={handleChange}
              disabled
              style={{ background: '#f0f0f0' }}
            />
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/players')} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add Player
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddPlayer;
