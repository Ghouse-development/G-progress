# 開発記録 (Changelog)

このファイルは、G-progressプロジェクトの開発変更履歴を記録します。

## [未リリース] - 2025-10-27

### UI/UXの大幅改善：ダッシュボード＆粗利益管理のカード形式化 (2025-10-27)

#### 改善内容

**1. 粗利益管理ページの全面刷新**
- **レイアウト変更**: 横スクロールテーブル → レスポンシブカードグリッド（2列）
- **主要KPI大型カード追加**（4つ）:
  - 売上（完工）、原価（完工）、粗利益（完工）、粗利益率（完工）
  - グラデーション背景＋大型アイコン（32px）
  - text-3xl（30px）フォントサイズで数値を強調
- **警告サマリーカード追加**（2つ）:
  - 粗利率20%未満の案件（黄色）
  - 予算差5%以上の案件（赤色）
  - text-4xl（36px）フォントサイズで件数を強調表示
- **プロジェクトカード機能**:
  - 問題の重症度による色分けボーダー（赤=両方問題、黄=低粗利率、橙=大差額、灰=正常）
  - 粗利益・粗利益率を2x2グリッドで見やすく表示
  - 詳細表示の折りたたみ機能（Eye/EyeOffアイコン）
  - 実行予算と完工実績の比較表示
- **フィルタボタン強化**:
  - 大きな角丸ボタン（px-6 py-3）
  - アクティブ状態は色付き背景＋影

**2. ダッシュボードページの全面刷新**
- **主要KPI大型カード**（4つ）:
  - 売上高（青）、粗利益（緑）、完工棟数（紫）、遅延タスク（赤/灰）
  - 各カードに達成率バッジ（100%以上=緑、80%以上=黄、未満=赤）
  - グラデーション背景＋大型アイコン（36px）
  - text-3xl（30px）フォントサイズで数値を強調
- **サブ指標カード**（6つ）:
  - 入金実績、変更契約、平均坪数、平均契約額、契約→引渡日数、従業員数
  - 小型アイコン（20px）＋text-2xl（24px）フォント
  - 2-3-6列のレスポンシブグリッド
- **商品構成セクション改善**:
  - 円グラフサイズ拡大（240px → 280px）
  - 凡例をカード形式に変更（背景色・ボーダー付き）
  - 横並びレイアウトで見やすく
- **月次推移グラフセクション**:
  - 5つのチャートを2列グリッド配置
  - 統一されたカードデザイン（白背景、角丸、2pxボーダー）
  - カラフルなバーで区別（青、緑、紫、青赤、オレンジ）
  - 年度累計と当月の数値を下部に大きく表示
  - 引き渡し数はQ1-Q4の四半期別表示
  - グラフフォントサイズ13px（太字）
- **拠点別経営状況セクション**:
  - 全社サマリーカード：6指標をアイコン付きで表示
  - 各拠点カード（3列グリッド）:
    - 拠点名ヘッダーに建物アイコン
    - 粗利率を大きく強調（15%以上=緑、10-15%=黄、10%未満=赤）
    - 売上・粗利益をグラデーションカードで表示
    - 基本指標と生産性指標を整理
  - 粗利益率の目安を色付きバッジで表示

**3. Prismaデザイン統一の完了**
- **対象ファイル**: 33ファイル（20ページ + 13コンポーネント）
- **統一内容**:
  - 全てtext-base（16px）以上のフォントサイズ
  - テーブルボーダーを太いボーダー（border-3）から通常ボーダー（border）に変更
  - 一貫したカラーパレット
  - 統一されたボタン・カードデザイン

**4. 最終デザイン統一：Reports、ApprovalFlow、Settings**
- **Reports.tsx**:
  - 統計カードにグラデーション背景追加（purple/red/cyan/yellow）
  - グラフの枠線を黒からグレー（#374151）に変更
  - 月次レポートセクションのボーダーを統一（border-2 border-orange-400）
  - 月次レポートカードを強化（border-2、shadow-md、font-black）
  - エクスポートドロップダウンのボーダー統一
- **ApprovalFlow.tsx**:
  - 統計カード4枚をグラデーション形式に刷新
  - 各カードにアイコン追加（Layers、Clock、CheckCircle、XCircle）
  - 数値フォントをfont-black（900）に変更
  - border-2とshadow-lg追加で立体感向上
- **Settings.tsx**:
  - タブナビゲーションのボーダーを統一（border-b-2 border-gray-300）
  - LINE連携セクションのボーダー統一（border-2 border-green-300）
  - 全体的なデザインの一貫性確保

