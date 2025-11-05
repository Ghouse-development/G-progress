# Prismaデザインルール 完全版

**作成日**: 2025年11月5日
**対象**: G-progressシステム全ページ
**目的**: UI/UX統一による作業効率向上

---

## 1. ヘッダーサイズ

### ページヘッダー
- **高さ**: `--header-height: 46px` (固定)
- **フォントサイズ**: `16px`
- **フォントウェイト**: `600` (semibold)
- **パディング**: `0 16px`
- **ボーダー**: `border-bottom: 1px solid var(--border-color)`

```css
.prisma-header {
  height: 46px;
  padding: 0 16px;
  border-bottom: 1px solid #e5e7eb;
}

.prisma-header-title {
  font-size: 16px;
  font-weight: 600;
}
```

### カードヘッダー
- **パディング**: `8px 10px`
- **フォントサイズ**: `15px`
- **フォントウェイト**: `600`
- **背景**: `#f9fafb`
- **ボーダー**: `border-bottom: 1px solid var(--border-color)`

```css
.prisma-card-header {
  padding: 8px 10px;
  font-size: 15px;
  font-weight: 600;
  background: #f9fafb;
}
```

---

## 2. 文字サイズ

### 基本フォントサイズ
- **body基本**: `12px`
- **line-height**: `1.35`

### コンポーネント別フォントサイズ
| コンポーネント | サイズ | 用途 |
|--------------|------|------|
| サイドバーロゴ | 16px | ブランディング |
| ページタイトル | 16px | ヘッダー |
| カードタイトル | 15px | セクション見出し |
| 通常テキスト | 12px | 本文・ラベル |
| ボタン | 12px | アクション |
| ボタン(小) | 11px | 補助アクション |
| テーブルヘッダー | 12px | データテーブル |
| テーブルセル | 12px | データ表示 |
| バッジ | 11px | ステータス表示 |
| サイドバーセクションタイトル | 10px | ナビゲーション区分 |

### モバイル対応
```css
@media (max-width: 768px) {
  .prisma-btn { font-size: 16px; }
  .prisma-input, .prisma-select { font-size: 16px; } /* iOSズーム防止 */
  .prisma-header-title { font-size: 18px; }
}
```

---

## 3. ボタンデザイン

### 基本ボタン
```css
.prisma-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
```

### ボタンバリエーション
#### プライマリボタン
```css
.prisma-btn-primary {
  background: #3b82f6;
  color: white;
}
.prisma-btn-primary:hover {
  background: #2563eb;
}
```

#### セカンダリボタン
```css
.prisma-btn-secondary {
  background: #ffffff;
  color: #111827;
  border: 2px solid #e5e7eb;
}
.prisma-btn-secondary:hover {
  background: #f3f4f6;
}
```

#### デンジャーボタン
```css
.prisma-btn-danger {
  background: #FEE2E2;
  color: #DC2626;
  border: 2px solid #FCA5A5;
}
.prisma-btn-danger:hover {
  background: #FCA5A5;
  border-color: #DC2626;
}
```

### サイズバリエーション
```css
.prisma-btn-sm {
  padding: 5px 10px;
  font-size: 11px;
}
```

### モバイル対応
```css
@media (max-width: 768px) {
  .prisma-btn {
    padding: 12px 16px;
    font-size: 16px;
    min-height: 48px; /* タッチターゲット */
    font-weight: 600;
  }
}
```

---

## 4. テーブルデザイン

### 基本構造
```css
.prisma-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}
```

### ヘッダー
```css
.prisma-table thead {
  background: #f3f4f6;
}

.prisma-table th {
  padding: 6px 8px;
  text-align: left; /* または center */
  font-size: 12px;
  font-weight: 600;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 2px solid #e5e7eb;
}
```

### セル
```css
.prisma-table td {
  padding: 5px 8px;
  border-bottom: 2px solid #f3f4f6;
  color: #111827;
  font-size: 12px;
}
```

### ホバー効果
```css
.prisma-table tbody tr:hover {
  background: #f3f4f6;
}
```

### 列幅制御
```html
<table class="prisma-table table-fixed w-full">
  <colgroup>
    <col style="width: 35%" />
    <col style="width: 20%" />
    <!-- ... -->
  </colgroup>
</table>
```

### 重要ルール
- **thとtdのpadding値は必ず揃える**: ヘッダーとセルで同じpaddingを使用
- **列幅固定**: `table-fixed`と`colgroup`で列幅を明示的に指定
- **ボーダー統一**: thead下は2px、行間は2px（light）

---

## 5. モーダルデザイン

### 基本構造
```css
.prisma-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 20px;
}

.prisma-modal {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```

