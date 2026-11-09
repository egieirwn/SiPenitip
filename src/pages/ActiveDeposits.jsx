import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Search, PackageOpen, RefreshCw, Filter, MapPin, Clock, User } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const formatTime = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};

const getDuration = (checkinAt) => {
  if (!checkinAt) return '—';
  const diff = Date.now() - new Date(checkinAt).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes} menit`;
};

export default function ActiveDeposits() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [locations, setLocations] = useState([]);

  const isConfigured = isSupabaseConfigured();

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (!isConfigured) {
      setTransactions([
        {
          id: '1', transaction_code: 'DEP-20261110-0001', checkin_at: new Date(Date.now() - 7200000).toISOString(),
          visitors: { full_name: 'Ahmad Rizki', institution: 'SMK Negeri 1' },
          profiles: { full_name: 'Petugas A' },
          deposit_items: [
            { name: 'Tas Ransel', quantity: 1, storage_locations: { code: 'RAK-A01', name: 'Rak A01' } },
            { name: 'Korek Api', quantity: 1, storage_locations: { code: 'RAK-A01', name: 'Rak A01' } }
          ]
        }
      ]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('deposit_transactions')
        .select(`
          id, transaction_code, checkin_at, notes, status,
          visitors(full_name, institution, identity_number, phone),
          profiles!received_by(full_name),
          deposit_items(id, name, quantity, initial_condition, photo_url,
            item_categories(name),
            storage_locations(id, code, name)
          )
        `)
        .eq('status', 'stored')
        .order('checkin_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);

      const { data: locs } = await supabase
        .from('storage_locations')
        .select('id, code, name')
        .eq('is_active', true)
        .order('code');
      setLocations(locs || []);
    } catch (err) {
      console.error('Error fetching active deposits:', err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = transactions.filter(tx => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      tx.transaction_code?.toLowerCase().includes(q) ||
      tx.visitors?.full_name?.toLowerCase().includes(q) ||
      tx.deposit_items?.some(item => item.name?.toLowerCase().includes(q));
    const matchLoc = !filterLocation ||
      tx.deposit_items?.some(item => item.storage_locations?.id === filterLocation);
    return matchSearch && matchLoc;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Barang Dititipkan</h1>
          <p className="page-subtitle">{transactions.length} transaksi penitipan yang sedang aktif saat ini</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Perbarui
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/penitipan-baru')}>
            + Penitipan Baru
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Cari kode penitipan, nama pengunjung, atau nama barang..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select
            value={filterLocation}
            onChange={e => setFilterLocation(e.target.value)}
            className="form-select-sm"
          >
            <option value="">Semua Lokasi</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.code} — {loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          <span className="spinner spinner-primary" />
          <p>Memuat barang yang dititipkan...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Archive size={48} />
          <h3>{search ? 'Tidak ditemukan' : 'Tidak ada barang yang sedang dititipkan'}</h3>
          <p>{search ? 'Coba ubah kata kunci pencarian.' : 'Semua barang titipan telah diambil oleh pengunjung.'}</p>
        </div>
      ) : (
        <div className="deposit-cards-grid">
          {filtered.map(tx => (
            <div key={tx.id} className="deposit-card">
              <div className="deposit-card-header">
                <code className="tx-code">{tx.transaction_code}</code>
                <span className="badge badge-stored">Dititipkan</span>
              </div>

              <div className="deposit-card-visitor">
                <User size={15} />
                <div>
                  <p className="visitor-name">{tx.visitors?.full_name}</p>
                  <p className="visitor-institution">{tx.visitors?.institution}</p>
                </div>
              </div>

              <div className="deposit-card-meta">
                <span><Clock size={13} /> {formatTime(tx.checkin_at)} ({getDuration(tx.checkin_at)})</span>
              </div>

              <div className="deposit-card-items">
                {tx.deposit_items?.map((item, i) => (
                  <div key={i} className="item-row">
                    <span className="item-name">{item.name}</span>
                    <span className="item-qty">×{item.quantity}</span>
                    {item.storage_locations && (
                      <span className="item-loc">
                        <MapPin size={11} /> {item.storage_locations.code}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="deposit-card-footer">
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Diterima: {tx.profiles?.full_name || '—'}
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/pengambilan', { state: { code: tx.transaction_code } })}
                >
                  <PackageOpen size={14} /> Proses Ambil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

