import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PackagePlus, Archive, PackageOpen,
  Users, ClipboardList, Tag, MapPin, UserCog,
  BarChart3, Settings, User, ChevronDown, ChevronRight,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NavSection = ({ label, children }) => (
  <div className="nav-section">
    <span className="nav-section-label">{label}</span>
    {children}
  </div>
);

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </NavLink>
);

export default function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`} aria-label="Navigasi utama">
      <div className="sidebar-logo">
        <div className="logo-badge">
          <Shield size={18} />
        </div>
        {!collapsed && (
          <div className="logo-text">
            <h2>SiPenitip</h2>
            <span>Sistem Penitipan Barang</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <NavSection label="Overview">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        </NavSection>

        <NavSection label="Operasional">
          <NavItem to="/penitipan-baru" icon={PackagePlus} label="Penitipan Baru" />
          <NavItem to="/barang-dititipkan" icon={Archive} label="Barang Dititipkan" />
          <NavItem to="/pengambilan" icon={PackageOpen} label="Pengambilan Barang" />
        </NavSection>

        <NavSection label="Data">
          <NavItem to="/pengunjung" icon={Users} label="Data Pengunjung" />
          <NavItem to="/riwayat" icon={ClipboardList} label="Riwayat Penitipan" />
        </NavSection>

        {isAdmin && (
          <>
            <NavSection label="Manajemen">
              <NavItem to="/kategori-barang" icon={Tag} label="Kategori Barang" />
              <NavItem to="/lokasi-penyimpanan" icon={MapPin} label="Lokasi Penyimpanan" />
              <NavItem to="/manajemen-petugas" icon={UserCog} label="Manajemen Petugas" />
            </NavSection>

            <NavSection label="Pelaporan">
              <NavItem to="/laporan" icon={BarChart3} label="Laporan Penitipan" />
            </NavSection>
          </>
        )}

        <NavSection label="Pengaturan">
          <NavItem to="/profil" icon={User} label="Profil Saya" />
          {isAdmin && <NavItem to="/pengaturan" icon={Settings} label="Pengaturan Sistem" />}
        </NavSection>
      </nav>

      <div className="sidebar-user-info">
        <div className="user-avatar-sm">
          {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="user-meta-sm">
          <p className="user-name-sm">{profile?.full_name || 'Pengguna'}</p>
          <span className={`role-badge role-${profile?.role}`}>
            {profile?.role === 'admin' ? 'Administrator' : 'Petugas Keamanan'}
          </span>
        </div>
      </div>
    </aside>
  );
}
