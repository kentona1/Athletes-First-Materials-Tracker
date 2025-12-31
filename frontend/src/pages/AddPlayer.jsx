import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import SchoolAutocomplete from '../components/SchoolAutocomplete';

function AddPlayer() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [transferData, setTransferData] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);

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
    photo_url: '',
    // Recruiting data
    high_school: '',
    recruiting_class_year: null,
    recruiting_stars: null,
    recruiting_rating: null,
    recruiting_ranking: null,
    recruiting_state_ranking: null,
    recruiting_position_ranking: null,
    original_commitment: ''
  });

  // Fetch agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await axios.get('/api/agents');
      setAgents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

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

        // Try to get detailed data from CFBD with fuzzy name matching
        try {
          let cfbdPlayers = [];

          // Try full name first
          console.log('🔍 Searching CFBD for:', player.name);
          let cfbdResponse = await axios.get('/api/players/search-cfbd', {
            params: { name: player.name }
          });
          cfbdPlayers = cfbdResponse.data.data || [];
          console.log('📊 Full name search returned', cfbdPlayers.length, 'players');

          // If no results, try name variations
          if (cfbdPlayers.length === 0) {
            const nameParts = player.name.split(' ');
            if (nameParts.length > 2) {
              // Try removing first part (e.g., "Olaivavega Ioane" → "Vega Ioane")
              const shortName = nameParts.slice(1).join(' ');
              console.log('🔍 Trying shortened name:', shortName);
              cfbdResponse = await axios.get('/api/players/search-cfbd', {
                params: { name: shortName }
              });
              cfbdPlayers = cfbdResponse.data.data || [];
              console.log('📊 Shortened name search returned', cfbdPlayers.length, 'players');
            }

            // If still no results, try just last name
            if (cfbdPlayers.length === 0 && nameParts.length >= 2) {
              const lastName = nameParts[nameParts.length - 1];
              console.log('🔍 Trying last name only:', lastName);
              cfbdResponse = await axios.get('/api/players/search-cfbd', {
                params: { name: lastName }
              });
              cfbdPlayers = cfbdResponse.data.data || [];
              console.log('📊 Last name search returned', cfbdPlayers.length, 'players');
            }
          }

          // Try to find match by school
          let cfbdPlayer = null;
          const espnSchool = player.school?.toLowerCase() || '';

          // Debug: Show what schools CFBD returned
          if (cfbdPlayers.length > 0) {
            console.log('🏫 CFBD schools found:', cfbdPlayers.map(p => p.school).join(', '));
            console.log('🏫 ESPN school to match:', player.school);
          }

          // First, try exact school match
          cfbdPlayer = cfbdPlayers.find(p =>
            p.school?.toLowerCase() === espnSchool
          );

          // If no exact match, try partial school match
          if (!cfbdPlayer && espnSchool) {
            cfbdPlayer = cfbdPlayers.find(p => {
              const cfbdSchool = p.school?.toLowerCase() || '';
              const matches = cfbdSchool.includes(espnSchool) || espnSchool.includes(cfbdSchool);
              if (matches) {
                console.log(`✓ Partial match: "${p.school}" matches "${player.school}"`);
              }
              return matches;
            });
          }

          // If still no match and we have multiple results, don't auto-fill
          if (!cfbdPlayer && cfbdPlayers.length > 0) {
            console.warn(`⚠️ Found ${cfbdPlayers.length} CFBD matches but none match school "${player.school}"`);
            console.warn('   CFBD schools:', cfbdPlayers.map(p => `"${p.school}"`).join(', '));
            console.warn('   Please verify player information manually');
            // Don't use potentially wrong data - let user fill in manually
            cfbdPlayer = null;
          }

          if (cfbdPlayer) {
            console.log('✅ Found CFBD data:', cfbdPlayer);

            // Verify school match for safety
            const schoolMatch = cfbdPlayer.school?.toLowerCase().includes(espnSchool) ||
                               espnSchool.includes(cfbdPlayer.school?.toLowerCase() || '');
            if (!schoolMatch) {
              console.warn('⚠️ School mismatch detected!');
              console.warn(`   ESPN: ${player.school}, CFBD: ${cfbdPlayer.school}`);
            }

            // If hometown is empty, try recruiting data for more details
            let recruitingData = null;
            if (!cfbdPlayer.hometown) {
              try {
                // Use CFBD school name (e.g., "Florida") not ESPN name (e.g., "Florida Gators")
                const teamName = cfbdPlayer.school || player.school;
                console.log('🎓 Hometown empty, trying recruiting data for:', player.name, teamName);
                const recruitResponse = await axios.get('/api/players/recruiting-data', {
                  params: {
                    name: player.name,
                    team: teamName
                  }
                });

                const recruits = recruitResponse.data.data || [];
                console.log('📊 Recruiting returned', recruits.length, 'results');

                if (recruits.length > 0) {
                  recruitingData = recruits[0];
                  console.log('✅ Found recruiting data:', recruitingData);
                }
              } catch (recruitError) {
                console.warn('⚠️ Recruiting data fetch failed:', recruitError.message);
              }
            }

            // Merge ESPN + CFBD + Recruiting data FIRST (to get current school)
            const hometown = recruitingData?.hometown || cfbdPlayer.hometown || '';
            const state = recruitingData?.state || cfbdPlayer.state || '';
            const recruitingYear = recruitingData?.classYear || '';
            const schoolName = cfbdPlayer.school || player.school || '';

            // Calculate class year from recruiting year
            let classYear = '';
            if (recruitingYear) {
              const currentYear = new Date().getFullYear();
              const yearsInCollege = currentYear - recruitingYear + 1;

              // Map years to class standings (default progression, user can override)
              const classMap = {
                1: 'Freshman',
                2: 'Sophomore',
                3: 'Junior',
                4: 'Senior',
                5: 'Fifth Year'
              };
              classYear = classMap[yearsInCollege] || '';
              console.log(`📅 Recruiting year: ${recruitingYear}, Years in college: ${yearsInCollege}, Class: ${classYear}`);
            }

            // Look up school in database to get normalized name and conference
            let conference = '';
            let normalizedSchoolName = schoolName; // Default to raw name if lookup fails
            if (schoolName) {
              try {
                console.log('🏫 Looking up school in database:', schoolName);
                const schoolLookup = await axios.get('/api/schools/lookup', {
                  params: { name: schoolName }
                });

                if (schoolLookup.data.data) {
                  // Use canonical school name from database for consistency
                  normalizedSchoolName = schoolLookup.data.data.school;
                  conference = schoolLookup.data.data.conference || '';
                  console.log('✅ Normalized school name:', normalizedSchoolName);
                  console.log('✅ Conference:', conference);
                }
              } catch (lookupError) {
                console.warn('⚠️ School lookup failed:', lookupError.message);
              }
            }

            // Fetch transfer portal data (AFTER we have normalized school name)
            try {
              console.log('🔄 Fetching transfer portal data...');
              const transferResponse = await axios.get('/api/players/transfer-data', {
                params: {
                  name: player.name,
                  school: normalizedSchoolName, // Pass current school for verification
                  recruitingYear: recruitingYear || undefined // Pass recruiting year for better search range
                }
              });

              const transfers = transferResponse.data.data || [];
              console.log('📊 Transfer portal returned', transfers.length, 'results');

              if (transfers.length > 0) {
                setTransferData(transfers);
                console.log('✅ Found verified transfer history:', transfers);
              } else {
                setTransferData([]);
                if (transferResponse.data.warning) {
                  console.warn('⚠️', transferResponse.data.warning);
                }
              }
            } catch (transferError) {
              console.warn('⚠️ Transfer data fetch failed:', transferError.message);
              setTransferData([]);
            }

            setFormData({
              name: player.name || '',
              position: cfbdPlayer.position || player.position || '',
              school: normalizedSchoolName,
              conference: conference,
              hometown: hometown,
              state: state,
              height: cfbdPlayer.height || '',
              weight: cfbdPlayer.weight || '',
              class_year: classYear,
              eligibility_year: new Date().getFullYear(),
              espn_id: espnId || '',
              photo_url: player.image || '',
              // Recruiting data
              high_school: recruitingData?.highSchool || '',
              recruiting_class_year: recruitingData?.classYear || null,
              recruiting_stars: recruitingData?.stars || null,
              recruiting_rating: recruitingData?.rating || null,
              recruiting_ranking: recruitingData?.ranking || null,
              recruiting_state_ranking: null, // CFBD doesn't provide this
              recruiting_position_ranking: null, // CFBD doesn't provide this
              original_commitment: recruitingData?.school || normalizedSchoolName
            });

            setSelectedPlayer({
              name: player.name,
              school: cfbdPlayer.school || player.school,
              photo_url: player.image,
              espn_id: espnId,
              ...cfbdPlayer,
              hometown,
              state,
              classYear
            });
          } else {
            throw new Error('No CFBD data found');
          }
        } catch (cfbdError) {
          console.warn('⚠️ CFBD also failed, using ESPN search data only:', cfbdError.message);

          // Final fallback: use ESPN search data only, but normalize school name
          let normalizedSchool = player.school || '';
          let fallbackConference = '';

          // Try to normalize school name even in fallback
          if (player.school) {
            try {
              const schoolLookup = await axios.get('/api/schools/lookup', {
                params: { name: player.school }
              });
              if (schoolLookup.data.data) {
                normalizedSchool = schoolLookup.data.data.school;
                fallbackConference = schoolLookup.data.data.conference || '';
                console.log('✅ Normalized ESPN school:', normalizedSchool);
              }
            } catch (lookupError) {
              console.warn('⚠️ School normalization failed, using raw ESPN name');
            }
          }

          setFormData({
            name: player.name || '',
            position: player.position || '',
            school: normalizedSchool,
            conference: fallbackConference,
            hometown: '',
            state: '',
            height: '',
            weight: '',
            class_year: '',
            eligibility_year: new Date().getFullYear(),
            espn_id: espnId || '',
            photo_url: player.image || '',
            // Recruiting data - empty for fallback
            high_school: '',
            recruiting_class_year: null,
            recruiting_stars: null,
            recruiting_rating: null,
            recruiting_ranking: null,
            recruiting_state_ranking: null,
            recruiting_position_ranking: null,
            original_commitment: normalizedSchool
          });

          setSelectedPlayer({
            name: player.name,
            school: normalizedSchool,
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
      // Create player
      const response = await axios.post('/api/players', formData);
      const playerId = response.data.data.id;

      // Save transfer history if any
      if (transferData.length > 0) {
        console.log(`💾 Saving ${transferData.length} transfer records...`);
        for (const transfer of transferData) {
          try {
            await axios.post('/api/players/transfers', {
              player_id: playerId,
              from_school: transfer.fromSchool,
              to_school: transfer.toSchool,
              transfer_season: transfer.transferSeason,
              transfer_year: transfer.transferYear,
              eligibility_remaining: transfer.eligibilityRemaining,
              transfer_type: transfer.transferType || 'Portal'
            });
          } catch (transferError) {
            console.warn('⚠️ Failed to save transfer:', transferError.message);
          }
        }
        console.log('✅ Transfer history saved');
      }

      // Assign agents if any selected
      if (selectedAgents.length > 0) {
        console.log(`👥 Assigning ${selectedAgents.length} agents...`);
        for (const agentId of selectedAgents) {
          try {
            await axios.post('/api/players/assign-agent', {
              playerId,
              agentId
            });
          } catch (agentError) {
            console.warn('⚠️ Failed to assign agent:', agentError.message);
          }
        }
        console.log('✅ Agents assigned');
      }

      alert('Player added successfully!');
      navigate(`/players/${playerId}`);
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
      photo_url: '',
      // Recruiting data
      high_school: '',
      recruiting_class_year: null,
      recruiting_stars: null,
      recruiting_rating: null,
      recruiting_ranking: null,
      recruiting_state_ranking: null,
      recruiting_position_ranking: null,
      original_commitment: ''
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
            <SchoolAutocomplete
              value={formData.school}
              onChange={(school, conference) => {
                setFormData({
                  ...formData,
                  school: school,
                  conference: conference
                });
              }}
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
              disabled
              style={{ background: '#f0f0f0', color: '#666' }}
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

        <div className="form-group full-width">
          <label>Assign Recruiting Agents</label>
          <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto' }}>
            {agents.length === 0 ? (
              <p style={{ color: '#999', fontStyle: 'italic' }}>No agents available</p>
            ) : (
              agents.map(agent => (
                <div key={agent.id} style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedAgents.includes(agent.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAgents([...selectedAgents, agent.id]);
                        } else {
                          setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
                        }
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span>{agent.first_name || agent.last_name ? `${agent.first_name || ''} ${agent.last_name || ''}`.trim() : agent.name}</span>
                  </label>
                </div>
              ))
            )}
          </div>
          <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>
            Select the agents who will be recruiting this player
          </small>
        </div>

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
