import React, { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';
import '../styles/AdvancedHeatMap.css';

// School location data - can be fetched from ESPN API
// For now, major college football schools with approximate coordinates
const SCHOOL_COORDINATES = {
  // SEC
  'Alabama': { lat: 33.2098, lng: -87.5692, conference: 'SEC' },
  'Auburn': { lat: 32.6099, lng: -85.4808, conference: 'SEC' },
  'Florida': { lat: 29.6436, lng: -82.3549, conference: 'SEC' },
  'Georgia': { lat: 33.9519, lng: -83.3576, conference: 'SEC' },
  'Kentucky': { lat: 38.0336, lng: -84.5037, conference: 'SEC' },
  'LSU': { lat: 30.4133, lng: -91.1800, conference: 'SEC' },
  'Ole Miss': { lat: 34.3665, lng: -89.5348, conference: 'SEC' },
  'Mississippi State': { lat: 33.4557, lng: -88.7903, conference: 'SEC' },
  'Missouri': { lat: 38.9404, lng: -92.3277, conference: 'SEC' },
  'South Carolina': { lat: 33.9737, lng: -81.0300, conference: 'SEC' },
  'Tennessee': { lat: 35.9544, lng: -83.9295, conference: 'SEC' },
  'Texas A&M': { lat: 30.6280, lng: -96.3344, conference: 'SEC' },
  'Arkansas': { lat: 36.0686, lng: -94.1748, conference: 'SEC' },
  'Vanderbilt': { lat: 36.1447, lng: -86.8027, conference: 'SEC' },
  'Texas': { lat: 30.2849, lng: -97.7341, conference: 'SEC' },
  'Oklahoma': { lat: 35.2056, lng: -97.4456, conference: 'SEC' },

  // Big Ten
  'Ohio State': { lat: 40.0142, lng: -83.0305, conference: 'Big Ten' },
  'Michigan': { lat: 42.2776, lng: -83.7382, conference: 'Big Ten' },
  'Penn State': { lat: 40.7982, lng: -77.8599, conference: 'Big Ten' },
  'Wisconsin': { lat: 43.0731, lng: -89.4012, conference: 'Big Ten' },
  'Iowa': { lat: 41.6611, lng: -91.5302, conference: 'Big Ten' },
  'Michigan State': { lat: 42.7284, lng: -84.4839, conference: 'Big Ten' },
  'Nebraska': { lat: 40.8202, lng: -96.7005, conference: 'Big Ten' },
  'Minnesota': { lat: 44.9778, lng: -93.2650, conference: 'Big Ten' },
  'Northwestern': { lat: 42.0565, lng: -87.6753, conference: 'Big Ten' },
  'Illinois': { lat: 40.1020, lng: -88.2272, conference: 'Big Ten' },
  'Indiana': { lat: 39.1653, lng: -86.5264, conference: 'Big Ten' },
  'Purdue': { lat: 40.4237, lng: -86.9212, conference: 'Big Ten' },
  'Maryland': { lat: 38.9869, lng: -76.9426, conference: 'Big Ten' },
  'Rutgers': { lat: 40.5008, lng: -74.4474, conference: 'Big Ten' },
  'USC': { lat: 34.0224, lng: -118.2851, conference: 'Big Ten' },
  'UCLA': { lat: 34.0689, lng: -118.4452, conference: 'Big Ten' },
  'Oregon': { lat: 44.0582, lng: -123.0868, conference: 'Big Ten' },
  'Washington': { lat: 47.6506, lng: -122.3045, conference: 'Big Ten' },

  // ACC
  'Clemson': { lat: 34.6834, lng: -82.8374, conference: 'ACC' },
  'Florida State': { lat: 30.4383, lng: -84.2807, conference: 'ACC' },
  'Miami': { lat: 25.7617, lng: -80.1918, conference: 'ACC' },
  'North Carolina': { lat: 35.9132, lng: -79.0558, conference: 'ACC' },
  'NC State': { lat: 35.7721, lng: -78.6389, conference: 'ACC' },
  'Duke': { lat: 36.0014, lng: -78.9382, conference: 'ACC' },
  'Virginia': { lat: 38.0293, lng: -78.4767, conference: 'ACC' },
  'Virginia Tech': { lat: 37.2284, lng: -80.4234, conference: 'ACC' },
  'Louisville': { lat: 38.2527, lng: -85.7585, conference: 'ACC' },
  'Pittsburgh': { lat: 40.4406, lng: -79.9959, conference: 'ACC' },
  'Syracuse': { lat: 43.0481, lng: -76.1474, conference: 'ACC' },
  'Boston College': { lat: 42.3355, lng: -71.1685, conference: 'ACC' },
  'Wake Forest': { lat: 36.1349, lng: -80.2834, conference: 'ACC' },
  'Georgia Tech': { lat: 33.7490, lng: -84.3880, conference: 'ACC' },
  'SMU': { lat: 32.8412, lng: -96.7845, conference: 'ACC' },
  'California': { lat: 37.8719, lng: -122.2585, conference: 'ACC' },
  'Stanford': { lat: 37.4275, lng: -122.1697, conference: 'ACC' },

  // Big 12
  'Oklahoma State': { lat: 36.1156, lng: -97.0584, conference: 'Big 12' },
  'Kansas': { lat: 38.9543, lng: -95.2558, conference: 'Big 12' },
  'Kansas State': { lat: 39.1836, lng: -96.5717, conference: 'Big 12' },
  'Iowa State': { lat: 42.0266, lng: -93.6465, conference: 'Big 12' },
  'Texas Tech': { lat: 33.5843, lng: -101.8753, conference: 'Big 12' },
  'TCU': { lat: 32.7357, lng: -97.3321, conference: 'Big 12' },
  'Baylor': { lat: 31.5489, lng: -97.1131, conference: 'Big 12' },
  'West Virginia': { lat: 39.6295, lng: -79.9559, conference: 'Big 12' },
  'UCF': { lat: 28.6024, lng: -81.2001, conference: 'Big 12' },
  'Cincinnati': { lat: 39.1031, lng: -84.5120, conference: 'Big 12' },
  'Houston': { lat: 29.7604, lng: -95.3698, conference: 'Big 12' },
  'BYU': { lat: 40.2518, lng: -111.6493, conference: 'Big 12' },
  'Arizona': { lat: 32.2319, lng: -110.9501, conference: 'Big 12' },
  'Arizona State': { lat: 33.4255, lng: -111.9400, conference: 'Big 12' },
  'Colorado': { lat: 40.0150, lng: -105.2705, conference: 'Big 12' },
  'Utah': { lat: 40.7649, lng: -111.8421, conference: 'Big 12' },

  // Pac-12 (remaining)
  'Washington State': { lat: 46.7319, lng: -117.1542, conference: 'Pac-12' },
  'Oregon State': { lat: 44.5646, lng: -123.2620, conference: 'Pac-12' },

  // Other Power 5 / Notable
  'Notre Dame': { lat: 41.7001, lng: -86.2379, conference: 'Independent' },
  'Army': { lat: 41.3915, lng: -73.9540, conference: 'Independent' },
  'Navy': { lat: 38.9832, lng: -76.4895, conference: 'AAC' },
};

function AdvancedHeatMap({ filters = {} }) {
  const [schoolData, setSchoolData] = useState({});
  const [loading, setLoading] = useState(true);
  const [hoveredSchool, setHoveredSchool] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });

  useEffect(() => {
    fetchSchoolData();
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (!loading && Object.keys(schoolData).length > 0) {
      drawHeatMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolData, loading, dimensions]);

  const updateDimensions = () => {
    const container = document.querySelector('.advanced-heat-map');
    if (container) {
      // Account for padding (2rem = 32px on each side)
      const padding = 64; // 2rem * 2 sides
      const availableWidth = container.offsetWidth - padding;
      const availableHeight = Math.min(availableWidth * 0.6, 700 - padding);

      setDimensions({
        width: Math.max(availableWidth, 100),
        height: Math.max(availableHeight, 100)
      });
    }
  };

  const fetchSchoolData = async () => {
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`/api/players?${params}`);
      const players = response.data.data;

      // Count players by school
      const schoolCounts = {};
      players.forEach(player => {
        if (player.school && SCHOOL_COORDINATES[player.school]) {
          if (!schoolCounts[player.school]) {
            schoolCounts[player.school] = {
              count: 0,
              signed: 0,
              players: [],
              coords: SCHOOL_COORDINATES[player.school]
            };
          }
          schoolCounts[player.school].count++;
          if (player.outcome_status === 'Signed' || player.status === 'Signed') {
            schoolCounts[player.school].signed++;
          }
          schoolCounts[player.school].players.push({
            name: player.name,
            position: player.position,
            status: player.outcome_status || player.status
          });
        }
      });

      setSchoolData(schoolCounts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching school data:', error);
      setLoading(false);
    }
  };

  const latLngToXY = (lat, lng) => {
    // Simple equirectangular projection for US map
    const minLat = 24;  // Southern tip of Florida
    const maxLat = 49;  // Canadian border
    const minLng = -125; // West Coast
    const maxLng = -66;  // East Coast

    const x = ((lng - minLng) / (maxLng - minLng)) * dimensions.width;
    const y = ((maxLat - lat) / (maxLat - minLat)) * dimensions.height;

    return { x, y };
  };

  const getHeatColor = (count, maxCount) => {
    const intensity = Math.min(count / maxCount, 1);
    
    // Color gradient: Blue → Cyan → Yellow → Orange → Red
    if (intensity < 0.2) return `rgba(100, 150, 255, ${0.3 + intensity * 2})`;
    if (intensity < 0.4) return `rgba(100, 200, 255, ${0.5 + intensity})`;
    if (intensity < 0.6) return `rgba(255, 255, 100, ${0.6 + intensity})`;
    if (intensity < 0.8) return `rgba(255, 165, 0, ${0.7 + intensity})`;
    return `rgba(255, 50, 50, ${0.8 + intensity * 0.2})`;
  };

  const drawHeatMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('Canvas ref not available');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Canvas context not available');
      return;
    }

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    if (Object.keys(schoolData).length === 0) {
      console.log('No school data to draw');
      return;
    }

    const maxCount = Math.max(...Object.values(schoolData).map(s => s.count), 1);

    // Draw heat gradient overlay
    Object.entries(schoolData).forEach(([school, data]) => {
      const pos = latLngToXY(data.coords.lat, data.coords.lng);
      const radius = 30 + (data.count / maxCount) * 50;

      // Create radial gradient
      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
      gradient.addColorStop(0, getHeatColor(data.count, maxCount));
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(pos.x - radius, pos.y - radius, radius * 2, radius * 2);
    });

    console.log(`Heat map drawn with ${Object.keys(schoolData).length} schools`);
  };

  const handleSchoolClick = (school) => {
    setSelectedSchool(selectedSchool === school ? null : school);
  };

  if (loading) {
    return <div className="loading">Loading heat map...</div>;
  }

  const maxCount = Math.max(...Object.values(schoolData).map(s => s.count), 1);

  return (
    <div className="advanced-heat-map">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="heat-canvas"
      />
      
      <svg
        className="map-overlay"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {/* US Map Outline */}
        <rect
          x="0"
          y="0"
          width={dimensions.width}
          height={dimensions.height}
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {/* School dots - smaller and more precise */}
        {Object.entries(schoolData).map(([school, data]) => {
          const pos = latLngToXY(data.coords.lat, data.coords.lng);
          const dotSize = 2 + (data.count / maxCount) * 4; // Smaller dots: 2-6px instead of 3-11px

          return (
            <g key={school}>
              {/* Glow effect - reduced */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={dotSize + 2}
                fill="rgba(255, 255, 255, 0.2)"
                className="school-glow"
              />
              {/* Main dot */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={dotSize}
                fill="white"
                stroke="#000"
                strokeWidth="0.5"
                className="school-dot"
                onMouseEnter={() => setHoveredSchool(school)}
                onMouseLeave={() => setHoveredSchool(null)}
                onClick={() => handleSchoolClick(school)}
                style={{ cursor: 'pointer' }}
              />
              {/* Label for larger schools */}
              {data.count >= maxCount * 0.3 && (
                <text
                  x={pos.x}
                  y={pos.y - dotSize - 5}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  className="school-label"
                >
                  {school}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredSchool && schoolData[hoveredSchool] && (
        <div 
          className="school-tooltip"
          style={{
            position: 'fixed',
            pointerEvents: 'none'
          }}
        >
          <h4>{hoveredSchool}</h4>
          <p className="conference-badge">{schoolData[hoveredSchool].coords.conference}</p>
          <div className="tooltip-stats">
            <div className="stat">
              <span className="label">Total Recruits:</span>
              <span className="value">{schoolData[hoveredSchool].count}</span>
            </div>
            <div className="stat">
              <span className="label">Signed:</span>
              <span className="value success">{schoolData[hoveredSchool].signed}</span>
            </div>
            <div className="stat">
              <span className="label">Conversion:</span>
              <span className="value">
                {((schoolData[hoveredSchool].signed / schoolData[hoveredSchool].count) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Selected school details panel */}
      {selectedSchool && schoolData[selectedSchool] && (
        <div className="selected-school-panel">
          <div className="panel-header">
            <h3>{selectedSchool}</h3>
            <button onClick={() => setSelectedSchool(null)} className="close-btn">×</button>
          </div>
          <p className="conference">{schoolData[selectedSchool].coords.conference}</p>
          <div className="panel-stats">
            <div className="stat-box">
              <div className="stat-number">{schoolData[selectedSchool].count}</div>
              <div className="stat-label">Total Recruits</div>
            </div>
            <div className="stat-box success">
              <div className="stat-number">{schoolData[selectedSchool].signed}</div>
              <div className="stat-label">Signed</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">
                {((schoolData[selectedSchool].signed / schoolData[selectedSchool].count) * 100).toFixed(0)}%
              </div>
              <div className="stat-label">Conversion</div>
            </div>
          </div>
          <div className="player-list">
            <h4>Players ({schoolData[selectedSchool].players.length})</h4>
            {schoolData[selectedSchool].players.map((player, idx) => (
              <div key={idx} className="player-item">
                <span className="player-name">{player.name}</span>
                <span className="player-position">{player.position}</span>
                <span className={`player-status ${player.status?.toLowerCase()}`}>
                  {player.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="heat-legend">
        <h4>Recruit Density</h4>
        <div className="legend-gradient">
          <span className="legend-label">Low</span>
          <div className="gradient-bar" />
          <span className="legend-label">High</span>
        </div>
        <div className="legend-stats">
          <div className="stat-item">
            <span className="label">Total Schools:</span>
            <span className="value">{Object.keys(schoolData).length}</span>
          </div>
          <div className="stat-item">
            <span className="label">Top School:</span>
            <span className="value">
              {Object.entries(schoolData).sort((a, b) => b[1].count - a[1].count)[0]?.[0] || '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancedHeatMap;
