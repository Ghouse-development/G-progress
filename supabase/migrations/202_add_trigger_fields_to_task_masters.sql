-- タスクマスタにトリガー機能を追加
-- トリガータスク：他のタスクの起点となるタスク
-- トリガーからの日数：トリガータスクから何日後に実行するか

-- 新規カラムを追加
ALTER TABLE task_masters
ADD COLUMN IF NOT EXISTS is_trigger_task BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trigger_task_id UUID REFERENCES task_masters(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS days_from_trigger INTEGER DEFAULT 0;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_task_masters_is_trigger ON task_masters(is_trigger_task) WHERE is_trigger_task = TRUE;
CREATE INDEX IF NOT EXISTS idx_task_masters_trigger_task_id ON task_masters(trigger_task_id);

-- コメント追加
COMMENT ON COLUMN task_masters.is_trigger_task IS 'トリガータスクの有無（ONにするとトリガーのプルダウンに表示される）';
COMMENT ON COLUMN task_masters.trigger_task_id IS 'トリガータスクID（このタスクの起点となるタスク）';
COMMENT ON COLUMN task_masters.days_from_trigger IS 'トリガーからの日数（プラスマイナス対応、例: +5日、-3日）';
