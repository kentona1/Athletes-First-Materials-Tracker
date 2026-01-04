import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import { formatHeight } from '../utils/formatters';
import MaterialEventForm from '../components/MaterialEventForm';
import SchoolAutocomplete from '../components/SchoolAutocomplete';
import '../styles/PlayerDetail.css';

function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [progressionLogos, setProgressionLogos] = useState({}); // Map of school name to logo URL
  const [materialEvents, setMaterialEvents] = useState([]); // Event-based materials
  const [loading, setLoading] = useState(true);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [agents, setAgents] = useState([]);
  const [editingStatus, setEditingStatus] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeData, setUpgradeData] = useState({
    school: '',
    conference: '',
    class_year: 'Freshman',
    espn_id: '',
    photo_url: '',
    height: '',
    weight: ''
  });

  // ESPN search state for upgrade to college modal
  const [upgradeSearchQuery, setUpgradeSearchQuery] = useState('');
  const [upgradeSearchResults, setUpgradeSearchResults] = useState([]);
  const [upgradeSearching, setUpgradeSearching] = useState(false);
  const [selectedUpgradePlayer, setSelectedUpgradePlayer] = useState(null);

  // Upgrade to Veteran state
  const [showVeteranModal, setShowVeteranModal] = useState(false);
  const [veteranUpgradeData, setVeteranUpgradeData] = useState({
    nfl_team: '',
    years_pro: 1,
    espn_id: '',
    photo_url: '',
    height: '',
    weight: ''
  });

  // NFL search state for veteran upgrade modal
  const [veteranSearchQuery, setVeteranSearchQuery] = useState('');
  const [veteranSearchResults, setVeteranSearchResults] = useState([]);
  const [veteranSearching, setVeteranSearching] = useState(false);
  const [selectedVeteranPlayer, setSelectedVeteranPlayer] = useState(null);

  // Connect to ESPN/CFBD state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectSearchQuery, setConnectSearchQuery] = useState('');
  const [connectSearchResults, setConnectSearchResults] = useState([]);
  const [connectSearching, setConnectSearching] = useState(false);
  const [selectedConnectPlayer, setSelectedConnectPlayer] = useState(null);
  const [connectData, setConnectData] = useState({
    espn_id: '',
    photo_url: '',
    height: '',
    weight: '',
    hometown: '',
    state: '',
    high_school: '',
    recruiting_class_year: null,
    recruiting_stars: null,
    recruiting_rating: null,
    recruiting_ranking: null,
    original_commitment: ''
  });
  const [connectTransferData, setConnectTransferData] = useState([]);
  const [connectSaving, setConnectSaving] = useState(false);
  const [manualSchoolSearch, setManualSchoolSearch] = useState('');
  const [searching247, setSearching247] = useState(false);

  const [outcomeData, setOutcomeData] = useState({
    status: '',
    outcome_date: '',
    draft_round: '',
    draft_pick: '',
    draft_year: '',
    signed_team: '',
    notes: ''
  });

  const [newMaterial, setNewMaterial] = useState({
    materialTypeId: '',
    agentId: '',
    title: '',
    deliveryMethod: 'Meeting',
    deliveryDate: new Date().toISOString().split('T')[0],
    filePath: '',
    notes: ''
  });

  // Navigation state for prev/next players
  const [adjacentPlayers, setAdjacentPlayers] = useState({ prev: null, next: null });

  useEffect(() => {
    fetchPlayerDetails();
    fetchMaterialTypes();
    fetchAgents();
    fetchMaterialEvents();
    fetchAdjacentPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keyboard navigation (left/right arrows)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't navigate if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      if (e.key === 'ArrowLeft' && adjacentPlayers.prev) {
        navigate(`/players/${adjacentPlayers.prev}`);
      } else if (e.key === 'ArrowRight' && adjacentPlayers.next) {
        navigate(`/players/${adjacentPlayers.next}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [adjacentPlayers, navigate]);

  const fetchAdjacentPlayers = async () => {
    try {
      // Get all player IDs sorted by last name (matching list view default)
      const response = await axios.get('/api/players?sortBy=lastName');
      const players = response.data.data || [];
      const currentIndex = players.findIndex(p => p.id === parseInt(id));

      if (currentIndex !== -1) {
        setAdjacentPlayers({
          prev: currentIndex > 0 ? players[currentIndex - 1].id : null,
          next: currentIndex < players.length - 1 ? players[currentIndex + 1].id : null
        });
      }
    } catch (error) {
      console.error('Error fetching adjacent players:', error);
    }
  };

  const fetchProgressionLogos = async (playerData) => {
    const logos = {};
    const schoolsToFetch = [];

    // Collect all unique schools in the progression
    if (playerData.original_commitment) {
      schoolsToFetch.push(playerData.original_commitment);
    }
    if (playerData.transfers && playerData.transfers.length > 0) {
      playerData.transfers.forEach(transfer => {
        // Add both from_school and to_school
        if (transfer.from_school && !schoolsToFetch.includes(transfer.from_school)) {
          schoolsToFetch.push(transfer.from_school);
        }
        if (transfer.to_school && !schoolsToFetch.includes(transfer.to_school)) {
          schoolsToFetch.push(transfer.to_school);
        }
      });
    }
    if (playerData.school && !schoolsToFetch.includes(playerData.school)) {
      schoolsToFetch.push(playerData.school);
    }

    // Fetch logo for each school
    for (const schoolName of schoolsToFetch) {
      try {
        const response = await axios.get('/api/schools/lookup', {
          params: { name: schoolName }
        });
        if (response.data.data && response.data.data.logo) {
          logos[schoolName] = response.data.data.logo;
        }
      } catch (error) {
        console.warn(`Could not fetch logo for ${schoolName}:`, error);
      }
    }

    setProgressionLogos(logos);
  };

  const fetchPlayerDetails = async () => {
    try {
      const response = await axios.get(`/api/players/${id}`);
      const playerData = response.data.data;
      setPlayer(playerData);

      // Initialize outcome data from player and outcome (merge both sources)
      const currentOutcome = playerData.outcome || {};
      setOutcomeData({
        status: currentOutcome.status || playerData.status || 'Active',
        outcome_date: currentOutcome.outcome_date || '',
        draft_round: currentOutcome.draft_round ?? playerData.draft_round ?? '',
        draft_pick: currentOutcome.draft_pick || '',
        draft_year: currentOutcome.draft_year ?? playerData.draft_year ?? '',
        signed_team: currentOutcome.signed_team || '',
        notes: currentOutcome.notes || ''
      });

      // Fetch school data for logo
      if (playerData.school) {
        try {
          const schoolResponse = await axios.get('/api/schools/lookup', {
            params: { name: playerData.school }
          });
          if (schoolResponse.data.data) {
            setSchoolData(schoolResponse.data.data);
          }
        } catch (schoolError) {
          console.warn('Could not fetch school data:', schoolError);
        }
      }

      // Fetch logos for progression timeline schools
      await fetchProgressionLogos(playerData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching player:', error);
      setLoading(false);
    }
  };

  const fetchMaterialTypes = async () => {
    try {
      const response = await axios.get('/api/materials/types');
      setMaterialTypes(response.data.data);
    } catch (error) {
      console.error('Error fetching material types:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await axios.get('/api/agents');
      setAgents(response.data.data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchMaterialEvents = async () => {
    try {
      const response = await axios.get(`/api/materials/events/${id}`);
      setMaterialEvents(response.data.data || []);
      console.log('📦 Loaded', response.data.data?.length || 0, 'material events');
    } catch (error) {
      console.error('Error fetching material events:', error);
      setMaterialEvents([]);
    }
  };

  const handleEventCreated = (eventData) => {
    console.log('✅ Event created:', eventData);
    setShowMaterialForm(false);
    fetchMaterialEvents(); // Reload events
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/materials', {
        playerId: id,
        ...newMaterial
      });

      setShowMaterialForm(false);
      setNewMaterial({
        materialTypeId: '',
        agentId: '',
        title: '',
        deliveryMethod: 'Meeting',
        deliveryDate: new Date().toISOString().split('T')[0],
        filePath: '',
        notes: ''
      });

      fetchPlayerDetails();
      alert('Material logged successfully!');
    } catch (error) {
      console.error('Error adding material:', error);
      alert('Error logging material');
    }
  };

  const handleUpdateOutcome = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/players/${id}/outcome`, outcomeData);

      setEditingStatus(false);
      fetchPlayerDetails();
      alert('Player status updated successfully!');
    } catch (error) {
      console.error('Error updating player outcome:', error);
      alert('Error updating player status');
    }
  };

  const handleCancelStatusEdit = () => {
    // Reset to current player data (merge both sources)
    const currentOutcome = player.outcome || {};
    setOutcomeData({
      status: currentOutcome.status || player.status || 'Active',
      outcome_date: currentOutcome.outcome_date || '',
      draft_round: currentOutcome.draft_round ?? player.draft_round ?? '',
      draft_pick: currentOutcome.draft_pick || '',
      draft_year: currentOutcome.draft_year ?? player.draft_year ?? '',
      signed_team: currentOutcome.signed_team || '',
      notes: currentOutcome.notes || ''
    });
    setEditingStatus(false);
  };

  // Search ESPN for college player (for upgrade modal)
  const handleUpgradeSearch = async (e) => {
    e.preventDefault();
    if (!upgradeSearchQuery.trim()) return;

    setUpgradeSearching(true);
    try {
      const response = await axios.get('/api/players/search-espn', {
        params: { name: upgradeSearchQuery }
      });
      setUpgradeSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching ESPN:', error);
      alert('Error searching ESPN. Please try again.');
    } finally {
      setUpgradeSearching(false);
    }
  };

  // Select a player from ESPN search results (for upgrade)
  const selectUpgradePlayer = async (espnPlayer) => {
    try {
      const espnId = espnPlayer.id || espnPlayer.url?.match(/\/id\/(\d+)\//)?.[1];

      if (!espnId) {
        // Use basic data if no ESPN ID
        setUpgradeData({
          ...upgradeData,
          photo_url: espnPlayer.image || ''
        });
        setSelectedUpgradePlayer(espnPlayer);
        setUpgradeSearchResults([]);
        return;
      }

      // Fetch detailed ESPN player data
      const detailsResponse = await axios.get(`/api/players/espn-details/${espnId}`);
      const details = detailsResponse.data.data;

      setUpgradeData({
        ...upgradeData,
        school: details.school || espnPlayer.school || upgradeData.school,
        conference: details.conference || upgradeData.conference,
        class_year: details.class_year || upgradeData.class_year,
        espn_id: espnId,
        photo_url: details.photo_url || espnPlayer.image || '',
        height: details.height || '',
        weight: details.weight || ''
      });

      setSelectedUpgradePlayer({ ...espnPlayer, ...details });
      setUpgradeSearchResults([]);
      setUpgradeSearchQuery('');
    } catch (error) {
      console.error('Error fetching ESPN player details:', error);
      // Fall back to basic data
      setUpgradeData({
        ...upgradeData,
        photo_url: espnPlayer.image || ''
      });
      setSelectedUpgradePlayer(espnPlayer);
      setUpgradeSearchResults([]);
    }
  };

  // Clear ESPN selection in upgrade modal
  const clearUpgradeSelection = () => {
    setSelectedUpgradePlayer(null);
    setUpgradeData({
      ...upgradeData,
      espn_id: '',
      photo_url: '',
      height: '',
      weight: ''
    });
  };

  // Upgrade high school player to college
  const handleUpgradeToCollege = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/players/${id}`, {
        player_type: 'college',
        school: upgradeData.school,
        conference: upgradeData.conference,
        class_year: upgradeData.class_year,
        espn_id: upgradeData.espn_id || null,
        photo_url: upgradeData.photo_url || null,
        height: upgradeData.height || player.height,
        weight: upgradeData.weight || player.weight,
        // Keep high school info intact
        high_school: player.high_school || player.name,
        recruiting_class_year: player.recruiting_cycle_year
      });

      setShowUpgradeModal(false);
      setSelectedUpgradePlayer(null);
      setUpgradeSearchQuery('');
      setUpgradeSearchResults([]);
      fetchPlayerDetails();
      alert('Player upgraded to college successfully!');
    } catch (error) {
      console.error('Error upgrading player:', error);
      alert('Error upgrading player: ' + (error.response?.data?.message || error.message));
    }
  };

  // Search ESPN NFL for veteran upgrade
  const handleVeteranSearch = async (e) => {
    e.preventDefault();
    if (!veteranSearchQuery.trim()) return;

    setVeteranSearching(true);
    try {
      const response = await axios.get('/api/players/search-nfl', {
        params: { name: veteranSearchQuery }
      });
      setVeteranSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching NFL:', error);
      alert('Error searching NFL players. Please try again.');
    } finally {
      setVeteranSearching(false);
    }
  };

  // Select NFL player from search results (for veteran upgrade)
  const selectVeteranPlayer = async (nflPlayer) => {
    try {
      const espnId = nflPlayer.id || nflPlayer.url?.match(/\/id\/(\d+)\//)?.[1];

      if (!espnId) {
        setVeteranUpgradeData({
          ...veteranUpgradeData,
          nfl_team: nflPlayer.team || '',
          photo_url: nflPlayer.image || ''
        });
        setSelectedVeteranPlayer(nflPlayer);
        setVeteranSearchResults([]);
        return;
      }

      // Fetch detailed NFL player data
      const detailsResponse = await axios.get(`/api/players/nfl-details/${espnId}`);
      const details = detailsResponse.data.data;

      setVeteranUpgradeData({
        ...veteranUpgradeData,
        nfl_team: details.team || nflPlayer.team || '',
        years_pro: details.experience || 1,
        espn_id: espnId,
        photo_url: details.photo_url || nflPlayer.image || '',
        height: details.height || '',
        weight: details.weight ? details.weight.replace(' lbs', '') : ''
      });

      setSelectedVeteranPlayer({ ...nflPlayer, ...details });
      setVeteranSearchResults([]);
      setVeteranSearchQuery('');
    } catch (error) {
      console.error('Error fetching NFL player details:', error);
      setVeteranUpgradeData({
        ...veteranUpgradeData,
        nfl_team: nflPlayer.team || '',
        photo_url: nflPlayer.image || ''
      });
      setSelectedVeteranPlayer(nflPlayer);
      setVeteranSearchResults([]);
    }
  };

  // Clear veteran selection
  const clearVeteranSelection = () => {
    setSelectedVeteranPlayer(null);
    setVeteranUpgradeData({
      nfl_team: '',
      years_pro: 1,
      espn_id: '',
      photo_url: '',
      height: '',
      weight: ''
    });
  };

  // Upgrade college player to veteran
  const handleUpgradeToVeteran = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/players/${id}`, {
        player_type: 'veteran',
        nfl_team: veteranUpgradeData.nfl_team,
        years_pro: veteranUpgradeData.years_pro,
        espn_id: veteranUpgradeData.espn_id || null,
        photo_url: veteranUpgradeData.photo_url || player.photo_url,
        height: veteranUpgradeData.height || player.height,
        weight: veteranUpgradeData.weight || player.weight,
        // Keep college info as school
        school: player.school,
        conference: player.conference
      });

      setShowVeteranModal(false);
      setSelectedVeteranPlayer(null);
      setVeteranSearchQuery('');
      setVeteranSearchResults([]);
      fetchPlayerDetails();
      alert('Player upgraded to NFL veteran successfully!');
    } catch (error) {
      console.error('Error upgrading player:', error);
      alert('Error upgrading player: ' + (error.response?.data?.message || error.message));
    }
  };

  // Connect to ESPN/CFBD - search handler
  const handleConnectSearch = async (e) => {
    e.preventDefault();
    if (!connectSearchQuery.trim()) return;

    setConnectSearching(true);
    try {
      // Use appropriate search based on player type
      const endpoint = player.player_type === 'veteran'
        ? '/api/players/search-nfl'
        : '/api/players/search-espn';

      const response = await axios.get(endpoint, {
        params: { name: connectSearchQuery }
      });
      setConnectSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching:', error);
      alert('Error searching. Please try again.');
    } finally {
      setConnectSearching(false);
    }
  };

  // Select a player from Connect search results
  const selectConnectPlayer = async (espnPlayer) => {
    try {
      const espnId = espnPlayer.id || espnPlayer.url?.match(/\/id\/(\d+)\//)?.[1];

      // Start with photo from ESPN search result
      let photoUrl = espnPlayer.image || '';
      let height = '';
      let weight = '';
      let hometown = '';
      let state = '';

      // For college players, use CFBD to get height, weight, hometown
      if (player.player_type !== 'veteran') {
        // Try CFBD player search for height/weight
        try {
          const cfbdResponse = await axios.get('/api/players/search-cfbd', {
            params: { name: player.name }
          });

          if (cfbdResponse.data.data && cfbdResponse.data.data.length > 0) {
            const cfbdPlayers = cfbdResponse.data.data;
            const exactMatch = cfbdPlayers.find(p =>
              p.name?.toLowerCase() === player.name?.toLowerCase()
            );
            const cfbdPlayer = exactMatch || cfbdPlayers[0];

            // CFBD returns height in inches, convert to feet'inches" format
            if (cfbdPlayer.height) {
              const feet = Math.floor(cfbdPlayer.height / 12);
              const inches = cfbdPlayer.height % 12;
              height = `${feet}'${inches}"`;
            }
            weight = cfbdPlayer.weight ? String(cfbdPlayer.weight) : '';
            // CFBD player search may have hometown
            hometown = cfbdPlayer.hometown || '';
            state = cfbdPlayer.state || '';
          }
        } catch (cfbdError) {
          console.warn('CFBD player search failed:', cfbdError.message);
        }

        // Fetch transfer history FIRST so we know the original school
        // Only use trusted school sources: database school and original_commitment
        // DO NOT use espnPlayer.school - it could be from a different player with same name
        let transfers = [];
        let originalSchool = null;
        const transferSchoolsToTry = [];
        if (player.school) transferSchoolsToTry.push(player.school);
        if (player.original_commitment && player.original_commitment !== player.school) {
          transferSchoolsToTry.push(player.original_commitment);
        }

        for (const searchSchool of transferSchoolsToTry) {
          if (transfers.length > 0) break; // Stop once we find transfers
          try {
            console.log(`Searching transfers with school: ${searchSchool}`);
            const transferResponse = await axios.get('/api/players/transfer-data', {
              params: {
                name: player.name,
                school: searchSchool
              }
            });
            transfers = transferResponse.data.data || [];
            if (transfers.length > 0) {
              originalSchool = transfers[0].fromSchool;
              console.log('Found transfers, original school:', originalSchool);
            }
          } catch (transferError) {
            console.warn(`Transfer search for ${searchSchool} failed:`, transferError.message);
          }
        }

        // Fetch full recruiting data (hometown, stars, rating, ranking, high school, original commitment)
        // Try CFBD first, then fall back to 247Sports for older players
        let recruitingData = null;
        let recruitingSource = null;

        // Try CFBD first
        try {
          const recruitingResponse = await axios.get('/api/players/recruiting-data', {
            params: { name: player.name, team: player.school }
          });

          if (recruitingResponse.data.data && recruitingResponse.data.data.length > 0) {
            recruitingData = recruitingResponse.data.data[0];
            recruitingSource = 'cfbd';
            console.log('Found recruiting data from CFBD:', recruitingData);
          }
        } catch (recruitError) {
          console.warn('CFBD recruiting data failed:', recruitError.message);
        }

        // If CFBD didn't return data, try 247Sports as fallback
        // Only use trusted school sources - NOT espnPlayer.school (could be different player)
        if (!recruitingData) {
          const schoolsToTry = [];
          if (player.school) schoolsToTry.push(player.school);
          if (player.original_commitment && player.original_commitment !== player.school) {
            schoolsToTry.push(player.original_commitment);
          }
          if (originalSchool && !schoolsToTry.includes(originalSchool)) {
            schoolsToTry.push(originalSchool);
          }

          for (const searchSchool of schoolsToTry) {
            if (recruitingData) break;
            try {
              console.log(`CFBD returned no data, trying 247Sports with school: ${searchSchool}...`);
              const params247 = { name: player.name, school: searchSchool };
              const response247 = await axios.get('/api/players/recruiting-data-247', { params: params247 });

              if (response247.data.data && response247.data.data.length > 0) {
                recruitingData = response247.data.data[0];
                recruitingSource = '247sports';
                console.log('Found recruiting data from 247Sports:', recruitingData);
              }
            } catch (error247) {
              console.warn(`247Sports search for ${searchSchool} failed:`, error247.message);
            }
          }
        }

        // Apply recruiting data if found from either source
        if (recruitingData) {
          // Use recruiting data for hometown/state if not already set
          if (!hometown) hometown = recruitingData.hometown || '';
          if (!state) state = recruitingData.state || '';
          // Also use height/weight from recruiting if not already set
          if (!height && recruitingData.height) {
            // CFBD returns height in inches, 247 returns formatted string like "6'3""
            if (typeof recruitingData.height === 'number' && recruitingData.height > 12) {
              const feet = Math.floor(recruitingData.height / 12);
              const inches = recruitingData.height % 12;
              height = `${feet}'${inches}"`;
            } else if (typeof recruitingData.height === 'string') {
              height = recruitingData.height;
            }
          }
          if (!weight) weight = recruitingData.weight ? String(recruitingData.weight) : '';

          // If recruiting data shows a different school than ESPN returned (e.g., ESPN returned high school),
          // re-search transfers using the correct college
          const recruitingSchool = recruitingData.school || recruitingData.committedTo;
          if (recruitingSchool && transfers.length === 0 &&
              recruitingSchool.toLowerCase() !== player.school?.toLowerCase()) {
            console.log(`Re-searching transfers with correct school: ${recruitingSchool} (ESPN had: ${player.school})`);
            try {
              const transferResponse2 = await axios.get('/api/players/transfer-data', {
                params: {
                  name: player.name,
                  school: recruitingSchool,
                  recruitingYear: recruitingData.classYear
                }
              });
              transfers = transferResponse2.data.data || [];
              if (transfers.length > 0) {
                console.log('Found transfers after re-search:', transfers.length);
              }
            } catch (err) {
              console.warn('Transfer re-search failed:', err.message);
            }
          }
        }

        setConnectTransferData(transfers);
        setConnectData({
          espn_id: espnId || '',
          photo_url: photoUrl,
          height: height,
          weight: weight,
          hometown: hometown,
          state: state,
          high_school: recruitingData?.highSchool || '',
          recruiting_class_year: recruitingData?.classYear || null,
          recruiting_stars: recruitingData?.stars || null,
          recruiting_rating: recruitingData?.rating || null,
          recruiting_ranking: recruitingData?.ranking || null,
          original_commitment: recruitingData?.school || ''
        });

        setSelectedConnectPlayer(espnPlayer);
        setConnectSearchResults([]);
        setConnectSearchQuery('');
        return; // Exit early since we've set the data
      } else {
        // For veterans, try ESPN NFL details
        try {
          if (espnId) {
            const nflResponse = await axios.get(`/api/players/nfl-details/${espnId}`);
            const details = nflResponse.data.data;
            if (details) {
              photoUrl = details.photo_url || photoUrl;
              height = details.height || details.displayHeight || '';
              weight = details.weight ? String(details.weight).replace(' lbs', '') : '';
              if (details.birthPlace) {
                const parts = details.birthPlace.split(',');
                hometown = parts[0]?.trim() || '';
                state = parts[1]?.trim() || '';
              }
            }
          }
        } catch (nflError) {
          console.warn('NFL details failed:', nflError.message);
        }
      }

      // For veterans - set data without recruiting info
      setConnectData({
        espn_id: espnId || '',
        photo_url: photoUrl,
        height: height,
        weight: weight,
        hometown: hometown,
        state: state,
        high_school: '',
        recruiting_class_year: null,
        recruiting_stars: null,
        recruiting_rating: null,
        recruiting_ranking: null,
        original_commitment: ''
      });
      setConnectTransferData([]);

      setSelectedConnectPlayer(espnPlayer);
      setConnectSearchResults([]);
      setConnectSearchQuery('');
    } catch (error) {
      console.error('Error fetching player details:', error);
      // Fall back to basic data with just photo
      setConnectData({
        espn_id: espnPlayer.id || '',
        photo_url: espnPlayer.image || '',
        height: '',
        weight: '',
        hometown: '',
        state: '',
        high_school: '',
        recruiting_class_year: null,
        recruiting_stars: null,
        recruiting_rating: null,
        recruiting_ranking: null,
        original_commitment: ''
      });
      setConnectTransferData([]);
      setSelectedConnectPlayer(espnPlayer);
      setConnectSearchResults([]);
    }
  };

  // Clear Connect selection
  const clearConnectSelection = () => {
    setSelectedConnectPlayer(null);
    setConnectData({
      espn_id: '',
      photo_url: '',
      height: '',
      weight: '',
      hometown: '',
      state: '',
      high_school: '',
      recruiting_class_year: null,
      recruiting_stars: null,
      recruiting_rating: null,
      recruiting_ranking: null,
      original_commitment: ''
    });
    setConnectTransferData([]);
    setManualSchoolSearch('');
  };

  // Manual 247Sports search for a different school
  const handleManual247Search = async () => {
    if (!manualSchoolSearch.trim() || !selectedConnectPlayer) return;

    setSearching247(true);
    try {
      console.log('Manual 247 search for:', selectedConnectPlayer.name, 'at', manualSchoolSearch);
      const response = await axios.get('/api/players/recruiting-data-247', {
        params: {
          name: selectedConnectPlayer.name,
          school: manualSchoolSearch.trim()
        }
      });

      if (response.data.data && response.data.data.length > 0) {
        const recruitingData = response.data.data[0];
        console.log('Found via manual 247 search:', recruitingData);

        // Update connectData with found recruiting info
        setConnectData(prev => ({
          ...prev,
          high_school: recruitingData.highSchool || prev.high_school,
          recruiting_class_year: recruitingData.classYear || prev.recruiting_class_year,
          recruiting_stars: recruitingData.stars || prev.recruiting_stars,
          recruiting_rating: recruitingData.rating || prev.recruiting_rating,
          recruiting_ranking: recruitingData.ranking || prev.recruiting_ranking,
          original_commitment: recruitingData.school || prev.original_commitment,
          hometown: recruitingData.hometown || prev.hometown,
          state: recruitingData.state || prev.state,
          height: recruitingData.height || prev.height,
          weight: recruitingData.weight || prev.weight
        }));

        // NOW search for transfers using the found school (this was missing before!)
        const recruitingSchool = recruitingData.school;
        if (recruitingSchool && connectTransferData.length === 0) {
          console.log(`Searching for transfers with found school: ${recruitingSchool}`);
          try {
            const transferResponse = await axios.get('/api/players/transfer-data', {
              params: {
                name: player.name,
                school: recruitingSchool,
                recruitingYear: recruitingData.classYear
              }
            });
            const transfers = transferResponse.data.data || [];
            if (transfers.length > 0) {
              console.log('Found transfers after manual 247 search:', transfers.length);
              setConnectTransferData(transfers);
              alert(`Found ${selectedConnectPlayer.name} at ${recruitingData.school} (${recruitingData.classYear} class) with ${transfers.length} transfer(s)!`);
            } else {
              alert(`Found ${selectedConnectPlayer.name} at ${recruitingData.school} (${recruitingData.classYear} class)`);
            }
          } catch (transferError) {
            console.warn('Transfer search after manual 247 failed:', transferError.message);
            alert(`Found ${selectedConnectPlayer.name} at ${recruitingData.school} (${recruitingData.classYear} class)`);
          }
        } else {
          alert(`Found ${selectedConnectPlayer.name} at ${recruitingData.school} (${recruitingData.classYear} class)`);
        }
      } else {
        alert(`No recruiting data found for ${selectedConnectPlayer.name} at ${manualSchoolSearch}`);
      }
    } catch (error) {
      console.error('Manual 247 search failed:', error);
      alert('Search failed: ' + error.message);
    } finally {
      setSearching247(false);
    }
  };

  // Save Connect to ESPN data - updates ESPN info, recruiting data, and transfers
  const handleSaveConnect = async (e) => {
    e.preventDefault();
    setConnectSaving(true);

    try {
      // Update player with ESPN data and recruiting info
      await axios.put(`/api/players/${id}`, {
        espn_id: connectData.espn_id || null,
        photo_url: connectData.photo_url || null,
        height: connectData.height || null,
        weight: connectData.weight || null,
        hometown: connectData.hometown || null,
        state: connectData.state || null,
        high_school: connectData.high_school || null,
        recruiting_class_year: connectData.recruiting_class_year || null,
        recruiting_stars: connectData.recruiting_stars || null,
        recruiting_rating: connectData.recruiting_rating || null,
        recruiting_ranking: connectData.recruiting_ranking || null,
        original_commitment: connectData.original_commitment || null
        // NOTE: class_year, school, conference, status, draft info are NOT included
      });

      // Save transfer history if we found any
      if (connectTransferData.length > 0) {
        for (const transfer of connectTransferData) {
          try {
            await axios.post('/api/players/transfers', {
              player_id: parseInt(id),
              from_school: transfer.fromSchool || transfer.from_school,
              to_school: transfer.toSchool || transfer.to_school,
              transfer_year: transfer.transferYear || transfer.transfer_year || transfer.season,
              transfer_type: transfer.transferType || transfer.transfer_type || 'Portal'
            });
          } catch (transferError) {
            console.warn('Failed to save transfer:', transferError.message);
          }
        }
      }

      setShowConnectModal(false);
      setSelectedConnectPlayer(null);
      setConnectSearchQuery('');
      setConnectSearchResults([]);
      setConnectData({
        espn_id: '',
        photo_url: '',
        height: '',
        weight: '',
        hometown: '',
        state: '',
        high_school: '',
        recruiting_class_year: null,
        recruiting_stars: null,
        recruiting_rating: null,
        recruiting_ranking: null,
        original_commitment: ''
      });
      setConnectTransferData([]);
      fetchPlayerDetails();
      alert('Player connected to ESPN successfully!' + (connectTransferData.length > 0 ? ` (${connectTransferData.length} transfers added)` : ''));
    } catch (error) {
      console.error('Error connecting player:', error);
      alert('Error connecting player: ' + (error.response?.data?.message || error.message));
    } finally {
      setConnectSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading player details...</div>;
  }

  if (!player) {
    return <div className="error">Player not found</div>;
  }

  return (
    <div className="player-detail">
      <div className="page-header">
        <div className="header-left">
          <button onClick={() => navigate('/players')} className="btn btn-secondary">
            ← Back to Players
          </button>
          <div className="player-nav-arrows">
            <button
              onClick={() => adjacentPlayers.prev && navigate(`/players/${adjacentPlayers.prev}`)}
              disabled={!adjacentPlayers.prev}
              className="nav-arrow prev"
              title="Previous player (←)"
            >
              ‹
            </button>
            <button
              onClick={() => adjacentPlayers.next && navigate(`/players/${adjacentPlayers.next}`)}
              disabled={!adjacentPlayers.next}
              className="nav-arrow next"
              title="Next player (→)"
            >
              ›
            </button>
          </div>
        </div>
        <div className="header-actions">
          {/* Connect/Update ESPN button - show for all players */}
          <button onClick={() => {
            setConnectSearchQuery(player.name);
            setShowConnectModal(true);
          }} className="btn btn-info">
            {player.espn_id ? 'Update ESPN Data' : 'Connect to ESPN'}
          </button>
          {player.player_type === 'high_school' && (
            <button onClick={() => {
              setUpgradeSearchQuery(player.name);
              setShowUpgradeModal(true);
            }} className="btn btn-success">
              Upgrade to College
            </button>
          )}
          {player.player_type === 'college' && (
            <button onClick={() => {
              setVeteranSearchQuery(player.name);
              setShowVeteranModal(true);
            }} className="btn btn-success veteran-upgrade">
              Upgrade to Veteran
            </button>
          )}
          <button onClick={() => navigate(`/players/${id}/edit`)} className="btn btn-primary">
            Edit Player
          </button>
        </div>
      </div>

      <div className="player-info-card">
        <div className="player-header">
          {player.photo_url && (
            <img src={player.photo_url} alt={player.name} className="player-photo" />
          )}
          <div className="player-title">
            <div className="player-name-row">
              <h1>{player.name}</h1>
              {player.player_type && player.player_type !== 'college' && (
                <span className={`player-type-badge ${player.player_type}`}>
                  {player.player_type === 'high_school' ? 'High School' : 'NFL Veteran'}
                </span>
              )}
            </div>
            <p className="player-subtitle">
              {player.position} •{' '}
              {player.player_type === 'high_school' ? (
                <>
                  {player.high_school || 'High School'}{player.state ? `, ${player.state}` : ''}
                  {player.recruiting_cycle_year && ` (Class of ${player.recruiting_cycle_year})`}
                </>
              ) : player.player_type === 'veteran' ? (
                <>
                  {player.nfl_team || 'NFL'}
                  {player.school && ` (${player.school})`}
                </>
              ) : (
                <>
                  {schoolData?.logo && (
                    <img
                      src={schoolData.logo}
                      alt={player.school}
                      className="school-logo-inline"
                      style={{ width: '20px', height: '20px', verticalAlign: 'middle', marginRight: '5px' }}
                    />
                  )}
                  {schoolData?.school || player.school} ({schoolData?.conference || player.conference})
                </>
              )}
            </p>
          </div>
        </div>

        <div className="player-stats-grid">
          <div className="stat-item">
            <label>Class</label>
            <span>
              {player.player_type === 'high_school'
                ? (player.recruiting_cycle_year || '-')
                : (player.class_year || '-')}
            </span>
          </div>
          <div className="stat-item">
            <label>Hometown</label>
            <span>{player.hometown}, {player.state}</span>
          </div>
          <div className="stat-item">
            <label>Height</label>
            <span>{formatHeight(player.height) || player.height || '-'}</span>
          </div>
          <div className="stat-item">
            <label>Weight</label>
            <span>{player.weight ? `${player.weight} lbs` : '-'}</span>
          </div>
          <div className="stat-item">
            <label>Status</label>
            <div className="status-edit-container">
              {!editingStatus ? (
                <>
                  <span className={`status-badge ${(player.outcome?.status || player.status)?.toLowerCase().replace(/\s+/g, '-')}`}>
                    {player.outcome?.status || player.status}
                  </span>
                  <button
                    onClick={() => setEditingStatus(true)}
                    className="btn-small btn-secondary"
                    style={{ marginLeft: '8px' }}
                  >
                    Edit
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '0.9em', color: '#666' }}>
                  Editing below ↓
                </span>
              )}
            </div>
          </div>
          {(player.outcome?.draft_round !== undefined || player.draft_round !== undefined) && (
            <div className="stat-item">
              <label>Draft</label>
              <span>
                {(() => {
                  const draftRound = player.outcome?.draft_round ?? player.draft_round;
                  if (draftRound === 0) return 'UDFA';
                  if (draftRound) return `Round ${draftRound}`;
                  return '-';
                })()}
              </span>
            </div>
          )}
        </div>

        {player.agents && player.agents.length > 0 && (
          <div className="agents-section">
            <h3>Assigned Agents</h3>
            <div className="agents-list">
              {player.agents.map(agent => (
                <Link key={agent.id} to={`/agents/${agent.id}`} className="agent-badge agent-link">
                  {agent.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status/Outcome Editing Form */}
      {editingStatus && (
        <div className="outcome-edit-card">
          <h2>Update Player Status</h2>
          <form onSubmit={handleUpdateOutcome}>
            <div className="form-row">
              <div className="form-group">
                <label>Status *</label>
                <select
                  value={outcomeData.status}
                  onChange={(e) => setOutcomeData({ ...outcomeData, status: e.target.value })}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Signed">Signed</option>
                  <option value="Not Signed">Not Signed</option>
                  <option value="Returned to School">Returned to School</option>
                </select>
              </div>

              <div className="form-group">
                <label>Outcome Date</label>
                <input
                  type="date"
                  value={outcomeData.outcome_date}
                  onChange={(e) => setOutcomeData({ ...outcomeData, outcome_date: e.target.value })}
                />
              </div>
            </div>

            {/* Draft/Team fields - always visible */}
            <div className="form-row">
              <div className="form-group">
                <label>Draft Round</label>
                <select
                  value={outcomeData.draft_round}
                  onChange={(e) => setOutcomeData({ ...outcomeData, draft_round: e.target.value })}
                >
                  <option value="">Not Drafted / Unknown</option>
                  <option value="0">UDFA (Undrafted Free Agent)</option>
                  <option value="1">Round 1</option>
                  <option value="2">Round 2</option>
                  <option value="3">Round 3</option>
                  <option value="4">Round 4</option>
                  <option value="5">Round 5</option>
                  <option value="6">Round 6</option>
                  <option value="7">Round 7</option>
                </select>
              </div>

              <div className="form-group">
                <label>Draft Year</label>
                <input
                  type="number"
                  value={outcomeData.draft_year}
                  onChange={(e) => setOutcomeData({ ...outcomeData, draft_year: e.target.value })}
                  placeholder="e.g., 2025"
                />
              </div>
            </div>

            {outcomeData.status === 'Signed' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Signed Team</label>
                  <input
                    type="text"
                    value={outcomeData.signed_team}
                    onChange={(e) => setOutcomeData({ ...outcomeData, signed_team: e.target.value })}
                    placeholder="Team name..."
                  />
                </div>

                <div className="form-group">
                  <label>Draft Pick</label>
                  <input
                    type="number"
                    min="1"
                    max="262"
                    value={outcomeData.draft_pick}
                    onChange={(e) => setOutcomeData({ ...outcomeData, draft_pick: e.target.value })}
                    placeholder="Overall pick #"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={outcomeData.notes}
                onChange={(e) => setOutcomeData({ ...outcomeData, notes: e.target.value })}
                rows="3"
                placeholder="Additional notes about this outcome..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Save Status
              </button>
              <button
                type="button"
                onClick={handleCancelStatusEdit}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upgrade to College Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay">
          <div className="modal-content upgrade-modal">
            <h2>Upgrade to College Player</h2>
            <p className="modal-description">
              {player.name} is currently a high school player. Search ESPN to find their college profile for updated info.
            </p>

            {/* ESPN Search Section */}
            <div className="espn-search-section upgrade-search">
              <h4>Search ESPN for {player.name}</h4>
              <form onSubmit={handleUpgradeSearch} className="search-form">
                <input
                  type="text"
                  placeholder={`Search "${player.name}" on ESPN...`}
                  value={upgradeSearchQuery}
                  onChange={(e) => setUpgradeSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="btn btn-primary" disabled={upgradeSearching || !upgradeSearchQuery.trim()}>
                  {upgradeSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {upgradeSearchResults.length > 0 && (
                <div className="search-results">
                  <h5>Results ({upgradeSearchResults.length})</h5>
                  <div className="results-grid compact">
                    {upgradeSearchResults.map((espnPlayer, index) => (
                      <div key={index} onClick={() => selectUpgradePlayer(espnPlayer)} className="search-result-card">
                        {espnPlayer.image && (
                          <img src={espnPlayer.image} alt={espnPlayer.name} className="player-image" />
                        )}
                        <div className="player-info">
                          <div className="player-name">{espnPlayer.name}</div>
                          <div className="player-details">{espnPlayer.position} • {espnPlayer.school}</div>
                        </div>
                        <button className="btn btn-sm btn-primary" style={{ pointerEvents: 'none' }}>Select</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selected ESPN Player Preview */}
            {selectedUpgradePlayer && (
              <div className="selected-player-preview">
                <div className="preview-content">
                  {upgradeData.photo_url && (
                    <img src={upgradeData.photo_url} alt={selectedUpgradePlayer.name} className="preview-image" />
                  )}
                  <div className="preview-info">
                    <div className="preview-badge">✓ Linked to ESPN</div>
                    <div className="preview-name">{selectedUpgradePlayer.name}</div>
                    <div className="preview-details">
                      {selectedUpgradePlayer.position} • {upgradeData.school || selectedUpgradePlayer.school}
                      {upgradeData.height && ` • ${upgradeData.height}`}
                      {upgradeData.weight && ` • ${upgradeData.weight} lbs`}
                    </div>
                  </div>
                  <button type="button" onClick={clearUpgradeSelection} className="btn btn-secondary btn-sm">
                    Clear
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleUpgradeToCollege}>
              <div className="form-group">
                <label>College/University *</label>
                <SchoolAutocomplete
                  value={upgradeData.school}
                  onChange={(school, conference) => {
                    setUpgradeData({ ...upgradeData, school, conference });
                  }}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Conference</label>
                  <input
                    type="text"
                    value={upgradeData.conference}
                    disabled
                    className="disabled-input"
                  />
                </div>

                <div className="form-group">
                  <label>Class Year *</label>
                  <select
                    value={upgradeData.class_year}
                    onChange={(e) => setUpgradeData({ ...upgradeData, class_year: e.target.value })}
                    required
                  >
                    <option value="Freshman">Freshman</option>
                    <option value="Sophomore">Sophomore</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
              </div>

              {/* Show height/weight if fetched from ESPN */}
              {(upgradeData.height || upgradeData.weight) && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Height (from ESPN)</label>
                    <input
                      type="text"
                      value={upgradeData.height}
                      onChange={(e) => setUpgradeData({ ...upgradeData, height: e.target.value })}
                      placeholder="e.g., 6'2&quot;"
                    />
                  </div>
                  <div className="form-group">
                    <label>Weight (from ESPN)</label>
                    <input
                      type="text"
                      value={upgradeData.weight}
                      onChange={(e) => setUpgradeData({ ...upgradeData, weight: e.target.value })}
                      placeholder="e.g., 220"
                    />
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-success">
                  Upgrade to College
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedUpgradePlayer(null);
                    setUpgradeSearchQuery('');
                    setUpgradeSearchResults([]);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade to Veteran Modal */}
      {showVeteranModal && (
        <div className="modal-overlay">
          <div className="modal-content upgrade-modal veteran-modal">
            <h2>Upgrade to NFL Veteran</h2>
            <p className="modal-description">
              {player.name} is moving to the NFL. Search ESPN to find their NFL profile.
            </p>

            {/* NFL Search Section */}
            <div className="espn-search-section veteran-search">
              <h4>Search ESPN NFL for {player.name}</h4>
              <form onSubmit={handleVeteranSearch} className="search-form">
                <input
                  type="text"
                  placeholder={`Search "${player.name}" on ESPN NFL...`}
                  value={veteranSearchQuery}
                  onChange={(e) => setVeteranSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="btn btn-primary" disabled={veteranSearching || !veteranSearchQuery.trim()}>
                  {veteranSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {veteranSearchResults.length > 0 && (
                <div className="search-results">
                  <h5>Results ({veteranSearchResults.length})</h5>
                  <div className="results-grid compact">
                    {veteranSearchResults.map((nflPlayer, index) => (
                      <div key={index} onClick={() => selectVeteranPlayer(nflPlayer)} className="search-result-card">
                        {nflPlayer.image && (
                          <img src={nflPlayer.image} alt={nflPlayer.name} className="player-image" />
                        )}
                        <div className="player-info">
                          <div className="player-name">{nflPlayer.name}</div>
                          <div className="player-details">{nflPlayer.position} • {nflPlayer.team}</div>
                        </div>
                        <button className="btn btn-sm btn-primary" style={{ pointerEvents: 'none' }}>Select</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selected NFL Player Preview */}
            {selectedVeteranPlayer && (
              <div className="selected-player-preview nfl-preview">
                <div className="preview-content">
                  {veteranUpgradeData.photo_url && (
                    <img src={veteranUpgradeData.photo_url} alt={selectedVeteranPlayer.name} className="preview-image" />
                  )}
                  <div className="preview-info">
                    <div className="preview-badge nfl-badge">✓ Linked to ESPN NFL</div>
                    <div className="preview-name">{selectedVeteranPlayer.name}</div>
                    <div className="preview-details">
                      {selectedVeteranPlayer.position} • {veteranUpgradeData.nfl_team}
                      {veteranUpgradeData.years_pro && ` • ${veteranUpgradeData.years_pro} yr${veteranUpgradeData.years_pro > 1 ? 's' : ''} pro`}
                    </div>
                  </div>
                  <button type="button" onClick={clearVeteranSelection} className="btn btn-secondary btn-sm">
                    Clear
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleUpgradeToVeteran}>
              <div className="form-row">
                <div className="form-group">
                  <label>NFL Team *</label>
                  <input
                    type="text"
                    value={veteranUpgradeData.nfl_team}
                    onChange={(e) => setVeteranUpgradeData({ ...veteranUpgradeData, nfl_team: e.target.value })}
                    placeholder="e.g., Kansas City Chiefs"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Years Pro</label>
                  <input
                    type="number"
                    value={veteranUpgradeData.years_pro}
                    onChange={(e) => setVeteranUpgradeData({ ...veteranUpgradeData, years_pro: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
              </div>

              {/* Show height/weight if fetched from ESPN */}
              {(veteranUpgradeData.height || veteranUpgradeData.weight) && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Height (from ESPN)</label>
                    <input
                      type="text"
                      value={veteranUpgradeData.height}
                      onChange={(e) => setVeteranUpgradeData({ ...veteranUpgradeData, height: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Weight (from ESPN)</label>
                    <input
                      type="text"
                      value={veteranUpgradeData.weight}
                      onChange={(e) => setVeteranUpgradeData({ ...veteranUpgradeData, weight: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-success">
                  Upgrade to Veteran
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowVeteranModal(false);
                    setSelectedVeteranPlayer(null);
                    setVeteranSearchQuery('');
                    setVeteranSearchResults([]);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect to ESPN Modal */}
      {showConnectModal && (
        <div className="modal-overlay">
          <div className="modal-content upgrade-modal connect-modal">
            <h2>Connect to ESPN</h2>
            <p className="modal-description">
              Search ESPN to fetch photo, height, weight, and hometown for {player.name}.
              <br />
              <strong>Note:</strong> This will NOT overwrite class year, school, or other imported data.
            </p>

            {/* ESPN Search Section */}
            <div className="espn-search-section connect-search">
              <h4>Search {player.player_type === 'veteran' ? 'ESPN NFL' : 'ESPN'} for {player.name}</h4>
              <form onSubmit={handleConnectSearch} className="search-form">
                <input
                  type="text"
                  placeholder={`Search "${player.name}"...`}
                  value={connectSearchQuery}
                  onChange={(e) => setConnectSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="btn btn-primary" disabled={connectSearching || !connectSearchQuery.trim()}>
                  {connectSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {connectSearchResults.length > 0 && (
                <div className="search-results">
                  <h5>Results ({connectSearchResults.length})</h5>
                  <div className="results-grid compact">
                    {connectSearchResults.map((espnPlayer, index) => (
                      <div key={index} onClick={() => selectConnectPlayer(espnPlayer)} className="search-result-card">
                        {espnPlayer.image && (
                          <img src={espnPlayer.image} alt={espnPlayer.name} className="player-image" />
                        )}
                        <div className="player-info">
                          <div className="player-name">{espnPlayer.name}</div>
                          <div className="player-details">
                            {espnPlayer.position} • {espnPlayer.school || espnPlayer.team}
                          </div>
                        </div>
                        <button className="btn btn-sm btn-primary" style={{ pointerEvents: 'none' }}>Select</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Player Preview */}
            {selectedConnectPlayer && (
              <div className="selected-player-preview connect-preview">
                <div className="preview-content">
                  {connectData.photo_url && (
                    <img src={connectData.photo_url} alt={selectedConnectPlayer.name} className="preview-image" />
                  )}
                  <div className="preview-info">
                    <div className="preview-badge">✓ Found on ESPN</div>
                    <div className="preview-name">{selectedConnectPlayer.name}</div>
                    <div className="preview-details">
                      {connectData.height && `${connectData.height}`}
                      {connectData.weight && ` • ${connectData.weight} lbs`}
                      {connectData.hometown && ` • ${connectData.hometown}`}
                      {connectData.state && `, ${connectData.state}`}
                    </div>
                  </div>
                  <button type="button" onClick={clearConnectSelection} className="btn btn-secondary btn-sm">
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Data to be saved */}
            {selectedConnectPlayer && (
              <form onSubmit={handleSaveConnect}>
                <div className="connect-data-preview">
                  <h4>Data to Import</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Photo URL</label>
                      <input
                        type="text"
                        value={connectData.photo_url}
                        onChange={(e) => setConnectData({ ...connectData, photo_url: e.target.value })}
                        placeholder="Photo URL"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Height</label>
                      <input
                        type="text"
                        value={connectData.height}
                        onChange={(e) => setConnectData({ ...connectData, height: e.target.value })}
                        placeholder="e.g., 6'2&quot;"
                      />
                    </div>
                    <div className="form-group">
                      <label>Weight</label>
                      <input
                        type="text"
                        value={connectData.weight}
                        onChange={(e) => setConnectData({ ...connectData, weight: e.target.value })}
                        placeholder="e.g., 220"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Hometown</label>
                      <input
                        type="text"
                        value={connectData.hometown}
                        onChange={(e) => setConnectData({ ...connectData, hometown: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        value={connectData.state}
                        onChange={(e) => setConnectData({ ...connectData, state: e.target.value })}
                        placeholder="State"
                      />
                    </div>
                  </div>

                  {/* Recruiting Data Section - only for college players */}
                  {player.player_type !== 'veteran' && (connectData.high_school || connectData.recruiting_stars || connectData.original_commitment) && (
                    <>
                      <h4 style={{ marginTop: '1rem' }}>Recruiting Data</h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label>High School</label>
                          <input
                            type="text"
                            value={connectData.high_school || ''}
                            onChange={(e) => setConnectData({ ...connectData, high_school: e.target.value })}
                            placeholder="High School"
                          />
                        </div>
                        <div className="form-group">
                          <label>Original Commitment</label>
                          <input
                            type="text"
                            value={connectData.original_commitment || ''}
                            onChange={(e) => setConnectData({ ...connectData, original_commitment: e.target.value })}
                            placeholder="Original school committed to"
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Recruiting Stars</label>
                          <input
                            type="number"
                            value={connectData.recruiting_stars || ''}
                            onChange={(e) => setConnectData({ ...connectData, recruiting_stars: e.target.value ? parseInt(e.target.value) : null })}
                            placeholder="1-5"
                            min="1"
                            max="5"
                          />
                        </div>
                        <div className="form-group">
                          <label>Recruiting Rating</label>
                          <input
                            type="text"
                            value={connectData.recruiting_rating || ''}
                            onChange={(e) => setConnectData({ ...connectData, recruiting_rating: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder="e.g., 0.9823"
                          />
                        </div>
                        <div className="form-group">
                          <label>National Ranking</label>
                          <input
                            type="number"
                            value={connectData.recruiting_ranking || ''}
                            onChange={(e) => setConnectData({ ...connectData, recruiting_ranking: e.target.value ? parseInt(e.target.value) : null })}
                            placeholder="e.g., 45"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Manual 247Sports Search - for transfer players whose original school isn't auto-detected */}
                  {player.player_type !== 'veteran' && !connectData.recruiting_stars && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#856404' }}>
                        No recruiting data found? Try searching a different school:
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input
                          type="text"
                          value={manualSchoolSearch}
                          onChange={(e) => setManualSchoolSearch(e.target.value)}
                          placeholder="e.g., Ohio State, Alabama..."
                          style={{ flex: 1, padding: '0.5rem' }}
                        />
                        <button
                          type="button"
                          onClick={handleManual247Search}
                          disabled={searching247 || !manualSchoolSearch.trim()}
                          className="btn btn-warning"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {searching247 ? 'Searching...' : 'Search 247'}
                        </button>
                      </div>
                      <small style={{ color: '#856404', marginTop: '0.25rem', display: 'block' }}>
                        For transfer players, enter their original college (where they were recruited out of high school)
                      </small>
                    </div>
                  )}

                  {/* Transfer History Section */}
                  {connectTransferData.length > 0 && (
                    <>
                      <h4 style={{ marginTop: '1rem' }}>Transfer History ({connectTransferData.length} found)</h4>
                      <div className="transfer-list-preview">
                        {connectTransferData.map((transfer, idx) => (
                          <div key={idx} className="transfer-item-preview">
                            <span>{transfer.fromSchool || transfer.from_school || '?'}</span>
                            <span className="transfer-arrow">→</span>
                            <span>{transfer.toSchool || transfer.to_school}</span>
                            <span className="transfer-year">({transfer.transferYear || transfer.transfer_year || transfer.season})</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={connectSaving}>
                    {connectSaving ? 'Saving...' : 'Save ESPN Data'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConnectModal(false);
                      setSelectedConnectPlayer(null);
                      setConnectSearchQuery('');
                      setConnectSearchResults([]);
                      clearConnectSelection();
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Cancel button when no player selected */}
            {!selectedConnectPlayer && (
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowConnectModal(false);
                    setConnectSearchQuery('');
                    setConnectSearchResults([]);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recruiting Profile Section */}
      {(player.recruiting_stars || player.recruiting_rating || player.recruiting_ranking || player.high_school) && (
        <div className="recruiting-profile-card">
          <h2>Recruiting Profile</h2>

          <div className="recruiting-grid">
            {player.recruiting_stars && (
              <div className="recruiting-item">
                <label>Rating</label>
                <div className="star-rating">
                  {'⭐'.repeat(player.recruiting_stars)}
                  <span className="star-text">{player.recruiting_stars}-Star</span>
                </div>
              </div>
            )}

            {player.recruiting_rating && (
              <div className="recruiting-item">
                <label>Composite Score</label>
                <span className="rating-score">{player.recruiting_rating.toFixed(4)}</span>
              </div>
            )}

            {player.recruiting_ranking && (
              <div className="recruiting-item">
                <label>National Ranking</label>
                <span className="ranking">#{player.recruiting_ranking}</span>
              </div>
            )}

            {player.high_school && (
              <div className="recruiting-item">
                <label>High School</label>
                <span>{player.high_school}</span>
              </div>
            )}

            {player.recruiting_class_year && (
              <div className="recruiting-item">
                <label>Recruiting Class</label>
                <span>{player.recruiting_class_year}</span>
              </div>
            )}

            {player.original_commitment && (
              <div className="recruiting-item">
                <label>Original Commitment</label>
                <span>{player.original_commitment}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfer History Section */}
      {player.transfers && player.transfers.length > 0 && (
        <div className="transfer-history-card">
          <h2>Transfer History</h2>

          <div className="transfer-timeline">
            {player.transfers.map((transfer, index) => (
              <div key={transfer.id} className="transfer-item">
                <div className="transfer-year">{transfer.transfer_year || transfer.transfer_season}</div>
                <div className="transfer-arrow">→</div>
                <div className="transfer-details">
                  <div className="transfer-schools">
                    {transfer.from_school && (
                      <span className="from-school">{transfer.from_school} → </span>
                    )}
                    <span className="to-school">{transfer.to_school}</span>
                  </div>
                  {transfer.eligibility_remaining && (
                    <div className="transfer-eligibility">
                      Eligibility: {transfer.eligibility_remaining}
                    </div>
                  )}
                  <div className="transfer-type">{transfer.transfer_type || 'Portal'}</div>
                </div>
              </div>
            ))}
          </div>

          {/* School Progression Timeline */}
          <div className="school-progression">
            <h3>School Progression</h3>
            <div className="progression-timeline">
              {(() => {
                const steps = [];

                // 1. Add high school
                if (player.high_school) {
                  steps.push({
                    type: 'high_school',
                    label: 'High School',
                    school: player.high_school,
                    year: null
                  });
                }

                // 2. Build college progression from transfers
                if (player.transfers && player.transfers.length > 0) {
                  const sortedTransfers = [...player.transfers].sort((a, b) => a.transfer_year - b.transfer_year);

                  // Add the first school (from_school of first transfer)
                  const firstTransfer = sortedTransfers[0];
                  steps.push({
                    type: 'college',
                    label: player.recruiting_class_year || 'Original',
                    school: firstTransfer.from_school,
                    year: player.recruiting_class_year
                  });

                  // Add all subsequent schools (to_school of each transfer)
                  sortedTransfers.forEach(transfer => {
                    steps.push({
                      type: 'college',
                      label: transfer.transfer_year,
                      school: transfer.to_school,
                      year: transfer.transfer_year
                    });
                  });
                } else if (player.original_commitment || player.school) {
                  // No transfers - show original commitment or current school
                  if (player.original_commitment && player.original_commitment !== player.school) {
                    // Had different original commitment
                    steps.push({
                      type: 'college',
                      label: player.recruiting_class_year || 'Original',
                      school: player.original_commitment,
                      year: player.recruiting_class_year
                    });
                    steps.push({
                      type: 'college',
                      label: 'Current',
                      school: player.school,
                      year: null
                    });
                  } else {
                    // Just current school
                    steps.push({
                      type: 'college',
                      label: player.recruiting_class_year || 'Current',
                      school: player.school,
                      year: player.recruiting_class_year
                    });
                  }
                }

                return steps.map((step, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <div className="progression-arrow">→</div>}
                    <div className={`progression-step ${idx === steps.length - 1 ? 'current' : ''}`}>
                      <div className="step-label">{step.label}</div>
                      {step.type === 'college' && progressionLogos[step.school] && (
                        <img
                          src={progressionLogos[step.school]}
                          alt={step.school}
                          className="progression-logo"
                        />
                      )}
                      <div className="step-school">{step.school}</div>
                    </div>
                  </React.Fragment>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="materials-section">
        <div className="section-header">
          <h2>Materials ({materialEvents.length} events)</h2>
          <button
            onClick={() => setShowMaterialForm(!showMaterialForm)}
            className="btn btn-primary"
          >
            {showMaterialForm ? 'Cancel' : '+ Log Materials'}
          </button>
        </div>

        {showMaterialForm && (
          <MaterialEventForm
            playerId={id}
            onSuccess={handleEventCreated}
            onCancel={() => setShowMaterialForm(false)}
          />
        )}

        {false && (
          <form onSubmit={handleAddMaterial} className="material-form">
            <div className="form-row">
              <div className="form-group">
                <label>Material Type *</label>
                <select
                  value={newMaterial.materialTypeId}
                  onChange={(e) => setNewMaterial({...newMaterial, materialTypeId: e.target.value})}
                  required
                >
                  <option value="">Select type...</option>
                  {materialTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Agent</label>
                <select
                  value={newMaterial.agentId}
                  onChange={(e) => setNewMaterial({...newMaterial, agentId: e.target.value})}
                >
                  <option value="">Select agent...</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Delivery Method *</label>
                <select
                  value={newMaterial.deliveryMethod}
                  onChange={(e) => setNewMaterial({...newMaterial, deliveryMethod: e.target.value})}
                  required
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Mail">Mail</option>
                  <option value="Email">Email</option>
                  <option value="Text">Text</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={newMaterial.deliveryDate}
                  onChange={(e) => setNewMaterial({...newMaterial, deliveryDate: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={newMaterial.title}
                onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
                placeholder="e.g., Intro Packet, Video Book"
              />
            </div>

            <div className="form-group">
              <label>File Path/Link</label>
              <input
                type="text"
                value={newMaterial.filePath}
                onChange={(e) => setNewMaterial({...newMaterial, filePath: e.target.value})}
                placeholder="OneDrive path or file link"
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={newMaterial.notes}
                onChange={(e) => setNewMaterial({...newMaterial, notes: e.target.value})}
                rows="3"
                placeholder="Any additional notes..."
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Save Material
            </button>
          </form>
        )}

        <div className="materials-timeline">
          {materialEvents && materialEvents.length > 0 ? (
            materialEvents.map(event => (
              <div key={event.id} className="material-event">
                <div className="event-header">
                  <div className="event-date">
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })}
                  </div>
                  <div className="event-label">{event.event_label}</div>
                </div>
                <div className="event-materials">
                  <ul>
                    {event.materials_detailed && event.materials_detailed.map(material => (
                      <li key={material.id}>
                        <span className="material-name">{material.material_name}</span>
                        <span className="material-category">{material.category}</span>
                      </li>
                    ))}
                  </ul>
                  {event.notes && <p className="event-notes">{event.notes}</p>}
                </div>
              </div>
            ))
          ) : (
            <p className="no-materials">No materials logged yet. Click "+ Log Materials" to get started!</p>
          )}
        </div>
      </div>

      {player.contacts && player.contacts.length > 0 && (
        <div className="contacts-section">
          <h2>Contact History ({player.contacts.length})</h2>
          <div className="contacts-list">
            {player.contacts.map(contact => (
              <div key={contact.id} className="contact-item">
                <div className="contact-date">
                  {new Date(contact.contact_date).toLocaleDateString()}
                </div>
                <div className="contact-content">
                  <h4>{contact.contact_type}</h4>
                  {contact.location && <p>{contact.location}</p>}
                  {contact.agent_name && <span className="contact-agent">{contact.agent_name}</span>}
                  {contact.notes && <p className="contact-notes">{contact.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerDetail;
