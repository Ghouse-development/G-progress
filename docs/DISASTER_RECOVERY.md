# データ復旧手順書（Disaster Recovery Plan）

## 📋 目次
1. [緊急連絡先](#緊急連絡先)
2. [復旧シナリオ別手順](#復旧シナリオ別手順)
3. [定期バックアップの確認](#定期バックアップの確認)
4. [復旧テスト手順](#復旧テスト手順)

---

## 🚨 緊急連絡先

| 役割 | 担当者 | 連絡先 |
|------|-------|--------|
| システム管理責任者 | [名前] | [電話番号/メール] |
| バックアップ担当者 | [名前] | [電話番号/メール] |
| Supabaseサポート | Supabase Support | support@supabase.io |
| AWSサポート | AWS Support | (有効なサポートプランが必要) |

---

## 📊 復旧目標値

| 指標 | 目標値 | 説明 |
|------|--------|------|
| **RPO** (Recovery Point Objective) | 最大24時間 | 最大でどれだけ過去のデータに戻るか |
| **RTO** (Recovery Time Objective) | 2-4時間 | 復旧にかかる最大時間 |
| **データ損失許容範囲** | 1営業日分 | 許容できる最大データ損失 |

---

## 🔧 復旧シナリオ別手順

### シナリオ1: 過去24時間以内のデータを復元（誤操作・誤削除）

**RPO**: 最大1時間 / **RTO**: 10-30分

#### 手順

1. **Supabaseダッシュボードにログイン**
   ```
   https://app.supabase.com/project/qxftwxkpeqvlukjybnfp
   ```

2. **Database → Backups に移動**

3. **PITR (Point-in-Time Recovery) を選択**
   - 復元したい日時を選択（最大7日前まで）
   - 例: 2025-10-20 14:30:00

4. **Restoreボタンをクリック**
   - 確認ダイアログで「Restore」を再度クリック

5. **復元完了まで待機**（10-30分）
   - ステータスが「Completed」になるまで待機

6. **動作確認**
   ```bash
   # アプリケーションにアクセス
   npm run dev

   # データが正しく復元されているか確認
   # - 主要な案件が存在するか
   # - タスクが正しく表示されるか
   # - 従業員情報が正しいか
   ```

7. **復旧完了報告**
   - システム管理責任者に報告
   - 監査ログに記録

---

### シナリオ2: 1日～7日前のデータを復元

**RPO**: 最大24時間 / **RTO**: 1-2時間

#### 手順

1. **バックアップフォルダから該当日のバックアップを取得**
   ```bash
   # バックアップ一覧確認
   ls -la backups/

   # 例: 2025-10-15のバックアップを使用
   cd backups/2025-10-15_02-00-00/
   ```

2. **Supabase SQL Editorにログイン**
   ```
   https://app.supabase.com/project/qxftwxkpeqvlukjybnfp/sql
   ```

3. **既存データのバックアップ（念のため）**
   ```sql
   -- 現在のデータをバックアップ用テーブルにコピー
   CREATE TABLE projects_backup_YYYYMMDD AS SELECT * FROM projects;
   CREATE TABLE employees_backup_YYYYMMDD AS SELECT * FROM employees;
   -- ... 必要に応じて全テーブル
   ```

4. **データの復元**

   **方法A: JSONファイルから復元（小規模データ）**
   ```sql
   -- テーブルをクリア
   TRUNCATE TABLE projects CASCADE;

   -- JSONデータをインポート（Supabase Dashboard → Table Editor → Import Data）
   -- projects.json をアップロード
   ```

   **方法B: SQLスクリプトで復元（大規模データ）**
   ```bash
   # TypeScriptスクリプトを使用
   npx tsx scripts/restore-from-backup.ts backups/2025-10-15_02-00-00/
   ```

5. **データ整合性チェック**
   ```sql
   -- レコード数確認
   SELECT COUNT(*) FROM projects;
   SELECT COUNT(*) FROM employees;
   SELECT COUNT(*) FROM tasks;

   -- 最新データ確認
   SELECT * FROM projects ORDER BY updated_at DESC LIMIT 10;
   ```

6. **アプリケーション動作確認**
   - ログイン可能か
   - 案件一覧が表示されるか
   - タスク編集が可能か
   - カレンダー表示が正常か

7. **復旧完了**

---

### シナリオ3: Supabase全体障害（最悪のケース）

**RPO**: 最大7日 / **RTO**: 4-8時間

#### 手順

1. **AWS S3から最新バックアップを取得**
   ```bash
   # AWS CLIでバックアップダウンロード
   aws s3 cp s3://g-progress-backups/weekly/latest/ ./recovery/ --recursive
   ```

2. **新しいSupabaseプロジェクトを作成**
   - https://app.supabase.com/ → New Project
   - プロジェクト名: `g-progress-recovery`
   - リージョン: 東京（asia-northeast-1）

3. **スキーマを復元**
   ```bash
   # スキーマファイルを実行
   # SQL Editor で以下を実行:
   # 1. supabase/schema.sql
   # 2. supabase/migrations/*.sql（すべて）
   ```

4. **データを復元**
   ```bash
   # 復元スクリプト実行
   npx tsx scripts/restore-from-backup.ts recovery/
   ```

5. **環境変数を更新**
   ```bash
   # .env ファイル更新
   VITE_SUPABASE_URL=https://[新しいプロジェクトID].supabase.co
   VITE_SUPABASE_ANON_KEY=[新しいAPIキー]
   ```

6. **Vercelの環境変数を更新**
   - Vercel Dashboard → G-progress → Settings → Environment Variables
   - `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を更新
   - Redeploy

7. **本番環境デプロイ**
   ```bash
   git add .env
   git commit -m "Update Supabase credentials after recovery"
   git push origin master
   ```

8. **徹底的な動作確認**
   - 全ページの動作確認
   - 全CRUD操作の確認
   - PDF/CSV出力の確認
   - 権限設定の確認

9. **復旧完了通知**
   - 全従業員に通知
   - 復旧報告書作成

---

## ✅ 定期バックアップの確認

### 毎日の確認事項（システム管理者）

```bash
# バックアップスクリプトが正常に実行されたか確認
ls -la backups/ | head -5

# 最新バックアップの内容確認
cat backups/[最新日時]/_summary.json

# 期待値:
# - successCount: 13/13
# - failedCount: 0
# - totalRecords: 100+ (データ量による)
```

### 週次の確認事項（毎週月曜）

1. **バックアップ容量チェック**
   ```bash
   du -sh backups/
   # 期待値: 適切なサイズ（異常な増加がないか）
   ```

2. **古いバックアップの削除確認**
   ```bash
   # 30日以上前のバックアップが削除されているか
   find backups/ -type d -mtime +30
   # 期待値: 何も表示されない
   ```

### 月次の確認事項（毎月15日）

1. **復旧テストの実施**
   - シナリオ1の手順で実際に復元テストを実施
   - ステージング環境で確認
   - 所要時間を記録

2. **バックアップ戦略の見直し**
   - データ量の増加
   - 新テーブルの追加
   - RPO/RTOの妥当性

---

## 🧪 復旧テスト手順

### ステージング環境での復旧テスト（毎月15日実施）

1. **テスト環境準備**
   ```bash
   # 別のSupabaseプロジェクトを使用
   # または、ローカルのSupabaseインスタンスを使用
   ```

2. **最新バックアップから復元**
   ```bash
   npx tsx scripts/restore-from-backup.ts backups/[最新日時]/
   ```

3. **動作確認チェックリスト**
   - [ ] ログイン可能
   - [ ] 案件一覧表示
   - [ ] 案件詳細表示
   - [ ] タスク作成・編集・削除
   - [ ] カレンダー表示
   - [ ] PDF出力
   - [ ] CSV出力
   - [ ] ダッシュボード表示
   - [ ] 入金管理表示
   - [ ] 性能管理表示

4. **所要時間記録**
   - 復元開始: [時刻]
   - 復元完了: [時刻]
   - 動作確認完了: [時刻]
   - **合計所要時間**: [XX分]

5. **問題点の記録**
   - 発生した問題
   - 解決方法
   - 手順書の修正点

6. **テスト結果報告書作成**

---

## 📝 インシデント報告フォーマット

```markdown
# データ復旧インシデント報告書

## 基本情報
- **発生日時**: YYYY-MM-DD HH:MM
- **発見者**: [名前]
- **影響範囲**: [全社 / 特定部門 / 特定機能]
- **重要度**: [致命的 / 重大 / 中程度 / 軽微]

## 事象の概要
[何が起きたか]

## 影響
- **影響を受けたユーザー数**: [XX名]
- **影響を受けたデータ**: [テーブル名、レコード数]
- **業務への影響**: [具体的な影響]

## 復旧作業
- **使用したシナリオ**: [シナリオ1/2/3]
- **復旧開始時刻**: YYYY-MM-DD HH:MM
- **復旧完了時刻**: YYYY-MM-DD HH:MM
- **所要時間**: [XX時間XX分]
- **復元ポイント**: YYYY-MM-DD HH:MM
- **データ損失期間**: [XX時間]

## 原因分析
[根本原因]

## 再発防止策
1. [対策1]
2. [対策2]
3. [対策3]

## 報告者
- **氏名**: [名前]
- **日付**: YYYY-MM-DD
```

---

## 🔒 セキュリティ注意事項

1. **バックアップファイルの取り扱い**
   - バックアップファイルには機密情報が含まれる
   - 暗号化されたストレージに保存
   - アクセス権限を最小限に制限

2. **認証情報の管理**
   - Supabase APIキーは絶対に公開しない
   - 環境変数ファイル（.env）はGitにコミットしない
   - パスワードは定期的に変更

3. **監査ログ**
   - 復旧作業はすべて監査ログに記録
   - 誰が・いつ・何を復元したかを追跡可能に

---

## 📞 エスカレーション手順

### レベル1: 通常のトラブル（システム管理者対応）
- データの誤削除
- 軽微なデータ破損

### レベル2: 重大なトラブル（システム管理責任者＋技術責任者対応）
- 広範囲のデータ損失
- システム障害

### レベル3: 災害級トラブル（経営陣＋外部サポート対応）
- Supabase全体障害
- データの完全損失
- サイバー攻撃

---

**最終更新日**: 2025-10-20
**次回見直し予定日**: 2025-11-20
**バージョン**: 1.0
