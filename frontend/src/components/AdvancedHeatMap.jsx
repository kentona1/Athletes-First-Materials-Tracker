import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup
} from 'react-simple-maps';
import axios from '../api/axios';
import '../styles/AdvancedHeatMap.css';

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// Orange County, CA - Athletes First HQ
const HQ_LOCATION = [-117.76, 33.68];
const HQ_NAME = "Athletes First HQ";

// Conference colors - vibrant broadcast palette
const CONFERENCE_COLORS = {
  'SEC': { primary: '#ff3a3a', glow: 'rgba(255, 58, 58, 0.7)', dark: '#cc2e2e' },
  'Big Ten': { primary: '#0080ff', glow: 'rgba(0, 128, 255, 0.7)', dark: '#0066cc' },
  'ACC': { primary: '#ffd000', glow: 'rgba(255, 208, 0, 0.7)', dark: '#ccaa00' },
  'Big 12': { primary: '#ff6b35', glow: 'rgba(255, 107, 53, 0.7)', dark: '#cc5529' },
  'Pac-12': { primary: '#c9b037', glow: 'rgba(201, 176, 55, 0.7)', dark: '#a08c2c' },
  'Independent': { primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.7)', dark: '#8644c5' },
  'AAC': { primary: '#00d9a5', glow: 'rgba(0, 217, 165, 0.7)', dark: '#00ad84' },
  'Mountain West': { primary: '#f97316', glow: 'rgba(249, 115, 22, 0.7)', dark: '#c75c12' },
  'Sun Belt': { primary: '#ec4899', glow: 'rgba(236, 72, 153, 0.7)', dark: '#bd3a7a' },
  'C-USA': { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.7)', dark: '#0592a9' },
  'default': { primary: '#64748b', glow: 'rgba(100, 116, 139, 0.7)', dark: '#505d6f' }
};

// State name to abbreviation
const STATE_ABBREVS = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// State center coordinates for heat markers
const STATE_CENTERS = {
  'AL': [-86.9, 32.8], 'AK': [-153.5, 64.2], 'AZ': [-111.9, 34.3], 'AR': [-92.4, 34.9],
  'CA': [-119.4, 37.2], 'CO': [-105.5, 39.0], 'CT': [-72.7, 41.6], 'DE': [-75.5, 39.0],
  'FL': [-81.7, 28.1], 'GA': [-83.5, 32.7], 'HI': [-155.5, 19.9], 'ID': [-114.7, 44.1],
  'IL': [-89.4, 40.0], 'IN': [-86.1, 39.8], 'IA': [-93.5, 42.0], 'KS': [-98.5, 38.5],
  'KY': [-85.3, 37.8], 'LA': [-91.9, 31.0], 'ME': [-69.2, 45.4], 'MD': [-76.6, 39.0],
  'MA': [-71.8, 42.2], 'MI': [-84.7, 44.3], 'MN': [-94.3, 46.3], 'MS': [-89.7, 32.7],
  'MO': [-92.5, 38.4], 'MT': [-110.4, 47.0], 'NE': [-99.8, 41.5], 'NV': [-116.6, 39.3],
  'NH': [-71.6, 43.7], 'NJ': [-74.7, 40.2], 'NM': [-106.0, 34.4], 'NY': [-75.5, 42.9],
  'NC': [-79.4, 35.5], 'ND': [-100.5, 47.4], 'OH': [-82.8, 40.3], 'OK': [-97.5, 35.6],
  'OR': [-120.5, 44.0], 'PA': [-77.6, 40.9], 'RI': [-71.5, 41.7], 'SC': [-80.9, 33.9],
  'SD': [-100.2, 44.4], 'TN': [-86.3, 35.8], 'TX': [-99.3, 31.5], 'UT': [-111.7, 39.3],
  'VT': [-72.7, 44.1], 'VA': [-78.8, 37.5], 'WA': [-120.5, 47.4], 'WV': [-80.6, 38.9],
  'WI': [-89.8, 44.6], 'WY': [-107.6, 43.0]
};

