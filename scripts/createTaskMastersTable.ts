import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const envPath = join(process.cwd(), '.env')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    envVars[key] = value
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY

console.log('⚠️  重要: この操作はSupabaseのダッシュボード上でSQLを実行する必要があります\n')
console.log('以下のSQLをSupabase SQL Editorで実行してください:\n')
console.log('=' .repeat(80))
console.log(`
-- タスクマスタテーブル
CREATE TABLE IF NOT EXISTS task_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  responsible_department TEXT,
  days_from_contract INTEGER NOT NULL DEFAULT 0,
  business_no INTEGER DEFAULT 1,
  task_order INTEGER DEFAULT 1,
  phase TEXT DEFAULT '契約後',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_task_masters_department ON task_masters(responsible_department);
CREATE INDEX IF NOT EXISTS idx_task_masters_days ON task_masters(days_from_contract);
CREATE INDEX IF NOT EXISTS idx_task_masters_business_no ON task_masters(business_no);

-- RLS有効化
ALTER TABLE task_masters ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Allow all authenticated users to read task_masters"
  ON task_masters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert task_masters"
  ON task_masters FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update task_masters"
  ON task_masters FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to delete task_masters"
  ON task_masters FOR DELETE
  TO authenticated
  USING (true);

-- トリガー設定
CREATE TRIGGER update_task_masters_updated_at
  BEFORE UPDATE ON task_masters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`)
console.log('=' .repeat(80))
console.log('\n📝 Supabaseダッシュボードでの操作手順:')
console.log('1. https://app.supabase.com/project/qxftwxkpeqvlukjybnfp を開く')
console.log('2. 左側メニューから "SQL Editor" を選択')
console.log('3. 上記のSQLをコピー＆ペースト')
console.log('4. "Run" ボタンをクリック')
console.log('\n✅ 完了後、アプリケーションでタスク管理マスタが使用可能になります')
