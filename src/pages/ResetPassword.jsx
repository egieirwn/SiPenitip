import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Lock, CheckCircle, Check, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Password Requirement Indicators
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const hasNumberAndSymbol = hasNumber && hasSymbol;
  const isConfirmMatch = confirmPassword.length > 0 && confirmPassword === password;

  const validate = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = 'Kata sandi baru wajib diisi.';
    } else if (password.length < 8) {
      newErrors.password = 'Kata sandi baru minimal 8 karakter.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi kata sandi baru Anda.';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Konfirmasi kata sandi tidak cocok.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { error } = await updatePassword(password);

      if (error) {
        setServerError(error.message || 'Gagal memperbarui kata sandi. Tautan mungkin telah kedaluwarsa.');
        return;
      }

      toast.success('Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.');
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <header
        style={{
          padding: '1.25rem 3rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}
      >
        <div className="logo-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={20} />
        </div>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          <strong>SiPenitip</strong> · Sistem Informasi Penitipan Barang Pengunjung
        </span>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
      >
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: '460px',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
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
              marginBottom: '1.25rem'
            }}
          >
            <Lock size={28} />
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Buat Kata Sandi Baru
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Pastikan kata sandi baru Anda kuat dan belum pernah digunakan sebelumnya.
          </p>

          {serverError && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertCircle size={18} />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="reset-new-password" className="form-label">
                Kata sandi baru *
              </label>
              <input
                id="reset-new-password"
                type="password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                className={`form-input ${errors.password ? 'has-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.password && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.password}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reset-confirm-password" className="form-label">
                Konfirmasi kata sandi baru *
              </label>
              <input
                id="reset-confirm-password"
                type="password"
                placeholder="Ulangi kata sandi baru"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                className={`form-input ${errors.confirmPassword ? 'has-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.confirmPassword && (
                <span className="error-text">
                  <AlertCircle size={14} /> {errors.confirmPassword}
                </span>
              )}
            </div>

            {/* Dynamic Password Requirements Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem', marginTop: '-0.25rem', marginBottom: '0.25rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: hasMinLength ? '#16A34A' : 'var(--color-text-muted)',
                  fontWeight: hasMinLength ? 600 : 400,
                  transition: 'color 0.2s ease, font-weight 0.2s ease'
                }}
              >
                {hasMinLength ? (
                  <Check size={14} strokeWidth={2.5} color="#16A34A" />
                ) : (
                  <span style={{ display: 'inline-block', width: '14px', textAlign: 'center', fontSize: '0.75rem', lineHeight: 1 }}>○</span>
                )}
                <span>Minimal 8 karakter</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: hasNumberAndSymbol ? '#16A34A' : 'var(--color-text-muted)',
                  fontWeight: hasNumberAndSymbol ? 600 : 400,
                  transition: 'color 0.2s ease, font-weight 0.2s ease'
                }}
              >
                {hasNumberAndSymbol ? (
                  <Check size={14} strokeWidth={2.5} color="#16A34A" />
                ) : (
                  <span style={{ display: 'inline-block', width: '14px', textAlign: 'center', fontSize: '0.75rem', lineHeight: 1 }}>○</span>
                )}
                <span>Disarankan menyertakan angka dan simbol</span>
              </div>

              {confirmPassword.length > 0 && !errors.confirmPassword && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: isConfirmMatch ? '#16A34A' : '#DC2626',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    marginTop: '0.125rem',
                    transition: 'color 0.2s ease'
                  }}
                >
                  {isConfirmMatch ? (
                    <>
                      <Check size={14} strokeWidth={2.5} color="#16A34A" />
                      <span>Konfirmasi kata sandi cocok</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} color="#DC2626" />
                      <span>Konfirmasi kata sandi belum cocok</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ marginRight: '0.5rem' }} /> Menyimpan kata sandi...
                </>
              ) : (
                'Simpan Kata Sandi Baru'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem' }}>
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Kembali ke Halaman Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
