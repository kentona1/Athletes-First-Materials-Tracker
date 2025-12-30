import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { formatHeight } from '../utils/formatters';
import '../styles/PlayerDetail.css';

function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [progressionLogos, setProgressionLogos] = useState({}); // Map of school name to logo URL
  const [loading, setLoading] = useState(true);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [agents, setAgents] = useState([]);

  const [newMaterial, setNewMaterial] = useState({
    materialTypeId: '',
    agentId: '',
    title: '',
    deliveryMethod: 'Meeting',
    deliveryDate: new Date().toISOString().split('T')[0],
    filePath: '',
    notes: ''
  });

  useEffect(() => {
    fetchPlayerDetails();
    fetchMaterialTypes();
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProgressionLogos = async (playerData) => {
    const logos = {};
    const schoolsToFetch = [];

    // Collect all unique schools in the progression
    if (playerData.original_commitment) {
      schoolsToFetch.push(playerData.original_commitment);
    }
    if (playerData.transfers && playerData.transfers.length > 0) {
      playerData.transfers.forEach(transfer => {
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

  if (loading) {
    return <div className="loading">Loading player details...</div>;
  }

  if (!player) {
    return <div className="error">Player not found</div>;
  }

  return (
    <div className="player-detail">
      <div className="page-header">
        <button onClick={() => navigate('/players')} className="btn btn-secondary">
          ← Back to Players
        </button>
        <button onClick={() => navigate(`/players/${id}/edit`)} className="btn btn-primary">
          Edit Player
        </button>
      </div>

      <div className="player-info-card">
        <div className="player-header">
          {player.photo_url && (
            <img src={player.photo_url} alt={player.name} className="player-photo" />
          )}
          <div className="player-title">
            <h1>{player.name}</h1>
            <p className="player-subtitle">
              {player.position} •{' '}
              {schoolData?.logo && (
                <img
                  src={schoolData.logo}
                  alt={player.school}
                  className="school-logo-inline"
                  style={{ width: '20px', height: '20px', verticalAlign: 'middle', marginRight: '5px' }}
                />
              )}
              {player.school} ({player.conference})
            </p>
          </div>
        </div>

        <div className="player-stats-grid">
          <div className="stat-item">
            <label>Class</label>
            <span>{player.class_year}</span>
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
            <span className={`status-badge ${player.status?.toLowerCase()}`}>
              {player.status}
            </span>
          </div>
          {player.outcome?.draft_round && (
            <div className="stat-item">
              <label>Draft</label>
              <span>Round {player.outcome.draft_round}</span>
            </div>
          )}
        </div>

        {player.agents && player.agents.length > 0 && (
          <div className="agents-section">
            <h3>Assigned Agents</h3>
            <div className="agents-list">
              {player.agents.map(agent => (
                <span key={agent.id} className="agent-badge">
                  {agent.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

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
              {player.high_school && (
                <div className="progression-step">
                  <div className="step-label">High School</div>
                  <div className="step-school">{player.high_school}</div>
                </div>
              )}

              {player.original_commitment && player.original_commitment !== player.school && (
                <>
                  <div className="progression-arrow">→</div>
                  <div className="progression-step">
                    <div className="step-label">Original</div>
                    {progressionLogos[player.original_commitment] && (
                      <img
                        src={progressionLogos[player.original_commitment]}
                        alt={player.original_commitment}
                        className="progression-logo"
                      />
                    )}
                    <div className="step-school">{player.original_commitment}</div>
                  </div>
                </>
              )}

              {player.transfers && player.transfers.length > 0 && (
                player.transfers.map((transfer, idx) => (
                  <React.Fragment key={idx}>
                    <div className="progression-arrow">→</div>
                    <div className="progression-step">
                      <div className="step-label">{transfer.transfer_year}</div>
                      {progressionLogos[transfer.to_school] && (
                        <img
                          src={progressionLogos[transfer.to_school]}
                          alt={transfer.to_school}
                          className="progression-logo"
                        />
                      )}
                      <div className="step-school">{transfer.to_school}</div>
                    </div>
                  </React.Fragment>
                ))
              )}

              {(!player.transfers || player.transfers.length === 0) && player.school !== player.original_commitment && (
                <>
                  <div className="progression-arrow">→</div>
                  <div className="progression-step current">
                    <div className="step-label">Current</div>
                    {progressionLogos[player.school] && (
                      <img
                        src={progressionLogos[player.school]}
                        alt={player.school}
                        className="progression-logo"
                      />
                    )}
                    <div className="step-school">{player.school}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="materials-section">
        <div className="section-header">
          <h2>Materials ({player.materials?.length || 0})</h2>
          <button 
            onClick={() => setShowMaterialForm(!showMaterialForm)}
            className="btn btn-primary"
          >
            {showMaterialForm ? 'Cancel' : '+ Log Material'}
          </button>
        </div>

        {showMaterialForm && (
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
          {player.materials && player.materials.length > 0 ? (
            player.materials.map(material => (
              <div key={material.id} className="material-item">
                <div className="material-date">
                  {new Date(material.delivery_date).toLocaleDateString()}
                </div>
                <div className="material-content">
                  <h4>{material.material_type_name}</h4>
                  {material.title && <p className="material-title">{material.title}</p>}
                  <div className="material-meta">
                    <span className="material-method">{material.delivery_method}</span>
                    {material.agent_name && (
                      <span className="material-agent">• {material.agent_name}</span>
                    )}
                  </div>
                  {material.notes && <p className="material-notes">{material.notes}</p>}
                  {material.file_path && (
                    <a href={material.file_path} className="material-link" target="_blank" rel="noopener noreferrer">
                      View File
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="no-materials">No materials logged yet.</p>
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
