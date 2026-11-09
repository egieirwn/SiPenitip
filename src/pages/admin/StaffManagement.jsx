import React, { useState, useEffect, useCallback } from 'react';
import { UserCog, Plus, Edit2, Save, X, RefreshCw, Shield, AlertCircle, Mail } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

const MOCK_STAFF = [
  { id: '1', full_name: 'Admin Utama', email: 'admin@perusahaan.com', role: 'admin', employee_id: 'ADM-001', shift: 'Pagi', is_active: true, created_at: new Date().toISOString() },
  { id: '2', full_name: 'Budi Satpam', email: 'budi@perusahaan.com', role: 'satpam', employee_id: 'SAT-001', shift: 'Pagi', is_active: true, created_at: new Date().toISOString() },
  { id: '3', full_name: 'Siti Petugas', email: 'siti@perusahaan.com', role: 'satpam', employee_id: 'SAT-002', shift: 'Siang', is_active: true, created_at: new Date().toISOString() },
];

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isConfigured = isSupabaseConfigured();

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (!isConfigured) { setStaff(MOCK_STAFF); setLoading(false); return; }
    try {
      const { data } = await supabase.from('profiles').select('id, full_name, role, employee_id, shift, is_active, created_at').in('role', ['admin', 'satpam']).order('full_name');
      setStaff(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdate = async () => {
    setSaving(true);
    if (!isConfigured) {
      setStaff(p => p.map(s => s.id === editing.id ? editing : s));
      setEditing(null); setSaving(false); return;
    }
    const { error: err } = await supabase.from('profiles').update({ role: editing.role, employee_id: editing.employee_id, shift: editing.shift, is_active: editing.is_active }).eq('id', editing.id);
    if (err) { setError(err.message); } else { setEditing(null); fetchData(); }
    setSaving(false);
  };

  const handleToggleActive = async (member) => {
    if (!isConfigured) { setStaff(p => p.map(s => s.id === member.id ? { ...s, is_active: !s.is_active } : s)); return; }
    await supabase.from('profiles').update({ is_active: !member.is_active }).eq('id', member.id);
    fetchData();
  };

  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Petugas</h1>
          <p className="page-subtitle">{staff.length} petugas keamanan dan administrator terdaftar</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Perbarui</button>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><AlertCircle size={16} />{error}<button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>×</button></div>}

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Nama</th><th>Role</th><th>ID Karyawan</th><th>Shift</th><th>Status</th><th>Terdaftar</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner spinner-primary" /></td></tr>
              ) : staff.map(member => (
                <tr key={member.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: member.role === 'admin' ? '#FEE2E2' : 'var(--color-primary-light, #DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: member.role === 'admin' ? '#991B1B' : 'var(--color-primary)', flexShrink: 0 }}>
                        {member.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, margin: 0, fontSize: '0.875rem' }}>{member.full_name}</p>
                        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={11} /> {member.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {editing?.id === member.id ? (
                      <select className="form-input-inline" value={editing.role} onChange={e => setEditing(p => ({ ...p, role: e.target.value }))}>
                        <option value="satpam">Satpam</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: member.role === 'admin' ? '#FEE2E2' : 'var(--color-primary-light, #DBEAFE)', color: member.role === 'admin' ? '#991B1B' : 'var(--color-primary)' }}>
                        <Shield size={11} style={{ marginRight: '0.25rem' }} />
                        {member.role === 'admin' ? 'Administrator' : 'Petugas Keamanan'}
                      </span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {editing?.id === member.id ? (
                      <input type="text" className="form-input-inline" value={editing.employee_id || ''} onChange={e => setEditing(p => ({ ...p, employee_id: e.target.value }))} placeholder="cth: SAT-001" style={{ width: '100px' }} />
                    ) : member.employee_id || '—'}
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>
                    {editing?.id === member.id ? (
                      <select className="form-input-inline" value={editing.shift || ''} onChange={e => setEditing(p => ({ ...p, shift: e.target.value }))}>
                        <option value="">—</option>
                        <option value="Pagi">Pagi</option>
                        <option value="Siang">Siang</option>
                        <option value="Malam">Malam</option>
                      </select>
                    ) : member.shift || '—'}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: member.is_active ? '#DCFCE7' : '#F3F4F6', color: member.is_active ? '#16A34A' : '#6B7280' }}>
                      {member.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{formatDate(member.created_at)}</td>
                  <td>
                    {editing?.id === member.id ? (
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={handleUpdate} disabled={saving}><Save size={13} /></button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}><X size={13} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...member })} title="Edit"><Edit2 size={13} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(member)} title={member.is_active ? 'Nonaktifkan' : 'Aktifkan'} style={{ color: member.is_active ? 'var(--color-warning, #D97706)' : 'var(--color-success, #16A34A)' }}>
                          {member.is_active ? '⏸' : '▶'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginTop: '1rem', fontSize: '0.8125rem', display: 'flex', gap: '0.5rem' }}>
        <Shield size={16} style={{ flexShrink: 0 }} />
        Penambahan atau pengaturan login akun petugas baru dikelola melalui Supabase Authentication. Perubahan hak akses dan role satpam/admin dapat disesuaikan pada tabel di atas.
      </div>
    </div>
  );
}

