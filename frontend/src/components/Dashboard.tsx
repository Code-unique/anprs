import { useEffect, useState } from 'react';
import { Activity, Car, CheckCircle, Clock, TrendingUp, Users, AlertTriangle, MapPin } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { scanApi } from '../services/api';
import { useStore } from '../store/useStore';
import { DashboardStats } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const data = await scanApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    { 
      title: 'Total Scans', 
      value: stats?.total_scans || 0, 
      icon: <Car size={24} />, 
      color: 'var(--cyan)',
      trend: '+12%'
    },
    { 
      title: 'Success Rate', 
      value: `${stats?.success_rate?.toFixed(1) || 0}%`, 
      icon: <CheckCircle size={24} />, 
      color: '#10b981',
      trend: '+2.5%'
    },
    { 
      title: 'Avg Processing Time', 
      value: `${stats?.avg_processing_time?.toFixed(2) || 0}s`, 
      icon: <Clock size={24} />, 
      color: '#f59e0b',
      trend: '-0.3s'
    },
    { 
      title: 'Active Cameras', 
      value: stats?.top_cameras?.length || 0, 
      icon: <Activity size={24} />, 
      color: '#8b5cf6',
      trend: '+2'
    },
  ];

  const hourlyData = stats?.hourly_stats ? 
    Object.entries(stats.hourly_stats).map(([hour, count]) => ({
      hour: hour.replace('hour_', ''),
      scans: count
    })).reverse() : [];

  const cameraData = stats?.top_cameras?.map(cam => ({
    name: cam.camera_id || 'Unknown',
    value: cam.count
  })) || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard Overview</h2>
        <button onClick={loadStats} className="refresh-btn">
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderTop: `4px solid ${stat.color}` }}>
            <div className="stat-header">
              <span className="stat-title">{stat.title}</span>
              <div className="stat-icon" style={{ color: stat.color }}>
                {stat.icon}
              </div>
            </div>
            <div className="stat-main">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-trend" style={{ color: stat.color }}>
                <TrendingUp size={16} />
                <span>{stat.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Hourly Activity</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="hour" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="scans" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Top Cameras</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={cameraData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {cameraData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <div className="activity-header">
          <h3>Recent Scans</h3>
          <span className="activity-count">{stats?.recent_activity?.length || 0} scans</span>
        </div>
        
        <div className="table-container">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Plate Number</th>
                <th>Time</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Camera</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recent_activity?.map((scan) => (
                <tr key={scan.id}>
                  <td>
                    <div className="plate-cell">
                      <Car size={16} />
                      <span className="font-mono">{scan.plate_number}</span>
                    </div>
                  </td>
                  <td>
                    {new Date(scan.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${scan.status.toLowerCase()}`}
                    >
                      {scan.status}
                    </span>
                  </td>
                  <td>
                    <div className="confidence-bar">
                      <div 
                        className="confidence-fill"
                        style={{ width: `${scan.confidence * 100}%` }}
                      ></div>
                      <span className="confidence-text">
                        {(scan.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    {scan.camera_id ? (
                      <div className="camera-cell">
                        <MapPin size={14} />
                        <span>{scan.camera_id}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No recent scans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}