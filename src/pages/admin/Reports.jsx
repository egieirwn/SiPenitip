import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, RefreshCw, Calendar, TrendingUp, Users, Package, PackageOpen } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export default function Reports() {
  const [period, setPeriod] = useState('today');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    if (!isConfigured) {
      setStats({
        total_deposits: 45, total_completed: 38, total_active: 7, total_cancelled: 0,
        total_visitors: 42, total_items: 67, by_category: [
          { name: 'Tas dan Koper', count: 28 }, { name: 'Rokok dan Korek Api', count: 15 },
          { name: 'Perangkat Elektronik', count: 12 }, { name: 'Lainnya', count: 12 }
        ],
        by_visit_type: [
          { name: 'Kunjungan Industri', count: 20 }, { name: 'Tamu Perusahaan', count: 15 },
          { name: 'Kunjungan Kerja', count: 10 }
        ],
        by_method: [{ method: 'owner', count: 35 }, { method: 'representative', count: 3 }]
      });
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      let startDate;
      if (period === 'today') { startDate = new Date(now); startDate.setHours(0,0,0,0); }
      else if (period === 'week') { startDate = new Date(now); startDate.setDate(now.getDate() - 7); }
      else if (period === 'month') { startDate = new Date(now); startDate.setDate(1); startDate.setHours(0,0,0,0); }
      else { startDate = new Date(now.getFullYear(), 0, 1); }

      const startISO = startDate.toISOString();

      const [
        { count: total_deposits },
        { count: total_completed },
        { count: total_active },
        { count: total_cancelled },
      ] = await Promise.all([
        supabase.from('deposit_transactions').select('*', { count: 'exact', head: true }).gte('checkin_at', startISO),
        supabase.from('deposit_transactions').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('checkin_at', startISO),
        supabase.from('deposit_transactions').select('*', { count: 'exact', head: true }).eq('status', 'stored').gte('checkin_at', startISO),
        supabase.from('deposit_transactions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled').gte('checkin_at', startISO),
      ]);

      const { data: visitorData } = await supabase.from('deposit_transactions').select('visitor_id').gte('checkin_at', startISO);
      const total_visitors = new Set(visitorData?.map(d => d.visitor_id) || []).size;

      const { count: total_items } = await supabase
        .from('deposit_items')
        .select('deposit_transactions!inner(checkin_at)', { count: 'exact', head: true })
        .gte('deposit_transactions.checkin_at', startISO);

      setStats({ total_deposits: total_deposits || 0, total_completed: total_completed || 0, total_active: total_active || 0, total_cancelled: total_cancelled || 0, total_visitors, total_items: total_items || 0, by_category: [], by_visit_type: [], by_method: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, period]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const periodLabels = { today: 'Hari Ini', week: '7 Hari Terakhir', month: 'Bulan Ini', year: 'Tahun Ini' };

  const StatCard = ({ label, value, icon: Icon, color = '#2563EB', bg = '#DBEAFE' }) => (
    <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-main)', margin: '0 0 0.125rem' }}>{value ?? '—'}</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>{label}</p>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Penitipan</h1>
          <p className="page-subtitle">Statistik dan ringkasan aktivitas operasional penitipan barang</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select className="form-select-sm" value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
          </select>
          <button className="btn btn-secondary" onClick={fetchStats} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /></button>
        </div>
      </div>

      <div style={{ padding: '0.5rem 0 1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Calendar size={15} /> Periode: <strong>{periodLabels[period]}</strong>
      </div>

      {loading ? (
        <div className="loading-state"><span className="spinner spinner-primary" /><p>Memuat laporan...</p></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard label="Total Penitipan" value={stats?.total_deposits} icon={TrendingUp} color="#2563EB" bg="#DBEAFE" />
            <StatCard label="Selesai (Diambil)" value={stats?.total_completed} icon={PackageOpen} color="#16A34A" bg="#DCFCE7" />
            <StatCard label="Masih Dititipkan" value={stats?.total_active} icon={Package} color="#D97706" bg="#FEF3C7" />
            <StatCard label="Total Pengunjung" value={stats?.total_visitors} icon={Users} color="#7C3AED" bg="#EDE9FE" />
            <StatCard label="Total Barang" value={stats?.total_items} icon={Package} color="#0891B2" bg="#CFFAFE" />
            <StatCard label="Dibatalkan" value={stats?.total_cancelled} icon={Package} color="#DC2626" bg="#FEE2E2" />
          </div>

          {stats?.by_category?.length > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-header"><h3 className="card-title"><BarChart3 size={18} /> Barang per Kategori</h3></div>
              <div style={{ padding: '1.25rem' }}>
                {stats.by_category.map((item, i) => (
                  <div key={i} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      <span>{item.name}</span><strong>{item.count}</strong>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((item.count / (stats.total_items || 1)) * 100)}%`, backgroundColor: 'var(--color-primary)', borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="alert alert-info" style={{ fontSize: '0.8125rem', display: 'flex', gap: '0.5rem' }}>
            <Download size={16} style={{ flexShrink: 0 }} />
            Gunakan fitur cetak peramban (Ctrl+P) untuk menyimpan atau mengekspor laporan ke dokumen PDF.
          </div>
        </>
      )}
    </div>
  );
}

