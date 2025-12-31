import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import '../styles/MaterialEventForm.css';

function MaterialEventForm({ playerId, onSuccess, onCancel }) {
  const [materialTypes, setMaterialTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [formData, setFormData] = useState({
    eventDate: new Date().toISOString().split('T')[0],
    deliveryMethod: 'Meeting',
    copies: 1,
    selectedMaterials: [],
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMaterialTypes();
  }, []);

  const fetchMaterialTypes = async () => {
    try {
      const response = await axios.get('/api/materials/types');
      setMaterialTypes(response.data.data || []);
    } catch (error) {
      console.error('Error fetching material types:', error);
      setError('Failed to load material types');
    }
  };

  const categories = ['All', ...new Set(materialTypes.map(m => m.category))];

  const filteredMaterials = materialTypes.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || material.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleMaterial = (materialId) => {
    setFormData(prev => ({
      ...prev,
      selectedMaterials: prev.selectedMaterials.includes(materialId)
        ? prev.selectedMaterials.filter(id => id !== materialId)
        : [...prev.selectedMaterials, materialId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.selectedMaterials.length === 0) {
      setError('Please select at least one material');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/materials/events', {
        playerId: playerId,
        eventDate: formData.eventDate,
        deliveryMethod: formData.deliveryMethod,
        materialIds: formData.selectedMaterials,
        copies: formData.deliveryMethod !== 'Email' ? formData.copies : 1,
        notes: formData.notes
      });

      console.log('✅ Event created:', response.data.data);

      if (onSuccess) {
        onSuccess(response.data.data);
      }

      // Reset form
      setFormData({
        eventDate: new Date().toISOString().split('T')[0],
        deliveryMethod: 'Meeting',
        copies: 1,
        selectedMaterials: [],
        notes: ''
      });
      setSearchTerm('');
    } catch (error) {
      console.error('Error creating event:', error);
      setError(error.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryMethodChange = (e) => {
    const method = e.target.value;
    setFormData({
      ...formData,
      deliveryMethod: method,
      copies: method === 'Email' ? 1 : formData.copies
    });
  };

  return (
    <div className="material-event-form">
      <h3>Log Materials</h3>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={formData.eventDate}
              onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Delivery Method *</label>
            <select
              value={formData.deliveryMethod}
              onChange={handleDeliveryMethodChange}
              required
            >
              <option value="Meeting">Meeting</option>
              <option value="Mail">Mail</option>
              <option value="Email">Email</option>
            </select>
          </div>

          {formData.deliveryMethod !== 'Email' && (
            <div className="form-group">
              <label>Copies {formData.deliveryMethod === 'Mail' ? 'Shipped' : 'Printed'} *</label>
              <select
                value={formData.copies}
                onChange={(e) => setFormData({ ...formData, copies: parseInt(e.target.value) })}
                required
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="materials-selection">
          <div className="selection-header">
            <label>Materials * ({formData.selectedMaterials.length} selected)</label>
            <div className="selection-controls">
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-filter"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="materials-grid">
            {filteredMaterials.map(material => (
              <label key={material.id} className="material-checkbox">
                <input
                  type="checkbox"
                  checked={formData.selectedMaterials.includes(material.id)}
                  onChange={() => toggleMaterial(material.id)}
                />
                <span className="material-name">{material.name}</span>
                <span className="material-category">{material.category}</span>
              </label>
            ))}
          </div>

          {filteredMaterials.length === 0 && (
            <div className="no-materials">No materials found</div>
          )}
        </div>

        <div className="form-group">
          <label>Notes (Optional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows="3"
            placeholder="Add any additional notes about this delivery..."
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || formData.selectedMaterials.length === 0}
          >
            {loading ? 'Logging...' : 'Log Materials'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MaterialEventForm;
