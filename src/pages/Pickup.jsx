import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  PackageOpen, Search, QrCode, User, Package, MapPin,
  Clock, CheckCircle, AlertCircle, XCircle, Camera,
  ChevronRight, ShieldCheck, Users, FileText, X
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const PICKUP_STEPS = {
  SEARCH: 'search',
  DETAIL: 'detail',
  VERIFY: 'verify',
  CONFIRM: 'confirm',
  DONE: 'done'
};

export default function Pickup() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isConfigured = isSupabaseConfigured();

  const [step, setStep] = useState(PICKUP_STEPS.SEARCH);
  const [searchCode, setSearchCode] = useState(state?.code || '');
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const qrScannerRef = useRef(null);

  // Efek kamera scanner
  useEffect(() => {
    let html5QrCode = null;
    if (showScanner) {
      setScannerError('');
      html5QrCode = new Html5Qrcode("qr-camera-reader");
      qrScannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          html5QrCode.stop().then(() => {
            setShowScanner(false);
            setSearchCode(decodedText);
            handleSearch(decodedText);
          }).catch(console.error);
        },
        () => {}
      ).catch(err => {
        setScannerError(`Tidak dapat mengakses kamera: ${err}`);
      });
    }

    return () => {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().catch(console.error);
      }
    };
  }, [showScanner]);

  // Metode & data perwakilan
  const [pickupMethod, setPickupMethod] = useState('owner');
  const [representative, setRepresentative] = useState({
    name: '', identity_number: '', phone: '', relationship: '',
    authorization_method: '', authorization_notes: ''
  });

  // Checklist verifikasi petugas
  const [checklist, setChecklist] = useState({
    card_checked: false,
    name_matched: false,
    identity_verified: false,
    items_matched: false,
    items_handed: false,
  });

  const checklistLabels = {
    card_checked: 'Kartu penitipan sudah diperiksa secara fisik',
    name_matched: 'Nama pengunjung atau perwakilan sudah dicocokkan',
    identity_verified: 'Identitas asli (KTP/kartu identitas) sudah diverifikasi',
    items_matched: 'Seluruh barang fisik sudah dicocokkan dengan data sistem',
    items_handed: 'Barang telah dipersiapkan dan siap diserahkan',
  };

  useEffect(() => {
    if (state?.code) handleSearch(state.code);
  }, []);

  const formatDT = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleSearch = async (code = searchCode) => {
    const trimmed = code?.trim();
    if (!trimmed) { setError('Masukkan kode tanda penitipan.'); return; }
    setError('');
    setLoading(true);
    try {
      if (!isConfigured) {
        await new Promise(r => setTimeout(r, 500));
        if (trimmed === 'DEP-20261110-0001' || trimmed.toLowerCase() === 'demo') {
          setTransaction({
            id: 'demo-id',
            transaction_code: 'DEP-20261110-0001',
            status: 'stored',
            checkin_at: new Date(Date.now() - 7200000).toISOString(),
            visitors: { full_name: 'Ahmad Rizki', institution: 'SMK Negeri 1', identity_number: '3374041234567890', phone: '081234567890', visit_type: 'Kunjungan Pendidikan' },
            profiles: { full_name: 'Petugas A' },
            deposit_items: [
              { name: 'Tas Ransel', quantity: 1, initial_condition: 'Baik', storage_locations: { code: 'RAK-A01', name: 'Rak A01' } },
              { name: 'Korek Api', quantity: 1, initial_condition: 'Baik', storage_locations: { code: 'RAK-A01', name: 'Rak A01' } },
            ]
          });
          setStep(PICKUP_STEPS.DETAIL);
        } else {
          setError('Transaksi tidak ditemukan. Periksa kembali kode penitipan.');
        }
        setLoading(false);
        return;
      }

      const { data, error: dbErr } = await supabase
        .from('deposit_transactions')
        .select(`
          id, transaction_code, status, checkin_at, notes,
          visitors(full_name, institution, identity_number, phone, visit_type),
          profiles!received_by(full_name),
          deposit_items(id, name, quantity, initial_condition, photo_url,
            item_categories(name),
            storage_locations(code, name)
          )
        `)
        .eq('transaction_code', trimmed)
        .maybeSingle();

      if (dbErr) throw dbErr;
      if (!data) { setError('Transaksi tidak ditemukan. Periksa kembali kode penitipan.'); return; }

      if (data.status === 'completed') {
        setError('Transaksi ini sudah SELESAI. Barang telah diambil sebelumnya dan tidak dapat diambil kembali.');
        return;
      }
      if (data.status === 'cancelled') {
        setError('Transaksi ini telah dibatalkan.');
        return;
      }
      if (data.status !== 'stored') {
        setError(`Status transaksi: ${data.status}. Tidak dapat diproses untuk pengambilan.`);
        return;
      }

      setTransaction(data);
      setStep(PICKUP_STEPS.DETAIL);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const allChecked = Object.values(checklist).every(Boolean);

  const handleConfirmPickup = async () => {
    if (!allChecked) { setError('Semua checklist verifikasi harus dicentang sebelum penyerahan.'); return; }
    if (pickupMethod === 'representative' && !representative.name.trim()) {
      setError('Nama perwakilan wajib diisi.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (!isConfigured) {
        await new Promise(r => setTimeout(r, 800));
        setStep(PICKUP_STEPS.DONE);
        setSubmitting(false);
        return;
      }

      const { data, error: rpcErr } = await supabase.rpc('rpc_complete_pickup', {
        p_transaction_id: transaction.id,
        p_released_by: user?.id,
        p_pickup_method: pickupMethod,
        p_representative_name: representative.name.trim(),
        p_representative_identity_number: representative.identity_number.trim(),
        p_representative_phone: representative.phone.trim(),
        p_representative_relationship: representative.relationship.trim(),
        p_authorization_method: representative.authorization_method,
        p_authorization_notes: representative.authorization_notes.trim(),
      });

      if (rpcErr) throw rpcErr;
      setStep(PICKUP_STEPS.DONE);
    } catch (err) {
      setError(`Gagal menyelesaikan pengambilan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(PICKUP_STEPS.SEARCH);
    setTransaction(null);
    setSearchCode('');
    setError('');
    setPickupMethod('owner');
    setRepresentative({ name: '', identity_number: '', phone: '', relationship: '', authorization_method: '', authorization_notes: '' });
    setChecklist({ card_checked: false, name_matched: false, identity_verified: false, items_matched: false, items_handed: false });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengambilan Barang</h1>
          <p className="page-subtitle">Proses validasi kartu tanda penitipan dan penyerahan barang titipan</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.125rem' }} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      {/* STEP: Search */}
      {step === PICKUP_STEPS.SEARCH && (
        <div className="card" style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div className="card-header">
            <h3 className="card-title"><Search size={18} /> Cari Transaksi Penitipan</h3>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Kode Penitipan</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="cth: DEP-20261110-0001"
                  value={searchCode}
                  onChange={e => setSearchCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  style={{ fontFamily: 'monospace', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => handleSearch()}
                  disabled={loading}
                  style={{ flexShrink: 0 }}
                >
                  {loading ? <span className="spinner spinner-sm" /> : <Search size={16} />}
                  {loading ? 'Mencari...' : 'Cari'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowScanner(true)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Camera size={16} /> Buka Kamera / Pindai QR Code
              </button>

              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                <QrCode size={14} style={{ marginRight: '0.375rem' }} />
                Arahkan kamera ke kartu tanda penitipan atau ketik kode manual di atas
              </div>
            </div>

            <div className="alert alert-info" style={{ fontSize: '0.75rem', marginTop: '1rem' }}>
              Petugas wajib mencocokkan kode penitipan dan identitas fisik pengunjung sebelum menyerahkan barang.
            </div>
          </div>
        </div>
      )}

      {/* MODAL SCANNER KAMERA */}
      {showScanner && (
        <div className="modal-overlay" onClick={() => setShowScanner(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={18} /> Pindai QR Code Kartu
              </h3>
              <button className="modal-close" onClick={() => setShowScanner(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.25rem' }}>
              <div id="qr-camera-reader" style={{ width: '100%', minHeight: '260px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }} />
              {scannerError && (
                <div className="alert alert-danger" style={{ marginTop: '1rem', fontSize: '0.8125rem' }}>
                  {scannerError}
                </div>
              )}
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '1rem', margin: 0 }}>
                Arahkan kamera ke QR Code pada kartu tanda penitipan barang.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP: Detail */}
      {step === PICKUP_STEPS.DETAIL && transaction && (
        <div style={{ maxWidth: '700px' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Detail Penitipan</h3>
                <code style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 700 }}>{transaction.transaction_code}</code>
              </div>
              <span style={{ padding: '0.3rem 0.75rem', borderRadius: '999px', backgroundColor: '#DBEAFE', color: '#2563EB', fontSize: '0.75rem', fontWeight: 700 }}>
                SEDANG DITITIPKAN
              </span>
            </div>
            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>PENGUNJUNG</p>
                <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.25rem' }}>{transaction.visitors?.full_name}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>{transaction.visitors?.institution}</p>
                {transaction.visitors?.identity_number && (
                  <p style={{ fontSize: '0.8125rem', fontFamily: 'monospace', margin: '0.25rem 0 0' }}>ID: {transaction.visitors.identity_number}</p>
                )}
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>WAKTU MASUK</p>
                <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>{formatDT(transaction.checkin_at)}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>Diterima oleh: {transaction.profiles?.full_name || '—'}</p>
              </div>
            </div>

            <div style={{ padding: '0 1.25rem 1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontWeight: 700 }}>BARANG YANG DITITIPKAN</p>
              {transaction.deposit_items?.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)', marginBottom: '0.375rem', fontSize: '0.875rem'
                }}>
                  <div>
                    <strong>{item.name}</strong>
                    <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>×{item.quantity}</span>
                    <span style={{ color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>· Kondisi: {item.initial_condition}</span>
                  </div>
                  {item.storage_locations && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                      <MapPin size={12} /> {item.storage_locations.code}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={handleReset}>Batalkan</button>
              <button className="btn btn-primary" onClick={() => setStep(PICKUP_STEPS.VERIFY)}>
                Lanjut ke Verifikasi <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP: Verify */}
      {step === PICKUP_STEPS.VERIFY && transaction && (
        <div style={{ maxWidth: '700px' }}>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title"><Users size={18} /> Metode Pengambilan</h3>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: '1 1 200px', padding: '0.75rem', border: `2px solid ${pickupMethod === 'owner' ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', backgroundColor: pickupMethod === 'owner' ? 'var(--color-primary-light, #DBEAFE)' : 'transparent' }}>
                  <input type="radio" name="pickup_method" value="owner" checked={pickupMethod === 'owner'} onChange={() => setPickupMethod('owner')} />
                  <div>
                    <p style={{ fontWeight: 600, margin: 0 }}><User size={15} /> Pemilik Langsung</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Barang diambil langsung oleh pengunjung yang menitipkan</p>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: '1 1 200px', padding: '0.75rem', border: `2px solid ${pickupMethod === 'representative' ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', backgroundColor: pickupMethod === 'representative' ? 'var(--color-primary-light, #DBEAFE)' : 'transparent' }}>
                  <input type="radio" name="pickup_method" value="representative" checked={pickupMethod === 'representative'} onChange={() => setPickupMethod('representative')} />
                  <div>
                    <p style={{ fontWeight: 600, margin: 0 }}><Users size={15} /> Perwakilan</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>Barang diambil oleh orang lain yang diberi kuasa oleh pemilik</p>
                  </div>
                </label>
              </div>

              {pickupMethod === 'representative' && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem' }}><FileText size={15} /> Data Perwakilan</p>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label required">Nama Perwakilan</label>
                      <input type="text" className="form-input" value={representative.name} onChange={e => setRepresentative(p => ({ ...p, name: e.target.value }))} placeholder="Nama lengkap perwakilan" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">No. Identitas Perwakilan</label>
                      <input type="text" className="form-input" value={representative.identity_number} onChange={e => setRepresentative(p => ({ ...p, identity_number: e.target.value }))} placeholder="KTP/SIM/dll" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Hubungan dengan Pemilik</label>
                      <input type="text" className="form-input" value={representative.relationship} onChange={e => setRepresentative(p => ({ ...p, relationship: e.target.value }))} placeholder="cth: Rekan kerja, Saudara" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Metode Otorisasi</label>
                      <select className="form-input" value={representative.authorization_method} onChange={e => setRepresentative(p => ({ ...p, authorization_method: e.target.value }))}>
                        <option value="">Pilih metode otorisasi</option>
                        <option value="surat_kuasa_tertulis">Surat Kuasa Tertulis</option>
                        <option value="konfirmasi_telepon">Konfirmasi Telepon dari Pemilik</option>
                        <option value="persetujuan_langsung">Persetujuan Langsung Pemilik</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Catatan Otorisasi</label>
                    <textarea className="form-input" rows={2} value={representative.authorization_notes} onChange={e => setRepresentative(p => ({ ...p, authorization_notes: e.target.value }))} placeholder="Catatan bukti otorisasi..." />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Checklist Verifikasi */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <h3 className="card-title"><ShieldCheck size={18} /> Checklist Validasi Pengambilan</h3>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Pastikan seluruh checklist di bawah ini sudah diperiksa oleh satpam sebelum menyerahkan barang:
              </p>
              {Object.entries(checklistLabels).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: `1px solid ${checklist[key] ? 'var(--color-success, #16A34A)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', cursor: 'pointer', backgroundColor: checklist[key] ? '#F0FDF4' : 'transparent', transition: 'all 0.15s' }}>
                  <input
                    type="checkbox"
                    checked={checklist[key]}
                    onChange={e => setChecklist(p => ({ ...p, [key]: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--color-success, #16A34A)' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: checklist[key] ? 600 : 400, color: checklist[key] ? '#16A34A' : 'var(--color-text-main)' }}>
                    {label}
                  </span>
                  {checklist[key] && <CheckCircle size={16} color="#16A34A" style={{ marginLeft: 'auto' }} />}
                </label>
              ))}
              {!allChecked && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-warning, #D97706)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <AlertCircle size={13} /> Seluruh poin pemeriksaan harus dipenuhi sebelum melanjutkan.
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(PICKUP_STEPS.DETAIL)}>← Kembali</button>
            <button
              className="btn btn-primary"
              onClick={() => {
                const err = !allChecked ? 'Selesaikan semua checklist verifikasi terlebih dahulu.' : (pickupMethod === 'representative' && !representative.name ? 'Isi data perwakilan penerima barang.' : '');
                if (err) { setError(err); return; }
                setError('');
                setStep(PICKUP_STEPS.CONFIRM);
              }}
            >
              Lanjut ke Konfirmasi <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP: Confirm */}
      {step === PICKUP_STEPS.CONFIRM && transaction && (
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><ShieldCheck size={18} /> Konfirmasi Akhir Penyerahan Barang</h3>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <div className="detail-row"><span>Kode Penitipan</span><code style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{transaction.transaction_code}</code></div>
              <div className="detail-row"><span>Pemilik Barang</span><strong>{transaction.visitors?.full_name}</strong></div>
              <div className="detail-row"><span>Instansi</span><span>{transaction.visitors?.institution}</span></div>
              <div className="detail-row"><span>Metode Pengambilan</span><span style={{ fontWeight: 600 }}>{pickupMethod === 'owner' ? '👤 Pemilik Langsung' : '👥 Perwakilan'}</span></div>
              {pickupMethod === 'representative' && (
                <>
                  <div className="detail-row"><span>Nama Perwakilan</span><strong>{representative.name}</strong></div>
                  <div className="detail-row"><span>ID Perwakilan</span><code>{representative.identity_number || '—'}</code></div>
                  <div className="detail-row"><span>Hubungan</span><span>{representative.relationship || '—'}</span></div>
                  <div className="detail-row"><span>Metode Otorisasi</span><span>{representative.authorization_method || '—'}</span></div>
                </>
              )}
              <div className="detail-row"><span>Petugas Penyerah</span><strong>{profile?.full_name || '—'}</strong></div>
              <div className="detail-row"><span>Waktu Penyerahan</span><span>{new Date().toLocaleString('id-ID')}</span></div>
              <hr />
              <strong style={{ fontSize: '0.875rem' }}>Barang yang diserahkan:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
                {transaction.deposit_items?.map((item, i) => (
                  <li key={i}>{item.name} ×{item.quantity} ({item.storage_locations?.code})</li>
                ))}
              </ul>

              <div className="alert alert-warning" style={{ marginTop: '1rem', fontSize: '0.8125rem', display: 'flex', gap: '0.5rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                Tindakan ini tidak dapat dibatalkan. Pastikan seluruh barang fisik telah diserahkan dengan benar kepada pihak yang berhak.
              </div>
            </div>
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(PICKUP_STEPS.VERIFY)}>← Kembali</button>
              <button
                className="btn btn-success"
                onClick={handleConfirmPickup}
                disabled={submitting}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {submitting ? <><span className="spinner spinner-sm" /> Memproses...</> : <><CheckCircle size={16} /> KONFIRMASI PENYERAHAN SELESAI</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP: Done */}
      {step === PICKUP_STEPS.DONE && (
        <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={40} color="#16A34A" />
          </div>
          <h2 style={{ color: '#16A34A', marginBottom: '0.5rem' }}>Pengambilan Berhasil Diselesaikan!</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Kode transaksi:</p>
          <code style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', display: 'block', marginBottom: '1.5rem' }}>
            {transaction?.transaction_code}
          </code>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Status transaksi telah diperbarui menjadi <strong>SELESAI</strong>.<br />
            Kapasitas lokasi penyimpanan telah otomatis dikembalikan ke status tersedia.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={handleReset}>
              <PackageOpen size={16} /> Proses Pengambilan Lain
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