// School coordinates with their states
const SCHOOL_DATA = {
  'Alabama': { coords: [-87.55, 33.21], state: 'AL' },
  'Auburn': { coords: [-85.48, 32.60], state: 'AL' },
  'LSU': { coords: [-91.19, 30.41], state: 'LA' },
  'Georgia': { coords: [-83.38, 33.95], state: 'GA' },
  'Florida': { coords: [-82.35, 29.65], state: 'FL' },
  'Tennessee': { coords: [-83.93, 35.95], state: 'TN' },
  'Texas A&M': { coords: [-96.33, 30.63], state: 'TX' },
  'Ole Miss': { coords: [-89.53, 34.37], state: 'MS' },
  'Mississippi State': { coords: [-88.75, 33.46], state: 'MS' },
  'Arkansas': { coords: [-94.18, 36.07], state: 'AR' },
  'South Carolina': { coords: [-81.02, 33.99], state: 'SC' },
  'Kentucky': { coords: [-84.50, 38.03], state: 'KY' },
  'Missouri': { coords: [-92.33, 38.94], state: 'MO' },
  'Vanderbilt': { coords: [-86.80, 36.14], state: 'TN' },
  'Texas': { coords: [-97.73, 30.28], state: 'TX' },
  'Oklahoma': { coords: [-97.45, 35.21], state: 'OK' },
  'Ohio State': { coords: [-83.01, 40.01], state: 'OH' },
  'Michigan': { coords: [-83.75, 42.28], state: 'MI' },
  'Penn State': { coords: [-77.86, 40.80], state: 'PA' },
  'USC': { coords: [-118.29, 34.02], state: 'CA' },
  'UCLA': { coords: [-118.45, 34.16], state: 'CA' },
  'Oregon': { coords: [-123.08, 44.06], state: 'OR' },
  'Washington': { coords: [-122.30, 47.65], state: 'WA' },
  'Notre Dame': { coords: [-86.24, 41.71], state: 'IN' },
  'Clemson': { coords: [-82.84, 34.68], state: 'SC' },
  'Florida State': { coords: [-84.30, 30.44], state: 'FL' },
  'Miami': { coords: [-80.24, 25.72], state: 'FL' },
  'North Carolina': { coords: [-79.05, 35.91], state: 'NC' },
  'NC State': { coords: [-78.68, 35.79], state: 'NC' },
  'Virginia': { coords: [-78.51, 38.03], state: 'VA' },
  'Virginia Tech': { coords: [-80.43, 37.23], state: 'VA' },
  'Duke': { coords: [-78.94, 36.00], state: 'NC' },
  'Pittsburgh': { coords: [-79.95, 40.44], state: 'PA' },
  'Louisville': { coords: [-85.76, 38.21], state: 'KY' },
  'Syracuse': { coords: [-76.15, 43.05], state: 'NY' },
  'Boston College': { coords: [-71.17, 42.34], state: 'MA' },
  'Wake Forest': { coords: [-80.28, 36.13], state: 'NC' },
  'Georgia Tech': { coords: [-84.40, 33.78], state: 'GA' },
  'TCU': { coords: [-97.36, 32.71], state: 'TX' },
  'Baylor': { coords: [-97.12, 31.56], state: 'TX' },
  'Texas Tech': { coords: [-101.85, 33.58], state: 'TX' },
  'Oklahoma State': { coords: [-97.07, 36.13], state: 'OK' },
  'Kansas': { coords: [-95.25, 38.95], state: 'KS' },
  'Kansas State': { coords: [-96.58, 39.20], state: 'KS' },
  'Iowa State': { coords: [-93.65, 42.01], state: 'IA' },
  'West Virginia': { coords: [-79.95, 39.65], state: 'WV' },
  'Cincinnati': { coords: [-84.51, 39.13], state: 'OH' },
  'UCF': { coords: [-81.39, 28.60], state: 'FL' },
  'BYU': { coords: [-111.65, 40.25], state: 'UT' },
  'Houston': { coords: [-95.37, 29.76], state: 'TX' },
  'Colorado': { coords: [-105.26, 40.01], state: 'CO' },
  'Arizona': { coords: [-110.95, 32.23], state: 'AZ' },
  'Arizona State': { coords: [-111.93, 33.42], state: 'AZ' },
  'Utah': { coords: [-111.84, 40.76], state: 'UT' },
  'Stanford': { coords: [-122.17, 37.43], state: 'CA' },
  'California': { coords: [-122.26, 37.87], state: 'CA' },
  'Oregon State': { coords: [-123.28, 44.56], state: 'OR' },
  'Washington State': { coords: [-117.43, 46.73], state: 'WA' },
  'Iowa': { coords: [-91.55, 41.66], state: 'IA' },
  'Wisconsin': { coords: [-89.41, 43.08], state: 'WI' },
  'Minnesota': { coords: [-93.23, 44.97], state: 'MN' },
  'Nebraska': { coords: [-96.70, 40.83], state: 'NE' },
  'Northwestern': { coords: [-87.67, 42.06], state: 'IL' },
  'Purdue': { coords: [-86.91, 40.42], state: 'IN' },
  'Illinois': { coords: [-88.23, 40.10], state: 'IL' },
  'Indiana': { coords: [-86.52, 39.17], state: 'IN' },
  'Michigan State': { coords: [-84.48, 42.73], state: 'MI' },
  'Maryland': { coords: [-76.94, 38.99], state: 'MD' },
  'Rutgers': { coords: [-74.45, 40.50], state: 'NJ' },
  'SMU': { coords: [-96.78, 32.84], state: 'TX' }
};

