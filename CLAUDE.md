# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト概要

G-progressは、株式会社Gハウスの建設プロジェクト管理システムです。契約から完了まで、建設プロジェクトのタスク、スケジュール、支払い、チーム割り当てを追跡します。

**技術スタック**: React + TypeScript + Vite + Supabase
**デザイン哲学**: Prismaテーマに準拠したユニバーサルデザイン

**Prismaデザイン原則** ⚠️ 最重要：すべてのコンポーネントで常に意識すること
- 大きく明確な文字サイズ（最小text-base、タイトルはtext-xl以上）
- 太いボーダー（border-3またはborder-4）を使用
- はっきりとした色使い（グラデーションよりもソリッドカラーを優先）
- 十分な余白とパディング（p-6〜p-8）
- クリック可能な要素は明確にホバーエフェクトを表示
- ユニバーサルデザイン（高齢者でも見やすい）
- ステータス表示のみ信号機カラー：赤（未着手）・黄（着手中）・青（完了）

**デザイン統一の原則** ⚠️ 最重要：UI/UX一貫性の確保
- **全ページで注文住宅事業のデザインに統一すること**
- 全ページで`LayoutPrisma`を使用し、サイドバー・ヘッダーのデザインを統一
- カードデザイン、フォントサイズ、ボーダー、余白などを全ページで統一
- **デザインの一貫性は作業性に直結する** - 社内利用者・フランチャイズ利用者の作業効率に影響
- 新規ページ作成時は必ず既存ページ（注文住宅事業）のデザインを参考にすること
- 文字を少なくし、視覚的にシンプルで分かりやすいUIを心がける

## 開発コマンド

```bash
# 開発サーバーを起動
npm run dev

# 本番環境用ビルド
tsc -b && vite build

# コードのLint
npm run lint

# 本番ビルドをプレビュー
npm run preview

# Supabase接続とデータの確認
npx tsx scripts/checkTasks.ts
```

## アーキテクチャ概要

### データベース構造 (Supabase)

アプリケーションはSupabaseを使用し、以下のコアテーブルで構成されています：

- **employees**: 従業員情報（部門：営業、設計、工事など、役割付き）
- **customers**: 顧客情報（複数名対応：`names: string[]`）
- **projects**: 建設プロジェクト情報（ステータス追跡付き）
- **tasks**: 個別作業項目（期限、Do's/Don'ts、マニュアル、動画付き）
- **payments**: 支払い追跡（契約金、着工金、上棟金、最終金）
- **vendors**: 外部業者・サービスプロバイダー
- **notifications**: ユーザー通知
- **audit_logs**: 監査ログ（活動追跡）

**データベースの重要概念**:
- すべてのテーブルでRLS（Row Level Security）が有効
- すべての操作は`src/lib/supabase.ts`のSupabaseクライアントを使用
- 環境変数：`.env`に`VITE_SUPABASE_URL`と`VITE_SUPABASE_ANON_KEY`

### タスク管理システム

タスクは独自のタイムラインベース表示を持ちます：
- タスクは**契約日からの経過日数**でグリッドに配置される（contract_date + N日）
- 各タスクは特定の**職種**（営業、設計、工事など）に属する
- タスクには以下が含まれる：
  - **ステータス**: `not_started`（赤：未着手）、`requested`（黄：着手中）、`completed`（青：完了）
  - **Do's/Don'ts**: タスクの指示事項
  - **マニュアル/動画URL**: 研修資料
  - **actual_completion_date**: 実際の完了日（due_dateとは別）

### プロジェクト詳細グリッド (ProjectDetail.tsx)

コア機能はExcel風のグリッド表示：
- **縦軸**: 契約日からの経過日数（0〜365日+）
- **横軸**: 部門 → 職種（営業部: 営業/営業事務/ローン事務など）
- **セル**: タスクは該当職種列の期限日行に表示される
- **今日マーカー**: 赤いボーダーで現在の日付を強調
- **セルダブルクリック**: その職種・日付の新規タスク作成モーダルを開く

部門構造：
```typescript
営業部: ['営業', '営業事務', 'ローン事務']
設計部: ['意匠設計', 'IC', '実施設計', '構造設計', '申請設計']
工事部: ['工事', '工事事務', '積算・発注']
外構事業部: ['外構設計', '外構工事']
```

### UI/UXデザイン原則

