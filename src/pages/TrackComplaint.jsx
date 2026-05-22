import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TrackComplaint() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth(); // for checking if admin/worker

  useEffect(() => {
    const fetchFullComplaint = async () => {
      try {
        const { data } = await axios.get(`/api/complaints/${id}`);
        setComplaint(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load complaint');
      } finally { setLoading(false); }
    };
    fetchFullComplaint();
  }, [id]);

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (error || !complaint) return <div className="container" style={{ marginTop: 40 }}><div className="alert alert-error">{error || 'Not found'}</div></div>;

  const currentStatus = complaint.status;
  const isResolved = currentStatus === 'Completed' || currentStatus === 'Closed';
  const proofStep = complaint.timeline?.slice().reverse().find(t => t.proof_image_url);

  return (
    <div className="page-wrapper container" style={{ padding: '32px 16px 64px' }}>
      <Link to={user?.role === 'admin' ? '/admin/complaints' : user?.role === 'worker' ? '/worker' : '/dashboard'} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
        ← Back to list
      </Link>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left Column: Complaint Details */}
        <div className="glass-card" style={{ flex: '1 1 500px', overflow: 'hidden' }}>
          {isResolved && proofStep && complaint.image_url ? (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 700, zIndex: 10 }}>BEFORE</div>
                <img src={complaint.image_url} alt="Before" style={{ width: '100%', height: 300, objectFit: 'cover' }} />
              </div>
              <div style={{ width: 4, background: 'var(--orange-primary)' }} />
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(34,197,94,0.9)', color: 'white', padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 700, zIndex: 10 }}>AFTER</div>
                <img src={proofStep.proof_image_url} alt="After" style={{ width: '100%', height: 300, objectFit: 'cover' }} />
              </div>
            </div>
          ) : complaint.image_url ? (
            <img src={complaint.image_url} alt="Proof" style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} />
          ) : (
            <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>No cover image provided</div>
          )}
          
          <div style={{ padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--blue-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{complaint.type}</div>
                {complaint.priority && (
                  <div style={{ 
                    fontSize: 11, padding: '2px 10px', borderRadius: 12, fontWeight: 700, 
                    background: complaint.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : complaint.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: complaint.priority === 'High' ? '#ef4444' : complaint.priority === 'Medium' ? '#f59e0b' : '#22c55e',
                    border: `1px solid ${complaint.priority === 'High' ? 'rgba(239, 68, 68, 0.5)' : complaint.priority === 'Medium' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`
                  }}>
                    {complaint.priority.toUpperCase()} PRIORITY
                  </div>
                )}
              </div>
              <div className={`badge badge-${currentStatus.replace(/\s+/g, '').toLowerCase()}`} style={{ fontSize: 13, padding: '6px 14px' }}>
                {currentStatus}
              </div>
            </div>

            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>{complaint.title}</h1>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: 24, lineHeight: 1.7 }}>
              {complaint.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Reported By</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{complaint.reporter_name}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Location</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>📍 {complaint.location_text || 'See map coords'}</div>
              </div>
            </div>

            {complaint.assignment && (
              <div style={{ marginTop: 20, padding: 16, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>👷</span>
                  <div>
                    <div style={{ fontSize: 12, color: '#d8b4fe' }}>Assigned Field Worker</div>
                    <div style={{ fontWeight: 600 }}>{complaint.assignment.worker_name}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Status Timeline */}
        <div style={{ flex: '1 1 340px' }}>
          <div className="glass-card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              ⏱️ Resolution Timeline
            </h2>

            <div className="timeline">
              {complaint.timeline?.map((step, idx) => {
                const isLast = idx === complaint.timeline.length - 1;
                return (
                  <div key={step.id} className="timeline-item">
                    <div className={`timeline-dot ${isLast && !isResolved ? 'active' : ''}`}>
                      {step.status === 'Completed' || step.status === 'Closed' ? '✓' : ''}
                    </div>
                    <div className="timeline-time">{new Date(step.created_at).toLocaleString()}</div>
                    <div className="timeline-label" style={{ color: 
                      step.status === 'Submitted' ? 'var(--blue-light)' :
                      step.status === 'Assigned' ? 'var(--purple-primary)' :
                      step.status === 'Completed' ? 'var(--green-primary)' : 'var(--orange-primary)'
                    }}>
                      {step.status}
                    </div>
                    <div className="timeline-comment">{step.comment}</div>
                    
                    {step.proof_image_url && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Proof Attached</div>
                        <img src={step.proof_image_url} alt="Proof" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
