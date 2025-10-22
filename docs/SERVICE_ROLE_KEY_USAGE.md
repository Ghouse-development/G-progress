# Service Role Key 使用ガイド

**Supabase Service Role Key の安全な使用方法**

---

## 🔐 Service Role Keyとは

Supabase Service Role Keyは、**RLS (Row Level Security) ポリシーをバイパス**し、データベースへの**完全なアクセス権限**を持つ特権キーです。

### 権限の違い

| キー種類 | 権限レベル | RLS | 用途 |
|---------|----------|-----|------|
| **anon key** | 制限あり | ✅ 適用される | フロントエンド・一般ユーザー |
| **service_role key** | 完全権限 | ❌ バイパス | バックエンド・管理操作 |

---

## ✅ 適切な使用例

### 1. 初期データ投入

RLSポリシーが設定された後の大量データ投入：

```javascript
// scripts/seed.ts
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! // Service Role使用
)

async function seedData() {
  // RLSをバイパスして大量データを投入
  const { data, error } = await supabaseAdmin
    .from('employees')
    .insert([
      { /* ... 大量のデータ */ }
    ])

  if (error) throw error
  console.log('データ投入完了:', data.length, '件')
}
```

### 2. 管理者専用API（バックエンド）

```javascript
// api/admin/deleteUser.ts (サーバーサイド)
import { createClient } from '@supabase/supabase-js'

export async function deleteUser(userId: string) {
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // サーバー環境変数
  )

  // ユーザー削除（関連データも含む）
  await supabaseAdmin.auth.admin.deleteUser(userId)
  await supabaseAdmin.from('employees').delete().eq('id', userId)
}
```

### 3. バックアップスクリプト

```javascript
// scripts/backup.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
)

async function backupAllData() {
  const tables = ['employees', 'customers', 'projects', 'tasks']

  for (const table of tables) {
    const { data } = await supabaseAdmin.from(table).select('*')
    fs.writeFileSync(`backup/${table}.json`, JSON.stringify(data, null, 2))
  }

  console.log('バックアップ完了')
}
```

---

## ❌ 不適切な使用例（絶対にNG）

### 1. フロントエンドコードで使用 ❌

```javascript
// ❌ 絶対にダメ！ブラウザに露出します
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xxx.supabase.co',
  'service_role_key_here' // ❌ フロントエンドでService Role使用
)

// ユーザーがブラウザの開発者ツールでキーを確認できてしまう
```

### 2. 公開リポジトリにコミット ❌

```bash
# ❌ 絶対にダメ！
git add .env
git commit -m "add env file"
git push

# Gitに含めないよう .gitignore で除外する
```

### 3. クライアントサイドの認証処理 ❌

```javascript
// ❌ ダメ！認証はanon keyで行う
const supabaseAdmin = createClient(url, serviceRoleKey)
await supabaseAdmin.auth.signInWithPassword({ email, password })
```

---

## 🛡️ セキュリティベストプラクティス

### 1. 環境変数での管理

#### 開発環境
```bash
# .env（ローカル開発用）
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### 本番環境
```bash
# Vercel環境変数設定（Dashboard経由）
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. `.gitignore` 設定

```gitignore
# 環境変数ファイルを除外
.env
.env.local
.env.production
.env.*.local

# バックアップファイル
backup/*.json
```

### 3. 使用場所の制限

**✅ 使用OK**:
- サーバーサイドAPI（Vercel Functionsなど）
- ローカルスクリプト（seed, migration, backup）
- CI/CD パイプライン（GitHub Actions）

**❌ 使用NG**:
- フロントエンドコード（React components）
- ブラウザで実行されるコード
- 公開されるビルドファイル

### 4. キーのローテーション

定期的にService Role Keyを更新：

1. Supabase Dashboard → Settings → API
2. 「Reset service_role secret」をクリック
3. 新しいキーをコピー
4. 環境変数を更新
5. アプリケーションを再デプロイ

### 5. アクセスログの監視

```sql
-- Supabase Logsで監視
-- Dashboard → Logs → API Logs
-- service_role認証の使用状況を確認
```

---

## 📊 G-progressでの使用状況

### 現在の使用箇所

| ファイル | 用途 | 理由 |
|---------|------|------|
| （未使用） | - | 現在はanon keyのみ使用中 |

### 今後の使用予定

| 機能 | 使用方法 | 優先度 |
|------|---------|:------:|
| 初期データ投入 | scripts/seed.ts | ⭐⭐⭐ |
| ユーザー一括登録 | scripts/bulkCreateUsers.ts | ⭐⭐ |
| データバックアップ | scripts/backup.ts | ⭐⭐⭐ |
| 管理者専用API | api/admin/* | ⭐⭐ |

---

## 🚨 インシデント発生時の対応

### Service Role Keyが漏洩した場合

1. **即座にキーをリセット**
   - Supabase Dashboard → Settings → API → Reset service_role secret

2. **不正アクセスの調査**
   - Dashboard → Logs → API Logs で異常なアクセスを確認
   - Audit Logsで不正操作がないか確認

3. **影響範囲の確認**
   ```sql
   -- 最近の変更を確認
   SELECT * FROM audit_logs
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

4. **データ整合性の確認**
   - 重要なテーブルのレコード数確認
   - バックアップからの差分確認

5. **再発防止**
   - 全環境変数の見直し
   - アクセス制御の強化
   - チームへの注意喚起

---

## 📝 チェックリスト

### デプロイ前
- [ ] `.env` ファイルが `.gitignore` に含まれている
- [ ] Service Role Keyがフロントエンドコードに含まれていない
- [ ] 本番環境の環境変数設定完了（Vercel Dashboard）
- [ ] ローカルの `.env` と本番環境で異なるキーを使用

### 定期チェック（月次）
- [ ] アクセスログの異常確認
- [ ] 不要なService Role Key使用箇所の削除
- [ ] キーローテーションの実施（3ヶ月ごと推奨）

---

## 📚 関連ドキュメント

- [Supabase Service Role Key 公式ドキュメント](https://supabase.com/docs/guides/api/api-keys)
- [REQUIREMENTS.md](../REQUIREMENTS.md) - 環境変数一覧
- [SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md) - セキュリティチェックリスト
- [DEPLOYMENT.md](../DEPLOYMENT.md) - デプロイ手順

---

**最終更新**: 2025-10-22
**作成者**: Claude Code
**バージョン**: 1.0
