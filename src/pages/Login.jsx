import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', form);
      login(res.data.token, res.data.user);
      const role = res.data.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'worker') navigate('/worker');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const [activeTab, setActiveTab] = useState('user');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'admin') setForm({ email: 'admin@civictrack.com', password: 'admin' });
    else if (tab === 'worker') setForm({ email: 'worker@civictrack.com', password: 'password' }); // Assuming standard demo
    else setForm({ email: '', password: '' });
  };

  return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: '0 24px', animation: 'fadeInUp 0.5s ease' }}>

        {/* Hero text */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 42, marginBottom: 12, animation: 'float 3s ease-in-out infinite' }}>📍</div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Select your portal to continue</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 24, position: 'relative' }}>
          <div style={{ 
            position: 'absolute', top: 4, bottom: 4, width: 'calc(33.33% - 2.66px)', 
            background: 'var(--blue-primary)', borderRadius: 8, transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: `translateX(${activeTab === 'user' ? '0%' : activeTab === 'worker' ? '100%' : 'calc(200% + 4px)'})`,
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
          }} />
          {['user', 'worker', 'admin'].map((tab) => (
             <button key={tab} type="button" onClick={() => handleTabChange(tab)}
               style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', color: activeTab === tab ? '#fff' : 'var(--text-secondary)', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, zIndex: 1, cursor: 'pointer', transition: 'color 0.3s ease' }}>
               {tab === 'user' ? 'Citizen' : tab}
             </button>
          ))}
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: 36 }}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: 8 }} disabled={loading}>
              {loading ? '⏳ Signing in...' : `🔐 Sign In as ${activeTab === 'user' ? 'Citizen' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
          Don't have an account? {' '}
          <Link to="/register" style={{ color: 'var(--blue-light)', fontWeight: 600 }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}
