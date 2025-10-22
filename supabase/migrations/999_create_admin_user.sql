-- ========================================
-- 管理者ユーザー作成スクリプト
-- ========================================
-- 実行前提: Supabase Authで admin@ghouse.jp ユーザーが作成済みであること
-- パスワード: Ghouse0648
-- ========================================

-- ========================================
-- ステップ1: Supabase Authでユーザーを手動作成
-- ========================================
-- 1. Supabase Dashboard → Authentication → Users → "Add User"
-- 2. Email: admin@ghouse.jp
-- 3. Password: Ghouse0648
-- 4. Auto Confirm User: ON（メール確認をスキップ）
-- 5. 作成後、User IDをコピー

-- ========================================
-- ステップ2: employeesテーブルにレコードを追加
-- ========================================
-- 注意: 下記のSQLを実行する前に、上記で作成したUser IDを確認してください
-- User IDは Supabase Dashboard → Authentication → Users で確認できます

-- システム管理者の作成
-- 注意: 以下のSQLの '[YOUR_AUTH_USER_ID]' を実際のAuth User IDに置き換えてください
INSERT INTO employees (
  id,
  email,
  first_name,
  last_name,
  department,
  role
) VALUES (
  '[YOUR_AUTH_USER_ID]'::uuid,  -- ⚠️ ここをSupabase Authで作成したUser IDに置き換え
  'admin@ghouse.jp',
  '秀樹',
  '西野',
  '営業',
  'executive'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  department = EXCLUDED.department,
  role = EXCLUDED.role;

-- ========================================
-- 確認用クエリ
-- ========================================
-- 管理者ユーザーが正しく作成されたか確認
SELECT
  id,
  email,
  last_name || ' ' || first_name as full_name,
  department,
  role,
  created_at
FROM employees
WHERE email = 'admin@ghouse.jp';

-- ========================================
-- 完了メッセージ
-- ========================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM employees WHERE email = 'admin@ghouse.jp') THEN
    RAISE NOTICE '管理者ユーザーが正常に作成されました: admin@ghouse.jp';
  ELSE
    RAISE WARNING '管理者ユーザーが見つかりません。Auth User IDを確認してください。';
  END IF;
END $$;
