# G-progress クイックスタート

## 1. Supabaseでスキーマを作成

1. **Supabase Dashboardにアクセス**
   - https://supabase.com/dashboard にアクセス
   - プロジェクト `qxftwxkpeqvlukjybnfp` を開く

2. **SQL Editorを開く**
   - 左メニューから `SQL Editor` をクリック
   - `+ New query` をクリック

3. **スキーマSQLを実行**
   - `supabase/schema_dev.sql` の内容をコピー
   - SQL Editorに貼り付け
   - `Run` をクリック

   ✅ 成功すると「Success. No rows returned」と表示されます

## 2. サンプルデータを投入

スキーマ作成後、以下のコマンドでサンプルデータを投入します：

```bash
npx tsx scripts/insertSampleData.ts
```

✅ 以下のデータが投入されます：
- 従業員: 3件 (営業1名、設計1名、工事1名)
- 顧客: 3件
- 案件: 3件 (着工後1件、契約後1件、契約前1件)

## 3. 案件一覧ページを確認

```bash
npm run dev
```

ブラウザで http://localhost:5173/projects にアクセス

## トラブルシューティング

### エラー: "Could not find the table"
→ Step 1 のスキーマ作成がまだです。`supabase/schema_dev.sql` を実行してください。

### エラー: "Invalid API key"
→ `.env` ファイルのSupabase認証情報を確認してください。

### データが表示されない
→ ブラウザのコンソール (F12) でエラーを確認してください。
