import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import SchoolAutocomplete from '../components/SchoolAutocomplete';
import '../styles/AddPlayer.css';

function EditPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [player, setPlayer] = useState(null);
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
    high_school: '',
    nfl_team: '',
    years_pro: '',
    recruiting_cycle_year: '',
    recruiting_stars: '',
    recruiting_rating: '',
    recruiting_ranking: '',
    original_commitment: '',
    photo_url: ''
  });

  useEffect(() => {
    fetchPlayer();
    fetchAgents();
  }, [id]);

  const fetchPlayer = async () => {
    try {
      const response = await axios.get(`/api/players/${id}`);
      const playerData = response.data.data;
      setPlayer(playerData);

      // Populate form with existing data
      setFormData({
        name: playerData.name || '',
        position: playerData.position || '',
        school: playerData.school || '',
        conference: playerData.conference || '',
        hometown: playerData.hometown || '',
        state: playerData.state || '',
        height: playerData.height || '',
        weight: playerData.weight || '',
        class_year: playerData.class_year || '',
        high_school: playerData.high_school || '',
        nfl_team: playerData.nfl_team || '',
        years_pro: playerData.years_pro || '',
        recruiting_cycle_year: playerData.recruiting_cycle_year || '',
        recruiting_stars: playerData.recruiting_stars || '',
        recruiting_rating: playerData.recruiting_rating || '',
        recruiting_ranking: playerData.recruiting_ranking || '',
        original_commitment: playerData.original_commitment || '',
        photo_url: playerData.photo_url || ''
      });

      // Set selected agents
      if (playerData.agents) {
        setSelectedAgents(playerData.agents.map(a => a.id));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching player:', error);
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await axios.get('/api/agents');
      setAgents(response.data.data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAgentToggle = (agentId) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Update player
      await axios.put(`/api/players/${id}`, {
        name: formData.name,
        position: formData.position,
        school: formData.school || null,
        conference: formData.conference || null,
        hometown: formData.hometown || null,
        state: formData.state || null,
        height: formData.height || null,
        weight: formData.weight || null,
        class_year: formData.class_year || null,
        high_school: formData.high_school || null,
        nfl_team: formData.nfl_team || null,
        years_pro: formData.years_pro || null,
        recruiting_cycle_year: formData.recruiting_cycle_year || null,
        recruiting_stars: formData.recruiting_stars || null,
        recruiting_rating: formData.recruiting_rating || null,
        recruiting_ranking: formData.recruiting_ranking || null,
        original_commitment: formData.original_commitment || null,
        photo_url: formData.photo_url || null
      });

      // Update agent assignments
      // First, get current assignments to compare
      const currentAgentIds = player.agents?.map(a => a.id) || [];

      // Remove agents that were unselected
      for (const agentId of currentAgentIds) {
        if (!selectedAgents.includes(agentId)) {
          // Would need a remove endpoint, skip for now
        }
      }

      // Add new agent assignments
      for (const agentId of selectedAgents) {
        if (!currentAgentIds.includes(agentId)) {
          await axios.post('/api/players/assign-agent', {
            playerId: parseInt(id),
            agentId: agentId,
            isPrimary: selectedAgents.indexOf(agentId) === 0
          });
        }
      }

      alert('Player updated successfully!');
      navigate(`/players/${id}`);
    } catch (error) {
      console.error('Error updating player:', error);
      alert('Error updating player: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading player...</div>;
  }

  if (!player) {
    return <div className="error">Player not found</div>;
  }

  const isVeteran = player.player_type === 'veteran';
  const isHighSchool = player.player_type === 'high_school';
  const isCollege = player.player_type === 'college';

  return (
    <div className="add-player-page">
      <div className="page-header">
        <h1>Edit Player</h1>
        <button onClick={() => navigate(`/players/${id}`)} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="player-form">
        {/* Basic Info */}
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-row">
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
            <div className="form-group">
              <label>Position *</label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                required
              >
                <option value="">Select position...</option>
                <option value="QB">QB - Quarterback</option>
                <option value="RB">RB - Running Back</option>
                <option value="WR">WR - Wide Receiver</option>
                <option value="TE">TE - Tight End</option>
                <option value="OT">OT - Offensive Tackle</option>
                <option value="OG">OG - Offensive Guard</option>
                <option value="C">C - Center</option>
                <option value="EDGE">EDGE - Edge Rusher</option>
                <option value="DL">DL - Defensive Line</option>
                <option value="LB">LB - Linebacker</option>
                <option value="CB">CB - Cornerback</option>
                <option value="S">S - Safety</option>
                <option value="K">K - Kicker</option>
                <option value="P">P - Punter</option>
                <option value="LS">LS - Long Snapper</option>
                <option value="ATH">ATH - Athlete</option>
              </select>
            </div>
          </div>

          {formData.photo_url && (
            <div className="form-row">
              <div className="form-group">
                <label>Current Photo</label>
                <img src={formData.photo_url} alt={formData.name} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
              </div>
            </div>
          )}

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

          <div className="form-row">
            <div className="form-group">
              <label>Height</label>
              <input
                type="text"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="e.g., 6'2&quot;"
              />
            </div>
            <div className="form-group">
              <label>Weight (lbs)</label>
              <input
                type="text"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g., 220"
              />
            </div>
          </div>
        </div>

        {/* School/Team Info - varies by player type */}
        <div className="form-section">
          <h3>{isVeteran ? 'NFL Team Info' : isHighSchool ? 'High School Info' : 'School Info'}</h3>

          {isVeteran ? (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>NFL Team</label>
                  <input
                    type="text"
                    name="nfl_team"
                    value={formData.nfl_team}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Years Pro</label>
                  <input
                    type="number"
                    name="years_pro"
                    value={formData.years_pro}
                    onChange={handleChange}
                    min="1"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>College</label>
                  <input
                    type="text"
                    name="school"
                    value={formData.school}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          ) : isHighSchool ? (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>High School</label>
                  <input
                    type="text"
                    name="high_school"
                    value={formData.high_school}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Recruiting Class Year</label>
                  <input
                    type="number"
                    name="recruiting_cycle_year"
                    value={formData.recruiting_cycle_year}
                    onChange={handleChange}
                    placeholder="e.g., 2026"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>School</label>
                  <SchoolAutocomplete
                    value={formData.school}
                    onChange={(school, conference) => {
                      setFormData(prev => ({ ...prev, school, conference }));
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Conference</label>
                  <input
                    type="text"
                    name="conference"
                    value={formData.conference}
                    disabled
                    className="disabled-input"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Class Year</label>
                  <select
                    name="class_year"
                    value={formData.class_year}
                    onChange={handleChange}
                  >
                    <option value="">Select...</option>
                    <option value="Freshman">Freshman</option>
                    <option value="Sophomore">Sophomore</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                    <option value="Graduate">Graduate</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>High School</label>
                  <input
                    type="text"
                    name="high_school"
                    value={formData.high_school}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recruiting Info - for college and high school */}
        {!isVeteran && (
          <div className="form-section">
            <h3>Recruiting Info</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Recruiting Stars</label>
                <select
                  name="recruiting_stars"
                  value={formData.recruiting_stars}
                  onChange={handleChange}
                >
                  <option value="">Select...</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
              <div className="form-group">
                <label>Recruiting Rating</label>
                <input
                  type="text"
                  name="recruiting_rating"
                  value={formData.recruiting_rating}
                  onChange={handleChange}
                  placeholder="e.g., 0.9823"
                />
              </div>
              <div className="form-group">
                <label>National Ranking</label>
                <input
                  type="number"
                  name="recruiting_ranking"
                  value={formData.recruiting_ranking}
                  onChange={handleChange}
                  placeholder="e.g., 45"
                />
              </div>
            </div>
            {isCollege && (
              <div className="form-row">
                <div className="form-group">
                  <label>Original Commitment</label>
                  <input
                    type="text"
                    name="original_commitment"
                    value={formData.original_commitment}
                    onChange={handleChange}
                    placeholder="Original school committed to"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agent Assignment */}
        <div className="form-section">
          <h3>Assigned Agents</h3>
          <div className="agents-grid">
            {agents.map(agent => (
              <label key={agent.id} className={`agent-checkbox ${selectedAgents.includes(agent.id) ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedAgents.includes(agent.id)}
                  onChange={() => handleAgentToggle(agent.id)}
                />
                <span>{agent.first_name} {agent.last_name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate(`/players/${id}`)} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditPlayer;
