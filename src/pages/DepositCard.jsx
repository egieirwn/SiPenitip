import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ArrowLeft, Shield, Package, User, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function DepositCard() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const printRef = useRef();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  const txId = state?.transaction_id;
  const txCode = state?.transaction_code;

  useEffect(() => {
    if (!txId && !txCode) {
      navigate('/dashboard');
      return;
    }

    if (!isConfigured) {
      setTransaction({
        id: 'demo-id',
        transaction_code: txCode || 'DEP-20261110-0001',
        checkin_at: new Date().toISOString(),
        visitors: { full_name: 'Ahmad Rizki', institution: 'SMK Negeri 1', visit_type: 'Kunjungan Pendidikan' },
        profiles: { full_name: 'Petugas Demo' },
        deposit_items: [
          { name: 'Tas Ransel', quantity: 1, initial_condition: 'Baik', storage_locations: { code: 'RAK-A01', name: 'Rak A01' } },
          { name: 'Korek Api', quantity: 1, initial_condition: 'Baik', storage_locations: { code: 'RAK-A01', name: 'Rak A01' } },
        ]
      });
      setLoading(false);
      return;
    }

    const fetchTx = async () => {
      let query = supabase
        .from('deposit_transactions')
        .select(`
          id, transaction_code, checkin_at, notes, status,
          visitors(full_name, institution, identity_number, visit_type),
          profiles!received_by(full_name),
          deposit_items(id, name, quantity, initial_condition, photo_url,
            item_categories(name),
            storage_locations(code, name)
          )
        `);

      if (txId) query = query.eq('id', txId);
      else query = query.eq('transaction_code', txCode);

      const { data, error } = await query.maybeSingle();
      if (error || !data) {
        navigate('/dashboard');
        return;
      }
      setTransaction(data);
      setLoading(false);
    };
    fetchTx();
  }, [txId, txCode, isConfigured, navigate]);

  const handlePrint = () => window.print();

  const formatDT = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('id-ID', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-state" style={{ minHeight: '60vh' }}>
        <span className="spinner spinner-primary" />
        <p>Memuat kartu tanda penitipan...</p>
      </div>
    );
  }

  if (!transaction) return null;

  // QR Code hanya berisi kode transaksi unik (bukan URL publik rahasia)
  const qrValue = transaction.transaction_code;

  return (
    <div className="page">
      {/* Toolbar (tidak tercetak) */}
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Kartu Tanda Penitipan</h1>
          <p className="page-subtitle">Pratinjau kartu sebelum dicetak</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Kembali
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Cetak Kartu
          </button>
        </div>
      </div>

      {/* Print hint */}
      <div className="alert alert-info no-print" style={{ marginBottom: '1.5rem', fontSize: '0.8125rem', display: 'flex', gap: '0.5rem' }}>
        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
        Pastikan printer terhubung. Klik "Cetak Kartu" untuk mencetak bukti tanda penitipan barang untuk pengunjung.
      </div>

      {/* KARTU CETAK */}
      <div className="print-area" ref={printRef}>
        <div className="deposit-card-print">
          {/* Header perusahaan */}
          <div className="card-print-header">
            <div className="card-print-logo">
              <Shield size={26} />
            </div>
            <div>
              <h1 className="card-print-company">PERUSAHAAN KITA</h1>
              <p className="card-print-system">Sistem Informasi Penitipan Barang Pengunjung</p>
            </div>
          </div>

          <div className="card-print-title">KARTU TANDA PENITIPAN BARANG</div>

          {/* Body kartu */}
          <div className="card-print-body">
            {/* Kode & QR */}
            <div className="card-print-code-section">
              <div>
                <p className="card-print-code-label">KODE PENITIPAN</p>
                <p className="card-print-code">{transaction.transaction_code}</p>
                <p className="card-print-time">
                  <Clock size={11} /> {formatDT(transaction.checkin_at)}
                </p>
              </div>
              <div className="card-print-qr">
                <QRCodeSVG
                  value={qrValue}
                  size={90}
                  level="M"
                  includeMargin={true}
                />
              </div>
            </div>

            <hr className="card-print-divider" />

            {/* Identitas pengunjung */}
            <div className="card-print-section">
              <p className="card-print-section-title"><User size={12} /> IDENTITAS PENGUNJUNG</p>
              <table className="card-print-table">
                <tbody>
                  <tr>
                    <td className="card-print-label">Nama</td>
                    <td className="card-print-colon">:</td>
                    <td className="card-print-value"><strong>{transaction.visitors?.full_name}</strong></td>
                  </tr>
                  <tr>
                    <td className="card-print-label">Instansi</td>
                    <td className="card-print-colon">:</td>
                    <td className="card-print-value">{transaction.visitors?.institution}</td>
                  </tr>
                  <tr>
                    <td className="card-print-label">Keperluan</td>
                    <td className="card-print-colon">:</td>
                    <td className="card-print-value">{transaction.visitors?.visit_type}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <hr className="card-print-divider" />

            {/* Daftar barang */}
            <div className="card-print-section">
              <p className="card-print-section-title"><Package size={12} /> DAFTAR BARANG DITITIPKAN</p>
              <table className="card-print-items-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Barang</th>
                    <th>Jml</th>
                    <th>Kondisi</th>
                    <th>Lokasi</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.deposit_items?.map((item, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{item.name}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td>{item.initial_condition}</td>
                      <td>{item.storage_locations?.code || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <hr className="card-print-divider" />

            {/* Footer info */}
            <div className="card-print-footer-info">
              <div>
                <p className="card-print-officer">Petugas Penerima: <strong>{transaction.profiles?.full_name || '—'}</strong></p>
              </div>
              <div className="card-print-warning">
                <AlertTriangle size={12} />
                <span>Wajib mengembalikan kartu ini saat pengambilan barang. Barang hanya diserahkan setelah verifikasi kartu dan identitas.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card no-print" style={{ maxWidth: '760px', margin: '1.5rem auto 0' }}>
        <div className="card-header">
          <h3 className="card-title">Foto Barang</h3>
        </div>
        <div className="deposit-card-photos">
          {transaction.deposit_items?.filter(item => item.photo_url).length ? (
            transaction.deposit_items.filter(item => item.photo_url).map((item, i) => (
              <figure className="deposit-card-photo" key={item.id || i}>
                <img src={item.photo_url} alt={`Foto ${item.name}`} loading="lazy" />
                <figcaption>{item.name}</figcaption>
              </figure>
            ))
          ) : (
            <p className="deposit-card-photos-empty">Belum ada foto barang pada transaksi ini.</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="no-print" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer size={16} /> Cetak Kartu
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/penitipan-baru')}>
          + Penitipan Baru
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/barang-dititipkan')}>
          Lihat Barang Dititipkan
        </button>
      </div>
    </div>
  );
}