### モーダルヘッダー
```css
.prisma-modal-header {
  padding: 16px 20px;
  border-bottom: 2px solid #e5e7eb;
}

.prisma-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}
```

### モーダルコンテンツ
```css
.prisma-modal-content {
  padding: 20px;
}
```

### モーダルフッター
```css
.prisma-modal-footer {
  padding: 12px 20px;
  border-top: 2px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
```

### サイズバリエーション
- **デフォルト**: `max-width: 600px`
- **大型**: `max-width: 900px` (複雑なフォーム用)
- **全画面**: `max-width: 95vw, max-height: 95vh`

---

## 6. タブデザイン

### 基本構造
```css
.prisma-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 8px;
}
```

### タブボタン
```css
.prisma-tab {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.prisma-tab:hover {
  color: #3b82f6;
  background: #dbeafe;
}

.prisma-tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  font-weight: 600;
}
```

### 実装例
```html
<div class="prisma-tabs">
  <button class="prisma-tab active">タブ1</button>
  <button class="prisma-tab">タブ2</button>
  <button class="prisma-tab">タブ3</button>
</div>
```

---

## 7. 余白のルール

### マージン・パディングスケール
| クラス | 値 | 用途 |
|--------|-----|------|
| mt-1, mb-1 | 4px | 最小間隔 |
| mt-2, mb-2 | 8px | 標準間隔 |
| mt-3, mb-3 | 12px | セクション間 |
| mt-4, mb-4 | 16px | 大きな区切り |
| gap-2 | 8px | Flexアイテム間 |
| gap-3 | 12px | Flexアイテム間（広め） |
| gap-4 | 16px | Flexアイテム間（最広） |

### コンテンツエリアパディング
```css
.prisma-content {
  padding: 0; /* 上下左右余白なし */
}
```

### カードパディング
```css
.prisma-card {
  padding: 10px;
  margin-bottom: 8px;
}
```

### レイアウト余白
- **サイドバー幅**: `160px`
- **ヘッダー高さ**: `46px`

---

## 8. スクロールバーのルール

### デスクトップ
```css
.prisma-content {
  overflow: auto;
}

/* カスタムスクロールバー（Webkit） */
.prisma-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.prisma-content::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.prisma-content::-webkit-scrollbar-thumb {
  background: #9ca3af;
  border-radius: 4px;
}

.prisma-content::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
```

### テーブル横スクロール
```css
.prisma-table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* iOS smooth scroll */
}
```

---

## 9. 色のルール

### メインカラーパレット
```css
:root {
  /* プライマリ */
  --primary-blue: #3b82f6;
  --primary-blue-hover: #2563eb;
  --primary-blue-light: #dbeafe;

  /* セマンティックカラー */
  --success-green: #10b981;
  --warning-yellow: #f59e0b;
  --danger-red: #ef4444;

  /* ニュートラル */
  --main-bg: #ffffff;
  --main-text: #111827;
  --border-color: #e5e7eb;
  --border-color-light: #f3f4f6;

  /* サイドバー */
  --sidebar-bg: #1f2937;
  --sidebar-hover: #374151;
  --sidebar-active: #4b5563;
  --sidebar-text: #f9fafb;
  --sidebar-text-secondary: #9ca3af;
}
```

### バッジカラー
```css
.prisma-badge-blue { background: #dbeafe; color: #3b82f6; }
.prisma-badge-green { background: #d1fae5; color: #10b981; }
.prisma-badge-yellow { background: #fef3c7; color: #f59e0b; }
.prisma-badge-red { background: #fee2e2; color: #ef4444; }
.prisma-badge-gray { background: #f3f4f6; color: #6b7280; }
```

### タスクステータスカラー（信号機）
```css
/* 未着手（赤） */
.task-not-started {
  background: #FCA5A5 !important;
  border: 2px solid #DC2626 !important;
}

/* 着手中（黄） */
.task-in-progress {
  background: #FDE047 !important;
  border: 2px solid #EAB308 !important;
}

/* 完了（青） */
.task-completed {
  background: #93C5FD !important;
  border: 2px solid #2563EB !important;
}
```

### データ表示カラー
- **予定金額**: `text-blue-700 font-bold`
- **実績金額**: `text-green-700 font-bold`
- **遅延表示**: `text-red-600 font-bold`
- **警告**: `text-orange-600`

---

## 10. 図解・チャートのルール

### カード型データ表示
```css
.prisma-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
}
```

### グリッドレイアウト
```html
<!-- 2列グリッド -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <div class="prisma-card">...</div>
  <div class="prisma-card">...</div>
</div>

<!-- 4列グリッド（ダッシュボード統計カード） -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div class="prisma-card">...</div>
  <!-- ... -->
</div>
```

