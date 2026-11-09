-- ============================================================
-- SKEMA & MIGRASI LENGKAP: Sistem Informasi Penitipan Barang Pengunjung
-- Dapat dijalankan pada Database Supabase Baru maupun yang Sudah Ada
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. FUNGSI TIMESTAMP HELPER
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. TABEL PROFILES (Akun Petugas Satpam & Admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'satpam',
  employee_id TEXT DEFAULT '',
  shift TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  phone_number TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  profile_completed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Pastikan kolom baru dan constraint role selalu ada dan valid ('satpam', 'admin')
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_id TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('satpam', 'admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);

-- Trigger updated_at pada profiles
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Trigger pembuatan profil otomatis saat user register di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'satpam'));
  IF v_role NOT IN ('satpam', 'admin') THEN
    v_role := 'satpam';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, role, employee_id, shift, phone, is_active, profile_completed
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'employee_id', ''),
    COALESCE(NEW.raw_user_meta_data->>'shift', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    TRUE,
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger perlindungan integritas role
CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role NOT IN ('satpam', 'admin') THEN
    RAISE EXCEPTION 'Role tidak valid. Hanya ''satpam'' atau ''admin'' yang diizinkan.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_roles ON public.profiles;
CREATE TRIGGER protect_profile_roles
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_roles();

-- ============================================================
-- 4. HELPER FUNCTIONS: is_admin() dan is_staff()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('satpam', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 5. TABEL PENGUNJUNG (visitors)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  institution TEXT NOT NULL DEFAULT '',
  visit_type TEXT NOT NULL DEFAULT 'Lainnya' CHECK (visit_type IN (
    'Kunjungan Industri', 'Kunjungan Pendidikan', 'Kunjungan Kerja',
    'Tamu Perusahaan', 'Kunjungan Instansi', 'Lainnya'
  )),
  identity_number TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  visit_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_visitors_full_name ON public.visitors(full_name);
CREATE INDEX IF NOT EXISTS idx_visitors_institution ON public.visitors(institution);
CREATE INDEX IF NOT EXISTS idx_visitors_identity_number ON public.visitors(identity_number);

DROP TRIGGER IF EXISTS trigger_visitors_updated_at ON public.visitors;
CREATE TRIGGER trigger_visitors_updated_at
  BEFORE UPDATE ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================
-- 6. TABEL KATEGORI BARANG (item_categories)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trigger_item_categories_updated_at ON public.item_categories;
CREATE TRIGGER trigger_item_categories_updated_at
  BEFORE UPDATE ON public.item_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================
-- 7. TABEL LOKASI PENYIMPANAN (storage_locations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  active_count INTEGER NOT NULL DEFAULT 0 CHECK (active_count >= 0),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'full', 'inactive')),
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_storage_locations_status ON public.storage_locations(status);
CREATE INDEX IF NOT EXISTS idx_storage_locations_code ON public.storage_locations(code);

DROP TRIGGER IF EXISTS trigger_storage_locations_updated_at ON public.storage_locations;
CREATE TRIGGER trigger_storage_locations_updated_at
  BEFORE UPDATE ON public.storage_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================
-- 8. TABEL TRANSAKSI PENITIPAN (deposit_transactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deposit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_code TEXT NOT NULL UNIQUE,
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'stored', 'completed', 'cancelled')),
  pickup_method TEXT DEFAULT 'owner' CHECK (pickup_method IN ('owner', 'representative')),
  received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  released_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  representative_name TEXT DEFAULT '',
  representative_identity_number TEXT DEFAULT '',
  representative_phone TEXT DEFAULT '',
  representative_relationship TEXT DEFAULT '',
  authorization_method TEXT DEFAULT '',
  authorization_notes TEXT DEFAULT '',
  pickup_verified_at TIMESTAMPTZ,
  pickup_completed_at TIMESTAMPTZ,
  checkin_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  checkout_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_deposit_transactions_status ON public.deposit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_transaction_code ON public.deposit_transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_visitor_id ON public.deposit_transactions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_received_by ON public.deposit_transactions(received_by);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_checkin_at ON public.deposit_transactions(checkin_at);

