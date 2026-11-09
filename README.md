# SiPenitip - Sistem Informasi Penitipan Barang Pengunjung Perusahaan

> **Sistem Manajemen & Pelacakan Penitipan Barang Pengunjung Berskala Perusahaan**  
> Terintegrasi langsung dengan **Supabase PostgreSQL**, **Supabase Auth**, **Row Level Security (RLS)**, dan **Stored Procedures / RPC Functions**.

Aplikasi web modern berbasis **React 19 + Vite 6 + Supabase** yang dirancang khusus untuk memfasilitasi petugas keamanan (satpam) perusahaan dalam mencatat identitas pengunjung, mendata barang bawaan yang dilarang masuk ke area perusahaan, mencetak kartu tanda penitipan ber-QR Code, mengelola lokasi penyimpanan (rak & loker), serta memvalidasi penyerahan barang (baik oleh pemilik langsung maupun perwakilan berkuasa) secara cepat, aman, dan dapat diaudit.

---

## 🏛️ Fitur Utama Sistem

1. **Dashboard Pemantauan Operasional**:
   - Statistik real-time transaksi penitipan harian, barang yang sedang dititipkan, barang yang telah diambil, dan lokasi penyimpanan tersedia.
   - Tabel transaksi terkini dengan pembaruan otomatis setiap menit.
2. **Pencatatan Penitipan Baru (Form 2 Bagian)**:
   - **Bagian 1: Identitas Pengunjung** (nama lengkap, asal instansi/perusahaan, jenis kunjungan, nomor identitas, dan telepon).
   - **Bagian 2: Data Barang** (mendukung multi-item dalam satu transaksi, kategori barang, jumlah, kondisi fisik awal, foto dokumentasi, dan penetapan rak/loker).
3. **Kartu Tanda Penitipan Siap Cetak (*Printable*)**:
   - Format standar perusahaan dengan kode transaksi unik `DEP-YYYYMMDD-XXXX`.
   - Dilengkapi QR Code untuk pencarian transaksi cepat.
   - Desain print-friendly tanpa elemen navbar atau sidebar dashboard.
4. **Alur Pengambilan Barang Lengkap & Aman**:
   - **Pengambilan oleh Pemilik**: Validasi kartu, identitas asli, dan pencocokan kondisi fisik barang.
   - **Pengambilan oleh Perwakilan**: Pencatatan identitas perwakilan, jenis bukti kuasa (surat kuasa tertulis, digital, telepon, persetujuan langsung), masa berlaku, dan checklist otorisasi wajib.
   - Transaksi diselesaikan secara atomik via RPC function PostgreSQL dan mencegah klaim ganda (*double-pickup*).
5. **Manajemen Data & Master (Administrator)**:
   - Kelola kategori barang bawaan terlarang.
   - Kelola lokasi penyimpanan (rak dan loker) beserta kapasitas otomatis.
   - Kelola data petugas keamanan (satpam & admin) dan shift kerja.
   - Laporan operasional periodik (harian, mingguan, bulanan, tahunan).

---

## 🗄️ Skema Database Supabase

Seluruh migrasi database tersimpan di:  
[`supabase/migration_penitipan_barang.sql`](supabase/migration_penitipan_barang.sql)

Jalankan skrip tersebut pada **Supabase SQL Editor** untuk menyiapkan tabel,
bucket foto publik `deposit-items`, dan kebijakan unggah khusus petugas.

### Entitas Tabel Utama:
1. `profiles`: Menyimpan data akun satpam dan admin (terhubung ke `auth.users`).
2. `visitors`: Direktori identitas pengunjung dan frekuensi kunjungan.
3. `item_categories`: Master kategori barang bawaan pengunjung.
4. `storage_locations`: Data rak dan loker penyimpanan barang.
5. `deposit_transactions`: Transaksi penitipan utama (`pending`, `stored`, `completed`, `cancelled`).
6. `deposit_items`: Rincian barang dalam setiap transaksi penitipan.
7. `pickup_authorizations`: Bukti kuasa pengambilan jika barang diambil oleh perwakilan.
8. `transaction_logs`: Catatan riwayat audit setiap perubahan status transaksi.

---

## 🚀 Panduan Memulai Cepat

### 1. Prasyarat
- Node.js versi 18+ atau 20+
- Akun Supabase (opsional jika ingin menggunakan demo luring)

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi variabel berikut dengan kredensial Supabase Anda:
```env
VITE_SUPABASE_URL=https://proyek-anda.supabase.co
VITE_SUPABASE_ANON_KEY=kunci-anon-anda
```
*(Catatan: Jika Supabase belum dikonfigurasi, sistem otomatis berjalan dalam Mode Demo).*

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Akses aplikasi melalui peramban di `http://localhost:5173`.

### 5. Membangun untuk Produksi
```bash
npm run build
```
Hasil build produksi siap di-deploy pada folder `dist/`.

---

## 🔒 Kebijakan Hak Akses (Role-Based Access Control)

- **Petugas Keamanan (Satpam)**:
  - Melihat dashboard operasional.
  - Mendaftarkan penitipan baru & mencetak kartu tanda penitipan.
  - Memantau barang yang sedang dititipkan.
  - Memproses validasi dan konfirmasi pengambilan barang (pemilik / perwakilan).
  - Melihat direktori data pengunjung dan riwayat transaksi.
- **Administrator**:
  - Seluruh hak akses satpam.
  - Mengelola master kategori barang dan lokasi penyimpanan.
  - Mengelola data petugas keamanan dan shift kerja.
  - Mengakses laporan operasional periodik.
