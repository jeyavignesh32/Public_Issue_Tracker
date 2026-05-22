import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', status: '', search: '' });

  // Modals
  const [assignModal, setAssignModal] = useState({ open: false, complaintId: null, workerId: '', notes: '' });
  const [statusModal, setStatusModal] = useState({ open: false, complaintId: null, status: 'Verified', comment: '' });

  useEffect(() => {
    fetchComplaints();
    fetchWorkers();
  }, [filter.type, filter.status]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/admin/complaints', { params: filter });
      setComplaints(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchWorkers = async () => {
    try {
      const { data } = await axios.get('/api/admin/workers');
      setWorkers(data);
    } catch (err) { console.error(err); }
  };

  const handleSearch = (e) => { e.preventDefault(); fetchComplaints(); };

  const submitAssign = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/admin/complaints/${assignModal.complaintId}/assign`, {
        worker_id: assignModal.workerId,
        notes: assignModal.notes
      });
      setAssignModal({ open: false, complaintId: null, workerId: '', notes: '' });
      fetchComplaints();
    } catch (err) { alert(err.response?.data?.error || 'Assignment failed'); }
  };

  const submitStatus = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/admin/complaints/${statusModal.complaintId}/status`, {
        status: statusModal.status,
        comment: statusModal.comment
      });
      setStatusModal({ open: false, complaintId: null, status: 'Verified', comment: '' });
      fetchComplaints();
    } catch (err) { alert(err.response?.data?.error || 'Status update failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this report? This action cannot be undone.')) return;
    try {
      await axios.delete(`/api/admin/complaints/${id}`);
      fetchComplaints();
    } catch (err) { alert('Deletion failed'); }
  };

  return (
    <div className="page-wrapper container">
      <div className="page-header">
        <h1 className="page-title">Complaint Management</h1>
      </div>

      <form onSubmit={handleSearch} className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input className="form-input" placeholder="Search title, reporter, location..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} />
          </div>
          <select className="form-select" style={{ width: 160 }} value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
            <option value="">All Types</option>
            <option value="Pothole">Pothole</option>
            <option value="Streetlight">Streetlight</option>
            <option value="Garbage">Garbage</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Sewage">Sewage</option>
          </select>
          <select className="form-select" style={{ width: 160 }} value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Verified">Verified</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <button type="submit" className="btn btn-primary">Search</button>
        </div>
      </form>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : complaints.length === 0 ? (
        <div className="empty-state glass-card">No reports found</div>
      ) : (
        <div className="glass-card table-wrap" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ISSUE / TYPE</th>
                <th>REPORTER</th>
                <th>STATUS</th>
                <th>WORKER ASSIGNED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id}>
                  <td style={{ maxWidth: 250 }}>
                    <Link to={`/complaints/${c.id}`} style={{ fontWeight: 600, color: 'var(--blue-light)', display: 'block', marginBottom: 2 }}>{c.title}</Link>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{c.type}</span>
                  </td>
                  <td><span style={{ fontSize: 13 }}>{c.reporter_name}</span></td>
                  <td><div className={`badge badge-${c.status.replace(/\s+/g, '').toLowerCase()}`}>{c.status}</div></td>
                  <td>
                    {c.assigned_worker ? (
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>👷 {c.assigned_worker}</span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setAssignModal({ open: true, complaintId: c.id, workerId: workers[0]?.id || '', notes: '' })}>
                        Assign
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setStatusModal({ open: true, complaintId: c.id, status: c.status, comment: '' })}>
                        Status
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal.open && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">Assign Field Worker</h2>
            <form onSubmit={submitAssign}>
              <div className="form-group">
                <label>Select Staff Member</label>
                <select className="form-select" value={assignModal.workerId} onChange={e => setAssignModal({ ...assignModal, workerId: e.target.value })} required>
                  <option value="" disabled>-- Choose Worker --</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.phone || 'No phone'})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Assignment Notes / Instructions (Optional)</label>
                <textarea className="form-textarea" placeholder="Repair priority, exact location hints, etc." rows={3} value={assignModal.notes} onChange={e => setAssignModal({ ...assignModal, notes: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setAssignModal({ ...assignModal, open: false })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {statusModal.open && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">Update Status Manually</h2>
            <form onSubmit={submitStatus}>
              <div className="form-group">
                <label>New Status</label>
                <select className="form-select" value={statusModal.status} onChange={e => setStatusModal({ ...statusModal, status: e.target.value })} required>
                  <option value="Submitted">Submitted (Reset)</option>
                  <option value="Verified">Verified (Legitmate issue)</option>
                  <option value="Assigned">Assigned (Worker mapped)</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Closed">Closed / Invalid</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reason / Public Comment</label>
                <textarea className="form-textarea" placeholder="Why is the status changing? The user will see this." rows={3} value={statusModal.comment} onChange={e => setStatusModal({ ...statusModal, comment: e.target.value })} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setStatusModal({ ...statusModal, open: false })}>Cancel</button>
                <button type="submit" className="btn btn-orange">Update Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
