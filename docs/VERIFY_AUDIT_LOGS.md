# 監査ログ確認ガイド

**タスクのステータス変更が正しく記録されているか確認する方法**

---

## 🔍 確認方法

### 1. Supabase Dashboardで確認

1. **Supabase Dashboard** にアクセス
   - https://app.supabase.com/project/qxftwxkpeqvlukjybnfp

2. **Table Editor** を開く
   - 左メニュー → Table Editor

3. **audit_logs** テーブルを選択

4. **最新のレコードを確認**
   - `action` 列が `update` のレコードを探す
   - `table_name` 列が `tasks` のレコードを確認
   - `changes` 列にステータス変更の履歴が保存されているか確認

### 2. SQLで確認

Supabase Dashboard → SQL Editor で以下のクエリを実行：

```sql
-- タスクのステータス変更履歴を確認
SELECT
  al.id,
  al.created_at,
  e.last_name || ' ' || e.first_name as user_name,
  al.action,
  al.table_name,
  al.record_id,
  al.changes,
  al.description
FROM audit_logs al
LEFT JOIN employees e ON e.id = al.user_id
WHERE al.table_name = 'tasks'
  AND al.action = 'update'
ORDER BY al.created_at DESC
LIMIT 20;
```

**期待される結果**:
- タスクのステータスを変更すると、audit_logsテーブルに自動的にレコードが追加される
- `changes` 列に `{"status": "old_value"}` → `{"status": "new_value"}` の形式で保存される
- `description` 列に「タスク「〇〇」のステータスを「未着手」→「完了」に変更しました」のようなメッセージが保存される

---

## ❌ 問題: 監査ログが保存されていない場合

### 考えられる原因

1. **audit_logsテーブルが存在しない**
   ```sql
   -- テーブルの存在確認
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'audit_logs';
   ```

2. **RLSポリシーで書き込みがブロックされている**
   ```sql
   -- RLSポリシー確認
   SELECT * FROM pg_policies WHERE tablename = 'audit_logs';
   ```

3. **useAuditLogフックが正しく動作していない**
   - `src/hooks/useAuditLog.ts` を確認

---

## ✅ 解決方法

### 1. audit_logsテーブルの作成

もし `audit_logs` テーブルが存在しない場合、以下のSQLを実行：

```sql
-- audit_logsテーブルの作成
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES employees(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  changes JSONB,
  description TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- RLSの有効化
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの設定
CREATE POLICY "Allow authenticated users to read audit_logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert audit_logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### 2. RLSポリシーの確認と修正

もし書き込みポリシーがない場合：

```sql
-- INSERTポリシーの追加
CREATE POLICY "Allow authenticated users to insert audit_logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### 3. useAuditLogフックの確認

`src/hooks/useAuditLog.ts` を開いて、以下を確認：

```typescript
export function useAuditLog() {
  const logUpdate = async (
    tableName: string,
    recordId: string,
    oldValues: any,
    newValues: any,
    description?: string
  ) => {
    try {
      const employeeId = localStorage.getItem('selectedEmployeeId')
      if (!employeeId) return

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: employeeId,
          action: 'update',
          table_name: tableName,
          record_id: recordId,
          changes: {
            old: oldValues,
            new: newValues
          },
          description: description || `${tableName}を更新しました`,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('監査ログの保存に失敗:', error)
      }
    } catch (error) {
      console.error('監査ログエラー:', error)
    }
  }

  return { logUpdate, logCreate, logDelete }
}
```

---

## 🧪 テスト方法

### 1. タスクのステータスを変更

1. G-progressアプリを開く
2. 案件詳細ページでタスクをクリック
3. ステータスを「未着手」→「完了」に変更

### 2. 監査ログを確認

```sql
-- 最新の監査ログを確認
SELECT
  al.*,
  e.last_name || ' ' || e.first_name as user_name
FROM audit_logs al
LEFT JOIN employees e ON e.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 5;
```

**期待される結果**:
- 新しいレコードが追加されている
- `action` = 'update'
- `table_name` = 'tasks'
- `changes` に変更前後の値が保存されている

---

## 📊 監査ログの確認クエリ集

### 今日の変更履歴

```sql
SELECT
  al.created_at,
  e.last_name || ' ' || e.first_name as user_name,
  al.table_name,
  al.action,
  al.description
FROM audit_logs al
LEFT JOIN employees e ON e.id = al.user_id
WHERE DATE(al.created_at) = CURRENT_DATE
ORDER BY al.created_at DESC;
```

### 特定ユーザーの変更履歴

```sql
SELECT
  al.created_at,
  al.table_name,
  al.action,
  al.description
FROM audit_logs al
WHERE al.user_id = '[ユーザーID]'
ORDER BY al.created_at DESC
LIMIT 50;
```

### 特定タスクの変更履歴

```sql
SELECT
  al.created_at,
  e.last_name || ' ' || e.first_name as user_name,
  al.action,
  al.changes,
  al.description
FROM audit_logs al
LEFT JOIN employees e ON e.id = al.user_id
WHERE al.table_name = 'tasks'
  AND al.record_id = '[タスクID]'
ORDER BY al.created_at DESC;
```

---

## 📚 関連ドキュメント

- [REQUIREMENTS.md](../REQUIREMENTS.md) - システム要件
- [SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md) - セキュリティチェックリスト
- [SQL_EXECUTION_CHECKLIST.md](./SQL_EXECUTION_CHECKLIST.md) - SQL実行手順

---

**作成日**: 2025-10-22
**最終更新**: 2025-10-22
**バージョン**: 1.0