### 統計カード
```html
<div class="prisma-card">
  <div class="text-xs text-gray-600">売上高</div>
  <div class="text-2xl font-bold text-blue-600">¥12,500,000</div>
  <div class="text-xs text-gray-500">前月比 +15%</div>
</div>
```

### アイコン・絵文字
- **UIコンポーネントでは絵文字を使用しない**
- **視覚的コミュニケーションはカラーとレイアウトで表現**
- **アイコンはSVGまたはフォントアイコンを使用**

---

## 11. ボーダー・角丸のルール

### ボーダー幅
- **強調**: `2px`
- **通常**: `1px`
- **テーブル**: `2px`（ヘッダー下・外枠）

### 角丸半径
- **カード・ボタン・インプット**: `6px`
- **モーダル**: `8px`
- **バッジ**: `12px`

```css
border-radius: 6px;  /* 基本 */
border-radius: 8px;  /* モーダル */
border-radius: 12px; /* バッジ・カウンター */
```

---

## 12. シャドウのルール

### シャドウ定義
```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

### 使用例
- **カードホバー**: `box-shadow: var(--shadow-md);`
- **モーダル**: `box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);`
- **ハンバーガーメニュー**: `box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);`

---

## 13. トランジションのルール

### 標準トランジション
```css
transition: all 0.15s ease;
```

### 用途別
- **ボタン**: `0.15s ease`
- **サイドバーアイテム**: `0.15s ease`
- **タブ**: `0.2s ease`
- **モバイルサイドバー**: `0.3s ease`

---

## 14. レスポンシブブレークポイント

### ブレークポイント定義
```css
/* モバイル: ≤768px */
@media (max-width: 768px) {
  /* タッチターゲット: 48px */
  /* フォントサイズ: 16px (iOS zoom prevention) */
}

/* タブレット: ≤1024px */
@media (max-width: 1024px) {
  /* テーブル横スクロール */
}

/* 極小スマホ: ≤480px */
@media (max-width: 480px) {
  /* さらにコンパクト化 */
}
```

---

## 15. 適用チェックリスト

全ページで以下を確認：

### ヘッダー
- [ ] `prisma-header` クラス使用
- [ ] タイトルは `prisma-header-title` (16px, font-weight 600)
- [ ] 高さ 46px 固定

### ボタン
- [ ] `prisma-btn` + `prisma-btn-primary/secondary/danger`
- [ ] フォントサイズ 12px
- [ ] パディング 6px 12px

### テーブル
- [ ] `prisma-table` クラス使用
- [ ] `colgroup` で列幅固定
- [ ] th と td のパディングが揃っている (6px 8px / 5px 8px)
- [ ] ヘッダーは `text-transform: uppercase`

### タブ
- [ ] `prisma-tabs` コンテナ + `prisma-tab` ボタン
- [ ] アクティブタブに `.active` クラス

### モーダル
- [ ] `prisma-modal-overlay` + `prisma-modal`
- [ ] ヘッダー・コンテンツ・フッター構造
- [ ] 最大幅 600px（または 900px/95vw）

### カード
- [ ] `prisma-card` クラス使用
- [ ] ボーダー 2px, 角丸 6px

### 余白
- [ ] `prisma-content` のパディングは 0
- [ ] セクション間は margin-bottom: 8px

### 色
- [ ] CSS変数 (`var(--primary-blue)` 等) を使用
- [ ] ステータスは信号機カラー

---

## 16. 実装例

### ページ基本構造
```html
<div class="prisma-layout">
  <aside class="prisma-sidebar">
    <!-- サイドバー -->
  </aside>

  <main class="prisma-main">
    <header class="prisma-header">
      <h1 class="prisma-header-title">ページタイトル</h1>
      <div class="prisma-header-actions">
        <button class="prisma-btn prisma-btn-primary">新規作成</button>
      </div>
    </header>

    <div class="prisma-content">
      <!-- タブがある場合 -->
      <div class="prisma-tabs">
        <button class="prisma-tab active">タブ1</button>
        <button class="prisma-tab">タブ2</button>
      </div>

      <!-- テーブル -->
      <table class="prisma-table table-fixed w-full">
        <colgroup>
          <col style="width: 40%" />
          <col style="width: 30%" />
          <col style="width: 30%" />
        </colgroup>
        <thead>
          <tr>
            <th class="text-center">項目1</th>
            <th class="text-center">項目2</th>
            <th class="text-center">項目3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-center">データ1</td>
            <td class="text-center">データ2</td>
            <td class="text-center">データ3</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</div>
```

---

**このデザインルールは、G-progressシステム全体の一貫性を保証し、社内利用者・FC利用者の作業効率を最大化するための統一規格です。すべての新規実装・改修時に本ドキュメントを参照してください。**
