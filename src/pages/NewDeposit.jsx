import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackagePlus, User, Package, Plus, Trash2, Camera,
  ChevronRight, ChevronLeft, Save, AlertCircle, CheckCircle,
  MapPin, Tag, Info
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const VISIT_TYPES = [
  'Kunjungan Industri', 'Kunjungan Pendidikan', 'Kunjungan Kerja',
  'Tamu Perusahaan', 'Kunjungan Instansi', 'Lainnya'
];

const CONDITIONS = ['Baik', 'Cukup Baik', 'Perlu Perhatian', 'Rusak Ringan'];

const emptyItem = {
  name: '', category_id: '', quantity: 1, description: '',
  initial_condition: 'Baik', photo_url: '', storage_location_id: '', notes: ''
};

export default function NewDeposit() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isConfigured = isSupabaseConfigured();

  const [step, setStep] = useState(1); // 1 = pengunjung, 2 = barang, 3 = konfirmasi
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null); // { transaction_code, transaction_id }

  // Data referensi
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  // Form data
  const [visitor, setVisitor] = useState({
    full_name: '', institution: '', visit_type: '',
    identity_number: '', phone: '', notes: ''
  });
  const [existingVisitorId, setExistingVisitorId] = useState(null);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [uploadingIdx, setUploadingIdx] = useState(null);

  // Load kategori & lokasi
  useEffect(() => {
    if (!isConfigured) {
      setCategories([
        { id: 'cat-1', name: 'Tas dan Koper' },
        { id: 'cat-2', name: 'Perangkat Elektronik' },
        { id: 'cat-3', name: 'Rokok dan Korek Api' },
        { id: 'cat-4', name: 'Aksesori' },
        { id: 'cat-5', name: 'Dokumen dan Berkas' },
        { id: 'cat-6', name: 'Perlengkapan Pribadi' },
        { id: 'cat-7', name: 'Barang Lainnya' },
      ]);
      setLocations([
        { id: 'loc-1', code: 'RAK-A01', name: 'Rak A01', status: 'available', active_count: 2, capacity: 10 },
        { id: 'loc-2', code: 'RAK-A02', name: 'Rak A02', status: 'available', active_count: 0, capacity: 10 },
        { id: 'loc-3', code: 'LKR-001', name: 'Loker 001', status: 'available', active_count: 1, capacity: 5 },
      ]);
      return;
    }
    const load = async () => {
      const [{ data: cats }, { data: locs }] = await Promise.all([
        supabase.from('item_categories').select('id, name').eq('is_active', true).order('name'),
        supabase.from('storage_locations').select('id, code, name, status, active_count, capacity').eq('is_active', true).order('code'),
      ]);
      setCategories(cats || []);
      setLocations(locs || []);
    };
    load();
  }, [isConfigured]);

  const validateStep1 = () => {
    if (!visitor.full_name.trim()) return 'Nama lengkap pengunjung wajib diisi.';
    if (!visitor.institution.trim()) return 'Instansi/asal wajib diisi.';
    if (!visitor.visit_type) return 'Jenis kunjungan wajib dipilih.';
    return '';
  };

  const validateStep2 = () => {
    for (let i = 0; i < items.length; i++) {
      if (!items[i].name.trim()) return `Nama barang #${i + 1} wajib diisi.`;
      if (!items[i].storage_location_id) return `Lokasi penyimpanan barang #${i + 1} wajib dipilih.`;
    }
    return '';
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
    }
    setStep(s => s + 1);
  };

  const handleAddItem = () => setItems(prev => [...prev, { ...emptyItem }]);
  const handleRemoveItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handlePhotoUpload = async (idx, file) => {
    if (!file) return;
    if (!isConfigured) {
      handleItemChange(idx, 'photo_url', URL.createObjectURL(file));
      return;
    }
    setUploadingIdx(idx);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from('deposit-items')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('deposit-items').getPublicUrl(data.path);
      handleItemChange(idx, 'photo_url', publicUrl);
    } catch (err) {
      setError(`Gagal upload foto: ${err.message}`);
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      if (!isConfigured) {
        await new Promise(r => setTimeout(r, 800));
        setSuccess({ transaction_code: `DEP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-0001`, transaction_id: 'demo-id' });
        return;
      }

      // 1. Cari atau buat data pengunjung
      let visitorId = existingVisitorId;
      if (!visitorId) {
        const { data: existing } = await supabase
          .from('visitors')
          .select('id, visit_count')
          .ilike('full_name', visitor.full_name.trim())
          .ilike('institution', visitor.institution.trim())
          .maybeSingle();

        if (existing) {
          visitorId = existing.id;
          await supabase.from('visitors').update({ visit_count: (existing.visit_count || 1) + 1 }).eq('id', existing.id);
        } else {
          const { data: newVisitor, error: vErr } = await supabase
            .from('visitors')
            .insert({
              full_name: visitor.full_name.trim(),
              institution: visitor.institution.trim(),
              visit_type: visitor.visit_type,
              identity_number: visitor.identity_number.trim(),
              phone: visitor.phone.trim(),
              notes: visitor.notes.trim(),
            })
            .select('id')
            .single();
          if (vErr) throw vErr;
          visitorId = newVisitor.id;
        }
      }

      // 2. Buat transaksi via RPC
      const { data: result, error: rpcErr } = await supabase.rpc('rpc_create_deposit', {
        p_visitor_id: visitorId,
        p_received_by: user?.id,
        p_notes: visitor.notes,
        p_items: items.map(item => ({
          name: item.name.trim(),
          category_id: item.category_id || null,
          quantity: parseInt(item.quantity) || 1,
          description: item.description.trim(),
          initial_condition: item.initial_condition,
          photo_url: item.photo_url,
          storage_location_id: item.storage_location_id || null,
          notes: item.notes.trim(),
        }))
      });

      if (rpcErr) throw rpcErr;
      setSuccess(result);
    } catch (err) {
      setError(`Gagal menyimpan penitipan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="page">
        <div style={{
          maxWidth: '480px', margin: '4rem auto', textAlign: 'center',
          padding: '2rem', backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg, 0.75rem)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <CheckCircle size={32} color="#16A34A" />
          </div>
          <h2 style={{ color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>Penitipan Berhasil!</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Kode penitipan barang:</p>
          <div style={{
            padding: '0.75rem 1.5rem', backgroundColor: 'var(--color-primary-light, #DBEAFE)',
            borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '1.5rem'
          }}>
            <code style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.05em' }}>
              {success.transaction_code}
            </code>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/kartu-penitipan', { state: { transaction_id: success.transaction_id, transaction_code: success.transaction_code } })}
            >
              🖨️ Cetak Kartu Penitipan
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSuccess(null);
                setStep(1);
                setVisitor({ full_name: '', institution: '', visit_type: '', identity_number: '', phone: '', notes: '' });
                setItems([{ ...emptyItem }]);
              }}
            >
              + Penitipan Baru
            </button>
          </div>
          <button
            className="btn btn-ghost"
            style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
            onClick={() => navigate('/dashboard')}
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Penitipan Baru</h1>
          <p className="page-subtitle">Pencatatan data pengunjung dan barang yang dititipkan</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="step-indicator">
        {[
          { n: 1, label: 'Identitas Pengunjung', icon: User },
          { n: 2, label: 'Data Barang', icon: Package },
          { n: 3, label: 'Konfirmasi', icon: CheckCircle }
        ].map(({ n, label, icon: Icon }) => (
          <div key={n} className={`step ${step === n ? 'active' : step > n ? 'done' : ''}`}>
            <div className="step-circle">
              {step > n ? <CheckCircle size={16} /> : <Icon size={16} />}
            </div>
            <span className="step-label">{label}</span>
            {n < 3 && <ChevronRight size={16} className="step-sep" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
          {error}
        </div>
      )}

      {/* STEP 1: Identitas Pengunjung */}
      {step === 1 && (
        <div className="card form-card">
          <div className="card-header">
            <h3 className="card-title"><User size={18} /> Identitas Pengunjung</h3>
          </div>
          <div className="form-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Nama Lengkap</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="cth: Ahmad Rizki"
                  value={visitor.full_name}
                  onChange={e => setVisitor(p => ({ ...p, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label required">Asal Instansi / Perusahaan / Sekolah</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="cth: SMK Negeri 1 Kota"
                  value={visitor.institution}
                  onChange={e => setVisitor(p => ({ ...p, institution: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Jenis Kunjungan</label>
                <select
                  className="form-input"
                  value={visitor.visit_type}
                  onChange={e => setVisitor(p => ({ ...p, visit_type: e.target.value }))}
                  required
                >
                  <option value="">Pilih jenis kunjungan</option>
                  {VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nomor Identitas (KTP/Kartu Pelajar)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Opsional"
                  value={visitor.identity_number}
                  onChange={e => setVisitor(p => ({ ...p, identity_number: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nomor Telepon</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Opsional (cth: 081234567890)"
                  value={visitor.phone}
                  onChange={e => setVisitor(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Catatan Tambahan</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Catatan tambahan (opsional)"
                  value={visitor.notes}
                  onChange={e => setVisitor(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="form-footer">
            <button className="btn btn-primary" onClick={handleNextStep}>
              Lanjut: Data Barang <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Data Barang */}
      {step === 2 && (
        <div>
          {items.map((item, idx) => (
            <div key={idx} className="card form-card" style={{ marginBottom: '1rem' }}>
              <div className="card-header">
                <h3 className="card-title"><Package size={18} /> Barang #{idx + 1}</h3>
                {items.length > 1 && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleRemoveItem(idx)}>
                    <Trash2 size={14} /> Hapus
                  </button>
                )}
              </div>
              <div className="form-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Nama Barang</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="cth: Tas Ransel Hitam"
                      value={item.name}
                      onChange={e => handleItemChange(idx, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><Tag size={14} /> Kategori</label>
                    <select
                      className="form-input"
                      value={item.category_id}
                      onChange={e => handleItemChange(idx, 'category_id', e.target.value)}
                    >
                      <option value="">Pilih kategori</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ flex: '0 0 120px' }}>
                    <label className="form-label">Jumlah</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kondisi Awal</label>
                    <select
                      className="form-input"
                      value={item.initial_condition}
                      onChange={e => handleItemChange(idx, 'initial_condition', e.target.value)}
                    >
                      {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required"><MapPin size={14} /> Lokasi Penyimpanan</label>
                    <select
                      className="form-input"
                      value={item.storage_location_id}
                      onChange={e => handleItemChange(idx, 'storage_location_id', e.target.value)}
                      required
                    >
                      <option value="">Pilih lokasi</option>
                      {locations.filter(l => l.status === 'available').map(l => (
                        <option key={l.id} value={l.id}>
                          {l.code} — {l.name} ({l.capacity - l.active_count} slot tersedia)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Deskripsi / Ciri Khusus</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="cth: Warna hitam merk Eiger, ada gantungan kunci"
                      value={item.description}
                      onChange={e => handleItemChange(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><Camera size={14} /> Foto Barang</label>
                    <div className="item-photo-field">
                      <input
                        type="file"
                        accept="image/*"
                        className="form-input item-photo-input"
                        onChange={e => handlePhotoUpload(idx, e.target.files[0])}
                        disabled={uploadingIdx === idx}
                      />
                      <span className="item-photo-hint">Format gambar JPG, PNG, atau lainnya.</span>
                      {uploadingIdx === idx && (
                        <p className="item-photo-uploading" role="status">Mengupload foto...</p>
                      )}
                    </div>
                    {item.photo_url && (
                      <div className="item-photo-preview">
                        <img src={item.photo_url} alt={`Pratinjau foto ${item.name || 'barang'}`} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button className="btn btn-secondary" style={{ marginBottom: '1.25rem' }} onClick={handleAddItem}>
            <Plus size={16} /> Tambah Barang Lain
          </button>

          <div className="form-footer" style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              <ChevronLeft size={16} /> Kembali
            </button>
            <button className="btn btn-primary" onClick={handleNextStep}>
              Lanjut: Konfirmasi <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Konfirmasi */}
      {step === 3 && (
        <div className="card form-card">
          <div className="card-header">
            <h3 className="card-title"><CheckCircle size={18} /> Konfirmasi Ringkasan Penitipan</h3>
          </div>
          <div className="form-body">
            <div className="confirmation-section">
              <h4><User size={15} /> Identitas Pengunjung</h4>
              <div className="detail-row"><span>Nama</span><strong>{visitor.full_name}</strong></div>
              <div className="detail-row"><span>Instansi</span><span>{visitor.institution}</span></div>
              <div className="detail-row"><span>Jenis Kunjungan</span><span>{visitor.visit_type}</span></div>
              {visitor.identity_number && <div className="detail-row"><span>No. Identitas</span><code>{visitor.identity_number}</code></div>}
              {visitor.phone && <div className="detail-row"><span>Telepon</span><span>{visitor.phone}</span></div>}
            </div>

            <div className="confirmation-section" style={{ marginTop: '1.5rem' }}>
              <h4><Package size={15} /> Barang yang Dititipkan ({items.length} item)</h4>
              {items.map((item, i) => {
                const loc = locations.find(l => l.id === item.storage_location_id);
                const cat = categories.find(c => c.id === item.category_id);
                return (
                  <div key={i} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', backgroundColor: 'var(--color-bg-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                      <strong>{item.name}</strong>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>×{item.quantity}</span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {cat && <span><Tag size={12} /> {cat.name}</span>}
                      <span>Kondisi: {item.initial_condition}</span>
                      {loc && <span><MapPin size={12} /> {loc.code} — {loc.name}</span>}
                    </div>
                    {item.description && <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>{item.description}</p>}
                  </div>
                );
              })}
            </div>

            <div className="alert alert-info" style={{ marginTop: '1rem', fontSize: '0.8125rem', display: 'flex', gap: '0.5rem' }}>
              <Info size={16} style={{ flexShrink: 0 }} />
              Pastikan data telah diverifikasi sesuai dengan identitas pengunjung dan barang fisik yang diserahkan sebelum menyimpan.
            </div>
          </div>

          <div className="form-footer" style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>
              <ChevronLeft size={16} /> Kembali
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <><span className="spinner spinner-sm" /> Menyimpan Transaksi...</>
                : <><Save size={16} /> Simpan & Buat Kartu Penitipan</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
