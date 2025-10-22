# G-progress

株式会社Gハウスの建設プロジェクト管理システム

契約から完了まで、建設プロジェクトのタスク、スケジュール、支払い、チーム割り当てを一元管理します。

---

## 📚 ドキュメント

### 📖 開発者向け

| ドキュメント | 内容 | 優先度 |
|------------|------|:------:|
| [CLAUDE.md](./CLAUDE.md) | プロジェクト概要・アーキテクチャ・開発ガイド | ⭐⭐⭐ |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | 要件定義・機能仕様 | ⭐⭐⭐ |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | デプロイ手順（Supabase + Vercel） | ⭐⭐⭐ |

### 📊 プロジェクト管理

| ドキュメント | 内容 | 優先度 |
|------------|------|:------:|
| [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | リリース工程表・進捗管理（65%→100%） | ⭐⭐⭐ |

### 🛠️ 運用チーム向け

| ドキュメント | 内容 | 優先度 |
|------------|------|:------:|
| [OPERATIONS_MANUAL.md](./OPERATIONS_MANUAL.md) | 運用マニュアル（日次・週次・月次作業） | ⭐⭐⭐ |
| [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) | セキュリティチェックリスト | ⭐⭐⭐ |
| [DISASTER_RECOVERY.md](./docs/DISASTER_RECOVERY.md) | 災害復旧計画 | ⭐⭐ |

---

## 🎯 プロジェクト概要

- **プロジェクト名**: G-progress（ジープログレス）
- **開発責任者**: 西野秀樹
- **目的**: 社内業務の見える化・スケジュール内でのタスク完全実行
- **対象ユーザー**: 全従業員（営業、設計、工事、事務など）+ フランチャイズ加盟店
- **技術スタック**: React 18 + TypeScript + Vite + Supabase
- **デザイン**: Apple調モノクロ（ステータス表示のみ信号機カラー）
- **進捗**: **85%完了** → 本番リリース準備完了
- **リリース目標**: 2025年11月下旬

## 開発環境のセットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env` ファイルは既に作成済みです。Supabase認証情報が設定されています。

### 3. Supabaseデータベースのセットアップ

`supabase/schema.sql` の内容をSupabaseダッシュボードのSQL Editorで実行してください。

詳細は `supabase/README.md` を参照してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

## プロジェクト構造

```
G-progress/
├── src/
│   ├── components/      # Reactコンポーネント
│   │   ├── Layout.tsx   # レイアウトコンポーネント
│   │   ├── Layout.css   # レイアウトスタイル
│   │   └── DashboardHome.tsx  # ダッシュボード
│   ├── pages/           # ページコンポーネント
│   │   ├── Login.tsx    # ログインページ
│   │   └── Dashboard.tsx # ダッシュボードページ
│   ├── lib/             # ライブラリ
│   │   └── supabase.ts  # Supabaseクライアント
│   ├── types/           # TypeScript型定義
│   │   └── database.ts  # データベース型定義
│   ├── App.tsx          # アプリケーションルート
│   ├── main.tsx         # エントリーポイント
│   └── index.css        # グローバルスタイル
├── supabase/
│   ├── schema.sql       # データベーススキーマ
│   └── README.md        # Supabaseセットアップガイド
└── README.md            # このファイル
```

## 機能

### 実装済み (65%完了)
- ✅ 認証・ログイン機能
- ✅ ダッシュボード（年度別、商品構成、入金予定など）
- ✅ 案件管理（一覧、詳細、100+フィールド）
- ✅ カレンダー機能
- ✅ 入金管理
- ✅ 性能管理
- ✅ マスタ管理（商品、タスク、従業員、部門、拠点、役職）
- ✅ CSV インポート
- ✅ 監査ログ
- ✅ コメント機能
- ✅ Prismaスタイルモーダル統一

### 実装予定 (35%残り)
- ⬜ モード切替（担当者/拠点/全社）
- ⬜ 年度選択機能
- ⬜ 権限管理強化
- ⬜ エラーハンドリング統一
- ⬜ テスト（カバレッジ60%+）
- ⬜ 本番環境構築
- ⬜ ユーザーマニュアル

詳細は [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) を参照

## 🔐 初期ログイン情報

**システム管理者アカウント**:
- **メール**: admin@ghouse.jp
- **パスワード**: Ghouse0648

**注意**:
- 初回デプロイ時は `docs/ADMIN_USER_SETUP.md` を参照してユーザーを作成してください
- 本番環境では必ずパスワードを変更してください
- ログイン手順の詳細: `docs/QUICK_LOGIN_GUIDE.md`

## デプロイ

- **GitHub**: https://github.com/Ghouse-development/G-progress.git
- **ホスティング**: Vercel（予定）
- **データベース**: Supabase

## ライセンス

Private - 株式会社Gハウス
