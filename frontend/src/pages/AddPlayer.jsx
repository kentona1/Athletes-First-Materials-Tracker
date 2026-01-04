import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import SchoolAutocomplete from '../components/SchoolAutocomplete';
import '../styles/AddPlayer.css';

// Tab constants
const TABS = {
  HIGH_SCHOOL: 'high_school',
  COLLEGE: 'college',
  VETERAN: 'veteran'
};

function AddPlayer() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TABS.COLLEGE);

  // ESPN Search state (for college players)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [transferData, setTransferData] = useState([]);

  // CFBD Search state (for high school players)
  const [hsSearchQuery, setHsSearchQuery] = useState('');
  const [hsSearchResults, setHsSearchResults] = useState([]);
  const [hsSearching, setHsSearching] = useState(false);
  const [selectedHSPlayer, setSelectedHSPlayer] = useState(null);

  // NFL Search state (for veterans)
  const [nflSearchQuery, setNflSearchQuery] = useState('');
  const [nflSearchResults, setNflSearchResults] = useState([]);
  const [nflSearching, setNflSearching] = useState(false);
  const [selectedNFLPlayer, setSelectedNFLPlayer] = useState(null);

  // Agents state
  const [agents, setAgents] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);

  // Generate recruiting class year options
  // Covers HS freshmen through seniors (current year through +3)
  const currentYear = new Date().getFullYear();
  const recruitingClassYears = Array.from({ length: 4 }, (_, i) => currentYear + i);

  // Form data for each player type
  const [collegeFormData, setCollegeFormData] = useState({
    name: '',
    position: '',
    school: '',
    conference: '',
    hometown: '',
    state: '',
    height: '',
    weight: '',
    class_year: '',
    eligibility_year: currentYear,
    espn_id: '',
    photo_url: '',
    high_school: '',
    recruiting_class_year: null,
    recruiting_stars: null,
    recruiting_rating: null,
    recruiting_ranking: null,
    recruiting_state_ranking: null,
    recruiting_position_ranking: null,
    original_commitment: ''
  });

  const [highSchoolFormData, setHighSchoolFormData] = useState({
    name: '',
    position: '',
    high_school: '',
    hometown: '',
    state: '',
    height: '',
    weight: '',
    recruiting_cycle_year: '', // Manual selection required
    recruiting_stars: null,
    recruiting_rating: null,
    recruiting_ranking: null,
    photo_url: ''
  });

  const [veteranFormData, setVeteranFormData] = useState({
    name: '',
    position: '',
    nfl_team: '',
    college: '',
    hometown: '',
    state: '',
    height: '',
    weight: '',
    years_pro: '',
    photo_url: ''
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

  // Search ESPN for college players
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

  // Search CFBD for high school recruits
  const handleHSSearch = async (e) => {
    e.preventDefault();
    if (!hsSearchQuery.trim()) return;

    setHsSearching(true);
    try {
      const response = await axios.get('/api/players/search-hs-recruits', {
        params: { name: hsSearchQuery }
      });

      console.log('HS Search results:', response.data);
      setHsSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching CFBD:', error);
      alert('Error searching recruiting database. Please try again.');
    } finally {
      setHsSearching(false);
    }
  };

  // Select a high school recruit from search results
  const selectHSPlayer = (player) => {
    // Convert height from inches to feet-inches format
    let heightStr = '';
    if (player.height) {
      const feet = Math.floor(player.height / 12);
      const inches = Math.round(player.height % 12);
      heightStr = `${feet}'${inches}"`;
    }

    setHighSchoolFormData({
      name: player.name || '',
      position: player.position || '',
      high_school: player.highSchool || '',
      hometown: player.city || '',
      state: player.state || '',
      height: heightStr,
      weight: player.weight || '',
      recruiting_cycle_year: player.recruitingClass || '',
      recruiting_stars: player.stars || null,
      recruiting_rating: player.rating || null,
      recruiting_ranking: player.ranking || null,
      committed_to: player.committedTo || '',
      photo_url: ''
    });

    setSelectedHSPlayer(player);
    setHsSearchResults([]);
    setHsSearchQuery('');
  };

  // Clear HS player selection
  const clearHSSelection = () => {
    setSelectedHSPlayer(null);
    setHighSchoolFormData({
      name: '',
      position: '',
      high_school: '',
      hometown: '',
      state: '',
      height: '',
      weight: '',
      recruiting_cycle_year: '',
      recruiting_stars: null,
      recruiting_rating: null,
      recruiting_ranking: null,
      photo_url: ''
    });
  };

  // Search ESPN for NFL veterans
  const handleNFLSearch = async (e) => {
    e.preventDefault();
    if (!nflSearchQuery.trim()) return;

    setNflSearching(true);
    try {
      const response = await axios.get('/api/players/search-nfl', {
        params: { name: nflSearchQuery }
      });

      console.log('NFL Search results:', response.data);
      setNflSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching NFL:', error);
      alert('Error searching NFL players. Please try again.');
    } finally {
      setNflSearching(false);
    }
  };

  // Select an NFL player from search results
  const selectNFLPlayer = async (player) => {
    try {
      const espnId = player.id || player.url?.match(/\/id\/(\d+)\//)?.[1];

      if (!espnId) {
        // Use basic data if no ESPN ID
        setVeteranFormData({
          name: player.name || '',
          position: player.position || '',
          nfl_team: player.team || '',
          college: '',
          height: '',
          weight: '',
          years_pro: '',
          photo_url: player.image || ''
        });
        setSelectedNFLPlayer(player);
        setNflSearchResults([]);
        setNflSearchQuery('');
        return;
      }

      // Fetch detailed NFL player data
      const detailsResponse = await axios.get(`/api/players/nfl-details/${espnId}`);
      const details = detailsResponse.data.data;

      // Parse birthPlace into hometown and state (format: "City, State")
      let hometown = '';
      let state = '';
      if (details.birthPlace) {
        const parts = details.birthPlace.split(',').map(p => p.trim());
        hometown = parts[0] || '';
        state = parts[1] || '';
      }

      setVeteranFormData({
        name: details.name || player.name || '',
        position: details.position || player.position || '',
        nfl_team: details.team || player.team || '',
        college: details.college || '',
        hometown: hometown,
        state: state,
        height: details.height || '',
        weight: details.weight ? details.weight.replace(' lbs', '') : '',
        years_pro: details.experience || '',
        photo_url: details.photo_url || player.image || ''
      });

      setSelectedNFLPlayer({ ...player, ...details });
      setNflSearchResults([]);
      setNflSearchQuery('');
    } catch (error) {
      console.error('Error fetching NFL player details:', error);
      // Fall back to basic data
      setVeteranFormData({
        name: player.name || '',
        position: player.position || '',
        nfl_team: player.team || '',
        college: '',
        hometown: '',
        state: '',
        height: '',
        weight: '',
        years_pro: '',
        photo_url: player.image || ''
      });
      setSelectedNFLPlayer(player);
      setNflSearchResults([]);
      setNflSearchQuery('');
    }
  };

  // Clear NFL player selection
  const clearNFLSelection = () => {
    setSelectedNFLPlayer(null);
    setVeteranFormData({
      name: '',
      position: '',
      nfl_team: '',
      college: '',
      height: '',
      weight: '',
      years_pro: '',
      photo_url: ''
    });
  };

  // Fetch detailed player data and populate form (college players)
  const selectPlayer = async (player) => {
    try {
      const espnId = player.id || player.url?.match(/\/id\/(\d+)\//)?.[1];

      if (!espnId) {
        console.error('No ESPN ID found for player');
        return;
      }

      console.log('Fetching details for ESPN ID:', espnId);

      try {
        const response = await axios.get(`/api/players/espn-details/${espnId}`);
        const playerData = response.data.data;

        console.log('✅ Got detailed player data:', playerData);

        setCollegeFormData({
          name: playerData.name || player.name || '',
          position: playerData.position || '',
          school: playerData.school || player.school || '',
          conference: playerData.conference || '',
          hometown: playerData.hometown || '',
          state: playerData.state || '',
          height: playerData.height || '',
          weight: playerData.weight ? parseInt(playerData.weight) : '',
          class_year: playerData.class_year || '',
          eligibility_year: currentYear,
          espn_id: espnId || '',
          photo_url: playerData.photo_url || player.image || ''
        });

        setSelectedPlayer({
          ...playerData,
          photo_url: playerData.photo_url || player.image
        });
      } catch (detailError) {
        console.warn('⚠️ ESPN details API failed, trying CFBD:', detailError.message);

        // Try CFBD fallback
        try {
          let cfbdPlayers = [];
          console.log('🔍 Searching CFBD for:', player.name);
          let cfbdResponse = await axios.get('/api/players/search-cfbd', {
            params: { name: player.name }
          });
          cfbdPlayers = cfbdResponse.data.data || [];

          if (cfbdPlayers.length === 0) {
            const nameParts = player.name.split(' ');
            if (nameParts.length > 2) {
              const shortName = nameParts.slice(1).join(' ');
              cfbdResponse = await axios.get('/api/players/search-cfbd', {
                params: { name: shortName }
              });
              cfbdPlayers = cfbdResponse.data.data || [];
            }

            if (cfbdPlayers.length === 0 && nameParts.length >= 2) {
              const lastName = nameParts[nameParts.length - 1];
              cfbdResponse = await axios.get('/api/players/search-cfbd', {
                params: { name: lastName }
              });
              cfbdPlayers = cfbdResponse.data.data || [];
            }
          }

          let cfbdPlayer = null;
          const espnSchool = player.school?.toLowerCase() || '';

          cfbdPlayer = cfbdPlayers.find(p => p.school?.toLowerCase() === espnSchool);

          if (!cfbdPlayer && espnSchool) {
            cfbdPlayer = cfbdPlayers.find(p => {
              const cfbdSchool = p.school?.toLowerCase() || '';
              return cfbdSchool.includes(espnSchool) || espnSchool.includes(cfbdSchool);
            });
          }

          if (cfbdPlayer) {
            // Fetch recruiting data if needed
            let recruitingData = null;
            if (!cfbdPlayer.hometown) {
              try {
                const teamName = cfbdPlayer.school || player.school;
                const recruitResponse = await axios.get('/api/players/recruiting-data', {
                  params: { name: player.name, team: teamName }
                });
                const recruits = recruitResponse.data.data || [];
                if (recruits.length > 0) {
                  recruitingData = recruits[0];
                }
              } catch (recruitError) {
                console.warn('⚠️ Recruiting data fetch failed:', recruitError.message);
              }
            }

            const hometown = recruitingData?.hometown || cfbdPlayer.hometown || '';
            const state = recruitingData?.state || cfbdPlayer.state || '';
            const recruitingYear = recruitingData?.classYear || '';
            const schoolName = cfbdPlayer.school || player.school || '';

            let classYear = '';
            if (recruitingYear) {
              const yearsInCollege = currentYear - recruitingYear + 1;
              const classMap = {
                1: 'Freshman', 2: 'Sophomore', 3: 'Junior',
                4: 'Senior', 5: 'Fifth Year'
              };
              classYear = classMap[yearsInCollege] || '';
            }

            // Look up school for conference
            let conference = '';
            let normalizedSchoolName = schoolName;
            if (schoolName) {
              try {
                const schoolLookup = await axios.get('/api/schools/lookup', {
                  params: { name: schoolName }
                });
                if (schoolLookup.data.data) {
                  normalizedSchoolName = schoolLookup.data.data.school;
                  conference = schoolLookup.data.data.conference || '';
                }
              } catch (lookupError) {
                console.warn('⚠️ School lookup failed:', lookupError.message);
              }
            }

            // Fetch transfer data
            try {
              const transferResponse = await axios.get('/api/players/transfer-data', {
                params: {
                  name: player.name,
                  school: normalizedSchoolName,
                  recruitingYear: recruitingYear || undefined
                }
              });
              const transfers = transferResponse.data.data || [];
              if (transfers.length > 0) {
                setTransferData(transfers);
              } else {
                setTransferData([]);
              }
            } catch (transferError) {
              setTransferData([]);
            }

            setCollegeFormData({
              name: player.name || '',
              position: cfbdPlayer.position || player.position || '',
              school: normalizedSchoolName,
              conference: conference,
              hometown: hometown,
              state: state,
              height: cfbdPlayer.height || '',
              weight: cfbdPlayer.weight || '',
              class_year: classYear,
              eligibility_year: currentYear,
              espn_id: espnId || '',
              photo_url: player.image || '',
              high_school: recruitingData?.highSchool || '',
              recruiting_class_year: recruitingData?.classYear || null,
              recruiting_stars: recruitingData?.stars || null,
              recruiting_rating: recruitingData?.rating || null,
              recruiting_ranking: recruitingData?.ranking || null,
              recruiting_state_ranking: null,
              recruiting_position_ranking: null,
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
          // Final fallback: use ESPN search data only
          let normalizedSchool = player.school || '';
          let fallbackConference = '';

          if (player.school) {
            try {
              const schoolLookup = await axios.get('/api/schools/lookup', {
                params: { name: player.school }
              });
              if (schoolLookup.data.data) {
                normalizedSchool = schoolLookup.data.data.school;
                fallbackConference = schoolLookup.data.data.conference || '';
              }
            } catch (lookupError) {
              console.warn('⚠️ School normalization failed');
            }
          }

          setCollegeFormData({
            name: player.name || '',
            position: player.position || '',
            school: normalizedSchool,
            conference: fallbackConference,
            hometown: '',
            state: '',
            height: '',
            weight: '',
            class_year: '',
            eligibility_year: currentYear,
            espn_id: espnId || '',
            photo_url: player.image || '',
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

      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Error selecting player:', error);
      alert('Error loading player data. You can still enter manually.');
    }
  };

  // Submit handlers for each player type
  const handleSubmitCollege = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/players', {
        ...collegeFormData,
        player_type: 'college'
      });
      const playerId = response.data.data.id;

      // Save transfer history if any
      if (transferData.length > 0) {
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
      }

      // Assign agents if any selected
      if (selectedAgents.length > 0) {
        for (const agentId of selectedAgents) {
          try {
            await axios.post('/api/players/assign-agent', { playerId, agentId });
          } catch (agentError) {
            console.warn('⚠️ Failed to assign agent:', agentError.message);
          }
        }
      }

      alert('College player added successfully!');
      navigate(`/players/${playerId}`);
    } catch (error) {
      handleSubmitError(error);
    }
  };

  const handleSubmitHighSchool = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/players', {
        name: highSchoolFormData.name,
        position: highSchoolFormData.position,
        high_school: highSchoolFormData.high_school,
        hometown: highSchoolFormData.hometown,
        state: highSchoolFormData.state,
        height: highSchoolFormData.height,
        weight: highSchoolFormData.weight,
        recruiting_cycle_year: highSchoolFormData.recruiting_cycle_year,
        recruiting_stars: highSchoolFormData.recruiting_stars,
        recruiting_rating: highSchoolFormData.recruiting_rating,
        recruiting_ranking: highSchoolFormData.recruiting_ranking,
        photo_url: highSchoolFormData.photo_url,
        player_type: 'high_school',
        eligibility_year: currentYear
      });
      const playerId = response.data.data.id;

      // Assign agents if any selected
      if (selectedAgents.length > 0) {
        for (const agentId of selectedAgents) {
          try {
            await axios.post('/api/players/assign-agent', { playerId, agentId });
          } catch (agentError) {
            console.warn('⚠️ Failed to assign agent:', agentError.message);
          }
        }
      }

      alert('High school player added successfully!');
      navigate(`/players/${playerId}`);
    } catch (error) {
      handleSubmitError(error);
    }
  };

  const handleSubmitVeteran = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/players', {
        name: veteranFormData.name,
        position: veteranFormData.position,
        school: veteranFormData.college, // Store college as school
        nfl_team: veteranFormData.nfl_team,
        hometown: veteranFormData.hometown,
        state: veteranFormData.state,
        height: veteranFormData.height,
        weight: veteranFormData.weight,
        years_pro: veteranFormData.years_pro,
        photo_url: veteranFormData.photo_url,
        player_type: 'veteran',
        eligibility_year: currentYear
      });
      const playerId = response.data.data.id;

      // Assign agents if any selected
      if (selectedAgents.length > 0) {
        for (const agentId of selectedAgents) {
          try {
            await axios.post('/api/players/assign-agent', { playerId, agentId });
          } catch (agentError) {
            console.warn('⚠️ Failed to assign agent:', agentError.message);
          }
        }
      }

      alert('NFL veteran added successfully!');
      navigate(`/players/${playerId}`);
    } catch (error) {
      handleSubmitError(error);
    }
  };

  const handleSubmitError = (error) => {
    console.error('Error adding player:', error);
    if (error.response?.status === 409) {
      const errorData = error.response.data;
      const existingPlayerId = errorData.existingPlayerId;
      if (existingPlayerId) {
        const viewExisting = window.confirm(
          `${errorData.message}\n\nWould you like to view the existing player?`
        );
        if (viewExisting) {
          navigate(`/players/${existingPlayerId}`);
        }
      } else {
        alert(errorData.message || 'This player already exists in the database');
      }
    } else {
      alert('Error adding player: ' + (error.response?.data?.message || error.message));
    }
  };

  const clearSelection = () => {
    setSelectedPlayer(null);
    setCollegeFormData({
      name: '', position: '', school: '', conference: '',
      hometown: '', state: '', height: '', weight: '', class_year: '',
      eligibility_year: currentYear, espn_id: '', photo_url: '',
      high_school: '', recruiting_class_year: null, recruiting_stars: null,
      recruiting_rating: null, recruiting_ranking: null,
      recruiting_state_ranking: null, recruiting_position_ranking: null,
      original_commitment: ''
    });
    setTransferData([]);
  };

  // Agent helpers
  const getAgentInitials = (agent) => {
    if (agent.first_name && agent.last_name) {
      return `${agent.first_name[0]}${agent.last_name[0]}`.toUpperCase();
    } else if (agent.name) {
      const parts = agent.name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return agent.name.substring(0, 2).toUpperCase();
    }
    return '?';
  };

  const getAgentDisplayName = (agent) => {
    if (agent.first_name || agent.last_name) {
      return `${agent.first_name || ''} ${agent.last_name || ''}`.trim();
    }
    return agent.name || 'Unknown Agent';
  };

  const toggleAgentSelection = (agentId) => {
    if (selectedAgents.includes(agentId)) {
      setSelectedAgents(selectedAgents.filter(id => id !== agentId));
    } else {
      setSelectedAgents([...selectedAgents, agentId]);
    }
  };

  // Render agent selection grid (shared across all tabs)
  const renderAgentSelection = () => (
    <div className="agent-assignment-section">
      <label>
        Assign Recruiting Agents
        {selectedAgents.length > 0 && (
          <span className="agent-selection-counter">{selectedAgents.length} selected</span>
        )}
      </label>
      {agents.length === 0 ? (
        <div className="agents-empty-state">No agents available</div>
      ) : (
        <div className="agents-grid">
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`agent-card ${selectedAgents.includes(agent.id) ? 'selected' : ''}`}
              onClick={() => toggleAgentSelection(agent.id)}
            >
              <div className="agent-card-checkbox"></div>
              <div className="agent-card-initials">{getAgentInitials(agent)}</div>
              <div className="agent-card-name">{getAgentDisplayName(agent)}</div>
            </div>
          ))}
        </div>
      )}
      <small className="agent-assignment-help">
        Click on agent cards to assign them to this player
      </small>
    </div>
  );

  // Render College Player Form
  const renderCollegeForm = () => (
    <>
      {/* ESPN Search Section */}
      <div className="espn-search-section">
        <h3>Search ESPN</h3>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search for a college player..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-primary" disabled={searching || !searchQuery.trim()}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="search-results">
            <h4>Results ({searchResults.length})</h4>
            <div className="results-grid">
              {searchResults.map((player, index) => (
                <div key={index} onClick={() => selectPlayer(player)} className="search-result-card">
                  {player.image && (
                    <img src={player.image} alt={player.name} className="player-image" />
                  )}
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-details">{player.position} • {player.school}</div>
                  </div>
                  <button className="btn btn-sm btn-primary" style={{ pointerEvents: 'none' }}>Select</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected player preview */}
      {selectedPlayer && (
        <div className="selected-player-preview">
          <div className="preview-content">
            {selectedPlayer.photo_url && (
              <img src={selectedPlayer.photo_url} alt={selectedPlayer.name} className="preview-image" />
            )}
            <div className="preview-info">
              <div className="preview-badge">✓ Selected from ESPN</div>
              <div className="preview-name">{selectedPlayer.name}</div>
              <div className="preview-details">{selectedPlayer.position} • {selectedPlayer.school}</div>
            </div>
            <button type="button" onClick={clearSelection} className="btn btn-secondary btn-sm">
              Clear & Search Again
            </button>
          </div>
        </div>
      )}

      {/* College Player Form */}
      <form onSubmit={handleSubmitCollege} className="player-form">
        <div className="form-group">
          <label>Name *</label>
          <input
            type="text"
            name="name"
            value={collegeFormData.name}
            onChange={(e) => setCollegeFormData({ ...collegeFormData, name: e.target.value })}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Position *</label>
            <input
              type="text"
              name="position"
              value={collegeFormData.position}
              onChange={(e) => setCollegeFormData({ ...collegeFormData, position: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Class Year *</label>
            <select
              name="class_year"
              value={collegeFormData.class_year}
              onChange={(e) => setCollegeFormData({ ...collegeFormData, class_year: e.target.value })}
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
              value={collegeFormData.school}
              onChange={(school, conference) => {
                setCollegeFormData({ ...collegeFormData, school, conference });
              }}
              required
            />
          </div>

          <div className="form-group">
            <label>Conference</label>
            <input
              type="text"
              name="conference"
              value={collegeFormData.conference}
              disabled
              className="disabled-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Height</label>
            <input
              type="text"
              name="height"
              value={collegeFormData.height}
              onChange={(e) => setCollegeFormData({ ...collegeFormData, height: e.target.value })}
              placeholder="e.g., 6'6&quot;"
            />
          </div>

          <div className="form-group">
            <label>Weight (lbs)</label>
            <input
              type="number"
              name="weight"
              value={collegeFormData.weight}
              onChange={(e) => setCollegeFormData({ ...collegeFormData, weight: e.target.value })}
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
              value={collegeFormData.hometown}
              onChange={(e) => setCollegeFormData({ ...collegeFormData, hometown: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              name="state"
              value={collegeFormData.state}
              onChange={(e) => setCollegeFormData({ ...collegeFormData, state: e.target.value })}
            />
          </div>
        </div>

        {collegeFormData.espn_id && (
          <div className="form-group">
            <label>ESPN ID</label>
            <input type="text" value={collegeFormData.espn_id} disabled className="disabled-input" />
          </div>
        )}

        {renderAgentSelection()}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/players')} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">Add College Player</button>
        </div>
      </form>
    </>
  );

  // Render High School Player Form
  const renderHighSchoolForm = () => (
    <>
      {/* CFBD Recruiting Search Section */}
      <div className="cfbd-search-section">
        <h3>Search Recruiting Database</h3>
        <form onSubmit={handleHSSearch} className="search-form">
          <input
            type="text"
            placeholder="Search for a high school recruit..."
            value={hsSearchQuery}
            onChange={(e) => setHsSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-primary" disabled={hsSearching || !hsSearchQuery.trim()}>
            {hsSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {hsSearchResults.length > 0 && (
          <div className="search-results">
            <h4>Results ({hsSearchResults.length})</h4>
            <div className="results-grid hs-results">
              {hsSearchResults.map((player, index) => (
                <div key={index} onClick={() => selectHSPlayer(player)} className="search-result-card hs-card">
                  <div className="hs-player-info">
                    <div className="player-name">
                      {player.name}
                      {player.stars && (
                        <span className="stars-badge">{'⭐'.repeat(player.stars)}</span>
                      )}
                    </div>
                    <div className="player-details">
                      {player.position} • {player.highSchool} ({player.state})
                    </div>
                    <div className="player-meta">
                      <span className="class-badge">Class of {player.recruitingClass}</span>
                      {player.ranking && <span className="ranking-badge">#{player.ranking} National</span>}
                      {player.committedTo && <span className="committed-badge">Committed: {player.committedTo}</span>}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-primary" style={{ pointerEvents: 'none' }}>Select</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected HS player preview */}
      {selectedHSPlayer && (
        <div className="selected-player-preview hs-preview">
          <div className="preview-content">
            <div className="hs-avatar">
              {selectedHSPlayer.stars ? '⭐'.repeat(selectedHSPlayer.stars) : '🏈'}
            </div>
            <div className="preview-info">
              <div className="preview-badge">✓ Selected from Recruiting Database</div>
              <div className="preview-name">{selectedHSPlayer.name}</div>
              <div className="preview-details">
                {selectedHSPlayer.position} • {selectedHSPlayer.highSchool} ({selectedHSPlayer.state}) • Class of {selectedHSPlayer.recruitingClass}
              </div>
              {selectedHSPlayer.committedTo && (
                <div className="preview-commitment">Committed to {selectedHSPlayer.committedTo}</div>
              )}
            </div>
            <button type="button" onClick={clearHSSelection} className="btn btn-secondary btn-sm">
              Clear & Search Again
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitHighSchool} className="player-form">
        <div className="form-info-banner">
          <span className="info-icon">ℹ️</span>
          <span>High school players can be upgraded to college players once they commit and enroll.</span>
        </div>

        <div className="form-group">
          <label>Name *</label>
          <input
            type="text"
            name="name"
            value={highSchoolFormData.name}
            onChange={(e) => setHighSchoolFormData({ ...highSchoolFormData, name: e.target.value })}
            required
            placeholder="First Last"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Position *</label>
            <input
              type="text"
              name="position"
              value={highSchoolFormData.position}
              onChange={(e) => setHighSchoolFormData({ ...highSchoolFormData, position: e.target.value })}
              required
              placeholder="e.g., QB, WR, OT"
            />
          </div>

          <div className="form-group">
            <label>Recruiting Class *</label>
            <select
              name="recruiting_cycle_year"
              value={highSchoolFormData.recruiting_cycle_year}
              onChange={(e) => setHighSchoolFormData({ ...highSchoolFormData, recruiting_cycle_year: parseInt(e.target.value) })}
              required
            >
              <option value="">Select class year...</option>
              {recruitingClassYears.map(year => (
                <option key={year} value={year}>Class of {year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>High School *</label>
            <input
              type="text"
              name="high_school"
              value={highSchoolFormData.high_school}
              onChange={(e) => setHighSchoolFormData({ ...highSchoolFormData, high_school: e.target.value })}
              required
              placeholder="High school name"
            />
          </div>

          <div className="form-group">
            <label>State *</label>
            <input
              type="text"
              name="state"
              value={highSchoolFormData.state}
              onChange={(e) => setHighSchoolFormData({ ...highSchoolFormData, state: e.target.value })}
              required
              placeholder="e.g., TX, CA, FL"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Hometown</label>
          <input
            type="text"
            name="hometown"
            value={highSchoolFormData.hometown}
            onChange={(e) => setHighSchoolFormData({ ...highSchoolFormData, hometown: e.target.value })}
            placeholder="City name"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Height</label>
            <input
              type="text"
              name="height"
              value={highSchoolFormData.height}
              onChange={(e) => setHighSchoolFormData({ ...highSchoolFormData, height: e.target.value })}
              placeholder="e.g., 6'2&quot;"
            />
          </div>

          <div className="form-group">
            <label>Weight (lbs)</label>
            <input
              type="number"
              name="weight"
              value={highSchoolFormData.weight}
              onChange={(e) => setHighSchoolFormData({ ...highSchoolFormData, weight: e.target.value })}
              placeholder="e.g., 220"
            />
          </div>
        </div>

        <div className="form-section-header">Recruiting Rankings (Optional)</div>

        <div className="form-row">
          <div className="form-group">
            <label>Stars</label>
            <select
              name="recruiting_stars"
            value={highSchoolFormData.recruiting_stars || ''}
            onChange={(e) => setHighSchoolFormData({ ...highSchoolFormData, recruiting_stars: e.target.value ? parseInt(e.target.value) : null })}
          >
            <option value="">Select...</option>
            <option value="5">⭐⭐⭐⭐⭐ 5-Star</option>
            <option value="4">⭐⭐⭐⭐ 4-Star</option>
            <option value="3">⭐⭐⭐ 3-Star</option>
            <option value="2">⭐⭐ 2-Star</option>
          </select>
        </div>

        <div className="form-group">
          <label>National Ranking</label>
          <input
            type="number"
            name="recruiting_ranking"
            value={highSchoolFormData.recruiting_ranking || ''}
            onChange={(e) => setHighSchoolFormData({ ...highSchoolFormData, recruiting_ranking: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="e.g., 15"
          />
        </div>
      </div>

      {renderAgentSelection()}

      <div className="form-actions">
        <button type="button" onClick={() => navigate('/players')} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">Add High School Player</button>
      </div>
    </form>
    </>
  );

  // Render NFL Veteran Form
  const renderVeteranForm = () => (
    <>
      {/* ESPN NFL Search Section */}
      <div className="espn-search-section nfl-search">
        <h3>Search ESPN NFL Players</h3>
        <form onSubmit={handleNFLSearch} className="search-form">
          <input
            type="text"
            placeholder="Search for an NFL player..."
            value={nflSearchQuery}
            onChange={(e) => setNflSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-primary" disabled={nflSearching || !nflSearchQuery.trim()}>
            {nflSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {nflSearchResults.length > 0 && (
          <div className="search-results">
            <h4>Results ({nflSearchResults.length})</h4>
            <div className="results-grid">
              {nflSearchResults.map((player, index) => (
                <div key={index} onClick={() => selectNFLPlayer(player)} className="search-result-card">
                  {player.image && (
                    <img src={player.image} alt={player.name} className="player-image" />
                  )}
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-details">{player.position} • {player.team}</div>
                  </div>
                  <button className="btn btn-sm btn-primary" style={{ pointerEvents: 'none' }}>Select</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected NFL player preview */}
      {selectedNFLPlayer && (
        <div className="selected-player-preview nfl-preview">
          <div className="preview-content">
            {selectedNFLPlayer.photo_url || selectedNFLPlayer.image ? (
              <img src={selectedNFLPlayer.photo_url || selectedNFLPlayer.image} alt={selectedNFLPlayer.name} className="preview-image" />
            ) : null}
            <div className="preview-info">
              <div className="preview-badge nfl-badge">✓ Selected from ESPN NFL</div>
              <div className="preview-name">{selectedNFLPlayer.name}</div>
              <div className="preview-details">{selectedNFLPlayer.position} • {selectedNFLPlayer.team || veteranFormData.nfl_team}</div>
            </div>
            <button type="button" onClick={clearNFLSelection} className="btn btn-secondary btn-sm">
              Clear & Search Again
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitVeteran} className="player-form">
        <div className="form-info-banner veteran">
          <span className="info-icon">🏈</span>
          <span>NFL veterans are players who have already played professionally.</span>
        </div>

        <div className="form-group">
          <label>Name *</label>
          <input
            type="text"
            name="name"
            value={veteranFormData.name}
            onChange={(e) => setVeteranFormData({ ...veteranFormData, name: e.target.value })}
            required
            placeholder="First Last"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Position *</label>
            <input
              type="text"
              name="position"
              value={veteranFormData.position}
              onChange={(e) => setVeteranFormData({ ...veteranFormData, position: e.target.value })}
              required
              placeholder="e.g., QB, WR, OT"
            />
          </div>

          <div className="form-group">
            <label>NFL Team</label>
            <input
              type="text"
              name="nfl_team"
              value={veteranFormData.nfl_team}
              onChange={(e) => setVeteranFormData({ ...veteranFormData, nfl_team: e.target.value })}
              placeholder="e.g., Dallas Cowboys, Free Agent"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>College</label>
            <input
              type="text"
              name="college"
              value={veteranFormData.college}
              onChange={(e) => setVeteranFormData({ ...veteranFormData, college: e.target.value })}
              placeholder="College attended"
            />
          </div>

          <div className="form-group">
            <label>Years Pro</label>
            <input
              type="number"
              name="years_pro"
              value={veteranFormData.years_pro}
              onChange={(e) => setVeteranFormData({ ...veteranFormData, years_pro: e.target.value })}
              placeholder="e.g., 3"
              min="0"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Hometown</label>
            <input
              type="text"
              name="hometown"
              value={veteranFormData.hometown}
              onChange={(e) => setVeteranFormData({ ...veteranFormData, hometown: e.target.value })}
              placeholder="City"
            />
          </div>

          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              name="state"
              value={veteranFormData.state}
              onChange={(e) => setVeteranFormData({ ...veteranFormData, state: e.target.value })}
              placeholder="State"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Height</label>
            <input
              type="text"
              name="height"
              value={veteranFormData.height}
              onChange={(e) => setVeteranFormData({ ...veteranFormData, height: e.target.value })}
              placeholder="e.g., 6'4&quot;"
            />
          </div>

          <div className="form-group">
            <label>Weight (lbs)</label>
            <input
              type="number"
              name="weight"
              value={veteranFormData.weight}
              onChange={(e) => setVeteranFormData({ ...veteranFormData, weight: e.target.value })}
              placeholder="e.g., 250"
            />
          </div>
        </div>

        {renderAgentSelection()}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/players')} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">Add NFL Veteran</button>
        </div>
      </form>
    </>
  );

  return (
    <div className="add-player">
      <h2>Add New Player</h2>

      {/* Tab Navigation */}
      <div className="player-type-tabs">
        <button
          className={`tab-button ${activeTab === TABS.HIGH_SCHOOL ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.HIGH_SCHOOL)}
        >
          <span className="tab-icon">🎓</span>
          High School
        </button>
        <button
          className={`tab-button ${activeTab === TABS.COLLEGE ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.COLLEGE)}
        >
          <span className="tab-icon">🏟️</span>
          College
        </button>
        <button
          className={`tab-button ${activeTab === TABS.VETERAN ? 'active' : ''}`}
          onClick={() => setActiveTab(TABS.VETERAN)}
        >
          <span className="tab-icon">🏈</span>
          NFL Veteran
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === TABS.COLLEGE && renderCollegeForm()}
        {activeTab === TABS.HIGH_SCHOOL && renderHighSchoolForm()}
        {activeTab === TABS.VETERAN && renderVeteranForm()}
      </div>
    </div>
  );
}

export default AddPlayer;
