-- トリガーマスタテーブルを作成
CREATE TABLE IF NOT EXISTS public.triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLSを有効化
ALTER TABLE public.triggers ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Triggers are viewable by everyone" ON public.triggers
  FOR SELECT USING (true);

-- 認証されたユーザーが挿入・更新・削除可能
CREATE POLICY "Triggers are insertable by authenticated users" ON public.triggers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Triggers are updatable by authenticated users" ON public.triggers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Triggers are deletable by authenticated users" ON public.triggers
  FOR DELETE USING (auth.role() = 'authenticated');

-- 初期トリガーデータを挿入
INSERT INTO public.triggers (name) VALUES
  ('請負契約日'),
  ('間取確定日'),
  ('最終打合せ日'),
  ('長期GO'),
  ('変更契約'),
  ('着工'),
  ('上棟'),
  ('完了検査'),
  ('引き渡し')
ON CONFLICT (name) DO NOTHING;

-- task_mastersテーブルにtrigger_idカラムを追加
ALTER TABLE public.task_masters
ADD COLUMN IF NOT EXISTS trigger_id UUID REFERENCES public.triggers(id);

-- days_from_contractをdays_from_triggerに変更（既存データは保持）
ALTER TABLE public.task_masters
ADD COLUMN IF NOT EXISTS days_from_trigger INTEGER DEFAULT 0;

-- 既存のdays_from_contractデータをdays_from_triggerにコピー
UPDATE public.task_masters
SET days_from_trigger = days_from_contract
WHERE days_from_trigger IS NULL OR days_from_trigger = 0;

-- デフォルトのトリガーIDを「請負契約日」に設定
UPDATE public.task_masters
SET trigger_id = (SELECT id FROM public.triggers WHERE name = '請負契約日' LIMIT 1)
WHERE trigger_id IS NULL;

COMMENT ON TABLE public.triggers IS 'タスクのトリガーマスタ';
COMMENT ON COLUMN public.task_masters.trigger_id IS 'タスクのトリガー（どの日付を基準とするか）';
COMMENT ON COLUMN public.task_masters.days_from_trigger IS 'トリガーからの日数';
