import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { user, profile, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <Shield size={32} color="var(--color-primary)" />
        <span className="spinner spinner-primary" style={{ width: '2rem', height: '2rem' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Memverifikasi sesi...</p>
      </div>
    );
  }

  if (isConfigured && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
