import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';
import './SchoolAutocomplete.css';

function SchoolAutocomplete({ value, onChange, required = false }) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const wrapperRef = useRef(null);

  // Update search term when value prop changes
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search schools as user types
  const handleInputChange = async (e) => {
    const query = e.target.value;
    setSearchTerm(query);
    setSelectedSchool(null);

    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      onChange('', '');
      return;
    }

    try {
      const response = await axios.get('/api/schools/search', {
        params: { query }
      });
      setSuggestions(response.data.data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching schools:', error);
      setSuggestions([]);
    }
  };

  // Handle selecting a school from suggestions
  const handleSelectSchool = (school) => {
    setSearchTerm(school.school);
    setSelectedSchool(school);
    setShowSuggestions(false);
    setSuggestions([]);

    // Pass both school name and conference to parent
    onChange(school.school, school.conference || '');
  };

  // Handle blur - if no valid school selected, clear
  const handleBlur = () => {
    setTimeout(() => {
      if (!selectedSchool && searchTerm) {
        // User typed something but didn't select from dropdown
        // Try to find exact match
        const exactMatch = suggestions.find(s =>
          s.school.toLowerCase() === searchTerm.toLowerCase()
        );
        if (exactMatch) {
          handleSelectSchool(exactMatch);
        }
      }
    }, 200);
  };

  return (
    <div className="school-autocomplete" ref={wrapperRef}>
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
        onBlur={handleBlur}
        placeholder="Search for a school..."
        required={required}
        className="school-autocomplete-input"
      />

      {showSuggestions && suggestions.length > 0 && (
        <ul className="school-suggestions">
          {suggestions.map((school) => (
            <li
              key={school.id}
              onClick={() => handleSelectSchool(school)}
              className="school-suggestion-item"
            >
              <div className="school-suggestion-content">
                {school.logo && (
                  <img
                    src={school.logo}
                    alt={school.school}
                    className="school-suggestion-logo"
                  />
                )}
                <div className="school-suggestion-text">
                  <div className="school-suggestion-name">
                    {school.school} {school.mascot && `(${school.mascot})`}
                  </div>
                  {school.conference && (
                    <div className="school-suggestion-conference">
                      {school.conference}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showSuggestions && suggestions.length === 0 && searchTerm.length >= 2 && (
        <div className="school-no-results">
          No schools found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}

export default SchoolAutocomplete;
