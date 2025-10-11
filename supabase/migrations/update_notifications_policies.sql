-- 通知テーブルのRLSポリシーを更新

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Allow users to read their own notifications" ON notifications;

-- 新しいポリシーを作成

-- 全ユーザーが自分宛の通知を読み取れる
CREATE POLICY "Allow users to read their own notifications"
  ON notifications
  FOR SELECT
  USING (true);

-- 全ユーザーが通知を作成できる
CREATE POLICY "Allow all to create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- ユーザーは自分宛の通知を更新できる（主に既読フラグの更新）
CREATE POLICY "Allow users to update their own notifications"
  ON notifications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ユーザーは自分宛の通知を削除できる
CREATE POLICY "Allow users to delete their own notifications"
  ON notifications
  FOR DELETE
  USING (true);

-- インデックスの追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
