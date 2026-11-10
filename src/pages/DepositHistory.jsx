import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Search, Filter, Eye, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const formatDT = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const statusConfig = {
  pending: { label: 'Menunggu', color: '#D97706', bg: '#FEF3C7' },
  stored: { label: 'Dititipkan', color: '#2563EB', bg: '#DBEAFE' },
  completed: { label: 'Selesai', color: '#16A34A', bg: '#DCFCE7' },
  cancelled: { label: 'Dibatalkan', color: '#DC2626', bg: '#FEE2E2' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { label: status, color: '#6B7280', bg: '#F3F4F6' };
  return (
    <span style={{
      fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem',
      borderRadius: '999px', backgroundColor: cfg.bg, color: cfg.color,
      textTransform: 'uppercase'
    }}>
      {cfg.label}
    </span>
  );
};

export default function DepositHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selected, setSelected] = useState(null);
  const isConfigured = isSupabaseConfigured();

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (!isConfigured) {
      setTransactions([
        {
          id: '1', transaction_code: 'DEP-20261110-0001', status: 'completed',
          checkin_at: new Date(Date.now() - 86400000).toISOString(),
          checkout_at: new Date(Date.now() - 82800000).toISOString(),
          pickup_method: 'owner',
          visitors: { full_name: 'Ahmad Rizki', institution: 'SMK Negeri 1', visit_type: 'Kunjungan Pendidikan' },
          received: { full_name: 'Petugas A' },
          released: { full_name: 'Petugas B' },
          deposit_items: [{ name: 'Tas Ransel', quantity: 1 }, { name: 'Korek Api', quantity: 1 }]
        }
      ]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('deposit_transactions')
        .select(`
          id, transaction_code, status, checkin_at, checkout_at, pickup_method,
          representative_name,
          visitors(full_name, institution, visit_type),
          received:profiles!received_by(full_name),
          released:profiles!released_by(full_name),
          deposit_items(id, name, quantity, photo_url)
        `)
        .order('checkin_at', { ascending: false })
        .limit(100);

      if (filterStatus) query = query.eq('status', filterStatus);
      if (filterDate) {
        const start = new Date(filterDate);
        const end = new Date(filterDate);
        end.setDate(end.getDate() + 1);
        query = query.gte('checkin_at', start.toISOString()).lt('checkin_at', end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, filterStatus, filterDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = transactions.filter(tx => {
    if (!search) return true;
    const q = search.toLowerCase();
    return tx.transaction_code?.toLowerCase().includes(q) ||
      tx.visitors?.full_name?.toLowerCase().includes(q) ||
      tx.visitors?.institution?.toLowerCase().includes(q) ||
      tx.deposit_items?.some(i => i.name?.toLowerCase().includes(q));
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Riwayat Penitipan</h1>
          <p className="page-subtitle">{transactions.length} transaksi tercatat dalam riwayat</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Perbarui
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Cari kode, nama, atau instansi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-select-sm">
            <option value="">Semua Status</option>
            <option value="stored">Dititipkan</option>
            <option value="completed">Selesai</option>
            <option value="pending">Menunggu</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
        <div className="filter-group">
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="form-input-sm"
            title="Filter berdasarkan tanggal"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-state"><span className="spinner spinner-primary" /><p>Memuat riwayat transaksi...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <h3>Tidak ada riwayat transaksi</h3>
          <p>Belum ada data transaksi yang cocok dengan filter yang dipilih.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode Penitipan</th>
                  <th>Pengunjung</th>
                  <th>Instansi</th>
                  <th>Barang</th>
                  <th>Masuk</th>
                  <th>Keluar</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <tr key={tx.id}>
                    <td>
                      <code style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.8rem' }}>
                        {tx.transaction_code}
                      </code>
                    </td>
                    <td style={{ fontWeight: 600 }}>{tx.visitors?.full_name || '—'}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{tx.visitors?.institution || '—'}</td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {tx.deposit_items?.slice(0, 2).map(i => i.name).join(', ')}
                      {tx.deposit_items?.length > 2 && ` +${tx.deposit_items.length - 2}`}
                    </td>
                    <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{formatDT(tx.checkin_at)}</td>
                    <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{formatDT(tx.checkout_at)}</td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {tx.pickup_method === 'representative' ? '👥 Perwakilan' : '👤 Pemilik'}
                    </td>
                    <td><StatusBadge status={tx.status} /></td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelected(tx)}
                        title="Lihat detail transaksi"
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
              <h3>Detail Riwayat Transaksi</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span>Kode Penitipan</span>
                <code style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{selected.transaction_code}</code>
              </div>
              <div className="detail-row">
                <span>Status</span>
                <StatusBadge status={selected.status} />
              </div>
              <div className="detail-row">
                <span>Pengunjung</span>
                <strong>{selected.visitors?.full_name}</strong>
              </div>
              <div className="detail-row">
                <span>Instansi</span>
                <span>{selected.visitors?.institution}</span>
              </div>
              <div className="detail-row">
                <span>Jenis Kunjungan</span>
                <span>{selected.visitors?.visit_type}</span>
              </div>
              <div className="detail-row">
                <span>Waktu Masuk</span>
                <span>{formatDT(selected.checkin_at)}</span>
              </div>
              <div className="detail-row">
                <span>Waktu Keluar</span>
                <span>{formatDT(selected.checkout_at)}</span>
              </div>
              <div className="detail-row">
                <span>Metode Pengambilan</span>
                <span>{selected.pickup_method === 'representative' ? `Perwakilan (${selected.representative_name || '—'})` : 'Pemilik Langsung'}</span>
              </div>
              <div className="detail-row">
                <span>Petugas Penerima</span>
                <span>{selected.received?.full_name || '—'}</span>
              </div>
              <div className="detail-row">
                <span>Petugas Penyerah</span>
                <span>{selected.released?.full_name || '—'}</span>
              </div>
              <hr />
              <strong style={{ fontSize: '0.875rem' }}>Daftar Barang Dititipkan:</strong>
              <div className="deposit-history-items">
                {selected.deposit_items?.map((item, i) => (
                  <div className="deposit-history-item" key={item.id || i}>
                    {item.photo_url && (
                      <img
                        className="deposit-item-photo"
                        src={item.photo_url}
                        alt={`Foto ${item.name}`}
                        loading="lazy"
                      />
                    )}
                    <span>{item.name} ×{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
