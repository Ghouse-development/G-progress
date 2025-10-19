-- プロジェクトの件数を確認
SELECT COUNT(*) as total_projects FROM projects;

-- fiscal_yearの分布を確認
SELECT fiscal_year, COUNT(*) as count 
FROM projects 
GROUP BY fiscal_year 
ORDER BY fiscal_year DESC;