// School to conference mapping
const SCHOOL_CONFERENCES = {
  'Alabama': 'SEC', 'Auburn': 'SEC', 'LSU': 'SEC', 'Georgia': 'SEC', 'Florida': 'SEC',
  'Tennessee': 'SEC', 'Texas A&M': 'SEC', 'Ole Miss': 'SEC', 'Mississippi State': 'SEC',
  'Arkansas': 'SEC', 'South Carolina': 'SEC', 'Kentucky': 'SEC', 'Missouri': 'SEC',
  'Vanderbilt': 'SEC', 'Texas': 'SEC', 'Oklahoma': 'SEC',
  'Ohio State': 'Big Ten', 'Michigan': 'Big Ten', 'Penn State': 'Big Ten', 'USC': 'Big Ten',
  'UCLA': 'Big Ten', 'Oregon': 'Big Ten', 'Washington': 'Big Ten', 'Iowa': 'Big Ten',
  'Wisconsin': 'Big Ten', 'Minnesota': 'Big Ten', 'Nebraska': 'Big Ten', 'Northwestern': 'Big Ten',
  'Purdue': 'Big Ten', 'Illinois': 'Big Ten', 'Indiana': 'Big Ten', 'Michigan State': 'Big Ten',
  'Maryland': 'Big Ten', 'Rutgers': 'Big Ten',
  'Clemson': 'ACC', 'Florida State': 'ACC', 'Miami': 'ACC', 'North Carolina': 'ACC',
  'NC State': 'ACC', 'Virginia': 'ACC', 'Virginia Tech': 'ACC', 'Duke': 'ACC',
  'Pittsburgh': 'ACC', 'Louisville': 'ACC', 'Syracuse': 'ACC', 'Boston College': 'ACC',
  'Wake Forest': 'ACC', 'Georgia Tech': 'ACC', 'Stanford': 'ACC', 'California': 'ACC', 'SMU': 'ACC',
  'TCU': 'Big 12', 'Baylor': 'Big 12', 'Texas Tech': 'Big 12', 'Oklahoma State': 'Big 12',
  'Kansas': 'Big 12', 'Kansas State': 'Big 12', 'Iowa State': 'Big 12', 'West Virginia': 'Big 12',
  'Cincinnati': 'Big 12', 'UCF': 'Big 12', 'BYU': 'Big 12', 'Houston': 'Big 12',
  'Colorado': 'Big 12', 'Arizona': 'Big 12', 'Arizona State': 'Big 12', 'Utah': 'Big 12',
  'Oregon State': 'Pac-12', 'Washington State': 'Pac-12',
  'Notre Dame': 'Independent'
};