**5. 拠点別経営状況の視認性改善＋粗利益管理の統合UI**
- **NewDashboard.tsx**:
  - 全社サマリーカードのフォントサイズ向上（text-xs → text-base、18px → 24px）
  - 全社サマリーカードの数値サイズ向上（text-2xl → text-3xl）
  - 各拠点カードの売上・粗利益ラベルをtext-baseに統一
  - 各拠点カードの数値をtext-xlに拡大
- **GrossProfitManagement.tsx**:
  - 統計カード＋警告サマリー＋フィルターを1つの大きなカードに統合
  - 主要指標4つ（売上・原価・粗利益・粗利益率）をコンパクトに配置
  - 警告サマリー2つ（粗利率20%未満、予算差5%以上）を境界線で区切り
  - フィルターボタンを同一カード内に配置し、情報の一覧性を向上
- **demoData.ts**:
  - 従業員データを3人から19人に拡大（5拠点に配置）
  - 本部（5人）、豊中（4人）、奈良（3人）、京都（4人）、西宮（3人）
  - 全従業員にbranch_id（拠点ID）を追加
  - プロジェクトデータを各拠点に均等分散（各拠点2件ずつ）
  - プロジェクトにsales_staffオブジェクトを追加し、拠点情報と連携

#### 技術的改善
- Lucide Reactアイコン追加：DollarSign, TrendingUp, Home, AlertCircle, Target, Award, Users, Building2
- グラデーション背景：bg-gradient-to-br from-X-50 to-X-100
- 状態管理：showDetails（折りたたみ状態）、toggleDetails（トグル関数）
- レスポンシブグリッド：grid-cols-1 md:grid-cols-2 lg:grid-cols-3/4
- 条件付きスタイリング：問題の重症度による動的className

#### ファイル変更
- `src/pages/GrossProfitManagement.tsx`: カードグリッド形式に全面刷新
- `src/pages/NewDashboard.tsx`: カードベースUIに全面刷新
- `src/pages/DelayedTasks.tsx`: 統計カードをグラデーション形式に改善、テーブルボーダー統一
- `src/pages/TaskBoard.tsx`: カードボーダーを統一（border-3 → border-2）
- `src/pages/Calendar.tsx`: className重複修正（2箇所）
- `src/pages/ProjectList.tsx`: className重複修正（3箇所）
- `src/pages/TaskByPosition.tsx`: className重複修正（2箇所）
- `src/pages/TaskMasterManagement.tsx`: 文字列リテラル構文エラー修正
- `src/pages/Reports.tsx`: 統計カード強化、グラフ枠線統一、月次レポートセクション改善
- `src/pages/ApprovalFlow.tsx`: 統計カードをグラデーション形式に刷新
- `src/pages/Settings.tsx`: ボーダー統一（border-3 → border-2）
- `src/components/GlobalSearch.tsx`: フォントサイズ統一
- `src/components/NotificationBell.tsx`: フォントサイズ統一
- `src/components/CommentSection.tsx`: ボーダー・フォントサイズ統一

#### 効果
- **視認性向上**: 大きなフォント（text-2xl〜text-4xl）とアイコンで一目で状況把握
- **情報整理**: カード形式で情報をグループ化し、スキャンしやすく
- **問題の可視化**: 色分けで注意が必要な項目がすぐわかる
- **直感的理解**: グラフと数値を組み合わせて総合的に表示
- **レスポンシブ対応**: モバイルからデスクトップまで最適表示

---

## [未リリース] - 2025-10-23

### モバイルUI改善(第2弾)：レイアウト・表示問題の徹底修正 (2025-10-23 20:30)

#### 修正した問題
- **TopPage (事業選択画面)**: カード内テキストが縦書きになる問題を修正
  - グリッドレイアウトを `repeat(auto-fit, minmax(280px, 1fr))` でレスポンシブ対応
  - モバイル時は1列表示に自動切り替え
  - カード内フォントサイズ20px、アイコン48pxに拡大

- **ProjectList (案件一覧画面)**: 進捗マトリクスが表示されない/見にくい問題を修正
  - カード高さを固定から`auto`に変更（maxHeight: 600px）
  - ボタンサイズ拡大（fontSize: 15px, minHeight: 44px）とflexWrap追加
  - バッジにflexWrap追加で折り返し対応
  - テーブルヘッダーフォントサイズを12px→13pxに拡大
  - タイトルフォントサイズ18px

- **PaymentManagement (入金管理画面)**: 情報バーの文字が見切れる問題を修正
  - フォントサイズ14px→15px（強調部分16px）に拡大
  - line-height: 1.6で行間を広く
  - padding拡大（p-3→p-4）

