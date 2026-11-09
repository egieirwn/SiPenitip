import React, { useState } from 'react';
import { User, Save, KeyRound, Mail, Phone, Hash, Clock, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, profile, updateUserProfile, updatePassword } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    employee_id: profile?.employee_id || '',
    shift: profile?.shift || '',
    phone: profile?.phone || '',
  });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState({ profile: '', password: '' });

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateUserProfile(form);
    setMsg(prev => ({ ...prev, profile: error ? `Gagal: ${error.message}` : 'Profil berhasil disimpan!' }));
    setSaving(false);
    setTimeout(() => setMsg(prev => ({ ...prev, profile: '' })), 3000);
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      setMsg(prev => ({ ...prev, password: 'Password baru tidak cocok.' }));
      return;
    }
    if (passwords.newPass.length < 8) {
      setMsg(prev => ({ ...prev, password: 'Password minimal 8 karakter.' }));
      return;
    }
    setSavingPw(true);
    const { error } = await updatePassword(passwords.newPass);
    setMsg(prev => ({ ...prev, password: error ? `Gagal: ${error.message}` : 'Password berhasil diubah!' }));
    if (!error) setPasswords({ current: '', newPass: '', confirm: '' });
    setSavingPw(false);
    setTimeout(() => setMsg(prev => ({ ...prev, password: '' })), 3000);
  };

  const avatarInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profil Saya</h1>
          <p className="page-subtitle">Kelola informasi akun dan pengaturan keamanan petugas</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><User size={18} /> Informasi Profil</h3>
          </div>
          <div style={{ padding: '1.5rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', fontWeight: 700, margin: '0 auto 0.75rem'
            }}>
              {avatarInitials}
            </div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{profile?.full_name || 'Petugas'}</p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.375rem', fontSize: '0.75rem',
              fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '999px',
              backgroundColor: profile?.role === 'admin' ? '#FEE2E2' : 'var(--color-primary-light, #DBEAFE)',
              color: profile?.role === 'admin' ? '#991B1B' : 'var(--color-primary)'
            }}>
              <Shield size={12} />
              {profile?.role === 'admin' ? 'Administrator' : 'Petugas Keamanan (Satpam)'}
            </span>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
              <Mail size={13} />
              {user?.email || 'petugas@perusahaan.com'}
            </p>
          </div>

          <form onSubmit={handleProfileSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input
                type="text"
                className="form-input"
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label"><Hash size={14} /> ID Karyawan / Petugas</label>
              <input
                type="text"
                className="form-input"
                value={form.employee_id}
                onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))}
                placeholder="cth: SAT-001"
              />
            </div>
            <div className="form-group">
              <label className="form-label"><Clock size={14} /> Shift Kerja</label>
              <select
                className="form-input"
                value={form.shift}
                onChange={e => setForm(p => ({ ...p, shift: e.target.value }))}
              >
                <option value="">Pilih shift</option>
                <option value="Pagi">Pagi (06:00–14:00)</option>
                <option value="Siang">Siang (14:00–22:00)</option>
                <option value="Malam">Malam (22:00–06:00)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label"><Phone size={14} /> Nomor Telepon</label>
              <input
                type="tel"
                className="form-input"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="cth: 081234567890"
              />
            </div>
            {msg.profile && (
              <div className={`alert ${msg.profile.includes('Gagal') ? 'alert-danger' : 'alert-success'}`} style={{ fontSize: '0.8125rem' }}>
                {msg.profile}
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner spinner-sm" /> Menyimpan...</> : <><Save size={16} /> Simpan Profil</>}
            </button>
          </form>
        </div>

        {/* Password Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><KeyRound size={18} /> Ubah Password</h3>
          </div>
          <form onSubmit={handlePasswordSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Password Baru</label>
              <input
                type="password"
                className="form-input"
                value={passwords.newPass}
                onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                placeholder="Minimal 8 karakter"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Konfirmasi Password Baru</label>
              <input
                type="password"
                className="form-input"
                value={passwords.confirm}
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Ulangi password baru"
                required
              />
            </div>
            {msg.password && (
              <div className={`alert ${msg.password.includes('Gagal') || msg.password.includes('tidak') ? 'alert-danger' : 'alert-success'}`} style={{ fontSize: '0.8125rem' }}>
                {msg.password}
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={savingPw}>
              {savingPw ? <><span className="spinner spinner-sm" /> Memproses...</> : <><KeyRound size={16} /> Perbarui Password</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
