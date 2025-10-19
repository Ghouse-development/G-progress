-- Projectテーブルにcontract_number列を追加

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS contract_number VARCHAR(50);

-- 列にコメントを追加
COMMENT ON COLUMN projects.contract_number IS '契約書番号（CSVの契約No）';

-- インデックスを追加（検索性能向上のため）
CREATE INDEX IF NOT EXISTS idx_projects_contract_number ON projects(contract_number);