#### 技術的改善
- flexWrapによる自動折り返しレイアウト
- minmax()によるレスポンシブグリッド
- 固定高さから自動高さへの変更
- タッチターゲットサイズの最適化（44px以上）

#### ファイル変更
- `src/pages/TopPage.tsx`: グリッドレイアウト・カードデザイン改善
- `src/pages/ProjectList.tsx`: 進捗マトリクス表示改善
- `src/pages/PaymentManagement.tsx`: 情報バー視認性向上
- `src/styles/prisma-theme.css`: TopPageモバイル用CSS追加

---

### モバイルUI改善：フォントサイズ・パディング・タッチターゲット最適化 (2025-10-23 19:00)

#### 改善
- **Prismaテーマのモバイル最適化** (`src/styles/prisma-theme.css`):
  - **ヘッダー**: 高さ56px（→52px極小）、タイトル18px（→16px極小）、font-weight: 700
  - **コンテンツ**: パディング16px 12px（→12px 10px極小）
  - **ボタン**: 最小高さ48px（→44px極小）、font-size: 16px（→15px極小）、font-weight: 600
  - **モーダル**: max-width: calc(100vw - 16px)、パディング20px 16px（→16px 12px極小）
  - **モーダルタイトル**: 20px（→18px極小）
  - **テーブル**: min-width: 500px（→450px極小）、font-size: 14px（→13px極小）
  - **テーブルセル**: パディング12px 10px（→10px 8px極小）
  - **入力フィールド**: 最小高さ48px、font-size: 16px（iOSズーム防止）
  - **ラベル**: font-size: 15px、font-weight: 600
  - **見出し**: h1: 24px（→22px極小）、h2: 20px（→18px極小）、h3: 18px（→16px極小）

#### ブレークポイント
- **768px以下**: タブレット・スマートフォン対応
- **480px以下**: 極小スマートフォン対応（さらにコンパクト化）

#### 技術的改善
- タッチターゲット最小サイズ44-48px確保（W3C推奨）
- iOSの自動ズーム防止（入力フィールド16px以上）
- 視認性向上のためフォント太さ調整
- コンテンツ領域のパディング最適化

#### ファイル変更
- `src/styles/prisma-theme.css`: モバイル・極小モバイル用メディアクエリ大幅改善

---

### タスクマスタ管理機能の拡張 (2025-10-23 17:30)

#### 追加
- **職種フィルタ機能**:
  - プルダウンで全職種・各職種を選択して表示
  - 初期表示は「全職種」
  - フィルタ結果の件数表示
  - 全職種リストはORGANIZATION_HIERARCHYから自動生成

- **ドラッグ＆ドロップによる並び順変更**:
  - タスクマスタの行をドラッグして順番を変更可能
  - ドラッグ中は行が半透明になり視覚的フィードバック
  - cursor: moveでドラッグ可能であることを明示
  - リアルタイムで並び順を更新

#### 改善
- タスクマスタ一覧のユーザビリティ向上
- フィルタリングと並び替えの組み合わせによる柔軟な管理

#### 技術的実装
- HTML5 Drag & Drop API使用
- filteredTaskMastersによる効率的なフィルタリング
- draggedTaskIdステートでドラッグ状態管理
- 配列spliceによる並び替えロジック

#### ファイル変更
- `src/pages/TaskMasterManagement.tsx`: 職種フィルタ＆ドラッグ＆ドロップ機能追加

---

### レスポンシブデザイン：スマホ・タブレット完全対応 (2025-10-23 16:00)

#### 追加
- **統一メディアクエリシステム** (`src/index.css`):
  - ブレークポイント統一（モバイル小: 320-479px、モバイル大: 480-767px、タブレット: 768-1023px、PC: 1024px以上）
  - モバイル版モーダル全画面化対応
  - タッチターゲット最小サイズ44px確保
  - iOS自動ズーム防止（font-size: 16px）
  - タッチデバイス専用スタイル（慣性スクロール、タッチフィードバック）

#### 改善
- **ProjectList.tsx**:
  - 進捗マトリクステーブルの`minWidth: 2000px`を削除
  - 担当者列（営業/設計/工事）をPC版のみ表示（lg:table-cell）
  - WebkitOverflowScrolling有効化

- **ProjectDetail.tsx**:
  - グリッドビューに慣性スクロール追加
  - アイコンボタンサイズ拡大（p-1→p-2、size 14→16）
  - タッチターゲット改善

- **TaskMasterManagement.tsx**:
  - テーブル列をレスポンシブ表示
    - フェーズ、責任職種: タブレット以上で表示（sm:table-cell）
    - 契約日から、トリガーから: PC版のみ表示（md:table-cell）
    - 目的: 大画面のみ表示（lg:table-cell）
  - WebkitOverflowScrolling有効化

