# 開発記録 (Changelog)

このファイルは、G-progressプロジェクトの開発変更履歴を記録します。

## [未リリース] - 2025-10-23

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
