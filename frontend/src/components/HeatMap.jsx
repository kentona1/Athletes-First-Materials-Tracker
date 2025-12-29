import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/HeatMap.css';

// US State coordinates for positioning
const stateCoordinates = {
  'AL': { lat: 32.806671, lng: -86.791130, name: 'Alabama' },
  'AK': { lat: 61.370716, lng: -152.404419, name: 'Alaska' },
  'AZ': { lat: 33.729759, lng: -111.431221, name: 'Arizona' },
  'AR': { lat: 34.969704, lng: -92.373123, name: 'Arkansas' },
  'CA': { lat: 36.116203, lng: -119.681564, name: 'California' },
  'CO': { lat: 39.059811, lng: -105.311104, name: 'Colorado' },
  'CT': { lat: 41.597782, lng: -72.755371, name: 'Connecticut' },
  'DE': { lat: 39.318523, lng: -75.507141, name: 'Delaware' },
  'FL': { lat: 27.766279, lng: -81.686783, name: 'Florida' },
  'GA': { lat: 33.040619, lng: -83.643074, name: 'Georgia' },
  'HI': { lat: 21.094318, lng: -157.498337, name: 'Hawaii' },
  'ID': { lat: 44.240459, lng: -114.478828, name: 'Idaho' },
  'IL': { lat: 40.349457, lng: -88.986137, name: 'Illinois' },
  'IN': { lat: 39.849426, lng: -86.258278, name: 'Indiana' },
  'IA': { lat: 42.011539, lng: -93.210526, name: 'Iowa' },
  'KS': { lat: 38.526600, lng: -96.726486, name: 'Kansas' },
  'KY': { lat: 37.668140, lng: -84.670067, name: 'Kentucky' },
  'LA': { lat: 31.169546, lng: -91.867805, name: 'Louisiana' },
  'ME': { lat: 44.693947, lng: -69.381927, name: 'Maine' },
  'MD': { lat: 39.063946, lng: -76.802101, name: 'Maryland' },
  'MA': { lat: 42.230171, lng: -71.530106, name: 'Massachusetts' },
  'MI': { lat: 43.326618, lng: -84.536095, name: 'Michigan' },
  'MN': { lat: 45.694454, lng: -93.900192, name: 'Minnesota' },
  'MS': { lat: 32.741646, lng: -89.678696, name: 'Mississippi' },
  'MO': { lat: 38.456085, lng: -92.288368, name: 'Missouri' },
  'MT': { lat: 46.921925, lng: -110.454353, name: 'Montana' },
  'NE': { lat: 41.125370, lng: -98.268082, name: 'Nebraska' },
  'NV': { lat: 38.313515, lng: -117.055374, name: 'Nevada' },
  'NH': { lat: 43.452492, lng: -71.563896, name: 'New Hampshire' },
  'NJ': { lat: 40.298904, lng: -74.521011, name: 'New Jersey' },
  'NM': { lat: 34.840515, lng: -106.248482, name: 'New Mexico' },
  'NY': { lat: 42.165726, lng: -74.948051, name: 'New York' },
  'NC': { lat: 35.630066, lng: -79.806419, name: 'North Carolina' },
  'ND': { lat: 47.528912, lng: -99.784012, name: 'North Dakota' },
  'OH': { lat: 40.388783, lng: -82.764915, name: 'Ohio' },
  'OK': { lat: 35.565342, lng: -96.928917, name: 'Oklahoma' },
  'OR': { lat: 44.572021, lng: -122.070938, name: 'Oregon' },
  'PA': { lat: 40.590752, lng: -77.209755, name: 'Pennsylvania' },
  'RI': { lat: 41.680893, lng: -71.511780, name: 'Rhode Island' },
  'SC': { lat: 33.856892, lng: -80.945007, name: 'South Carolina' },
  'SD': { lat: 44.299782, lng: -99.438828, name: 'South Dakota' },
  'TN': { lat: 35.747845, lng: -86.692345, name: 'Tennessee' },
  'TX': { lat: 31.054487, lng: -97.563461, name: 'Texas' },
  'UT': { lat: 40.150032, lng: -111.862434, name: 'Utah' },
  'VT': { lat: 44.045876, lng: -72.710686, name: 'Vermont' },
  'VA': { lat: 37.769337, lng: -78.169968, name: 'Virginia' },
  'WA': { lat: 47.400902, lng: -121.490494, name: 'Washington' },
  'WV': { lat: 38.491226, lng: -80.954453, name: 'West Virginia' },
  'WI': { lat: 44.268543, lng: -89.616508, name: 'Wisconsin' },
  'WY': { lat: 42.755966, lng: -107.302490, name: 'Wyoming' }
};

