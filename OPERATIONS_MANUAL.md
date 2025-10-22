# G-progress 運用マニュアル

システム管理者向けの運用手順書です。

## 📋 目次

1. [日次運用](#日次運用)
2. [週次運用](#週次運用)
3. [月次運用](#月次運用)
4. [マスタデータ管理](#マスタデータ管理)
5. [ユーザー管理](#ユーザー管理)
6. [バックアップとリストア](#バックアップとリストア)
7. [トラブルシューティング](#トラブルシューティング)

---

## 日次運用

### 1. システム稼働状況の確認

**所要時間**: 約5分

1. **Vercelダッシュボード確認**
   - https://vercel.com/ にログイン
   - Deploymentsタブで最新デプロイのステータスを確認
   - エラーがないことを確認

2. **Supabaseダッシュボード確認**
   - https://supabase.com/ にログイン
   - Database Healthをチェック
   - アクティブな接続数を確認（通常50以下）

3. **アプリケーション動作確認**
   - 本番環境URLにアクセス
   - ログインページが正常に表示されるか確認
   - ダッシュボードが正常に動作するか確認

### 2. エラーログの確認

**所要時間**: 約10分

1. **Vercelログ確認**
   - Vercel > Project > Logs
   - 過去24時間のエラーログを確認
   - 500エラーや4xxエラーの頻度をチェック

2. **Supabase監査ログ確認**
   - Supabase > Database > SQL Editor
   ```sql
   -- 直近24時間の重要なログを確認
   SELECT
     created_at,
     user_id,
     action,
     table_name,
     description
   FROM audit_logs
   WHERE created_at >= NOW() - INTERVAL '24 hours'
     AND action IN ('delete', 'export', 'import')
   ORDER BY created_at DESC
   LIMIT 100;
   ```

### 3. パフォーマンスモニタリング

**所要時間**: 約5分

1. **レスポンスタイムチェック**
   - Vercel > Analytics > Performance
   - 平均レスポンスタイムが2秒以内であることを確認

2. **データベースクエリパフォーマンス**
   - Supabase > Database > Query Performance
   - 遅いクエリ（3秒以上）がないか確認

---

## 週次運用

### 1. データベースメンテナンス

**所要時間**: 約15分

1. **データベースサイズ確認**
   ```sql
   -- テーブルごとのサイズを確認
   SELECT
     schemaname,
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

2. **不要データのクリーンアップ**
   ```sql
   -- 90日以上前の監査ログを削除
   DELETE FROM audit_logs
   WHERE created_at < NOW() - INTERVAL '90 days';

   -- 既読通知の古いものを削除（30日以上前）
   DELETE FROM notifications
   WHERE is_read = true
     AND created_at < NOW() - INTERVAL '30 days';
   ```

3. **統計情報の更新**
   ```sql
   ANALYZE;
   ```

### 2. セキュリティチェック

**所要時間**: 約10分

1. **依存パッケージの脆弱性チェック**
   ```bash
   npm audit
   ```

2. **不審なアクセスログの確認**
   ```sql
   -- 短時間に大量のログイン失敗
   SELECT
     user_id,
     COUNT(*) as failure_count
   FROM audit_logs
   WHERE action = 'login_failed'
     AND created_at >= NOW() - INTERVAL '7 days'
   GROUP BY user_id
   HAVING COUNT(*) > 10
   ORDER BY failure_count DESC;
   ```

### 3. ユーザーアクティビティレポート

**所要時間**: 約10分

```sql
-- 週間アクティブユーザー数
SELECT COUNT(DISTINCT user_id) as active_users
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '7 days';

-- 部門別のアクティビティ
SELECT
  e.department,
  COUNT(DISTINCT al.user_id) as active_users,
  COUNT(*) as total_actions
FROM audit_logs al
JOIN employees e ON al.user_id = e.id
WHERE al.created_at >= NOW() - INTERVAL '7 days'
GROUP BY e.department
ORDER BY total_actions DESC;
```

---

## 月次運用

### 1. バックアップ確認

**所要時間**: 約20分

1. **Supabaseバックアップ確認**
   - Supabase > Database > Backups
   - 直近7日分のバックアップが存在することを確認
   - バックアップサイズが適切であることを確認

2. **手動バックアップの実行**
   ```bash
   # Supabase CLIを使用
   npx supabase db dump -f backup_$(date +%Y%m%d).sql
   ```

3. **バックアップのテストリストア**
   - 開発環境でリストアテストを実施
   - データの整合性を確認

### 2. パフォーマンスレビュー

**所要時間**: 約30分

1. **月次パフォーマンスレポート作成**
   - 平均レスポンスタイム
   - エラー率
   - アクティブユーザー数
   - データベースサイズ推移

2. **遅いクエリの最適化**
   - 実行時間3秒以上のクエリをリストアップ
   - インデックス追加の検討
   - クエリの書き換え検討

### 3. セキュリティパッチ適用

**所要時間**: 約30分

1. **依存パッケージの更新**
   ```bash
   npm outdated
   npm update
   npm audit fix
   ```

2. **本番環境への反映**
   - 開発環境でテスト
   - ステージング環境でテスト
   - 本番環境にデプロイ

---

## マスタデータ管理

### 従業員マスタの管理

#### 新規従業員の追加

1. **Supabase Authでユーザー作成**
   - Supabase > Authentication > Users
   - 「Add User」をクリック
   - メールアドレスとパスワードを入力

2. **employeesテーブルにレコード追加**
   ```sql
   INSERT INTO employees (
     id,
     email,
     first_name,
     last_name,
     department,
     role,
     branch_id,
     hire_date
   ) VALUES (
     'auth-user-id',  -- Step 1で作成したユーザーIDをコピー
     'new.employee@example.com',
     '太郎',
     '山田',
     '営業',
     '一般社員',
     (SELECT id FROM branches WHERE code = 'HQ'),
     CURRENT_DATE
   );
   ```

#### 従業員情報の更新

```sql
-- 部門変更
UPDATE employees
SET department = '設計'
WHERE email = 'employee@example.com';

-- 役職変更
UPDATE employees
SET role = '課長'
WHERE email = 'employee@example.com';

-- 退職処理
UPDATE employees
SET
  is_active = false,
  termination_date = CURRENT_DATE
WHERE email = 'employee@example.com';
```

### 商品マスタの管理

```sql
-- 新規商品追加
INSERT INTO products (name, category, description, base_price)
VALUES ('新プラン', '注文住宅', '説明文', 40000000);

-- 商品価格変更
UPDATE products
SET base_price = 45000000
WHERE name = '新プラン';

-- 商品の無効化
UPDATE products
SET is_active = false
WHERE name = '旧プラン';
```

### タスクマスタの管理

```sql
-- 新規タスク追加
INSERT INTO task_masters (
  position,
  task_title,
  task_order,
  day_from_contract,
  dos,
  donts
) VALUES (
  '営業',
  '初回ヒアリング',
  5,
  1,
  ARRAY['顧客要望の詳細ヒアリング', '予算確認'],
  ARRAY['強引な営業は禁止']
);

-- タスク順序の変更
UPDATE task_masters
SET task_order = 6
WHERE task_title = '初回ヒアリング';
```

---

## ユーザー管理

### アクティブユーザーの確認

```sql
SELECT
  e.email,
  e.first_name,
  e.last_name,
  e.department,
  e.role,
  e.last_login_at
FROM employees e
WHERE e.is_active = true
ORDER BY e.last_login_at DESC;
```

### 権限の変更

```sql
-- 管理者権限付与
UPDATE employees
SET role = '管理者'
WHERE email = 'user@example.com';

-- 権限削除（一般社員に戻す）
UPDATE employees
SET role = '一般社員'
WHERE email = 'user@example.com';
```

### パスワードリセット

1. Supabase Dashboard > Authentication > Users
2. 対象ユーザーを検索
3. 「Send Password Recovery」をクリック
4. ユーザーにメールが送信される

---

## バックアップとリストア

### 手動バックアップ

```bash
# データベース全体をバックアップ
npx supabase db dump -f backup_full_$(date +%Y%m%d).sql

# 特定のテーブルのみバックアップ
npx supabase db dump -f backup_projects_$(date +%Y%m%d).sql --table projects
```

### リストア手順

```bash
# バックアップファイルからリストア
npx supabase db reset
psql -h db.your-project.supabase.co -U postgres -d postgres -f backup_full_20251022.sql
```

### バックアップスケジュール

- **自動バックアップ**: Supabaseが毎日自動実行（7日間保持）
- **手動バックアップ**: 月初に実施し、外部ストレージに保存

---

## トラブルシューティング

### よくある問題と対処法

#### 1. ログインできない

**症状**: ユーザーがログインできない

**確認事項**:
1. Supabase Authでユーザーが存在するか確認
2. employeesテーブルにレコードがあるか確認
3. is_activeがtrueになっているか確認

**対処法**:
```sql
-- ユーザー確認
SELECT * FROM employees WHERE email = 'user@example.com';

-- アクティブ化
UPDATE employees
SET is_active = true
WHERE email = 'user@example.com';
```

#### 2. データが表示されない

**症状**: 案件やタスクが表示されない

**確認事項**:
1. RLSポリシーが正しく設定されているか
2. ユーザーの権限が適切か
3. fiscal_yearの設定が正しいか

**対処法**:
```sql
-- RLSポリシー確認
SELECT * FROM pg_policies WHERE tablename = 'projects';

-- ユーザー権限確認
SELECT role, department FROM employees WHERE email = 'user@example.com';
```

#### 3. パフォーマンスが遅い

**症状**: ページ読み込みが遅い

**確認事項**:
1. データベースサイズ
2. インデックスの有無
3. 遅いクエリの存在

**対処法**:
```sql
-- インデックスの確認
SELECT * FROM pg_indexes WHERE tablename = 'projects';

-- 遅いクエリの特定
SELECT * FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

---

## 📞 サポート連絡先

**緊急時連絡先**:
- システム管理者: admin@example.com
- 技術サポート: support@example.com

**外部サービスサポート**:
- Supabase Support: https://supabase.com/support
- Vercel Support: https://vercel.com/support

---

**最終更新**: 2025-10-22
**バージョン**: 1.0.0
