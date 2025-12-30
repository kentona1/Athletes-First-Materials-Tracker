import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import '../styles/PlayerDetail.css';

function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
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

  const fetchPlayerDetails = async () => {
    try {
      const response = await axios.get(`/api/players/${id}`);
      setPlayer(response.data.data);
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
              {player.position} • {player.school} ({player.conference})
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
            <span>{player.height || '-'}</span>
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
