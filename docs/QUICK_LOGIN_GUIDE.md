# クイックログインガイド

**G-progressシステムへのログイン方法**

---

## 🔐 ログイン情報

### システム管理者アカウント

| 項目 | 内容 |
|------|------|
| **メールアドレス** | admin@ghouse.jp |
| **パスワード** | Ghouse0648 |
| **権限** | システム管理者（全権限） |

---

## 🚀 ログイン手順

### 1. アプリケーションにアクセス

**開発環境**:
```
http://localhost:5173
```

**本番環境**:
```
https://your-domain.vercel.app
```

### 2. ログインページで入力

1. **Email**: `admin@ghouse.jp` を入力
2. **Password**: `Ghouse0648` を入力
3. **ログインボタン**をクリック

### 3. ダッシュボードに自動遷移

ログイン成功後、自動的にダッシュボードにリダイレクトされます。

---

## 👥 一般ユーザーの追加方法

### ステップ1: Supabase Authでユーザー作成

1. Supabase Dashboard → Authentication → Users → "Add User"
2. メールアドレスとパスワードを入力
3. "Auto Confirm User" をONにする

### ステップ2: employeesテーブルに追加

```sql
INSERT INTO employees (
  id,
  email,
  first_name,
  last_name,
  department,
  role
) VALUES (
  '[USER_ID_FROM_AUTH]'::uuid,
  'user@ghouse.jp',
  '太郎',
  '山田',
  '営業',
  'member'  -- member, leader, manager, executive
);
```

---

## 🔑 権限レベル

| role | 権限レベル | 説明 |
|------|----------|------|
| **executive** | システム管理者 | 全権限（マスタ管理、システム設定） |
| **manager** | 管理者 | 部門全体の管理 |
| **leader** | リーダー | チーム管理 |
| **member** | 一般ユーザー | 自分の担当案件のみ |

---

## ⚠️ トラブルシューティング

### "Invalid login credentials" エラー

**原因**: ユーザーがSupabase Authに存在しない

**解決策**:
1. `docs/ADMIN_USER_SETUP.md` を参照してユーザーを作成
2. メールアドレスとパスワードが正しいか確認

### ログイン後すぐにログアウトされる

**原因**: employeesテーブルにレコードが存在しない

**解決策**:
```sql
-- ユーザーがemployeesテーブルに存在するか確認
SELECT * FROM employees WHERE email = 'admin@ghouse.jp';

-- 存在しない場合は追加
-- 詳細は docs/ADMIN_USER_SETUP.md を参照
```

---

## 📱 初回ログイン後の推奨設定

1. **プロフィール設定**
   - 右上のアイコン → 設定
   - 個人情報を更新

2. **パスワード変更**（本番環境の場合）
   - 設定 → セキュリティ → パスワード変更

3. **通知設定**
   - 設定 → 通知
   - 受け取りたい通知を選択

---

## 🎯 初めて使う方へ

### 推奨ワークフロー

1. **ダッシュボードで全体把握**
   - 案件数、進捗率、遅延タスクを確認

2. **案件一覧で詳細確認**
   - 自分の担当案件を確認
   - ステータスでフィルタリング

3. **案件詳細でタスク管理**
   - タイムライングリッドでタスク進捗を確認
   - 期限が近いタスクを優先対応

4. **カレンダーで予定確認**
   - 今週のタスクを確認
   - スケジュールを調整

---

**詳細ドキュメント**:
- 運用マニュアル: `OPERATIONS_MANUAL.md`
- デプロイ手順: `DEPLOYMENT.md`
- 管理者設定: `docs/ADMIN_USER_SETUP.md`

---

**作成日**: 2025-10-22
**バージョン**: 1.0
