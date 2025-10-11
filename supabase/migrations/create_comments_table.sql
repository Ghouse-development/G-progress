-- コメントテーブルの作成
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- リレーション
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- スレッド返信用

  -- コメント内容
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}', -- メンションされたユーザーIDの配列

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  edited BOOLEAN DEFAULT FALSE,

  -- 制約: projectまたはtaskのいずれかが必要
  CONSTRAINT comment_target CHECK (
    (project_id IS NOT NULL AND task_id IS NULL) OR
    (project_id IS NULL AND task_id IS NOT NULL)
  )
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.edited = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();

-- RLSポリシー
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 全従業員が自分の所属プロジェクト/タスクのコメントを閲覧可能
CREATE POLICY "Employees can view comments on their projects"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()
    )
  );

-- 全従業員がコメントを作成可能
CREATE POLICY "Employees can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
  );

-- 自分のコメントのみ更新可能
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 自分のコメントのみ削除可能（管理者は全て削除可能）
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid() AND e.role = '管理者'
    )
  );

-- メンション時の通知を作成するトリガー関数
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user_id UUID;
  project_name TEXT;
  task_name TEXT;
BEGIN
  -- メンションがある場合のみ処理
  IF array_length(NEW.mentions, 1) > 0 THEN
    -- プロジェクト名またはタスク名を取得
    IF NEW.project_id IS NOT NULL THEN
      SELECT p.project_name INTO project_name
      FROM projects p
      WHERE p.id = NEW.project_id;
    END IF;

    IF NEW.task_id IS NOT NULL THEN
      SELECT t.title INTO task_name
      FROM tasks t
      WHERE t.id = NEW.task_id;
    END IF;

    -- 各メンションユーザーに通知を作成
    FOREACH mentioned_user_id IN ARRAY NEW.mentions LOOP
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        related_project_id,
        related_task_id,
        read
      ) VALUES (
        mentioned_user_id,
        'コメントでメンションされました',
        CASE
          WHEN project_name IS NOT NULL THEN 'プロジェクト「' || project_name || '」でメンションされました'
          WHEN task_name IS NOT NULL THEN 'タスク「' || task_name || '」でメンションされました'
          ELSE 'コメントでメンションされました'
        END,
        'mention',
        NEW.project_id,
        NEW.task_id,
        FALSE
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mention_notifications
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notifications();

COMMENT ON TABLE comments IS 'プロジェクトとタスクへのコメント・スレッド';
COMMENT ON COLUMN comments.mentions IS 'メンションされたユーザーIDの配列';
COMMENT ON COLUMN comments.parent_comment_id IS 'スレッド返信の場合、親コメントID';
