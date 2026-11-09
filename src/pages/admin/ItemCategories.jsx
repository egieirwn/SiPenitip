import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Edit2, Trash2, Save, X, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

const MOCK = [
  { id: '1', name: 'Tas dan Koper', description: 'Tas ransel, koper, dan sejenisnya', is_active: true },
  { id: '2', name: 'Perangkat Elektronik', description: 'Laptop, kamera, ponsel', is_active: true },
  { id: '3', name: 'Rokok dan Korek Api', description: 'Rokok, cerutu, korek api', is_active: true },
  { id: '4', name: 'Aksesori', description: 'Jam tangan, perhiasan', is_active: true },
  { id: '5', name: 'Dokumen dan Berkas', description: 'Dokumen, map, berkas penting', is_active: true },
  { id: '6', name: 'Perlengkapan Pribadi', description: 'Dompet, kunci, obat-obatan pribadi', is_active: true },
  { id: '7', name: 'Barang Lainnya', description: 'Barang lain yang tidak termasuk kategori di atas', is_active: true },
];

export default function ItemCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isConfigured = isSupabaseConfigured();

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (!isConfigured) { setCategories(MOCK); setLoading(false); return; }
    try {
      const { data } = await supabase.from('item_categories').select('*').order('name');
      setCategories(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!newCat.name.trim()) { setError('Nama kategori wajib diisi.'); return; }
    setSaving(true);
    if (!isConfigured) {
      setCategories(p => [...p, { id: Date.now().toString(), ...newCat, is_active: true }]);
      setCreating(false); setNewCat({ name: '', description: '' }); setSaving(false); return;
    }
    const { error: err } = await supabase.from('item_categories').insert({ name: newCat.name.trim(), description: newCat.description.trim() });
    if (err) { setError(err.message); } else { setCreating(false); setNewCat({ name: '', description: '' }); fetchData(); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editing?.name?.trim()) { setError('Nama kategori wajib diisi.'); return; }
    setSaving(true);
    if (!isConfigured) {
      setCategories(p => p.map(c => c.id === editing.id ? editing : c));
      setEditing(null); setSaving(false); return;
    }
    const { error: err } = await supabase.from('item_categories').update({ name: editing.name.trim(), description: editing.description?.trim(), is_active: editing.is_active }).eq('id', editing.id);
    if (err) { setError(err.message); } else { setEditing(null); fetchData(); }
    setSaving(false);
  };

  const handleToggle = async (cat) => {
    if (!isConfigured) { setCategories(p => p.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c)); return; }
    await supabase.from('item_categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    fetchData();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Kategori Barang</h1>
          <p className="page-subtitle">{categories.length} kategori barang terdaftar</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Perbarui</button>
          <button className="btn btn-primary" onClick={() => { setCreating(true); setError(''); }}><Plus size={16} /> Tambah Kategori</button>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><AlertCircle size={16} />{error}<button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>×</button></div>}

      {creating && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header"><h3 className="card-title"><Plus size={16} /> Kategori Baru</h3></div>
          <div style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label className="form-label required">Nama Kategori</label>
              <input type="text" className="form-input" value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} placeholder="cth: Tas dan Koper" autoFocus />
            </div>
            <div className="form-group" style={{ flex: '2 1 300px' }}>
              <label className="form-label">Deskripsi</label>
              <input type="text" className="form-input" value={newCat.description} onChange={e => setNewCat(p => ({ ...p, description: e.target.value }))} placeholder="Deskripsi singkat (opsional)" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? <span className="spinner spinner-sm" /> : <Save size={14} />} Simpan</button>
              <button className="btn btn-secondary" onClick={() => { setCreating(false); setError(''); }}><X size={14} /></button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>#</th><th>Nama Kategori</th><th>Deskripsi</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner spinner-primary" /></td></tr>
              ) : categories.map((cat, i) => (
                <tr key={cat.id}>
                  <td style={{ color: 'var(--color-text-muted)', width: '40px' }}>{i + 1}</td>
                  <td>
                    {editing?.id === cat.id ? (
                      <input type="text" className="form-input-inline" value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} autoFocus />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Tag size={15} color="var(--color-primary)" />
                        <strong>{cat.name}</strong>
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {editing?.id === cat.id ? (
                      <input type="text" className="form-input-inline" value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} />
                    ) : cat.description || '—'}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: cat.is_active ? '#DCFCE7' : '#F3F4F6', color: cat.is_active ? '#16A34A' : '#6B7280' }}>
                      {cat.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    {editing?.id === cat.id ? (
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={handleUpdate} disabled={saving}><Save size={13} /></button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}><X size={13} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...cat })} title="Edit"><Edit2 size={13} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(cat)} title={cat.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          style={{ color: cat.is_active ? 'var(--color-warning, #D97706)' : 'var(--color-success, #16A34A)' }}>
                          {cat.is_active ? '⏸' : '▶'}
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
    </div>
  );
}

