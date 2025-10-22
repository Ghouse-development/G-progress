# 環境変数設定サマリー - 2025-10-22

**G-progress システムの環境変数設定完了**

---

## ✅ 追加された環境変数

### Service Role Key
```bash
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZnR3eGtwZXF2bHVranlibmZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTgxMjMxNSwiZXhwIjoyMDc1Mzg4MzE1fQ.aagoyqouAINiKBXKngvimecxEq5K0boQk5Y8fQnIvJs
```

**用途**:
- 初期データ投入（RLSバイパス）
- 管理者専用操作
- データベースバックアップ/リストア
- マイグレーション実行

**⚠️ セキュリティ警告**:
- **絶対にフロントエンドコードで使用しないこと**
- **Gitにコミットしないこと**（`.gitignore`で除外済み）
- バックエンド・スクリプトでのみ使用

---

## 📋 完全な環境変数リスト

### `.env` ファイル内容

```bash
# Supabase接続情報
VITE_SUPABASE_URL=https://qxftwxkpeqvlukjybnfp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZnR3eGtwZXF2bHVranlibmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTIzMTUsImV4cCI6MjA3NTM4ODMxNX0.CMvqNski6cYgG3cfkNPwtpKJQKiaWPtszP48qX8_WP8

# Supabase Service Role Key（管理操作用・RLSバイパス）
# ⚠️ 警告: このキーは強力な権限を持ちます。本番環境では厳重に管理してください
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZnR3eGtwZXF2bHVranlibmZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTgxMjMxNSwiZXhwIjoyMDc1Mzg4MzE1fQ.aagoyqouAINiKBXKngvimecxEq5K0boQk5Y8fQnIvJs

# Google Gemini AI
VITE_GEMINI_API_KEY=AIzaSyAfEI3sFVWbZvG9qp2Y8irYCuNMbZFbntw
```

---

## 🔐 APIキーの違い

| キー種類 | 権限レベル | RLS | 使用場所 | セキュリティ |
|---------|----------|-----|---------|------------|
| **anon key** | 制限あり | ✅ 適用 | フロントエンド | 低リスク（公開OK） |
| **service_role key** | 完全権限 | ❌ バイパス | バックエンドのみ | 高リスク（機密情報） |

---

## 📝 更新されたドキュメント

### 1. `.env` ファイル
- ✅ `VITE_SUPABASE_SERVICE_ROLE_KEY` を追加

### 2. `REQUIREMENTS.md`
- ✅ 環境変数セクションを追加
- ✅ Service Role Keyの使用用途を記載
- ✅ セキュリティ注意事項を記載

### 3. `docs/SERVICE_ROLE_KEY_USAGE.md`（新規作成）
- ✅ Service Role Keyの詳細な使用ガイド
- ✅ 適切な使用例・不適切な使用例
- ✅ セキュリティベストプラクティス
- ✅ インシデント発生時の対応手順

### 4. `SECURITY_CHECKLIST.md`
- ✅ APIキー管理セクションを更新
- ✅ Service Role Keyの注意事項を追加

---

## 🚀 次のステップ

### 開発環境
- [x] `.env` ファイルに Service Role Key 追加済み
- [x] ローカル開発環境で使用可能

### 本番環境（Vercel）
- [ ] Vercel Dashboard → Settings → Environment Variables
- [ ] `VITE_SUPABASE_SERVICE_ROLE_KEY` を追加
- [ ] Production環境のみに設定
- [ ] 再デプロイ

---

## ⚠️ セキュリティ注意事項

### 絶対にやってはいけないこと

1. **フロントエンドコードで使用**
   ```javascript
   // ❌ 絶対にダメ！
   const supabase = createClient(url, import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY)
   ```

2. **Gitにコミット**
   ```bash
   # ❌ 絶対にダメ！
   git add .env
   git commit -m "add env"
   ```

3. **公開リポジトリで共有**
   - GitHubのissueやPRに貼り付けない
   - Slackなど公開チャンネルに投稿しない

### 正しい使い方

1. **バックエンドスクリプト**
   ```javascript
   // ✅ OK: ローカルスクリプト
   import { createClient } from '@supabase/supabase-js'
   const supabaseAdmin = createClient(
     process.env.VITE_SUPABASE_URL,
     process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
   )
   ```

2. **環境変数管理**
   - ローカル: `.env` ファイル（Gitに含めない）
   - 本番: Vercel環境変数（Dashboard経由）

---

## 📚 関連ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [REQUIREMENTS.md](../REQUIREMENTS.md) | 環境変数一覧・技術スタック |
| [SERVICE_ROLE_KEY_USAGE.md](./SERVICE_ROLE_KEY_USAGE.md) | Service Role Key詳細ガイド |
| [SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md) | セキュリティチェックリスト |
| [DEPLOYMENT.md](../DEPLOYMENT.md) | デプロイ手順書 |

---

## ✅ チェックリスト

### 設定完了
- [x] `.env` ファイルに Service Role Key 追加
- [x] REQUIREMENTS.md に環境変数セクション追加
- [x] SERVICE_ROLE_KEY_USAGE.md 作成
- [x] SECURITY_CHECKLIST.md 更新

### 次のアクション
- [ ] Vercel環境変数に Service Role Key 追加（本番デプロイ時）
- [ ] 定期的なキーローテーション設定（3ヶ月ごと）
- [ ] アクセスログ監視設定

---

**作成日**: 2025-10-22
**作成者**: Claude Code
**バージョン**: 1.0
