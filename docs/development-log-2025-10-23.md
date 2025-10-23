# 開発記録 - 2025年10月23日

## 実施した作業

### 1. tasksテーブルにtask_master_idカラムを追加（400エラー修正）

**問題**:
- `tasks`テーブルに`task_master_id`カラムが存在しないため、Supabaseクエリで400エラーが発生
- TypeScript型定義とデータベーススキーマに不一致があった

**解決策**:
- マイグレーション`205_add_task_master_id_to_tasks.sql`を作成
- 外部キー制約`tasks_task_master_id_fkey`を追加
- ProjectList.tsxとTaskByPosition.tsxのJOIN構文を修正

**影響範囲**:
- `src/pages/ProjectList.tsx` (2箇所)
- `src/pages/TaskByPosition.tsx` (1箇所)
- `supabase/migrations/205_add_task_master_id_to_tasks.sql` (新規)

---

### 2. 設定ページとシステム設定ページを統合

**変更内容**:
- `Settings.tsx`に`SystemSettings.tsx`の機能を統合
- タブ切り替えで3つのセクションを表示：
  1. **基本設定**: デモモード、ダークモード
  2. **kintone連携**: 設定、接続テスト、バックアップ
  3. **システム構想**: システムロードマップ

**UI改善**:
- タブナビゲーションで直感的に切り替え可能
- Prismaデザインに統一
- アイコンで視認性を向上

**影響範囲**:
- `src/pages/Settings.tsx` (大幅変更: 164行 → 556行)

---

### 3. system_settingsとbackup_logsテーブルの追加

**目的**:
- Settings画面のkintone連携機能のため
- 404エラーの解消

**作成したテーブル**:
- `system_settings`: kintone設定などのシステム設定を保存
- `backup_logs`: バックアップ履歴を保存

**影響範囲**:
- `supabase/migrations/206_create_system_tables.sql` (新規)

**構文エラー修正**:
- PostgreSQLでは`CREATE POLICY IF NOT EXISTS`がサポートされていない
- `DROP POLICY IF EXISTS` + `CREATE POLICY`に変更
- `CREATE TRIGGER IF NOT EXISTS` → `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`に変更

---

### 4. 粗利益管理画面のテーブル列配置を修正

**問題**:
- テーブルのヘッダーとデータの列がずれていた

**解決策**:
- `table-layout: fixed`で列幅を固定
- `<colgroup>`で各列に明確な幅を設定（20%, 15%, 18%, 18%, 18%, 11%）
- ヘッダーのフォントサイズを`text-base`に統一

**影響範囲**:
- `src/pages/GrossProfitManagement.tsx`

---

### 5. 粗利益管理画面のサマリーカードのレイアウト改善

**変更内容**:
- サマリーカード（売上、原価、粗利益、粗利益率）を縦並びに変更
- アイコン、ラベル、数値を縦に配置
- 中央揃えで視認性向上
- ラベルの直下に数値を表示

**影響範囲**:
- `src/pages/GrossProfitManagement.tsx`

---

## 技術的な学び

### PostgreSQL構文の制約

1. **CREATE POLICY IF NOT EXISTS は使えない**
   ```sql
   -- ❌ エラー
   CREATE POLICY IF NOT EXISTS "policy_name" ON table_name ...

   -- ✅ 正しい
   DROP POLICY IF EXISTS "policy_name" ON table_name;
   CREATE POLICY "policy_name" ON table_name ...
   ```

2. **CREATE TRIGGER IF NOT EXISTS は使えない**
   ```sql
   -- ❌ エラー
   CREATE TRIGGER IF NOT EXISTS trigger_name ...

   -- ✅ 正しい
   DROP TRIGGER IF EXISTS trigger_name ON table_name;
   CREATE TRIGGER trigger_name ...
   ```

### Supabase外部キーJOINの構文

```typescript
// 外部キー制約名を明示的に指定
task_master:task_masters!tasks_task_master_id_fkey(show_in_progress)
```

### テーブルレイアウトの固定

```typescript
<table style={{ tableLayout: 'fixed', width: '100%' }}>
  <colgroup>
    <col style={{ width: '20%' }} />
    <col style={{ width: '15%' }} />
    // ...
  </colgroup>
</table>
```

---

## 今後の課題

### 1. 案件詳細のUI変更（保留中）

**要求**:
- 初期表示をグリッドビューにする（✅ 既に達成）
- その横に職種別ビュー
- その横に基本情報、スケジュール、金額、融資、解体、土地、性能値のタブ

**課題**:
- ProjectDetail.tsxは1748行の大規模ファイル
- 大幅なレイアウト変更が必要
- ユーザーの要求を再確認する必要がある

### 2. データの整理整頓

- 不要なファイルの削除
- 古いマイグレーションファイルの整理
- 使用されていないコンポーネントの削除

### 3. 要件定義書の更新

- 重要な機能要件を文書化
- データベース構造の更新
- API仕様の明確化

---

## コミット履歴

1. `4fa4471` - tasksテーブルにtask_master_idカラムを追加して400エラーを修正
2. `57f8c3f` - 設定ページとシステム設定ページを統合
3. `6130769` - 粗利益管理画面のテーブル列配置を修正 & システムテーブル追加
4. `8703f99` - 粗利益管理画面のレイアウト改善 & Supabaseマイグレーション修正

---

## 次回作業予定

1. ✅ Supabaseマイグレーション実行の確認
2. ⏳ 案件詳細のUI変更（要確認）
3. ⏳ データの整理整頓
4. ⏳ 要件定義書の更新
5. ⏳ エラーログの確認と修正

---

**作成日時**: 2025年10月23日
**作成者**: Claude Code
**プロジェクト**: G-progress（業務管理システム）
