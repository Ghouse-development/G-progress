# G-progress デプロイメントガイド

本番環境へのデプロイ手順を説明します。

## 📋 前提条件

- Node.js 20.x以上
- npm 9.x以上
- Supabaseアカウント
- Vercelアカウント（推奨）またはその他のホスティングサービス
- GitHubリポジトリ

## 🗄️ 1. Supabaseセットアップ

### 1.1 プロジェクト作成

1. [Supabase](https://supabase.com/)にログイン
2. 「New Project」をクリック
3. プロジェクト情報を入力：
   - Name: `g-progress-production`
   - Database Password: 強力なパスワードを設定
   - Region: `Tokyo (Northeast Asia)`を選択
4. 「Create new project」をクリック

### 1.2 データベーススキーマのセットアップ

1. Supabase Dashboard > SQL Editorを開く
2. `supabase/migrations/`ディレクトリ内のSQLファイルを順番に実行：
   ```bash
   # ローカルで確認
   ls supabase/migrations/

   # 001から順番に実行
   ```

3. 重要なマイグレーション：
   - `001_initial_schema.sql` - 基本テーブル作成
   - `100_comprehensive_rls_policies.sql` - RLSポリシー
   - `101_performance_indexes.sql` - パフォーマンスインデックス

### 1.3 認証設定

1. Dashboard > Authentication > Providersを開く
2. Email認証を有効化
3. Site URL設定：
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/**`

### 1.4 API認証情報の取得

1. Dashboard > Settings > APIを開く
2. 以下をコピー：
   - Project URL
   - anon public key（本番環境用）

## 🚀 2. Vercelデプロイ

### 2.1 Vercelプロジェクト作成

1. [Vercel](https://vercel.com/)にログイン
2. 「Add New Project」をクリック
3. GitHubリポジトリを接続
4. フレームワーク設定：
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 2.2 環境変数の設定

Vercel Project > Settings > Environment Variablesで以下を設定：

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ENV=production
VITE_APP_NAME=G-progress
VITE_APP_VERSION=1.0.0
VITE_ENABLE_DEMO_MODE=false
```

オプション（AI機能を使用する場合）:
```
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_ENABLE_AI_ASSISTANT=true
```

### 2.3 カスタムドメイン設定（オプション）

1. Vercel Project > Settings > Domainsを開く
2. 「Add Domain」をクリック
3. カスタムドメインを入力（例: `g-progress.example.com`）
4. DNS設定の指示に従う

## 🔧 3. GitHub Actionsセットアップ

### 3.1 Secretsの設定

GitHub Repository > Settings > Secrets and variablesで以下を設定：

```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
```

取得方法：
1. **VERCEL_TOKEN**: Vercel > Settings > Tokens > Create Token
2. **VERCEL_ORG_ID**: Vercel Project > Settings > General > Project ID
3. **VERCEL_PROJECT_ID**: 同上

### 3.2 自動デプロイの確認

1. `master`または`main`ブランチにプッシュ
2. GitHub > Actionsタブで実行を確認
3. ビルド成功後、自動的にVercelにデプロイ

## ✅ 4. デプロイ後の確認

### 4.1 基本動作確認

- [ ] トップページが表示される
- [ ] ログインページが正常に動作
- [ ] Supabaseへの接続が成功
- [ ] 各ページが正しく表示される

### 4.2 セキュリティ確認

1. HTTPSが有効か確認
2. セキュリティヘッダーの確認：
   ```bash
   curl -I https://your-domain.com
   ```

   以下のヘッダーが含まれているか確認：
   - `Strict-Transport-Security`
   - `X-Content-Type-Options`
   - `X-Frame-Options`
   - `Content-Security-Policy`

3. RLSポリシーの動作確認

### 4.3 パフォーマンス確認

1. Lighthouseスコアチェック：
   ```bash
   npm install -g lighthouse
   lighthouse https://your-domain.com
   ```

2. 目標スコア：
   - Performance: 90+
   - Accessibility: 90+
   - Best Practices: 90+
   - SEO: 90+

## 🔄 5. 継続的メンテナンス

### 5.1 定期的な更新

- 依存パッケージの更新：
  ```bash
  npm audit
  npm update
  ```

- セキュリティパッチの適用：
  ```bash
  npm audit fix
  ```

### 5.2 バックアップ

Supabase Dashboard > Database > Backups で自動バックアップを確認

### 5.3 モニタリング

- Vercel Analytics（アクセス解析）
- Supabase Dashboard（データベースメトリクス）
- エラーログの定期確認

## 🆘 6. トラブルシューティング

### ビルドエラー

```bash
# ローカルでビルドテスト
npm run build

# TypeScriptエラーチェック
npx tsc --noEmit
```

### 環境変数が反映されない

1. Vercelで環境変数を再確認
2. 再デプロイを実行
3. ブラウザキャッシュをクリア

### Supabase接続エラー

1. Supabase URLとANON KEYを再確認
2. RLSポリシーが正しく設定されているか確認
3. ネットワーク接続を確認

## 📞 7. サポート

問題が解決しない場合：
- GitHub Issues: リポジトリのIssuesページで質問
- Supabase Support: https://supabase.com/support
- Vercel Support: https://vercel.com/support

---

**最終更新**: 2025-10-22
**バージョン**: 1.0.0
