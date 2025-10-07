# Supabaseセットアップ手順

## 1. Supabaseダッシュボードにアクセス

ブラウザで以下のURLを開いてください：
```
https://app.supabase.com/project/qxftwxkpeqvlukjybnfp
```

## 2. SQL Editorを開く

左メニューから「SQL Editor」をクリック

## 3. テーブルを作成

1. 「New query」をクリック
2. `supabase/schema.sql` の内容を全てコピーして貼り付け
3. 「Run」ボタン（または Ctrl+Enter）で実行
4. 「Success. No rows returned」と表示されればOK

## 4. サンプルデータを投入

1. 「New query」をクリック
2. `supabase/sample_data.sql` の内容を全てコピーして貼り付け
3. 「Run」ボタン（または Ctrl+Enter）で実行
4. データが投入されます

## 5. データ確認

左メニューから「Table Editor」をクリックして、以下のテーブルにデータが入っているか確認：
- employees (10件)
- vendors (6件)
- customers (5件)
- projects (5件)
- payments (20件)
- tasks (15件)
- notifications (3件)
- audit_logs (3件)

## トラブルシューティング

### エラーが出た場合

**「relation already exists」エラー**:
- テーブルが既に存在しています
- 一度削除してから再実行するか、sample_data.sqlだけ実行してください

**「foreign key constraint」エラー**:
- schema.sqlを先に実行してからsample_data.sqlを実行してください

**「syntax error」エラー**:
- SQLの内容を正確にコピーできているか確認してください
- 特殊文字が文字化けしていないか確認してください

## 完了したら

アプリ（http://localhost:5173）をブラウザで開いて、案件一覧に5件の案件が表示されることを確認してください。
