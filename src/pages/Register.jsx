import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', form);
      login(res.data.token, res.data.user);
      navigate(form.role === 'worker' ? '/worker' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', padding: '32px 0' }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '0 24px', animation: 'fadeInUp 0.5s ease' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏙️</div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Join CivicTrack</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Be the change your city needs</p>
        </div>

        <div className="glass-card" style={{ padding: 36 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input className="form-input" placeholder="John Doe" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input className="form-input" type="tel" placeholder="+91 98765 43210" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div className="form-group">
              <label>I am registering as</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {['user', 'worker'].map(r => (
                  <button key={r} type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    style={{
                      padding: '14px 12px', borderRadius: 'var(--radius-md)', border: `2px solid ${form.role === r ? 'var(--blue-primary)' : 'var(--glass-border)'}`,
                      background: form.role === r ? 'rgba(59,130,246,0.15)' : 'var(--glass)',
                      color: form.role === r ? 'var(--blue-light)' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: 14, transition: 'var(--transition)', cursor: 'pointer',
                    }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{r === 'user' ? '👤' : '🔧'}</div>
                    <div>{r === 'user' ? 'Citizen' : 'Field Worker'}</div>
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? '⏳ Creating Account...' : '🚀 Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
          Already have an account? {' '}
          <Link to="/login" style={{ color: 'var(--blue-light)', fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