function AdvancedHeatMap({ filters = {} }) {
  const [viewMode, setViewMode] = useState('schools');
  const [schoolData, setSchoolData] = useState({});
  const [playerData, setPlayerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  // Changed: Now tracks HIGHLIGHTED conferences (not filtered)
  // Empty set = show all muted, selected conferences get full color
  const [highlightedConferences, setHighlightedConferences] = useState(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [schoolLogos, setSchoolLogos] = useState({});

  // Zoom state for click-to-zoom
  const [mapPosition, setMapPosition] = useState({ coordinates: [-96, 38], zoom: 1 });
  const [selectedState, setSelectedState] = useState(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams(filters);
        const response = await axios.get(`/api/players?${params}`);
        const players = response.data.data || [];
        setPlayerData(players);

        // Process school data
        const schools = {};
        players.forEach(player => {
          const school = player.school;
          if (school && SCHOOL_DATA[school]) {
            if (!schools[school]) {
              const conf = SCHOOL_CONFERENCES[school] || player.conference || 'Independent';
              schools[school] = {
                name: school,
                conference: conf,
                coords: SCHOOL_DATA[school].coords,
                state: SCHOOL_DATA[school].state,
                players: [],
                signed: 0
              };
            }
            schools[school].players.push(player);
            if (player.outcome_status === 'Signed' || player.status === 'Signed') {
              schools[school].signed++;
            }
          }
        });
        setSchoolData(schools);
        setLoading(false);

        // Fetch logos for schools
        Object.keys(schools).forEach(async (school) => {
          try {
            const res = await axios.get(`/api/schools/lookup?name=${encodeURIComponent(school)}`);
            if (res.data?.data?.logo) {
              setSchoolLogos(prev => ({ ...prev, [school]: res.data.data.logo }));
            }
          } catch (e) { /* ignore */ }
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, [filters]);

  // Change view with transition
  const changeView = useCallback((newView) => {
    if (newView === viewMode) return;
    setIsTransitioning(true);
    setSelectedSchool(null);
    setTimeout(() => {
      setViewMode(newView);
      setIsTransitioning(false);
    }, 300);
  }, [viewMode]);

  // Toggle conference highlight
  const toggleConference = useCallback((conf) => {
    setHighlightedConferences(prev => {
      const next = new Set(prev);
      next.has(conf) ? next.delete(conf) : next.add(conf);
      return next;
    });
  }, []);

  // All schools (we show all, but highlight selected conferences)
  const allSchools = useMemo(() => {
    return Object.values(schoolData);
  }, [schoolData]);

  // Top 5 schools by player count (these get pulse animation)
  const top5Schools = useMemo(() => {
    return [...allSchools]
      .sort((a, b) => b.players.length - a.players.length)
      .slice(0, 5)
      .map(s => s.name);
  }, [allSchools]);

  // For filtering in stats (use highlighted if any, otherwise all)
  const filteredSchools = useMemo(() => {
    if (highlightedConferences.size === 0) return allSchools;
    return allSchools.filter(s => highlightedConferences.has(s.conference));
  }, [allSchools, highlightedConferences]);

  // School density by state (for heat map)
  const stateDensity = useMemo(() => {
    const density = {};
    filteredSchools.forEach(school => {
      const state = school.state;
      if (state) {
        density[state] = (density[state] || 0) + school.players.length;
      }
    });
    return density;
  }, [filteredSchools]);

  const maxDensity = useMemo(() => Math.max(...Object.values(stateDensity), 1), [stateDensity]);

  // Pipeline connections - FROM HQ TO Schools (show all schools)
  const pipelineData = useMemo(() => {
    if (viewMode !== 'pipelines') return [];
    return allSchools.map(school => ({
      from: HQ_LOCATION,
      to: school.coords,
      school: school.name,
      conference: school.conference,
      playerCount: school.players.length,
      isHighlighted: highlightedConferences.size === 0 || highlightedConferences.has(school.conference)
    }));
  }, [viewMode, allSchools, highlightedConferences]);

  // Stats
  const stats = useMemo(() => {
    const topStates = Object.entries(stateDensity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const confCounts = {};
    filteredSchools.forEach(s => {
      confCounts[s.conference] = (confCounts[s.conference] || 0) + s.players.length;
    });
    return {
      totalSchools: filteredSchools.length,
      totalProspects: filteredSchools.reduce((sum, s) => sum + s.players.length, 0),
      topStates,
      confCounts
    };
  }, [filteredSchools, stateDensity]);

  // Heat color for state
  const getHeatColor = useCallback((stateName) => {
    const abbrev = STATE_ABBREVS[stateName];
    const count = stateDensity[abbrev] || stateDensity[stateName] || 0;
    if (count === 0) return '#0d1220';
    const intensity = Math.min(count / maxDensity, 1);
    // Dark to vibrant cyan-teal gradient
    const r = Math.round(10 + intensity * 30);
    const g = Math.round(20 + intensity * 200);
    const b = Math.round(40 + intensity * 180);
    return `rgb(${r}, ${g}, ${b})`;
  }, [stateDensity, maxDensity]);

  const getColor = (conf) => CONFERENCE_COLORS[conf] || CONFERENCE_COLORS.default;

  // Handle state click for zoom
  const handleStateClick = useCallback((stateName) => {
    const abbrev = STATE_ABBREVS[stateName];
    const coords = STATE_CENTERS[abbrev];
    if (coords) {
      if (selectedState === stateName) {
        // Click again to reset
        setMapPosition({ coordinates: [-96, 38], zoom: 1 });
        setSelectedState(null);
      } else {
        setMapPosition({ coordinates: coords, zoom: 3 });
        setSelectedState(stateName);
      }
    }
  }, [selectedState]);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setMapPosition({ coordinates: [-96, 38], zoom: 1 });
    setSelectedState(null);
  }, []);

  if (loading) {
    return (
      <div className="broadcast-map-container">
        <div className="broadcast-loading">
          <div className="loading-pulse" />
          <span>LOADING RECRUITING DATA...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="broadcast-map-container">
      {/* Cinematic Background */}
      <div className="broadcast-bg">
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-orb orb-3" />
        <div className="bg-scanlines" />
      </div>

      {/* Header */}
      <div className="broadcast-header">
        <div className="header-left">
          <h2 className="broadcast-title">
            <span className="title-main">RECRUITING</span>
            <span className="title-accent">COMMAND CENTER</span>
          </h2>
          <div className="header-stats">
            <span className="header-stat">
              <strong>{stats.totalSchools}</strong> Programs
            </span>
            <span className="header-divider">|</span>
            <span className="header-stat">
              <strong>{stats.totalProspects}</strong> Prospects
            </span>
          </div>
        </div>

        {/* View Toggle */}
        <div className="view-toggle">
          {[
            { key: 'schools', icon: '🏟️', label: 'Schools' },
            { key: 'heatmap', icon: '🔥', label: 'Heat Map' },
            { key: 'pipelines', icon: '⚡', label: 'Reach' }
          ].map(({ key, icon, label }) => (
            <button
              key={key}
              className={`view-btn ${viewMode === key ? 'active' : ''}`}
              onClick={() => changeView(key)}
            >
              <span className="view-icon">{icon}</span>
              <span className="view-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conference Filters - Click to highlight */}
      <div className="conference-bar">
        <span className="filter-hint">Click to highlight:</span>
        {Object.keys(CONFERENCE_COLORS).filter(c => c !== 'default').slice(0, 7).map(conf => {
          const color = getColor(conf);
          const isHighlighted = highlightedConferences.has(conf);
          const count = stats.confCounts[conf] || 0;

          return (
            <button
              key={conf}
              className={`conf-chip ${isHighlighted ? 'highlighted' : ''}`}
              onClick={() => toggleConference(conf)}
              style={{ '--chip-color': color.primary, '--chip-glow': color.glow }}
            >
              <span className="chip-indicator" />
              <span className="chip-name">{conf}</span>
              <span className="chip-count">{count}</span>
            </button>
          );
        })}

        {highlightedConferences.size > 0 && (
          <button className="clear-highlight-btn" onClick={() => setHighlightedConferences(new Set())}>
            Clear
          </button>
        )}

        {selectedState && (
          <button className="reset-zoom-btn" onClick={resetZoom}>
            Reset View
          </button>
        )}
      </div>

      {/* Map */}
      <div className={`map-stage ${isTransitioning ? 'transitioning' : ''}`}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1100 }}
          className="broadcast-map"
        >
          <ZoomableGroup
            center={mapPosition.coordinates}
            zoom={mapPosition.zoom}
            minZoom={1}
            maxZoom={5}
            onMoveEnd={({ coordinates, zoom }) => setMapPosition({ coordinates, zoom })}
          >
            {/* States */}
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const stateName = geo.properties.name;
                  const isHeatmap = viewMode === 'heatmap';
                  const fillColor = isHeatmap ? getHeatColor(stateName) : '#0d1220';
                  const stateAbbrev = STATE_ABBREVS[stateName];
                  const stateCount = stateDensity[stateAbbrev] || 0;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fillColor}
                      stroke="#1e293b"
                      strokeWidth={0.5}
                      onClick={() => handleStateClick(stateName)}
                      style={{
                        default: { outline: 'none', transition: 'fill 0.4s ease', cursor: 'pointer' },
                        hover: {
                          outline: 'none',
                          fill: isHeatmap
                            ? (stateCount > 0 ? getHeatColor(stateName) : '#1a2535')
                            : '#1a2535',
                          cursor: 'pointer'
                        },
                        pressed: { outline: 'none' }
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Pipeline Lines - FROM HQ TO Schools */}
            {viewMode === 'pipelines' && pipelineData.map((conn, i) => {
              const isHighlighted = highlightedConferences.size === 0 || highlightedConferences.has(conn.conference);
              return (
                <Line
                  key={`line-${conn.school}`}
                  from={conn.from}
                  to={conn.to}
                  stroke={isHighlighted ? getColor(conn.conference).primary : '#3a4556'}
                  strokeWidth={isHighlighted ? 1.5 + (conn.playerCount * 0.3) : 1}
                  strokeOpacity={isHighlighted ? 0.7 : 0.2}
                  strokeLinecap="round"
                  className="pipeline-line"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              );
            })}

            {/* HQ Marker - Only show in pipelines view */}
            {viewMode === 'pipelines' && (
              <Marker coordinates={HQ_LOCATION}>
                <g className="hq-marker">
                  <circle className="hq-pulse" r={20} />
                  <circle className="hq-glow" r={14} />
                  <circle className="hq-core" r={10} fill="#fff" />
                  <text y={28} textAnchor="middle" className="hq-label">HQ</text>
                </g>
              </Marker>
            )}

            {/* School Markers */}
            {(viewMode === 'schools' || viewMode === 'pipelines') && allSchools.map((school, i) => {
              const color = getColor(school.conference);
              const size = Math.min(Math.max(school.players.length * 2 + 6, 8), 24);
              const isHovered = hoveredItem === school.name;
              const isSelected = selectedSchool === school.name;
              const logo = schoolLogos[school.name];
              const showLogo = viewMode === 'schools' && logo;

              // Determine if this school should be highlighted
              const isHighlighted = highlightedConferences.size === 0
                ? false  // No conferences selected = all muted
                : highlightedConferences.has(school.conference);
              const isTop5 = top5Schools.includes(school.name);
              const shouldPulse = isTop5 && (highlightedConferences.size === 0 || isHighlighted);

              return (
                <Marker
                  key={school.name}
                  coordinates={school.coords}
                  onMouseEnter={() => setHoveredItem(school.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => setSelectedSchool(isSelected ? null : school.name)}
                >
                  <g
                    className={`school-marker ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : 'muted'} ${shouldPulse ? 'pulse' : ''}`}
                    style={{ '--m-color': color.primary, '--m-glow': color.glow, animationDelay: `${i * 30}ms` }}
                  >
                    {/* Pulse ring - only for top 5 */}
                    {shouldPulse && <circle className="marker-pulse" r={size + 6} />}
                    {/* Glow - only when highlighted */}
                    {isHighlighted && <circle className="marker-glow" r={size + 2} />}
                    {/* Main dot */}
                    <circle
                      className="marker-core"
                      r={size}
                      style={viewMode === 'pipelines' ? { fill: isHighlighted ? '#ffffff' : '#4a5568' } : {}}
                    />
                    {/* Logo only in schools view */}
                    {showLogo ? (
                      <image
                        href={logo}
                        x={-size * 0.65}
                        y={-size * 0.65}
                        width={size * 1.3}
                        height={size * 1.3}
                        className="marker-logo"
                        style={{ opacity: isHighlighted || highlightedConferences.size === 0 ? 1 : 0.4 }}
                      />
                    ) : (
                      <text className="marker-text" textAnchor="middle" dominantBaseline="central">
                        {school.players.length}
                      </text>
                    )}
                  </g>
                </Marker>
              );
            })}

            {/* Heat Map State Labels */}
            {viewMode === 'heatmap' && Object.entries(stateDensity).map(([state, count]) => {
              const coords = STATE_CENTERS[state];
              if (!coords || count === 0) return null;
              const size = Math.min(Math.max(count * 2 + 10, 14), 40);
              const intensity = count / maxDensity;

              return (
                <Marker key={state} coordinates={coords}>
                  <g className="heat-marker" style={{ '--intensity': intensity }}>
                    <circle className="heat-pulse" r={size + 8} />
                    <circle className="heat-glow" r={size + 3} />
                    <circle className="heat-core" r={size} />
                    <text className="heat-text" textAnchor="middle" dominantBaseline="central">
                      {count}
                    </text>
                  </g>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {hoveredItem && schoolData[hoveredItem] && !selectedSchool && (
          <div className="map-tooltip">
            <div className="tooltip-head">
              {schoolLogos[hoveredItem] && (
                <img src={schoolLogos[hoveredItem]} alt="" className="tooltip-logo" />
              )}
              <div className="tooltip-title">
                <h4>{hoveredItem}</h4>
                <span className="tooltip-conf" style={{ color: getColor(schoolData[hoveredItem].conference).primary }}>
                  {schoolData[hoveredItem].conference}
                </span>
              </div>
            </div>
            <div className="tooltip-body">
              <div className="tooltip-stat">
                <span className="ts-value">{schoolData[hoveredItem].players.length}</span>
                <span className="ts-label">Prospects</span>
              </div>
              <div className="tooltip-stat">
                <span className="ts-value highlight">{schoolData[hoveredItem].signed}</span>
                <span className="ts-label">Signed</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Panel */}
        {selectedSchool && schoolData[selectedSchool] && (
          <div className="detail-panel">
            <div className="panel-head">
              <div className="panel-info">
                {schoolLogos[selectedSchool] && (
                  <img src={schoolLogos[selectedSchool]} alt="" className="panel-logo" />
                )}
                <div>
                  <h3>{selectedSchool}</h3>
                  <span style={{ color: getColor(schoolData[selectedSchool].conference).primary }}>
                    {schoolData[selectedSchool].conference}
                  </span>
                </div>
              </div>
              <button className="panel-close" onClick={() => setSelectedSchool(null)}>×</button>
            </div>
            <div className="panel-stats">
              <div className="ps-item">
                <span className="ps-num">{schoolData[selectedSchool].players.length}</span>
                <span className="ps-lbl">Prospects</span>
              </div>
              <div className="ps-item highlight">
                <span className="ps-num">{schoolData[selectedSchool].signed}</span>
                <span className="ps-lbl">Signed</span>
              </div>
              <div className="ps-item">
                <span className="ps-num">
                  {schoolData[selectedSchool].players.length > 0
                    ? Math.round((schoolData[selectedSchool].signed / schoolData[selectedSchool].players.length) * 100)
                    : 0}%
                </span>
                <span className="ps-lbl">Rate</span>
              </div>
            </div>
            <div className="panel-roster">
              <h4>Prospects</h4>
              <div className="roster-list">
                {schoolData[selectedSchool].players.map((p, i) => (
                  <div key={i} className="roster-row">
                    <span className="roster-name">{p.first_name ? `${p.first_name} ${p.last_name || ''}` : p.name}</span>
                    <span className="roster-pos">{p.position}</span>
                    <span className={`roster-status ${(p.outcome_status || p.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {p.outcome_status || p.status || 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Stats */}
      <div className="bottom-bar">
        <div className="stats-section">
          <div className="stat-block primary">
            <span className="stat-num">{stats.totalProspects}</span>
            <span className="stat-lbl">Total Prospects</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-block">
            <span className="stat-num">{stats.totalSchools}</span>
            <span className="stat-lbl">Programs</span>
          </div>
        </div>

        <div className="top-states">
          <span className="top-label">TOP RECRUITING STATES</span>
          <div className="state-chips">
            {stats.topStates.map(([state, count], i) => (
              <span key={state} className="state-chip">
                <span className="state-rank">#{i + 1}</span>
                <span className="state-abbr">{state}</span>
                <span className="state-cnt">{count}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="legend-section">
          {viewMode === 'schools' && <span className="legend-text">Marker size = prospect count</span>}
          {viewMode === 'heatmap' && (
            <div className="heat-legend">
              <span>Low</span>
              <div className="heat-bar" />
              <span>High</span>
            </div>
          )}
          {viewMode === 'pipelines' && <span className="legend-text">Lines from OC HQ to programs</span>}
        </div>
      </div>
    </div>
  );
}

export default AdvancedHeatMap;
