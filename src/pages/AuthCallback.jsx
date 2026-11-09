import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { refreshProfile } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    const processAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          navigate('/dashboard', { replace: true });
          return;
        }

        const type = searchParams.get('type');
        const hash = window.location.hash;

        if (type === 'recovery' || hash.includes('type=recovery')) {
          navigate('/reset-password', { replace: true });
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!session?.user) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (currentSession?.user) {
              subscription.unsubscribe();
              await refreshProfile();
              toast.success('Autentikasi berhasil! Selamat datang.');
              navigate('/dashboard', { replace: true });
            }
          });

          setTimeout(() => {
            if (mounted && !errorMsg) {
              setErrorMsg('Sesi autentikasi tidak ditemukan atau tautan verifikasi telah kedaluwarsa.');
            }
          }, 4000);
          return;
        }

        await refreshProfile();
        toast.success('Autentikasi berhasil! Selamat datang.');
        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (mounted) {
          setErrorMsg(err.message || 'Gagal memproses tautan autentikasi.');
        }
      }
    };

    processAuth();

    return () => {
      mounted = false;
    };
  }, [navigate, searchParams, refreshProfile, toast]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-app)',
        padding: '2rem'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {errorMsg ? (
          <>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto'
              }}
            >
              <AlertCircle size={28} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Autentikasi Gagal
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
              {errorMsg}
            </p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Kembali ke Halaman Masuk
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto'
              }}
            >
              <Shield size={28} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Memverifikasi Sesi...
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
              Mohon tunggu sejenak, sistem sedang mengonfirmasi kredensial Anda.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span className="spinner spinner-primary" style={{ width: '2rem', height: '2rem' }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
