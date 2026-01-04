import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AdvancedHeatMap from '../components/AdvancedHeatMap';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const fetchAnalytics = async () => {
    try {
      const params = year ? `?year=${year}` : '';
      const response = await axios.get(`/api/players/analytics${params}`);
      setAnalytics(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="error">No analytics data available</div>;
  }

  const outcomeData = [
    { name: 'Signed', value: analytics.overall.signed },
    { name: 'Not Signed', value: analytics.overall.not_signed },
    { name: 'Active', value: analytics.overall.returned }
  ].filter(item => item.value > 0);

  return (
    <div className="analytics">
      <div className="page-header">
        <h2>Analytics</h2>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="year-filter"
        >
          <option value="">All Years</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
          <option value="2021">2021</option>
          <option value="2020">2020</option>
          <option value="2019">2019</option>
        </select>
      </div>

      <div className="analytics-summary">
        <div className="summary-card">
          <h3>Total Prospects</h3>
          <p className="big-number">{analytics.overall.total_players}</p>
        </div>
        <div className="summary-card success">
          <h3>Signing Rate</h3>
          <p className="big-number">
            {analytics.overall.total_players > 0 
              ? `${((analytics.overall.signed / analytics.overall.total_players) * 100).toFixed(1)}%`
              : '0%'}
          </p>
          <p className="sub-text">{analytics.overall.signed} signed</p>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card full-width heat-map-card">
          <AdvancedHeatMap filters={{ year }} />
        </div>

        <div className="chart-card">
          <h3>Outcomes Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={outcomeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {outcomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>By Position</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.byPosition?.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="position" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#0088FE" name="Total" />
              <Bar dataKey="signed" fill="#00C49F" name="Signed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>By Conference</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.byConference?.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="conference" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#FFBB28" name="Total" />
              <Bar dataKey="signed" fill="#00C49F" name="Signed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}

export default Analytics;
