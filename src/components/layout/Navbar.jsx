import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, LogOut, User, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate('/login');
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Pengguna';
  const userRole = profile?.role || 'satpam';

  const avatarInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email ? user.email.slice(0, 2).toUpperCase() : 'U');

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <Shield size={20} className="topbar-brand-icon" />
        <span>Sistem Penitipan Barang Pengunjung</span>
      </div>

      <div className="topbar-user">
        <button className="notification-btn" aria-label="Notifikasi" title="Notifikasi">
          <Bell size={20} />
        </button>

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <div
            className="user-profile"
            onClick={() => setDropdownOpen(prev => !prev)}
            style={{ cursor: 'pointer', userSelect: 'none', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDropdownOpen(prev => !prev); }}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div className="user-avatar" aria-hidden="true" style={{ fontWeight: 700 }}>
              {avatarInitials}
            </div>
            <div className="user-meta">
              <h4>{displayName}</h4>
              <p>
                <span style={{
                  fontWeight: 600,
                  color: userRole === 'admin' ? 'var(--color-danger)' : 'var(--color-primary)'
                }}>
                  {userRole === 'admin' ? 'Administrator' : 'Petugas Keamanan'}
                </span>
                {profile?.employee_id ? ` · ${profile.employee_id}` : ''}
              </p>
            </div>
            <ChevronDown size={14} color="var(--color-text-muted)" style={{ marginLeft: '0.25rem' }} />
          </div>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              minWidth: '220px', zIndex: 100, overflow: 'hidden'
            }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>{displayName}</p>
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                    padding: '0.125rem 0.4rem', borderRadius: 'var(--radius-sm)',
                    backgroundColor: userRole === 'admin' ? '#FEE2E2' : 'var(--color-primary-light)',
                    color: userRole === 'admin' ? '#991B1B' : 'var(--color-primary)'
                  }}>
                    {userRole === 'admin' ? 'Admin' : 'Satpam'}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>{user?.email || ''}</p>
              </div>

              <Link
                to="/profil"
                onClick={() => setDropdownOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.6875rem 1rem', fontSize: '0.875rem', color: 'var(--color-text-main)', transition: 'background-color 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-subtle)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <User size={16} /> Profil Saya
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.6875rem 1rem', fontSize: '0.875rem', color: '#DC2626',
                  textAlign: 'left', borderTop: '1px solid var(--color-border)', transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogOut size={16} /> Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
