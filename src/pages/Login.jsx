import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight,
  PackageCheck, Sparkles, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, isConfigured } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const heroPanelRef = useRef(null);
  const animationFrameRef = useRef(null);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    if (user) navigate(from, { replace: true });
    return () => window.cancelAnimationFrame(frame);
  }, [user, navigate, from]);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotionEnabled(!reduceMotion.matches);

    const handleMotionPreference = (event) => setMotionEnabled(!event.matches);
    reduceMotion.addEventListener?.('change', handleMotionPreference);
    return () => reduceMotion.removeEventListener?.('change', handleMotionPreference);
  }, []);

  useEffect(() => () => {
    if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
  }, []);

  const handleHeroPointerMove = (event) => {
    if (!motionEnabled || !heroPanelRef.current) return;
    const bounds = heroPanelRef.current.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = window.requestAnimationFrame(() => {
      heroPanelRef.current?.style.setProperty('--pointer-x', `${x * 18}px`);
      heroPanelRef.current?.style.setProperty('--pointer-y', `${y * 18}px`);
    });
  };

  const handleHeroPointerLeave = () => {
    if (!heroPanelRef.current) return;
    if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = window.requestAnimationFrame(() => {
      heroPanelRef.current?.style.setProperty('--pointer-x', '0px');
      heroPanelRef.current?.style.setProperty('--pointer-y', '0px');
    });
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await signIn({ email: form.email, password: form.password });
      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Email atau password salah. Silakan coba lagi.'
          : authError.message);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError('Terjadi kesalahan saat masuk. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`login-page${isVisible ? ' login-page-visible' : ''}${motionEnabled ? '' : ' login-reduced-motion'}`}>
      <div className="login-shell">
        <section
          className="login-showcase"
          ref={heroPanelRef}
          onPointerMove={handleHeroPointerMove}
          onPointerLeave={handleHeroPointerLeave}
          aria-label="Tentang SiPenitip"
        >
          <div className="login-showcase-glow login-showcase-glow-one" />
          <div className="login-showcase-glow login-showcase-glow-two" />
          <div className="login-showcase-grid" />

          <Link to="/login" className="login-brand" aria-label="SiPenitip">
            <span className="login-brand-mark"><Shield size={21} strokeWidth={2.2} /></span>
            <span>
              <strong>SiPenitip</strong>
              <small>Sistem Penitipan Barang</small>
            </span>
          </Link>

          <div className="login-showcase-copy">
            <span className="login-eyebrow"><Sparkles size={14} /> TERTIB · AMAN · TERPERCAYA</span>
            <h1>Semua titipan,<br /><span>terjaga dengan baik.</span></h1>
            <p>Kelola barang titipan pengunjung dengan pencatatan yang rapi, aman, dan mudah dilacak.</p>
          </div>

          <div className="login-visual" aria-hidden="true">
            <div className="login-orbit login-orbit-outer" />
            <div className="login-orbit login-orbit-inner" />
            <div className="login-visual-spark login-visual-spark-one">✦</div>
            <div className="login-visual-spark login-visual-spark-two">✧</div>
            <div className="login-package-card">
              <div className="login-package-icon"><PackageCheck size={25} /></div>
              <div className="login-package-meta">
                <span>STATUS PENITIPAN</span>
                <strong>Barang tersimpan aman</strong>
              </div>
              <span className="login-package-check"><CheckCircle2 size={19} /></span>
              <div className="login-package-line"><span /></div>
              <div className="login-package-footer">
                <span>Kode penitipan</span><strong>DEP-2026-0042</strong>
              </div>
            </div>
            <div className="login-floating-badge login-floating-badge-top">
              <span className="login-live-dot" /> Data tersimpan
            </div>
            <div className="login-floating-badge login-floating-badge-bottom">
              <Shield size={15} /> Akses terlindungi
            </div>
          </div>

          <div className="login-showcase-footer">
            <span>© {new Date().getFullYear()} SiPenitip</span>
            <span><span className="login-footer-dot" /> Sistem operasional penitipan</span>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-content">
            <div className="login-mobile-brand">
              <span className="login-brand-mark"><Shield size={20} /></span>
              <strong>SiPenitip</strong>
            </div>
            <div className="login-form-heading">
              <span className="login-form-kicker">SELAMAT DATANG KEMBALI</span>
              <h2>Masuk ke akun Anda</h2>
              <p>Gunakan akun petugas untuk melanjutkan ke sistem.</p>
            </div>

            {!isConfigured && (
              <div className="login-demo-notice">
                <AlertCircle size={17} />
                <span><strong>Mode Demo</strong> — Supabase belum dikonfigurasi. Anda dapat langsung masuk.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email">Alamat email</label>
                <div className="login-input-wrap">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="nama@perusahaan.com"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <div className="login-field-heading">
                  <label htmlFor="password">Kata sandi</label>
                  <Link to="/forgot-password">Lupa kata sandi?</Link>
                </div>
                <div className="login-input-wrap">
                  <Lock size={18} aria-hidden="true" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Masukkan kata sandi"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword(p => !p)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <AlertCircle size={17} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? (
                  <><span className="login-spinner" /> Memeriksa akun...</>
                ) : (
                  <>Masuk ke sistem <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <div className="login-security-note">
              <Shield size={16} />
              <span>Akses aman khusus petugas yang berwenang</span>
            </div>
          </div>
          <div className="login-panel-footer">Butuh bantuan? Hubungi administrator sistem.</div>
        </section>
      </div>
    </main>
  );
}
