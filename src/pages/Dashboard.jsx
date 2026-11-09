import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackagePlus, Archive, PackageOpen, Users, Clock,
  MapPin, TrendingUp, RefreshCw, AlertCircle, CheckCircle,
  ArrowRight
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ label, value, icon: Icon, color = 'primary', action, onClick }) => (
  <div
    className={`stat-card stat-card-${color}`}
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
  >
    <div className="stat-icon">
      <Icon size={22} />
    </div>
    <div className="stat-info">
      <span className="stat-value">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
    </div>
    {action && (
      <div className="stat-action">
        <ArrowRight size={16} />
      </div>
    )}
  </div>
);

const formatTime = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const isConfigured = isSupabaseConfigured();

  const fetchStats = useCallback(async () => {
    if (!isConfigured) {
      // Mock data untuk mode offline / demo
      setStats({
        totalHariIni: 12,
        sedangDititipkan: 8,
        diambilHariIni: 4,
        pengunjungHariIni: 11,
        belumSelesai: 8,
        lokasiTersedia: 23
      });
      setRecentTransactions([
        { id: '1', transaction_code: 'DEP-20261110-0001', visitors: { full_name: 'Ahmad Rizki', institution: 'SMK Negeri 1' }, status: 'stored', checkin_at: new Date().toISOString(), deposit_items: [{ name: 'Tas Ransel' }, { name: 'Korek Api' }] },
        { id: '2', transaction_code: 'DEP-20261110-0002', visitors: { full_name: 'Budi Santoso', institution: 'PT Maju Bersama' }, status: 'completed', checkin_at: new Date(Date.now() - 3600000).toISOString(), deposit_items: [{ name: 'Koper' }] },
      ]);
      setLoading(false);
      setLastUpdated(new Date());
      return;
    }

    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [
        { count: totalHariIni },
        { count: sedangDititipkan },
        { count: diambilHariIni },
        { count: belumSelesai },
        { count: lokasiTersedia }
      ] = await Promise.all([
        supabase.from('deposit_transactions').select('*', { count: 'exact', head: true }).gte('checkin_at', todayISO),
        supabase.from('deposit_transactions').select('*', { count: 'exact', head: true }).eq('status', 'stored'),
        supabase.from('deposit_transactions').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('checkout_at', todayISO),
        supabase.from('deposit_transactions').select('*', { count: 'exact', head: true }).in('status', ['pending', 'stored']),
        supabase.from('storage_locations').select('*', { count: 'exact', head: true }).eq('status', 'available').eq('is_active', true),
      ]);

      const { data: visitorData } = await supabase
        .from('deposit_transactions')
        .select('visitor_id')
        .gte('checkin_at', todayISO);
      const uniqueVisitors = new Set(visitorData?.map(d => d.visitor_id) || []).size;

      setStats({
        totalHariIni: totalHariIni || 0,
        sedangDititipkan: sedangDititipkan || 0,
        diambilHariIni: diambilHariIni || 0,
        pengunjungHariIni: uniqueVisitors,
        belumSelesai: belumSelesai || 0,
        lokasiTersedia: lokasiTersedia || 0
      });

      const { data: recent } = await supabase
        .from('deposit_transactions')
        .select(`
          id, transaction_code, status, checkin_at, checkout_at,
          visitors(full_name, institution),
          deposit_items(name, quantity)
        `)
        .order('checkin_at', { ascending: false })
        .limit(8);

      setRecentTransactions(recent || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const statusBadge = (status) => {
    const map = {
      pending: { label: 'Menunggu', color: '#D97706', bg: '#FEF3C7' },
      stored: { label: 'Dititipkan', color: '#2563EB', bg: '#DBEAFE' },
      completed: { label: 'Selesai', color: '#16A34A', bg: '#DCFCE7' },
      cancelled: { label: 'Dibatalkan', color: '#DC2626', bg: '#FEE2E2' },
    };
    const s = map[status] || { label: status, color: '#6B7280', bg: '#F3F4F6' };
    return (
      <span style={{
        fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem',
        borderRadius: '999px', backgroundColor: s.bg, color: s.color,
        textTransform: 'uppercase', letterSpacing: '0.03em'
      }}>
        {s.label}
      </span>
    );
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat pagi';
    if (h < 17) return 'Selamat siang';
    return 'Selamat malam';
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {greeting()}, <strong>{profile?.full_name || 'Petugas'}</strong>.{' '}
            {lastUpdated && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Terakhir diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchStats}
            disabled={loading}
            title="Perbarui data"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Perbarui
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/penitipan-baru')}
          >
            <PackagePlus size={16} />
            Penitipan Baru
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard
          label="Penitipan Hari Ini"
          value={stats?.totalHariIni}
          icon={PackagePlus}
          color="primary"
          onClick={() => navigate('/riwayat')}
        />
        <StatCard
          label="Sedang Dititipkan"
          value={stats?.sedangDititipkan}
          icon={Archive}
          color="warning"
          onClick={() => navigate('/barang-dititipkan')}
        />
        <StatCard
          label="Diambil Hari Ini"
          value={stats?.diambilHariIni}
          icon={PackageOpen}
          color="success"
        />
        <StatCard
          label="Pengunjung Hari Ini"
          value={stats?.pengunjungHariIni}
          icon={Users}
          color="info"
          onClick={() => navigate('/pengunjung')}
        />
        <StatCard
          label="Belum Selesai"
          value={stats?.belumSelesai}
          icon={Clock}
          color={stats?.belumSelesai > 0 ? 'danger' : 'muted'}
          onClick={() => navigate('/barang-dititipkan')}
        />
        <StatCard
          label="Lokasi Tersedia"
          value={stats?.lokasiTersedia}
          icon={MapPin}
          color="success"
        />
      </div>

      {/* Recent Transactions Table */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">
            <TrendingUp size={18} />
            Transaksi Terbaru
          </h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/riwayat')}
          >
            Lihat Semua <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <span className="spinner spinner-primary" />
            <p>Memuat data...</p>
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="empty-state">
            <Archive size={40} />
            <p>Belum ada transaksi hari ini</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/penitipan-baru')}>
              <PackagePlus size={14} /> Buat Penitipan Baru
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode Penitipan</th>
                  <th>Pengunjung</th>
                  <th>Instansi</th>
                  <th>Barang</th>
                  <th>Waktu Masuk</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map(tx => (
                  <tr key={tx.id}>
                    <td>
                      <code style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {tx.transaction_code}
                      </code>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {tx.visitors?.full_name || '—'}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {tx.visitors?.institution || '—'}
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {tx.deposit_items?.slice(0, 2).map(item => item.name).join(', ')}
                      {tx.deposit_items?.length > 2 && ` +${tx.deposit_items.length - 2} lainnya`}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {formatTime(tx.checkin_at)}
                    </td>
                    <td>{statusBadge(tx.status)}</td>
                    <td>
                      {tx.status === 'stored' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate('/pengambilan', { state: { code: tx.transaction_code } })}
                        >
                          <PackageOpen size={13} /> Ambil
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
