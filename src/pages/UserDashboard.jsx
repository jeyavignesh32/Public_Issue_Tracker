import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function UserDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyComplaints = async () => {
      try {
        const { data } = await axios.get('/api/complaints/my');
        setComplaints(data);
      } catch (err) { console.error('Error fetching complaints:', err); }
      finally { setLoading(false); }
    };
    fetchMyComplaints();
  }, []);

  const stats = {
    total: complaints.length,
    active: complaints.filter(c => ['Submitted', 'Verified', 'Assigned', 'In Progress'].includes(c.status)).length,
    resolved: complaints.filter(c => ['Completed', 'Closed'].includes(c.status)).length
  };

  return (
    <div className="page-wrapper container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">My Dashboard</h1>
          <p className="page-subtitle">Track the status of your reported issues</p>
        </div>
        <Link to="/submit" className="btn btn-primary">➕ Report New Issue</Link>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Reports</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', WebkitBackgroundClip: 'text' }}>{stats.active}</div>
          <div className="stat-label">Active Issues</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', WebkitBackgroundClip: 'text' }}>{stats.resolved}</div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>My Reports</h2>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : complaints.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">📝</div>
          <div className="empty-title">No reports yet</div>
          <p style={{ marginBottom: 20 }}>You haven't reported any public issues yet.</p>
          <Link to="/submit" className="btn btn-orange">Report Your First Issue</Link>
        </div>
      ) : (
        <div className="glass-card table-wrap" style={{ marginBottom: 64 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title & Category</th>
                <th>Location</th>
                <th>Date Submitted</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                      <div style={{ fontSize: 12, color: 'var(--blue-light)' }}>{c.type}</div>
                      {c.priority && (
                        <div style={{ 
                          fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700, 
                          background: c.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : c.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                          color: c.priority === 'High' ? '#ef4444' : c.priority === 'Medium' ? '#f59e0b' : '#22c55e',
                          border: `1px solid ${c.priority === 'High' ? 'rgba(239, 68, 68, 0.5)' : c.priority === 'Medium' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`
                        }}>
                          {c.priority.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📍 {c.location_text || 'N/A'}</span></td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'inline-flex' }} className={`badge badge-${c.status.replace(/\s+/g, '').toLowerCase()}`}>
                      {c.status}
                    </div>
                  </td>
                  <td>
                    <Link to={`/complaints/${c.id}`} className="btn btn-ghost btn-sm">Track →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
