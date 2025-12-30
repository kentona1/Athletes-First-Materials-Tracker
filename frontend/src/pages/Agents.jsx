import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Agents() {
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgentsData = async () => {
    try {
      const perfRes = await axios.get('/api/agents/performance');
      setPerformance(perfRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching agents data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading agents...</div>;
  }

  return (
    <div className="agents-page">
      <h2>Agents Performance</h2>

      <div className="agents-table">
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Total Players</th>
              <th>Signed</th>
              <th>Missed</th>
              <th>Walked Away</th>
              <th>Returned</th>
              <th>No Meeting</th>
              <th>Materials</th>
              <th>Conversion Rate</th>
            </tr>
          </thead>
          <tbody>
            {performance.map((agent, idx) => (
              <tr key={idx}>
                <td><strong>{agent.agent}</strong></td>
                <td>{agent.total_players}</td>
                <td className="success-text">{agent.signed}</td>
                <td>{agent.missed}</td>
                <td>{agent.walked_away}</td>
                <td>{agent.returned}</td>
                <td>{agent.no_meeting}</td>
                <td>{agent.total_materials}</td>
                <td>
                  <span className="conversion-rate">
                    {agent.conversion_rate ? `${agent.conversion_rate}%` : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Agents;
