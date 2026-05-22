import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = {
  user:   [{ to: '/dashboard', label: '🏠 Dashboard' }, { to: '/submit', label: '➕ Report Issue' }, { to: '/', label: '🗺️ Public Feed' }],
  admin:  [{ to: '/admin', label: '📊 Dashboard' }, { to: '/admin/complaints', label: '📋 All Complaints' }, { to: '/', label: '🗺️ Public Feed' }],
  worker: [{ to: '/worker', label: '🔧 My Tasks' }, { to: '/', label: '🗺️ Public Feed' }],
  guest:  [{ to: '/', label: '🗺️ Public Feed' }],
};

export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = user?.role || 'guest';
  const links = NAV_LINKS[role] || NAV_LINKS.guest;

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(6,11,24,0.85)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{ fontSize: 26 }}>📍</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, background: 'linear-gradient(135deg,#60a5fa,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CivicTrack
          </span>
        </Link>

        {/* Desktop Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="desktop-nav">
          {links.map(l => (
            <Link key={l.to} to={l.to} style={{
              padding: '7px 14px', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500,
              color: isActive(l.to) ? '#fff' : 'var(--text-secondary)',
              background: isActive(l.to) ? 'rgba(59,130,246,0.2)' : 'transparent',
              border: isActive(l.to) ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
              transition: 'var(--transition)',
            }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isLoggedIn ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--blue-light)', textTransform: 'capitalize' }}>{user?.role}</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