- **Calendar.tsx**:
  - イベント表示フォントサイズをレスポンシブ化（text-sm md:text-base lg:text-lg）
  - 慣性スクロール追加

#### 技術的改善
- **モバイルファースト対応**:
  - 全モーダルがビューポート基準サイズに対応
  - テーブル横スクロールの最適化
  - グリッド要素の1列表示切り替え
  - フレックス要素の縦並び自動変換

- **タッチデバイス最適化**:
  - ボタン最小サイズ44×44px確保
  - タッチフィードバック強化（opacity + scale）
  - スクロール慣性有効化（-webkit-overflow-scrolling: touch）
  - ホバー効果無効化（タッチデバイスでは不要）

- **パフォーマンス**:
  - メディアクエリのブレークポイント統一
  - CSSの冗長性削減
  - タッチイベント最適化

#### ファイル変更
- `src/index.css`: 250行以上のレスポンシブスタイル追加
- `src/pages/ProjectList.tsx`: テーブルレスポンシブ対応
- `src/pages/ProjectDetail.tsx`: グリッドビュー最適化、ボタンサイズ調整
- `src/pages/TaskMasterManagement.tsx`: テーブル列制御
- `src/pages/Calendar.tsx`: フォントサイズ調整、スクロール最適化

#### テスト推奨環境
- スマートフォン: 375×667px (iPhone SE)、360×740px (Android標準)
- タブレット: 768×1024px (iPad)、1024×600px (Android Tablet)
- PC: 1920×1080px以上

---

### バグ修正：コード品質の改善 (2025-10-23 14:30)

#### 修正
- **ProjectDetail.tsx ソートロジックのバグ修正**:
  - construction_start_dateソート時に同じ値を比較していたバグを修正
  - 正しくdayFromContractで比較するように変更（lines 633-637）

- **TaskMasterManagement.tsx video_url削除**:
  - UIに存在していたが保存されないvideo_urlフィールドを削除
  - データベーススキーマに存在しないため、ユーザーの混乱を防止

- **ProjectList.tsx 職種フィルタリングの統一**:
  - 担当者選択ドロップダウンのハードコード職種リストを削除
  - ORGANIZATION_HIERARCHYを使用した統一的な職種管理に変更
  - getPositionsForDepartmentヘルパー関数を追加
  - getDepartmentStatus関数もORGANIZATION_HIERARCHYを使用するように修正

#### 改善
- **コードの保守性向上**:
  - 職種定義の一元管理により、組織変更時の修正箇所を削減
  - ORGANIZATION_HIERARCHYが唯一の真実の情報源（Single Source of Truth）

#### ファイル変更
- `src/pages/ProjectDetail.tsx`: ソートロジック修正
- `src/pages/TaskMasterManagement.tsx`: video_url削除
- `src/pages/ProjectList.tsx`: 職種フィルタリング統一

---

### バグ修正と機能改善 (2025-10-23 12:20)

#### 削除
- **古いコンポーネントを削除**: `src/components/TaskMasterManagement.tsx`
  - ページ版（`src/pages/TaskMasterManagement.tsx`）に統一
  - 古いバージョンには新機能が未実装だったため削除

#### 実装
- **show_in_progressフィルタを実装**:
  - ProjectDetail.tsx: タスクマスタクエリに`show_in_progress`を追加
  - ProjectList.tsx: 進捗表示で`show_in_progress=false`のタスクを除外
  - グリッドビューと職種別一覧ビューは常に全タスクを表示（仕様通り）

#### 改善
- **days_from_trigger入力処理をシンプル化**:
  - 不要なelse分岐を削除
  - コメントを明確化
  - コードの可読性向上

#### ファイル変更
- `src/components/TaskMasterManagement.tsx`: 削除
- `src/pages/ProjectDetail.tsx`: show_in_progressフィールド追加
- `src/pages/ProjectList.tsx`: show_in_progressフィルタ実装
- `src/pages/TaskMasterManagement.tsx`: 入力処理改善

---

### タスクマスタ管理機能の改善 (2025-10-23 12:10)

#### 追加
- **進捗管理表に掲載するか**: 新しいフィールドを追加
  - タスクマスタごとに進捗管理表への掲載有無を設定可能
  - ラジオボタンで「掲載する」「掲載しない」を選択
  - デフォルトは「掲載する」（TRUE）
  - 案件一覧の進捗表示に影響（グリッドビュー・職種別一覧ビューは常に表示）

