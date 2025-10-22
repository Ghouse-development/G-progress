-- ========================================
-- 初期データ投入スクリプト
-- ========================================
-- 本番環境で必要な基本マスタデータを投入
-- 作成日: 2025-10-22
-- ========================================

-- ========================================
-- 1. Fiscal Years（年度マスタ）
-- ========================================
INSERT INTO fiscal_years (year, start_date, end_date, is_active) VALUES
('2024', '2024-08-01', '2025-07-31', false),
('2025', '2025-08-01', '2026-07-31', true),
('2026', '2026-08-01', '2027-07-31', false)
ON CONFLICT (year) DO NOTHING;

-- ========================================
-- 2. Departments（部門マスタ）
-- ========================================
INSERT INTO departments (name, description) VALUES
('営業', '営業部門'),
('営業事務', '営業事務部門'),
('ローン事務', 'ローン事務部門'),
('意匠設計', '意匠設計部門'),
('IC', 'インテリアコーディネート部門'),
('実施設計', '実施設計部門'),
('構造設計', '構造設計部門'),
('申請設計', '申請設計部門'),
('工事', '工事部門'),
('工事事務', '工事事務部門'),
('積算・発注', '積算・発注部門'),
('外構設計', '外構設計部門'),
('外構工事', '外構工事部門')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 3. Roles（役職マスタ）
-- ========================================
INSERT INTO roles (name, description, level) VALUES
('システム管理者', 'システム全体の管理者', 10),
('管理者', '組織全体の管理者', 9),
('部長', '部門の責任者', 7),
('課長', '課の責任者', 6),
('主任', '主任職', 5),
('一般社員', '一般従業員', 3),
('契約社員', '契約従業員', 2),
('パート', 'パートタイム従業員', 1)
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 4. Branches（拠点マスタ）
-- ========================================
INSERT INTO branches (name, code, address, phone, is_active) VALUES
('本社', 'HQ', '東京都〇〇区〇〇1-2-3', '03-1234-5678', true),
('大阪支店', 'OSA', '大阪府〇〇市〇〇1-2-3', '06-1234-5678', true),
('名古屋支店', 'NGY', '愛知県名古屋市〇〇1-2-3', '052-123-4567', true),
('福岡支店', 'FKO', '福岡県福岡市〇〇1-2-3', '092-123-4567', true)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 5. Products（商品マスタ）
-- ========================================
INSERT INTO products (name, category, description, base_price) VALUES
('スタンダードプラン', '注文住宅', '基本的な注文住宅プラン', 30000000),
('プレミアムプラン', '注文住宅', '高級仕様の注文住宅プラン', 50000000),
('エコプラン', '注文住宅', '省エネ重視の注文住宅プラン', 35000000),
('太陽光発電システム', 'オプション', '屋根設置型太陽光発電', 2000000),
('蓄電池システム', 'オプション', '家庭用蓄電池', 1500000),
('外構工事', '外構', '基本的な外構工事', 3000000),
('外構デザインプラン', '外構', 'デザイン重視の外構工事', 5000000)
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 6. Triggers（トリガーマスタ）
-- ========================================
INSERT INTO triggers (name, trigger_type, days_from_contract, description) VALUES
('契約締結', 'milestone', 0, '請負契約の締結'),
('設計開始', 'milestone', 7, '設計業務の開始'),
('着工準備', 'milestone', 60, '工事着工の準備'),
('着工', 'milestone', 90, '工事の着工'),
('上棟', 'milestone', 120, '建物の上棟'),
('竣工検査', 'milestone', 180, '建物の竣工検査'),
('引き渡し', 'milestone', 210, '建物の引き渡し'),
('アフターフォロー開始', 'milestone', 240, 'アフターフォローの開始')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 7. Vendors（業者マスタ）
-- ========================================
INSERT INTO vendors (name, category, contact_name, phone, email) VALUES
('株式会社〇〇建材', '建材', '山田太郎', '03-1111-2222', 'yamada@example.com'),
('株式会社△△設備', '設備', '佐藤花子', '03-2222-3333', 'sato@example.com'),
('株式会社□□電気', '電気', '鈴木一郎', '03-3333-4444', 'suzuki@example.com'),
('株式会社◇◇工務店', '工事', '田中次郎', '03-4444-5555', 'tanaka@example.com'),
('株式会社〇〇外構', '外構', '高橋三郎', '03-5555-6666', 'takahashi@example.com')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 8. システム管理者アカウント作成準備
-- ========================================
-- 注意: 実際のシステム管理者は、Supabase Authで作成してから
-- employeesテーブルに手動で追加する必要があります

-- システム管理者用のサンプルレコード（実際の環境では削除してください）
-- INSERT INTO employees (
--   id,
--   email,
--   first_name,
--   last_name,
--   department,
--   role,
--   branch_id
-- ) VALUES (
--   'system-admin-id',  -- Supabase Authで作成したユーザーIDに置き換え
--   'admin@g-house.example.com',
--   '管理者',
--   'システム',
--   '営業',
--   'システム管理者',
--   (SELECT id FROM branches WHERE code = 'HQ' LIMIT 1)
-- );

-- ========================================
-- 完了メッセージ
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '初期データの投入が完了しました';
  RAISE NOTICE '年度マスタ: % 件', (SELECT COUNT(*) FROM fiscal_years);
  RAISE NOTICE '部門マスタ: % 件', (SELECT COUNT(*) FROM departments);
  RAISE NOTICE '役職マスタ: % 件', (SELECT COUNT(*) FROM roles);
  RAISE NOTICE '拠点マスタ: % 件', (SELECT COUNT(*) FROM branches);
  RAISE NOTICE '商品マスタ: % 件', (SELECT COUNT(*) FROM products);
  RAISE NOTICE 'トリガーマスタ: % 件', (SELECT COUNT(*) FROM triggers);
  RAISE NOTICE '業者マスタ: % 件', (SELECT COUNT(*) FROM vendors);
  RAISE NOTICE 'タスクマスタ: % 件', (SELECT COUNT(*) FROM task_masters);
END $$;
