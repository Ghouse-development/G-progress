# G-progress

株式会社Gハウスの業務管理システム

## 概要

- **開発責任者**: 西野秀樹
- **目的**: 社内業務の見える化・スケジュール内でのタスク完全実行
- **技術スタック**: React + TypeScript + Vite + Supabase
- **デザイン**: Apple調モノクロ（信号機能のみ色使用）

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

### 実装済み
- ✅ プロジェクト構造セットアップ
- ✅ Supabase認証統合
- ✅ データベーススキーマ設計
- ✅ 基本レイアウト（左メニュー、上通知バー）
- ✅ ログインページ
- ✅ TypeScript型定義

### 実装予定
- ⬜ 案件一覧画面（Excel風UI）
- ⬜ 案件詳細画面（タブ構造）
- ⬜ ダッシュボード（信号表示、グラフ）
- ⬜ カレンダー機能
- ⬜ 通知システム
- ⬜ 監査ログ
- ⬜ スマホ対応

## 初期ログイン情報

- **メール**: admin@ghouse.jp
- **パスワード**: Ghouse0648

## デプロイ

- **GitHub**: https://github.com/Ghouse-development/G-progress.git
- **ホスティング**: Vercel（予定）
- **データベース**: Supabase

## ライセンス

Private - 株式会社Gハウス
