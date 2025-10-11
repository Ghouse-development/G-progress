# Supabase Edge Functions - 自動化・バッチ処理

このディレクトリには、G-progressシステムの自動化タスクを実行するSupabase Edge Functionsが含まれています。

## 📋 利用可能な関数

### 1. `daily-task-check`
**目的**: 毎日、遅延しているタスクをチェックして通知を作成

**実行タイミング**: 毎日午前9時（JST）

**機能**:
- 期限切れの未完了タスクを検出
- 担当者に遅延通知を送信
- 遅延日数を計算して表示

### 2. `payment-reminder`
**目的**: 支払い期限が近い案件や期限超過案件を検出

**実行タイミング**: 毎日午前6時（JST）

**機能**:
- 7日以内に期限が来る支払いを検出
- 期限超過の支払いを検出
- 営業部門の全メンバーに通知

### 3. `weekly-report`
**目的**: 週次の活動サマリーレポートを生成

**実行タイミング**: 毎週月曜日午前10時（JST）

**機能**:
- 過去7日間の統計を集計
- 新規契約、完了プロジェクト、タスク完了数を集計
- 売上合計を計算
- 管理者とマネージャーに送信

## 🚀 デプロイ手順

### 前提条件
- Supabase CLIがインストールされていること
- Supabaseプロジェクトにログインしていること

### 1. Supabase CLIのインストール

```bash
npm install -g supabase
```

### 2. Supabaseにログイン

```bash
supabase login
```

### 3. プロジェクトにリンク

```bash
supabase link --project-ref <YOUR_PROJECT_REF>
```

プロジェクトREFは、SupabaseダッシュボードのProject Settings > Generalから確認できます。

### 4. 環境変数の設定

Supabaseダッシュボードで以下の環境変数を設定:
- `SUPABASE_URL`: プロジェクトのURL
- `SUPABASE_SERVICE_ROLE_KEY`: サービスロールキー

### 5. 関数をデプロイ

全ての関数をデプロイ:
```bash
supabase functions deploy daily-task-check
supabase functions deploy payment-reminder
supabase functions deploy weekly-report
```

個別にデプロイする場合:
```bash
supabase functions deploy daily-task-check
```

## 🔧 GitHub Actionsの設定

### 1. GitHubリポジトリのSecretsを設定

リポジトリの Settings > Secrets and variables > Actions で以下を追加:

- `SUPABASE_URL`: SupabaseプロジェクトのURL
  - 例: `https://xxxxxxxxxxxx.supabase.co`
- `SUPABASE_ANON_KEY`: Supabase Anon Key
  - Supabase Dashboard > Project Settings > API から取得

### 2. ワークフローの有効化

`.github/workflows/scheduled-tasks.yml` をリポジトリにプッシュすると、自動的にスケジュールされたジョブが有効になります。

### 3. 手動実行

GitHub Actions > Scheduled Tasks > Run workflow から手動で実行可能です。

## 🧪 ローカルテスト

### Supabase CLIを使用してローカルで実行

```bash
# Supabaseローカル環境を起動
supabase start

# 関数をローカルで実行
supabase functions serve daily-task-check --no-verify-jwt

# 別のターミナルから関数を呼び出し
curl -X POST http://localhost:54321/functions/v1/daily-task-check \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## 📊 実行スケジュール

| 関数 | 実行頻度 | 実行時刻（JST） | cron式 |
|------|---------|----------------|--------|
| daily-task-check | 毎日 | 9:00 AM | `0 0 * * *` |
| payment-reminder | 毎日 | 6:00 AM | `0 21 * * *` |
| weekly-report | 毎週月曜 | 10:00 AM | `0 1 * * 1` |

## 🔐 セキュリティ

- 全ての関数はSupabase Service Role Keyを使用してRLSをバイパスします
- CORS設定により、承認されたオリジンからのみアクセス可能
- GitHub Actionsは環境変数として保存されたシークレットを使用

## 📧 メール通知の追加（オプション）

現在、関数は通知テーブルにレコードを挿入するだけですが、メール送信サービス（SendGrid、Resendなど）を統合して、実際のメール通知を送信できます。

### SendGridの例

```typescript
// 関数内でメール送信
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY'))

const msg = {
  to: employee.email,
  from: 'noreply@g-progress.com',
  subject: '遅延タスク通知',
  text: `タスク「${task.title}」が遅延しています。`,
  html: `<p>タスク「<strong>${task.title}</strong>」が遅延しています。</p>`
}

await sgMail.send(msg)
```

## 🐛 トラブルシューティング

### 関数がデプロイできない

```bash
# プロジェクトとのリンクを確認
supabase projects list

# 再リンク
supabase unlink
supabase link --project-ref <YOUR_PROJECT_REF>
```

### 関数が実行されない

- GitHub ActionsのログでエラーをチェックCredentials
- Supabase ダッシュボードの Logs > Edge Functions でログを確認
- 環境変数が正しく設定されているか確認

### 通知が作成されない

- RLSポリシーが正しく設定されているか確認
- `notifications` テーブルに挿入権限があるか確認
- Supabase Service Role Keyを使用しているか確認

## 📚 参考資料

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