function HeatMap({ filters = {} }) {
  const [stateData, setStateData] = useState({});
  const [loading, setLoading] = useState(true);
  const [hoveredState, setHoveredState] = useState(null);
  const [maxCount, setMaxCount] = useState(0);

  useEffect(() => {
    fetchStateData();
  }, [filters]);

  const fetchStateData = async () => {
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`/api/players?${params}`);
      const players = response.data.data;

      // Count players by state
      const stateCounts = {};
      const stateDetails = {};

      players.forEach(player => {
        if (player.state) {
          const state = player.state.toUpperCase();
          stateCounts[state] = (stateCounts[state] || 0) + 1;
          
          if (!stateDetails[state]) {
            stateDetails[state] = {
              total: 0,
              signed: 0,
              players: []
            };
          }
          
          stateDetails[state].total++;
          if (player.outcome_status === 'Signed' || player.status === 'Signed') {
            stateDetails[state].signed++;
          }
          stateDetails[state].players.push(player.name);
        }
      });

      const max = Math.max(...Object.values(stateCounts), 1);
      setMaxCount(max);
      setStateData(stateDetails);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching state data:', error);
      setLoading(false);
    }
  };

  const getHeatColor = (count) => {
    if (!count) return '#e0e0e0';
    const intensity = count / maxCount;
    
    if (intensity > 0.75) return '#0d47a1'; // Dark blue
    if (intensity > 0.5) return '#1976d2';  // Medium blue
    if (intensity > 0.25) return '#42a5f5'; // Light blue
    return '#90caf9'; // Very light blue
  };

  if (loading) {
    return <div className="loading">Loading heat map...</div>;
  }

  return (
    <div className="heat-map-container">
      <div className="heat-map-legend">
        <h4>Recruits by State</h4>
        <div className="legend-scale">
          <span>Low</span>
          <div className="legend-gradient" />
          <span>High</span>
        </div>
      </div>

      <div className="heat-map-grid">
        {Object.entries(stateCoordinates).map(([stateCode, data]) => {
          const stateInfo = stateData[stateCode];
          const count = stateInfo?.total || 0;
          
          return (
            <div
              key={stateCode}
              className="state-box"
              style={{
                backgroundColor: getHeatColor(count)
              }}
              onMouseEnter={() => setHoveredState(stateCode)}
              onMouseLeave={() => setHoveredState(null)}
            >
              <div className="state-code">{stateCode}</div>
              <div className="state-count">{count}</div>
            </div>
          );
        })}
      </div>

      {hoveredState && stateData[hoveredState] && (
        <div className="state-tooltip">
          <h4>{stateCoordinates[hoveredState].name}</h4>
          <p>Total Recruits: {stateData[hoveredState].total}</p>
          <p>Signed: {stateData[hoveredState].signed}</p>
          <p className="conversion-rate">
            Conversion: {stateData[hoveredState].total > 0 
              ? `${((stateData[hoveredState].signed / stateData[hoveredState].total) * 100).toFixed(1)}%`
              : '0%'
            }
          </p>
          <div className="player-list">
            {stateData[hoveredState].players.slice(0, 5).map((name, idx) => (
              <div key={idx} className="player-name">{name}</div>
            ))}
            {stateData[hoveredState].players.length > 5 && (
              <div className="more-players">
                +{stateData[hoveredState].players.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      <div className="heat-map-stats">
        <div className="stat-item">
          <label>Total States</label>
          <span>{Object.keys(stateData).length}</span>
        </div>
        <div className="stat-item">
          <label>Top State</label>
          <span>
            {Object.keys(stateData).length > 0 
              ? Object.entries(stateData).sort((a, b) => b[1].total - a[1].total)[0][0]
              : '-'
            }
          </span>
        </div>
        <div className="stat-item">
          <label>Most Signed From</label>
          <span>
            {Object.keys(stateData).length > 0
              ? Object.entries(stateData).sort((a, b) => b[1].signed - a[1].signed)[0][0]
              : '-'
            }
          </span>
        </div>
      </div>
    </div>
  );
}

export default HeatMap;
