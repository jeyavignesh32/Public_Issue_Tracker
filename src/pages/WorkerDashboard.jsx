import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function WorkerDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modal, setModal] = useState({ open: false, complaintId: null, status: 'In Progress', comment: '' });
  const [proofImage, setProofImage] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [updating, setUpdating] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/worker/assigned');
      setComplaints(data);
    } catch (err) { console.error('Error fetching tasks', err); }
    finally { setLoading(false); }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofImage(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const submitUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    const formData = new FormData();
    formData.append('status', modal.status);
    formData.append('comment', modal.comment);
    if (proofImage) formData.append('proof', proofImage);

    try {
      await axios.put(`/api/worker/complaints/${modal.complaintId}/update`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setModal({ open: false, complaintId: null, status: 'In Progress', comment: '' });
      setProofImage(null); setProofPreview('');
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed');
    } finally { setUpdating(false); }
  };

  return (
    <div className="page-wrapper container">
      <div className="page-header">
        <h1 className="page-title">My Tasks</h1>
        <p className="page-subtitle">Issues assigned to you for resolution</p>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : complaints.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">🏖️</div>
          <div className="empty-title">You're all caught up!</div>
          <p>No pending tasks assigned to you right now.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, paddingBottom: 64 }}>
          {complaints.map(c => (
            <div key={c.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* Image Header */}
              {c.image_url ? (
                <img src={c.image_url} alt="Issue" style={{ width: '100%', height: 160, objectFit: 'cover', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }} />
              ) : (
                <div style={{ width: '100%', height: 160, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }}>
                  🚧
                </div>
              )}

              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--blue-light)', fontWeight: 600, textTransform: 'uppercase' }}>{c.type}</div>
                  <div className={`badge badge-${c.status.replace(/\s+/g, '').toLowerCase()}`}>{c.status}</div>
                </div>

                <Link to={`/complaints/${c.id}`} style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, marginBottom: 8, display: 'block' }}>
                  {c.title}
                </Link>
                
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span>📍</span> <span>{c.location_text || 'GPS Coordinates Provided'}</span>
                </div>

                {c.assignment_notes && (
                  <div style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 16, fontSize: 13 }}>
                    <div style={{ color: 'var(--orange-primary)', fontWeight: 600, marginBottom: 4 }}>Admin Notes:</div>
                    {c.assignment_notes}
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  {c.status !== 'Completed' && c.status !== 'Closed' ? (
                    <button className="btn btn-primary btn-full" onClick={() => setModal({ open: true, complaintId: c.id, status: c.status === 'Assigned' ? 'In Progress' : 'Completed', comment: '' })}>
                      Update Status
                    </button>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--green-primary)', fontWeight: 600, fontSize: 14 }}>
                      ✓ Task Completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Update Modal */}
      {modal.open && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">Update Task Status</h2>
            <form onSubmit={submitUpdate}>
              <div className="form-group">
                <label>New Status</label>
                <select className="form-select" value={modal.status} onChange={e => setModal({ ...modal, status: e.target.value })} required>
                  <option value="In Progress">🚧 Starts Work (In Progress)</option>
                  <option value="Completed">✅ Mark as Completed</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Work Log / Comment</label>
                <textarea className="form-textarea" placeholder="Describe the work done or current status..." rows={3} value={modal.comment} onChange={e => setModal({ ...modal, comment: e.target.value })} required />
              </div>

              {modal.status === 'Completed' && (
                <div className="form-group">
                  <label>Proof of Completion (Photo)</label>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
                  {!proofPreview ? (
                    <div className="upload-zone" style={{ padding: '20px', minHeight: 'auto' }} onClick={() => fileInputRef.current?.click()}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>📸</div>
                      <div style={{ fontSize: 13 }}>Upload photo of resolved issue (Required)</div>
                    </div>
                  ) : (
                    <div>
                      <img src={proofPreview} alt="Proof" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => { setProofImage(null); setProofPreview(''); }}>Change Image</button>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => {
                  setModal({ ...modal, open: false });
                  setProofImage(null); setProofPreview('');
                }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={updating || (modal.status === 'Completed' && !proofImage)}>
                  {updating ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
