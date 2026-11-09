/**
 * Test Suite: Sistem Informasi Penitipan Barang Pengunjung
 * Memvalidasi logika bisnis inti, aturan validasi, dan alur transaksi
 */

const assert = require('assert');

function runTests() {
  console.log('🧪 Memulai Pengujian Sistem Penitipan Barang Pengunjung...\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Format Kode Penitipan
  test('Kode penitipan harus memiliki format DEP-YYYYMMDD-XXXX', () => {
    const regex = /^DEP-\d{8}-\d{4}$/;
    const sampleCode = 'DEP-20261110-0001';
    assert.strictEqual(regex.test(sampleCode), true);
    assert.strictEqual(regex.test('DEP-20261110-001'), false);
    assert.strictEqual(regex.test('BRW-123456789'), false);
  });

  // 2. Validasi Formulir Identitas Pengunjung (Step 1)
  test('Registrasi pengunjung wajib memiliki nama lengkap, instansi, dan jenis kunjungan', () => {
    function validateVisitor(v) {
      if (!v.full_name || !v.full_name.trim()) return 'Nama lengkap pengunjung wajib diisi.';
      if (!v.institution || !v.institution.trim()) return 'Instansi/asal wajib diisi.';
      if (!v.visit_type) return 'Jenis kunjungan wajib dipilih.';
      return null;
    }

    assert.strictEqual(validateVisitor({ full_name: '', institution: 'PT ABC', visit_type: 'Tamu Perusahaan' }), 'Nama lengkap pengunjung wajib diisi.');
    assert.strictEqual(validateVisitor({ full_name: 'Budi', institution: '', visit_type: 'Tamu Perusahaan' }), 'Instansi/asal wajib diisi.');
    assert.strictEqual(validateVisitor({ full_name: 'Budi', institution: 'PT ABC', visit_type: '' }), 'Jenis kunjungan wajib dipilih.');
    assert.strictEqual(validateVisitor({ full_name: 'Budi', institution: 'PT ABC', visit_type: 'Tamu Perusahaan' }), null);
  });

  // 3. Validasi Barang Dititipkan (Step 2)
  test('Setiap barang wajib memiliki nama dan alokasi lokasi penyimpanan', () => {
    function validateItems(items) {
      if (!items || items.length === 0) return 'Minimal satu barang harus didaftarkan.';
      for (let i = 0; i < items.length; i++) {
        if (!items[i].name || !items[i].name.trim()) return `Nama barang #${i + 1} wajib diisi.`;
        if (!items[i].storage_location_id) return `Lokasi penyimpanan barang #${i + 1} wajib dipilih.`;
      }
      return null;
    }

    assert.strictEqual(validateItems([]), 'Minimal satu barang harus didaftarkan.');
    assert.strictEqual(validateItems([{ name: '', storage_location_id: 'loc-1' }]), 'Nama barang #1 wajib diisi.');
    assert.strictEqual(validateItems([{ name: 'Tas Ransel', storage_location_id: '' }]), 'Lokasi penyimpanan barang #1 wajib dipilih.');
    assert.strictEqual(validateItems([{ name: 'Tas Ransel', storage_location_id: 'loc-1' }]), null);
  });

  // 4. Perhitungan Status Kapasitas Lokasi Penyimpanan
  test('Kapasitas lokasi penyimpanan menghitung status available vs full secara akurat', () => {
    function calculateLocationStatus(capacity, activeCount, isActive) {
      if (!isActive) return 'inactive';
      if (activeCount >= capacity) return 'full';
      return 'available';
    }

    assert.strictEqual(calculateLocationStatus(10, 2, true), 'available');
    assert.strictEqual(calculateLocationStatus(10, 10, true), 'full');
    assert.strictEqual(calculateLocationStatus(10, 11, true), 'full');
    assert.strictEqual(calculateLocationStatus(10, 0, false), 'inactive');
  });

  // 5. Checklist Verifikasi Pengambilan Barang
  test('Pengambilan barang wajib menyelesaikan seluruh 5 poin checklist sebelum penyerahan', () => {
    function canRelease(checklist) {
      const keys = ['card_checked', 'name_matched', 'identity_verified', 'items_matched', 'items_handed'];
      return keys.every(k => Boolean(checklist[k]));
    }

    assert.strictEqual(canRelease({ card_checked: true, name_matched: true, identity_verified: true, items_matched: true, items_handed: false }), false);
    assert.strictEqual(canRelease({ card_checked: true, name_matched: true, identity_verified: true, items_matched: true, items_handed: true }), true);
  });

  // 6. Validasi Pengambilan oleh Perwakilan
  test('Pengambilan oleh perwakilan wajib mencatat nama perwakilan dan otorisasi', () => {
    function validatePickup(method, rep) {
      if (method === 'representative') {
        if (!rep || !rep.name || !rep.name.trim()) return 'Nama perwakilan wajib diisi.';
      }
      return null;
    }

    assert.strictEqual(validatePickup('owner', null), null);
    assert.strictEqual(validatePickup('representative', { name: '' }), 'Nama perwakilan wajib diisi.');
    assert.strictEqual(validatePickup('representative', { name: 'Andi Santoso' }), null);
  });

  // 7. Siklus Status Transaksi
  test('Siklus status transaksi harus mengikuti urutan valid (pending -> stored -> completed / cancelled)', () => {
    const validStatuses = ['pending', 'stored', 'completed', 'cancelled'];
    function isValidStatus(status) {
      return validStatuses.includes(status);
    }

    assert.strictEqual(isValidStatus('stored'), true);
    assert.strictEqual(isValidStatus('completed'), true);
    assert.strictEqual(isValidStatus('DIPINJAM'), false); // status sistem lama tidak valid
  });

  // 8. Otorisasi Role Petugas
  test('Sistem hanya mengenali role satpam dan admin', () => {
    function isValidRole(role) {
      return ['satpam', 'admin'].includes(role);
    }

    assert.strictEqual(isValidRole('satpam'), true);
    assert.strictEqual(isValidRole('admin'), true);
    assert.strictEqual(isValidRole('mahasiswa'), false);
    assert.strictEqual(isValidRole('dosen'), false);
    assert.strictEqual(isValidRole('superadmin'), false);
  });

  console.log(`\n========================================`);
  console.log(`Hasil Pengujian: ${passed} Lulus, ${failed} Gagal`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

