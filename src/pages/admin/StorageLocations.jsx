import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Edit2, Save, X, RefreshCw, AlertCircle, Package } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

const MOCK_LOCS = [
  { id: '1', code: 'RAK-A01', name: 'Rak A01', capacity: 10, active_count: 2, status: 'available', is_active: true },
  { id: '2', code: 'RAK-A02', name: 'Rak A02', capacity: 10, active_count: 0, status: 'available', is_active: true },
  { id: '3', code: 'RAK-B01', name: 'Rak B01', capacity: 10, active_count: 10, status: 'full', is_active: true },
  { id: '4', code: 'LKR-001', name: 'Loker 001', capacity: 5, active_count: 1, status: 'available', is_active: true },
  { id: '5', code: 'LKR-002', name: 'Loker 002', capacity: 5, active_count: 0, status: 'inactive', is_active: false },
];

const statusConfig = {
  available: { label: 'Tersedia', color: '#16A34A', bg: '#DCFCE7' },
  full: { label: 'Penuh', color: '#D97706', bg: '#FEF3C7' },
  inactive: { label: 'Nonaktif', color: '#6B7280', bg: '#F3F4F6' },
};

export default function StorageLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newLoc, setNewLoc] = useState({ code: '', name: '', capacity: 10, description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isConfigured = isSupabaseConfigured();

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (!isConfigured) { setLocations(MOCK_LOCS); setLoading(false); return; }
    try {
      const { data } = await supabase.from('storage_locations').select('*').order('code');
      setLocations(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!newLoc.code.trim() || !newLoc.name.trim()) { setError('Kode dan nama lokasi wajib diisi.'); return; }
    setSaving(true);
    if (!isConfigured) {
      setLocations(p => [...p, { id: Date.now().toString(), ...newLoc, active_count: 0, status: 'available', is_active: true }]);
      setCreating(false); setNewLoc({ code: '', name: '', capacity: 10, description: '' }); setSaving(false); return;
    }
    const { error: err } = await supabase.from('storage_locations').insert({ code: newLoc.code.trim().toUpperCase(), name: newLoc.name.trim(), capacity: parseInt(newLoc.capacity) || 10, description: newLoc.description });
    if (err) { setError(err.message); } else { setCreating(false); setNewLoc({ code: '', name: '', capacity: 10, description: '' }); fetchData(); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    if (!isConfigured) { setLocations(p => p.map(l => l.id === editing.id ? editing : l)); setEditing(null); setSaving(false); return; }
    const { error: err } = await supabase.from('storage_locations').update({ name: editing.name, capacity: editing.capacity, description: editing.description, is_active: editing.is_active }).eq('id', editing.id);
    if (err) { setError(err.message); } else { setEditing(null); fetchData(); }
    setSaving(false);
  };

  const availableCount = locations.filter(l => l.status === 'available' && l.is_active).length;
  const fullCount = locations.filter(l => l.status === 'full').length;
  const totalCapacity = locations.reduce((s, l) => s + (l.capacity || 0), 0);
  const totalActive = locations.reduce((s, l) => s + (l.active_count || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lokasi Penyimpanan</h1>
          <p className="page-subtitle">{availableCount} lokasi tersedia · {fullCount} penuh · {totalActive}/{totalCapacity} kapasitas terpakai</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /></button>
          <button className="btn btn-primary" onClick={() => { setCreating(true); setError(''); }}><Plus size={16} /> Tambah Lokasi</button>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><AlertCircle size={16} />{error}<button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>×</button></div>}

      {creating && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header"><h3 className="card-title"><Plus size={16} /> Lokasi Baru</h3></div>
          <div style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '0 0 150px' }}>
              <label className="form-label required">Kode Lokasi</label>
              <input type="text" className="form-input" value={newLoc.code} onChange={e => setNewLoc(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="cth: RAK-C01" autoFocus />
            </div>
            <div className="form-group" style={{ flex: '1 1 180px' }}>
              <label className="form-label required">Nama Lokasi</label>
              <input type="text" className="form-input" value={newLoc.name} onChange={e => setNewLoc(p => ({ ...p, name: e.target.value }))} placeholder="cth: Rak C01" />
            </div>
            <div className="form-group" style={{ flex: '0 0 100px' }}>
              <label className="form-label">Kapasitas</label>
              <input type="number" className="form-input" min="1" value={newLoc.capacity} onChange={e => setNewLoc(p => ({ ...p, capacity: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="form-group" style={{ flex: '2 1 200px' }}>
              <label className="form-label">Keterangan</label>
              <input type="text" className="form-input" value={newLoc.description} onChange={e => setNewLoc(p => ({ ...p, description: e.target.value }))} placeholder="Opsional" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? <span className="spinner spinner-sm" /> : <Save size={14} />} Simpan</button>
              <button className="btn btn-secondary" onClick={() => setCreating(false)}><X size={14} /></button>
            </div>
          </div>
        </div>
      )}

      <div className="locations-grid">
        {loading ? (
          <div className="loading-state"><span className="spinner spinner-primary" /><p>Memuat...</p></div>
        ) : locations.map(loc => {
          const cfg = statusConfig[loc.is_active ? loc.status : 'inactive'] || statusConfig.inactive;
          const usagePercent = loc.capacity > 0 ? Math.round((loc.active_count / loc.capacity) * 100) : 0;
          return (
            <div key={loc.id} className="location-card" style={{ opacity: loc.is_active ? 1 : 0.6 }}>
              <div className="location-card-header">
                <div>
                  <code className="location-code">{loc.code}</code>
                  <p className="location-name">{loc.name}</p>
                </div>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>
              <div className="location-usage">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.375rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Terisi</span>
                  <span style={{ fontWeight: 700 }}>{loc.active_count} / {loc.capacity}</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${usagePercent}%`, backgroundColor: usagePercent >= 100 ? '#D97706' : usagePercent > 70 ? '#F59E0B' : '#16A34A', borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
              </div>
              {loc.description && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>{loc.description}</p>}
              <div className="location-card-footer">
                {editing?.id === loc.id ? (
                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <input type="number" className="form-input-inline" style={{ width: '80px' }} value={editing.capacity} onChange={e => setEditing(p => ({ ...p, capacity: parseInt(e.target.value) || 1 }))} min="1" title="Kapasitas" />
                    <button className="btn btn-primary btn-sm" onClick={handleUpdate} disabled={saving}><Save size={13} /></button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}><X size={13} /></button>
                  </div>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...loc })} style={{ width: '100%' }}>
                    <Edit2 size={13} /> Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