**ユニバーサルデザイン要件**:
- 大きく明確な文字（最小でもtext-base、重要な情報はtext-xl以上）
- 視覚的コミュニケーション（UIでは絵文字アイコンを使用しないこと）
- 太いボーダーのカードベースレイアウト（border-3またはborder-4）
- グラデーションによる色分けセクション（視覚的階層）
- 未選択ステータスボタンは白背景
- 高齢者にも使いやすいアクセシビリティ（お年寄りでもわかる）

**ステータスカラーシステム**:
- CSSクラス: `.task-not-started`, `.task-in-progress`, `.task-completed`
- 色は`src/index.css`で`!important`フラグ付きで定義
- 赤（未着手）: `#FCA5A5` 背景、`#DC2626` ボーダー
- 黄（着手中）: `#FDE047` 背景、`#EAB308` ボーダー
- 青（完了）: `#93C5FD` 背景、`#2563EB` ボーダー

### ページ構造

- **Login.tsx**: 認証ページ（現在は開発用にバイパス）
- **Dashboard.tsx**: 管理者モード（全プロジェクトの進捗表示）
- **ProjectList.tsx**: カードベースのプロジェクト一覧（CRUD操作付き）
- **ProjectDetail.tsx**: 個別プロジェクトのメインタイムライングリッド（タスク管理）
- **Calendar.tsx**: 全プロジェクトのタスクをカレンダー表示

### 状態管理

外部の状態管理ライブラリは使用せず、Reactフックを利用：
- `useState`でUIの状態管理
- `useEffect`でSupabaseからのデータ読み込み
- Supabase操作による直接的なリアルタイム更新

### スタイリングアプローチ

- グローバルスタイルは`src/index.css`
- コンポーネント固有のCSSは`src/components/Layout.css`
- Tailwind風ユーティリティクラスを手動定義
- セクションごとにパステルカラーパレット
- ブレークポイント（768px、1024px）でモバイル対応

## データベース操作

スキーマ変更を適用するには：
1. Supabaseダッシュボードを開く：https://app.supabase.com/project/qxftwxkpeqvlukjybnfp
2. SQL Editorに移動
3. `supabase/schema.sql`の内容を実行

サンプルデータを挿入するには：
- SQL Editorで`supabase/sample_data.sql`を実行
- または`/scripts`ディレクトリのスクリプトを使用：`npx tsx scripts/[スクリプト名].ts`

## 重要なコードパターン

### タスクの作成

タスクのdescriptionには`position`プレフィックスを含める必要があります：
```typescript
const taskData = {
  description: `${position}: ${taskDescription}`,
  // ... その他のフィールド
}
```

これにより、グリッドが職種でタスクをフィルタリングできます。

### タスクグリッドのフィルタリング

```typescript
const getTasksForPositionAndDay = (position: string, day: number) => {
  return tasks.filter(task => {
    const descriptionParts = task.description?.split(':')
    const taskPosition = descriptionParts?.[0]?.trim()
    return task.dayFromContract === day && taskPosition === position
  })
}
```

### 日付計算

`date-fns`ライブラリを使用：
```typescript
import { differenceInDays, addDays, format } from 'date-fns'
import { ja } from 'date-fns/locale'

// 契約日からの日数を計算
const dayFromContract = differenceInDays(new Date(dueDate), new Date(contractDate))

// 表示用に日付をフォーマット
format(new Date(date), 'yyyy年M月d日 (E)', { locale: ja })
```

## モーダルデザインパターン

タスク詳細モーダルはユニバーサルデザインに従います：
- 画面高さの95%に制限：`max-h-[95vh]`
- デスクトップで2列レイアウト：`grid-cols-1 lg:grid-cols-2`
- 左列：日付管理 + 作業内容
- 右列：Do's/Don'ts + マニュアル・動画リンク
- 大きなアイコンサイズ（text-3xlからtext-5xl）※UIでは絵文字を避けること
- グラデーション付きの色分けカード
- ステータスボタンは3列グリッド（信号機カラー）

## TypeScript型システム

すべてのデータベース型は`src/types/database.ts`で定義：
- ステータス列挙型にはユニオン型を使用（`TaskStatus`、`ProjectStatus`など）
- インターフェースはオプションの関連エンティティを含む（例：`Project`はオプションで`customer?: Customer`）
- Department型は具体的な職種を含み、一般的な部門名は含まない

**重要**: 部門グループ（営業部、設計部など）で従業員をフィルタリングする場合、職種配列を使用：
```typescript
// 正しい
employees.filter(e => ['営業', '営業事務', 'ローン事務'].includes(e.department))

// 間違い
employees.filter(e => e.department === '営業部')
```
