# SQL実行チェックリスト

**本番環境デプロイ前に実行が必要なSQLファイル一覧**

作成日: 2025-10-22
対象: Supabase本番環境
実行方法: Supabaseダッシュボード → SQL Editor でコピー&実行

---

## 📋 実行順序

### ステップ1: ベーススキーマ作成

| No | ファイル名 | 内容 | 実行必須 |
|----|-----------|------|:-------:|
| 1 | `schema.sql` | 基本テーブル作成（employees, customers, projects, tasks, payments等） | ✅ 必須 |

**実行コマンド**:
```bash
# Supabase SQL Editorで実行
# ファイルパス: supabase/schema.sql
```

---

### ステップ2: 拡張スキーマ（マイグレーション）

**実行順序が重要です！以下の順番で実行してください。**

| No | ファイル名 | 内容 | 実行必須 | 優先度 |
|----|-----------|------|:-------:|:------:|
| 1 | `001_add_multitenancy.sql` | マルチテナント機能追加 | ✅ | ⭐⭐⭐ |
| 2 | `002_add_auth_user_id.sql` | 認証ユーザーID追加 | ✅ | ⭐⭐⭐ |
| 3 | `002_add_permissions.sql` | 権限管理テーブル追加 | ✅ | ⭐⭐⭐ |
| 4 | `003_add_realtime.sql` | リアルタイム機能追加（edit_locks, online_users） | ✅ | ⭐⭐⭐ |
| 5 | `100_comprehensive_rls_policies.sql` | 包括的RLSポリシー設定 | ✅ | ⭐⭐⭐ |
| 6 | `101_performance_indexes.sql` | パフォーマンス最適化インデックス | ✅ | ⭐⭐⭐ |
| 7 | `create_user_settings_table.sql` | ユーザー設定テーブル作成 | ✅ | ⭐⭐⭐ |
| 8 | `create_comments_table.sql` | コメント機能テーブル作成 | ✅ | ⭐⭐⭐ |
| 9 | `create_project_files_table.sql` | プロジェクトファイルテーブル作成 | ✅ | ⭐⭐ |
| 10 | `comprehensive_expansion.sql` | 包括的スキーマ拡張 | ✅ | ⭐⭐⭐ |
| 11 | `extend_schema_for_requirements.sql` | 要件対応スキーマ拡張 | ✅ | ⭐⭐⭐ |
| 12 | `extend_schema_for_requirements_fixed.sql` | スキーマ拡張修正版 | ✅ | ⭐⭐⭐ |
| 13 | `add_employee_name_fields.sql` | 従業員名フィールド追加 | ✅ | ⭐⭐ |
| 14 | `add_comprehensive_task_masters.sql` | 包括的タスクマスタ追加 | ✅ | ⭐⭐⭐ |
| 15 | `update_notifications_policies.sql` | 通知ポリシー更新 | ✅ | ⭐⭐ |

**実行コマンド**:
```bash
# 各ファイルをSupabase SQL Editorで順番に実行
# ファイルパス: supabase/migrations/[ファイル名]
```

---

### ステップ3: データ整合性確認と修正

| No | ファイル名 | 内容 | 実行必須 | 優先度 |
|----|-----------|------|:-------:|:------:|
| 1 | `verify_and_fix_task_masters.sql` | タスクマスタ検証・修正 | ✅ | ⭐⭐ |
| 2 | `cleanup_and_insert_data.sql` | データクリーンアップ・挿入 | ✅ | ⭐⭐ |
| 3 | `final_data_verification_and_fix.sql` | 最終データ検証・修正 | ✅ | ⭐⭐ |

---

### ステップ4: 初期データ投入

| No | ファイル名 | 内容 | 実行必須 | 優先度 |
|----|-----------|------|:-------:|:------:|
| 1 | `200_initial_data.sql` | 初期マスタデータ投入（商品、部門、役職、トリガー、拠点等） | ✅ | ⭐⭐⭐ |
| 2 | `sample_data.sql` | サンプルデータ（開発・テスト用） | ⬜ | ⭐ |

**注意**:
- `200_initial_data.sql` は本番環境でも実行必須（マスタデータ）
- `sample_data.sql` は開発・ステージング環境のみで実行（本番環境では不要）