#### 変更
- **責任部署 → 責任職種**: ラベル名称を変更
  - より正確な表現に修正
  - テーブルヘッダー、モーダルラベルすべて統一
  - データベースカラム名は既存のまま（responsible_department）

#### データベースマイグレーション
- `204_add_show_in_progress_to_task_masters.sql`: 進捗管理表掲載フィールド追加SQL

#### ファイル変更
- `src/types/database.ts`: TaskMaster型に`show_in_progress`フィールド追加、コメント更新
- `src/pages/TaskMasterManagement.tsx`: UI更新、新フィールド追加、ラベル変更

---

### タスクマスタ管理機能の改善 (2025-10-23 11:40)

#### 修正
- **トリガーからの日数入力**: マイナス値入力の完全修正（独立ステート管理）
  - 入力フィールド専用の文字列ステート `daysFromTriggerInput` を追加
  - `type="number"` → `type="text"` に変更
  - 正規表現（`/^-?\d+$/`）で入力値を検証
  - マイナス記号「-」を入力中も正しく表示される
  - マイナス記号を含む整数値（-3、5など）が完全に入力可能
  - onBlurイベントで不完全な入力を自動補正

#### 技術的改善
- formDataとは別に入力フィールド用のstateを管理することで、入力中の中間状態を保持
- これにより「-」単体での入力も可能に

---

### タスクマスタ管理機能の改善 (2025-10-23 11:20)

#### 修正
- **トリガーからの日数入力**: マイナス値入力の問題を再修正（第二回目の試み）
  - `parseInt`から`Number()`に変更してマイナス値の処理を改善
  - 空文字列の場合は明示的に0を設定
  - ※この修正では問題が解決せず、type="text"への変更が必要だった

---

### タスクマスタ管理機能の改善 (2025-10-23 11:00)

#### 修正
- **トリガーからの日数入力**: マイナス値が入力できない問題を修正（第一回目の試み）
  - `parseInt`の処理を改善
  - 空の値やNaNのケースを適切に処理
  - onKeyDownハンドラを追加

---

### タスクマスタ管理機能の改善 (2025-10-23 10:30)

#### 追加
- **トリガー設定バッジ**: トリガー設定がONのタスクに青いバッジ「トリガー」を表示
- **トリガーからの日数列**: 新しい列を追加し、トリガーからの相対日数を表示
  - プラス値（+5日など）: 緑色のバッジ
  - マイナス値（-3日など）: オレンジ色のバッジ
- **フェーズの整理**: 5つのフェーズに統一（内定、契約前、着工前、着工後、引き渡し後）

#### 改善
- **レスポンシブデザイン**: スマホ・タブレット対応を改善
  - 横スクロール対応でテーブル全体を表示
  - 中画面以下では「目的」列を非表示にして見やすく
  - パディングを調整（px-6 → px-4）
- **トリガー機能UI**: 青・緑のボックスで視覚的に分離
  - 「トリガー設定の有無」: 青いボックス
  - 「トリガーを設定する」: 緑のボックス
- **エラーハンドリング**: 詳細なエラーログ出力を追加

#### 修正
- **データベーススキーマ**: task_mastersテーブルの完全な再構築
  - 不足していたカラム（dos, donts, manual_url等）を追加
  - トリガー機能のカラム（is_trigger_task, trigger_task_id, days_from_trigger）を追加
  - 関連タスクのカラム（related_task_master_ids）を追加

#### データベースマイグレーション
- `FINAL_FIX_task_masters.sql`: 完全なテーブル再作成SQL
- `203_add_missing_task_master_columns.sql`: 不足カラム追加SQL
- `202_add_trigger_fields_to_task_masters.sql`: トリガーフィールド追加SQL

#### ファイル変更
- `src/pages/TaskMasterManagement.tsx`: テーブルUIの大幅な改善
- `src/constants/organizationHierarchy.ts`: 組織階層定義の追加
- `src/types/database.ts`: TaskMaster型の更新

---

## 開発ガイドライン

### コミットメッセージ形式
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント
- style: コードスタイル
- refactor: リファクタリング
- test: テスト
- chore: その他

### ブランチ戦略
- `master`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `fix/*`: バグ修正

---

## 今後の予定

### 優先度: 高
- [ ] タスクマスタのトリガー機能の実装完了
- [ ] プロジェクト詳細画面でのトリガータスク連動
- [ ] モバイル対応の完全化

### 優先度: 中
- [ ] タスクマスタのインポート/エクスポート機能
- [ ] タスクマスタのバージョン管理

### 優先度: 低
- [ ] タスクマスタのテンプレート機能
- [ ] タスクマスタのカテゴリ管理
