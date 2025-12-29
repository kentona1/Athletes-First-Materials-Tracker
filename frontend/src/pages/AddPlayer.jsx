import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AddPlayer() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    school: '',
    conference: '',
    hometown: '',
    state: '',
    class_year: '',
    eligibility_year: new Date().getFullYear()
  });

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

  return (
    <div className="add-player">
      <h2>Add New Player</h2>
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