---

### ステップ5: 管理者ユーザー作成 ⭐⭐⭐

**重要**: ログインに必要な管理者ユーザーを作成します

| No | ファイル名 | 内容 | 実行必須 | 優先度 |
|----|-----------|------|:-------:|:------:|
| 1 | `999_create_admin_user.sql` | 管理者ユーザー作成（admin@ghouse.jp） | ✅ | ⭐⭐⭐ |

**実行方法**:
1. **Supabase Authでユーザーを作成**（Dashboard経由）
   - Email: admin@ghouse.jp
   - Password: Ghouse0648
   - Auto Confirm: ON
2. **User IDをコピー**
3. **SQLファイルを実行**（User IDを置き換えて）

**詳細手順**: `docs/ADMIN_USER_SETUP.md` を参照

**ログイン情報**:
- Email: admin@ghouse.jp
- Password: Ghouse0648

---

## 📝 実行前チェックリスト

### 環境確認
- [ ] Supabaseプロジェクトにログイン済み
- [ ] 本番環境のプロジェクトURLを確認: `https://qxftwxkpeqvlukjybnfp.supabase.co`
- [ ] SQL Editorにアクセス可能
- [ ] Authenticationページにアクセス可能（ユーザー作成用）

### バックアップ
- [ ] 既存データのバックアップを取得（既存データがある場合）
- [ ] スキーマのエクスポート完了

### 実行準備
- [ ] 各SQLファイルの内容を確認済み
- [ ] 実行順序を理解済み
- [ ] エラー発生時の対応手順を確認済み
- [ ] 管理者ユーザー作成手順を確認済み（`docs/ADMIN_USER_SETUP.md`）

---

## ⚠️ 実行時の注意事項

1. **順序厳守**: 上記の順序で実行してください。依存関係があります。
2. **エラーハンドリング**: エラーが発生した場合、次に進まず解決してください。
3. **RLS有効化**: すべてのテーブルでRow Level Security (RLS) が有効化されます。
4. **インデックス**: パフォーマンス最適化のためインデックスが自動作成されます。
5. **リアルタイム**: Realtime機能が有効化され、同時編集が可能になります。

---

## 🔍 実行後の確認項目

### テーブル作成確認
```sql
-- Supabase SQL Editorで実行
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**期待されるテーブル一覧** (30+テーブル):
- employees
- customers
- projects
- tasks
- payments
- vendors
- audit_logs
- notifications
- comments
- project_files
- user_settings
- edit_locks
- online_users
- permissions
- roles
- departments
- branches
- task_masters
- product_masters
- trigger_masters
- (その他マスタテーブル)

### RLSポリシー確認
```sql
-- RLSが有効化されているテーブルを確認
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

### インデックス確認
```sql
-- インデックスが作成されているか確認
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 初期データ確認
```sql
-- マスタデータが投入されているか確認
SELECT 'product_masters' as table_name, COUNT(*) as count FROM product_masters
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'branches', COUNT(*) FROM branches
UNION ALL
SELECT 'trigger_masters', COUNT(*) FROM trigger_masters
UNION ALL
SELECT 'task_masters', COUNT(*) FROM task_masters;
```

**期待される結果**:
- product_masters: 10件以上
- departments: 15件以上
- roles: 5件以上
- branches: 5件以上
- trigger_masters: 10件以上
- task_masters: 50件以上

---

## 🚨 トラブルシューティング

### エラー: "relation already exists"
→ すでにテーブルが存在します。`DROP TABLE IF EXISTS [テーブル名] CASCADE;` で削除してから再実行。

### エラー: "foreign key constraint"
→ 外部キー制約エラー。参照先テーブルが存在するか確認してください。

### エラー: "permission denied"
→ 権限不足。Supabaseプロジェクトの管理者権限があるか確認してください。

### データが表示されない
→ RLSポリシーを確認。認証されたユーザーでアクセスしているか確認。

---

## 📞 サポート

問題が解決しない場合:
1. Supabaseログを確認: Dashboard → Logs
2. エラーメッセージをコピーして開発者に連絡
3. このドキュメントを開発者と共有

---

**最終更新**: 2025-10-22
**作成者**: Claude Code
**バージョン**: 1.0
