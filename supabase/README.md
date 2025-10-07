# Supabaseデータベースセットアップ

## スキーマの適用方法

1. Supabaseダッシュボードにアクセス: https://app.supabase.com/project/qxftwxkpeqvlukjybnfp

2. 左メニューから「SQL Editor」を選択

3. `schema.sql` の内容をコピーして実行

## 初期データの投入

最初に管理者ユーザーを作成する必要があります：

1. Supabaseダッシュボードの「Authentication」→「Users」→「Add user」
   - Email: `admin@ghouse.jp`
   - Password: `Ghouse0648`
   - Confirm password: `Ghouse0648`

2. 作成したユーザーのUIDをコピー

3. SQL Editorで以下を実行（UIDを置き換える）:

```sql
INSERT INTO employees (id, email, name, department, role)
VALUES (
  'ユーザーのUID',
  'admin@ghouse.jp',
  '管理者',
  '経営管理部',
  'executive'
);
```

## データベース構造

- **employees**: 従業員情報
- **vendors**: 業者情報
- **customers**: 顧客情報（複数氏名対応）
- **projects**: 案件情報
- **payments**: 入金情報
- **tasks**: タスク（イベント）
- **attachments**: 添付ファイル
- **audit_logs**: 監査ログ
- **notifications**: 通知

## Row Level Security (RLS)

すべてのテーブルでRLSが有効化されています。
認証されたユーザーは基本的に全データにアクセス可能です。
必要に応じてポリシーをカスタマイズしてください。