DROP TRIGGER IF EXISTS trigger_deposit_transactions_updated_at ON public.deposit_transactions;
CREATE TRIGGER trigger_deposit_transactions_updated_at
  BEFORE UPDATE ON public.deposit_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================
-- 9. TABEL RINCIAN BARANG TITIPAN (deposit_items)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deposit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.deposit_transactions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.item_categories(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  description TEXT DEFAULT '',
  initial_condition TEXT NOT NULL DEFAULT 'Baik',
  photo_url TEXT DEFAULT '',
  storage_location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_deposit_items_transaction_id ON public.deposit_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_deposit_items_category_id ON public.deposit_items(category_id);
CREATE INDEX IF NOT EXISTS idx_deposit_items_storage_location_id ON public.deposit_items(storage_location_id);

DROP TRIGGER IF EXISTS trigger_deposit_items_updated_at ON public.deposit_items;
CREATE TRIGGER trigger_deposit_items_updated_at
  BEFORE UPDATE ON public.deposit_items
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================
-- 10. TABEL BUKTI KUASA PERWAKILAN (pickup_authorizations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pickup_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.deposit_transactions(id) ON DELETE CASCADE,
  authorization_type TEXT NOT NULL CHECK (authorization_type IN (
    'surat_kuasa_tertulis', 'surat_kuasa_digital', 'konfirmasi_telepon',
    'konfirmasi_kanal_resmi', 'persetujuan_langsung', 'lainnya'
  )),
  grantor_name TEXT NOT NULL DEFAULT '',
  grantor_identity_number TEXT DEFAULT '',
  representative_name TEXT NOT NULL DEFAULT '',
  representative_identity_number TEXT DEFAULT '',
  representative_phone TEXT DEFAULT '',
  representative_relationship TEXT DEFAULT '',
  authorization_date DATE,
  valid_until DATE,
  authorization_scope TEXT DEFAULT '',
  additional_notes TEXT DEFAULT '',
  evidence_file_path TEXT DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
  verification_notes TEXT DEFAULT '',
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pickup_authorizations_transaction_id ON public.pickup_authorizations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pickup_authorizations_verification_status ON public.pickup_authorizations(verification_status);

DROP TRIGGER IF EXISTS trigger_pickup_authorizations_updated_at ON public.pickup_authorizations;
CREATE TRIGGER trigger_pickup_authorizations_updated_at
  BEFORE UPDATE ON public.pickup_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================
-- 11. TABEL AUDIT LOG (transaction_logs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.deposit_transactions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  notes TEXT DEFAULT '',
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transaction_logs_transaction_id ON public.transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_performed_by ON public.transaction_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_created_at ON public.transaction_logs(created_at);

-- ============================================================
-- 12. FUNGSI BISNIS & RPC TRANSAKSI
-- ============================================================

-- Function: generate_transaction_code (DEP-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION public.generate_transaction_code()
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_seq INTEGER;
  v_code TEXT;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.deposit_transactions
  WHERE transaction_code LIKE 'DEP-' || v_date || '-%';
  v_code := 'DEP-' || v_date || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- RPC: rpc_create_deposit
CREATE OR REPLACE FUNCTION public.rpc_create_deposit(
  p_visitor_id UUID,
  p_received_by UUID,
  p_notes TEXT DEFAULT '',
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_code TEXT;
  v_transaction RECORD;
  v_item JSONB;
  v_location_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Harus login untuk membuat transaksi penitipan.';
  END IF;

  v_code := public.generate_transaction_code();

  INSERT INTO public.deposit_transactions (
    transaction_code, visitor_id, received_by, status, notes
  ) VALUES (
    v_code, p_visitor_id, p_received_by, 'stored', p_notes
  ) RETURNING * INTO v_transaction;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_location_id := NULLIF(v_item->>'storage_location_id', '')::UUID;

    INSERT INTO public.deposit_items (
      transaction_id, name, category_id, quantity, description,
      initial_condition, photo_url, storage_location_id, notes
    ) VALUES (
      v_transaction.id,
      v_item->>'name',
      NULLIF(v_item->>'category_id', '')::UUID,
      COALESCE((v_item->>'quantity')::INTEGER, 1),
      COALESCE(v_item->>'description', ''),
      COALESCE(v_item->>'initial_condition', 'Baik'),
      COALESCE(v_item->>'photo_url', ''),
      v_location_id,
      COALESCE(v_item->>'notes', '')
    );

    IF v_location_id IS NOT NULL THEN
      UPDATE public.storage_locations
      SET active_count = active_count + 1,
          status = CASE WHEN active_count + 1 >= capacity THEN 'full' ELSE 'available' END
      WHERE id = v_location_id;
    END IF;
  END LOOP;

  INSERT INTO public.transaction_logs (
    transaction_id, action, old_status, new_status, performed_by
  ) VALUES (
    v_transaction.id, 'deposit_created', NULL, 'stored', auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction.id,
    'transaction_code', v_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: rpc_complete_pickup
CREATE OR REPLACE FUNCTION public.rpc_complete_pickup(
  p_transaction_id UUID,
  p_released_by UUID,
  p_pickup_method TEXT DEFAULT 'owner',
  p_representative_name TEXT DEFAULT '',
  p_representative_identity_number TEXT DEFAULT '',
  p_representative_phone TEXT DEFAULT '',
  p_representative_relationship TEXT DEFAULT '',
  p_authorization_method TEXT DEFAULT '',
  p_authorization_notes TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Harus login untuk memproses pengambilan barang.';
  END IF;

  SELECT * INTO v_transaction
  FROM public.deposit_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi penitipan tidak ditemukan.';
  END IF;

  IF v_transaction.status != 'stored' THEN
    RAISE EXCEPTION 'Transaksi tidak dapat diproses. Status saat ini: %', v_transaction.status;
  END IF;

  -- Jika pengambilan oleh perwakilan, pastikan dicatat di authorizations jika ada
  IF p_pickup_method = 'representative' THEN
    INSERT INTO public.pickup_authorizations (
      transaction_id, authorization_type, representative_name, representative_identity_number,
      representative_phone, representative_relationship, additional_notes, verification_status,
      verified_by, verified_at
    ) VALUES (
      p_transaction_id,
      COALESCE(NULLIF(p_authorization_method, ''), 'persetujuan_langsung'),
      p_representative_name,
      p_representative_identity_number,
      p_representative_phone,
      p_representative_relationship,
      p_authorization_notes,
      'verified',
      auth.uid(),
      timezone('utc'::text, now())
    );
  END IF;

  UPDATE public.deposit_transactions SET
    status = 'completed',
    released_by = p_released_by,
    pickup_method = p_pickup_method,
    representative_name = p_representative_name,
    representative_identity_number = p_representative_identity_number,
    representative_phone = p_representative_phone,
    representative_relationship = p_representative_relationship,
    authorization_method = p_authorization_method,
    authorization_notes = p_authorization_notes,
    pickup_verified_at = timezone('utc'::text, now()),
    pickup_completed_at = timezone('utc'::text, now()),
    checkout_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_transaction_id;

  -- Kembalikan kapasitas rak/loker
  UPDATE public.storage_locations sl
  SET active_count = GREATEST(0, sl.active_count - 1),
      status = CASE WHEN GREATEST(0, sl.active_count - 1) < sl.capacity THEN 'available' ELSE 'full' END,
      updated_at = timezone('utc'::text, now())
  FROM public.deposit_items di
  WHERE di.transaction_id = p_transaction_id
    AND di.storage_location_id = sl.id;

  INSERT INTO public.transaction_logs (
    transaction_id, action, old_status, new_status, notes, performed_by
  ) VALUES (
    p_transaction_id, 'pickup_completed', 'stored', 'completed',
    'Metode: ' || p_pickup_method, auth.uid()
  );

  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_logs ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- visitors
DROP POLICY IF EXISTS "Staff can view all visitors" ON public.visitors;
CREATE POLICY "Staff can view all visitors"
  ON public.visitors FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can insert visitors" ON public.visitors;
CREATE POLICY "Staff can insert visitors"
  ON public.visitors FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can update visitors" ON public.visitors;
CREATE POLICY "Staff can update visitors"
  ON public.visitors FOR UPDATE TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Admin can delete visitors" ON public.visitors;
CREATE POLICY "Admin can delete visitors"
  ON public.visitors FOR DELETE TO authenticated USING (public.is_admin());

-- item_categories
DROP POLICY IF EXISTS "Staff can view item_categories" ON public.item_categories;
CREATE POLICY "Staff can view item_categories"
  ON public.item_categories FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Admin can manage item_categories" ON public.item_categories;
CREATE POLICY "Admin can manage item_categories"
  ON public.item_categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- storage_locations
DROP POLICY IF EXISTS "Staff can view storage_locations" ON public.storage_locations;
CREATE POLICY "Staff can view storage_locations"
  ON public.storage_locations FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Admin can manage storage_locations" ON public.storage_locations;
CREATE POLICY "Admin can manage storage_locations"
  ON public.storage_locations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- deposit_transactions
DROP POLICY IF EXISTS "Staff can view all deposit_transactions" ON public.deposit_transactions;
CREATE POLICY "Staff can view all deposit_transactions"
  ON public.deposit_transactions FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can create deposit_transactions" ON public.deposit_transactions;
CREATE POLICY "Staff can create deposit_transactions"
  ON public.deposit_transactions FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can update deposit_transactions" ON public.deposit_transactions;
CREATE POLICY "Staff can update deposit_transactions"
  ON public.deposit_transactions FOR UPDATE TO authenticated USING (public.is_staff());

-- deposit_items
DROP POLICY IF EXISTS "Staff can view deposit_items" ON public.deposit_items;
CREATE POLICY "Staff can view deposit_items"
  ON public.deposit_items FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage deposit_items" ON public.deposit_items;
CREATE POLICY "Staff can manage deposit_items"
  ON public.deposit_items FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- pickup_authorizations
DROP POLICY IF EXISTS "Staff can view pickup_authorizations" ON public.pickup_authorizations;
CREATE POLICY "Staff can view pickup_authorizations"
  ON public.pickup_authorizations FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage pickup_authorizations" ON public.pickup_authorizations;
CREATE POLICY "Staff can manage pickup_authorizations"
  ON public.pickup_authorizations FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- transaction_logs
DROP POLICY IF EXISTS "Staff can view transaction_logs" ON public.transaction_logs;
CREATE POLICY "Staff can view transaction_logs"
  ON public.transaction_logs FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Staff or service can insert logs" ON public.transaction_logs;
CREATE POLICY "Staff or service can insert logs"
  ON public.transaction_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 14. SEED DATA AWAL (Kategori & Lokasi Penyimpanan)
-- ============================================================

INSERT INTO public.item_categories (name, description) VALUES
  ('Tas dan Koper', 'Tas ransel, koper, tas kerja, dan sejenisnya'),
  ('Perangkat Elektronik', 'Laptop, kamera, ponsel, tablet, dan perangkat elektronik lainnya'),
  ('Rokok dan Korek Api', 'Rokok, cerutu, korek api, dan pemantik'),
  ('Aksesori', 'Jam tangan, perhiasan, ikat pinggang, dan aksesori lainnya'),
  ('Dokumen dan Berkas', 'Dokumen, map, berkas, dan surat penting'),
  ('Perlengkapan Pribadi', 'Dompet, kunci, obat-obatan pribadi, dan perlengkapan pribadi lainnya'),
  ('Barang Lainnya', 'Barang lain yang tidak termasuk kategori di atas')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.storage_locations (code, name, capacity, description) VALUES
  ('RAK-A01', 'Rak A01', 10, 'Rak penyimpanan bagian A, nomor 1'),
  ('RAK-A02', 'Rak A02', 10, 'Rak penyimpanan bagian A, nomor 2'),
  ('RAK-A03', 'Rak A03', 10, 'Rak penyimpanan bagian A, nomor 3'),
  ('RAK-B01', 'Rak B01', 10, 'Rak penyimpanan bagian B, nomor 1'),
  ('RAK-B02', 'Rak B02', 10, 'Rak penyimpanan bagian B, nomor 2'),
  ('LKR-001', 'Loker 001', 5, 'Loker penyimpanan nomor 001'),
  ('LKR-002', 'Loker 002', 5, 'Loker penyimpanan nomor 002'),
  ('LKR-003', 'Loker 003', 5, 'Loker penyimpanan nomor 003')
ON CONFLICT (code) DO NOTHING;
