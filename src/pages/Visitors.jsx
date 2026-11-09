import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Eye, RefreshCw, Building2, Phone, Hash } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [visitorHistory, setVisitorHistory] = useState([]);
  const isConfigured = isSupabaseConfigured();

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (!isConfigured) {
      setVisitors([
        {
          id: '1', full_name: 'Ahmad Rizki', institution: 'SMK Negeri 1',
          visit_type: 'Kunjungan Pendidikan', identity_number: '3374041234567890',
          phone: '081234567890', visit_count: 3, created_at: new Date().toISOString()
        },
        {
          id: '2', full_name: 'Budi Santoso', institution: 'PT Maju Bersama',
          visit_type: 'Kunjungan Kerja', identity_number: '3171012345678901',
          phone: '081398765432', visit_count: 1, created_at: new Date().toISOString()
        }
      ]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('visitors')
        .select('*')
        .order('full_name', { ascending: true });
      setVisitors(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleViewDetail = async (visitor) => {
    setSelected(visitor);
    if (!isConfigured) {
      setVisitorHistory([
        { transaction_code: 'DEP-20261110-0001', status: 'completed', checkin_at: new Date().toISOString(), deposit_items: [{ name: 'Tas Ransel' }] }
      ]);
      return;
    }
    try {
      const { data } = await supabase
        .from('deposit_transactions')
        .select('transaction_code, status, checkin_at, checkout_at, deposit_items(name, quantity)')
        .eq('visitor_id', visitor.id)
        .order('checkin_at', { ascending: false });
      setVisitorHistory(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = visitors.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.full_name?.toLowerCase().includes(q) ||
      v.institution?.toLowerCase().includes(q) ||
      v.identity_number?.includes(q);
  });

  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Data Pengunjung</h1>
          <p className="page-subtitle">{visitors.length} pengunjung terdaftar dalam sistem</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Perbarui
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Cari nama, instansi, atau nomor identitas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><span className="spinner spinner-primary" /><p>Memuat data pengunjung...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>Tidak ada data pengunjung</h3>
          <p>Pengunjung baru akan otomatis tercatat saat membuat penitipan barang.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Lengkap</th>
                  <th>Instansi</th>
                  <th>Jenis Kunjungan</th>
                  <th>No. Identitas</th>
                  <th>Telepon</th>
                  <th>Kunjungan</th>
                  <th>Terdaftar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          backgroundColor: 'var(--color-primary-light, #DBEAFE)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0
                        }}>
                          {v.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        {v.full_name}
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Building2 size={13} /> {v.institution || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>{v.visit_type || '—'}</td>
                    <td style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                      {v.identity_number || '—'}
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {v.phone ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Phone size={13} /> {v.phone}</div> : '—'}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                        borderRadius: '999px', backgroundColor: 'var(--color-primary-light, #DBEAFE)',
                        color: 'var(--color-primary)'
                      }}>
                        {v.visit_count}×
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{formatDate(v.created_at)}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleViewDetail(v)}
                        title="Lihat detail riwayat"
                      >
                        <Eye size={14} /> Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3>Riwayat Pengunjung</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light, #DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {selected.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>{selected.full_name}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>{selected.institution} · {selected.visit_type}</p>
                </div>
              </div>
              <div className="detail-row"><span>No. Identitas</span><code>{selected.identity_number || '—'}</code></div>
              <div className="detail-row"><span>Telepon</span><span>{selected.phone || '—'}</span></div>
              <div className="detail-row"><span>Total Kunjungan</span><span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{selected.visit_count}×</span></div>
              <hr />
              <strong style={{ fontSize: '0.875rem' }}>Riwayat Transaksi Penitipan:</strong>
              {visitorHistory.length === 0 ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Belum ada riwayat penitipan.</p>
              ) : (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {visitorHistory.map((tx, i) => (
                    <div key={i} style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <code style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{tx.transaction_code}</code>
                        <span style={{
                          fontSize: '0.6875rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                          borderRadius: '999px',
                          backgroundColor: tx.status === 'completed' ? '#DCFCE7' : '#DBEAFE',
                          color: tx.status === 'completed' ? '#16A34A' : '#2563EB'
                        }}>{tx.status === 'completed' ? 'Selesai' : 'Aktif'}</span>
                      </div>
                      <p style={{ color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
                        {tx.deposit_items?.map(item => item.name).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

