# G-progress Scripts

管理者用スクリプト集（Service Role Keyを使用）

---

## 📋 スクリプト一覧

| スクリプト | 説明 | 使用頻度 |
|-----------|------|:-------:|
| `seedData.ts` | 初期データ投入 | 初回のみ |
| `backup.ts` | データベースバックアップ | 週次 |

---

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
cd scripts
npm install
```

### 2. 環境変数の確認

プロジェクトルートの `.env` ファイルに以下が設定されていることを確認：

```bash
VITE_SUPABASE_URL=https://qxftwxkpeqvlukjybnfp.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 スクリプト実行方法

### seedData.ts - 初期データ投入

**用途**: 開発環境・ステージング環境への初期データ投入

**実行方法**:
```bash
cd scripts
npm run seed
```

**投入されるデータ**:
- 従業員: 7名
- 顧客: 3組
- 業者: 3社

**⚠️ 注意**:
- 既にデータが存在する場合は警告が表示されます
- RLSをバイパスするため、重複チェックが必要です

---

### backup.ts - データベースバックアップ

**用途**: 全テーブルのデータをJSONファイルにバックアップ

**実行方法**:
```bash
cd scripts
npm run backup
```

**バックアップ先**: `scripts/backup/` ディレクトリ

**対象テーブル**:
- employees
- customers
- projects
- tasks
- payments
- vendors
- その他全テーブル

---

## ⚠️ セキュリティ注意事項

### Service Role Key を使用

これらのスクリプトは **Service Role Key** を使用します。

**重要**:
1. ローカル環境でのみ実行してください
2. 本番環境での実行は慎重に行ってください
3. バックアップファイルには機密情報が含まれます（Git除外）
4. 実行ログは監査ログとして保存してください

### 実行権限

これらのスクリプトを実行できるのは：
- ✅ システム管理者
- ✅ データベース管理者
- ❌ 一般ユーザー

---

## 🛡️ トラブルシューティング

### エラー: "環境変数が設定されていません"

**原因**: `.env` ファイルが見つからない、または環境変数が未設定

**解決策**:
1. プロジェクトルートに `.env` ファイルがあるか確認
2. `VITE_SUPABASE_URL` と `VITE_SUPABASE_SERVICE_ROLE_KEY` が設定されているか確認
3. `.env` ファイルの権限を確認（読み取り可能か）

### エラー: "permission denied"

**原因**: Service Role Keyが無効、または権限不足

**解決策**:
1. Supabase Dashboard → Settings → API で Service Role Key を確認
2. キーが正しくコピーされているか確認
3. キーが期限切れでないか確認

### 既存データとの重複

**問題**: 既にデータが存在する状態で実行すると重複エラー

**解決策**:
```sql
-- 既存データを削除してから実行
DELETE FROM employees WHERE email LIKE '%@ghouse.jp';
DELETE FROM customers;
DELETE FROM vendors;
```

---

## 📚 関連ドキュメント

- [SERVICE_ROLE_KEY_USAGE.md](../docs/SERVICE_ROLE_KEY_USAGE.md) - Service Role Key詳細ガイド
- [REQUIREMENTS.md](../REQUIREMENTS.md) - 環境変数一覧
- [SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md) - セキュリティチェックリスト

---

**最終更新**: 2025-10-22
**作成者**: Claude Code
**バージョン**: 1.0
