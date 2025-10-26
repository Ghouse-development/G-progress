# LINE連携設定ガイド

このドキュメントでは、G-progressシステムとLINEを連携させるための設定方法を説明します。

**注意**: この機能は将来実装予定です。現時点では設定情報の保存のみ可能で、実際のLINE連携機能は未実装です。

---

## 目次

1. [LINE連携の概要](#line連携の概要)
2. [必要な準備](#必要な準備)
3. [LINE Messaging APIの取得方法](#line-messaging-apiの取得方法)
4. [G-progressでの設定方法](#g-progressでの設定方法)
5. [将来の実装について](#将来の実装について)
6. [データベース設計（将来用）](#データベース設計将来用)

---

## LINE連携の概要

### 実現できること

LINE連携により、以下の機能が利用可能になります：

- **顧客とのLINEメッセージの自動保存**
  - テキストメッセージ
  - 画像・ファイル添付
  - 位置情報

- **プロジェクト管理の効率化**
  - LINE履歴をプロジェクト詳細画面で時系列表示
  - 重要なメッセージをタスクに変換
  - 担当者変更時の引き継ぎが容易

- **顧客対応の品質向上**
  - 言った言わない問題の解消
  - 過去のやり取りを検索可能
  - 複数担当者での情報共有

### システム構成（将来）

```
顧客のLINE
    ↓
LINE公式アカウント（G-progress専用）
    ↓ Webhook
Supabase Edge Functions（メッセージ受信処理）
    ↓
G-progress データベース
    ↓
ProjectDetail画面などで履歴表示
```

---

## 必要な準備

LINE連携を行うには、以下が必要です：

1. **LINE公式アカウント**
   - LINE for Businessで作成
   - 認証済みアカウント推奨（未認証でもテストは可能）

2. **LINE Developersアカウント**
   - LINE公式アカウントと紐付け
   - Messaging APIチャネルの作成

3. **Supabase Edge Functions（将来実装時）**
   - Webhook受信エンドポイント
   - メッセージ処理ロジック

---

## LINE Messaging APIの取得方法

### 1. LINE Developersコンソールにアクセス

1. [LINE Developers](https://developers.line.biz/ja/)にアクセス
2. LINEアカウントでログイン
3. 「プロバイダー」を作成（会社名など）

### 2. Messaging APIチャネルを作成

1. プロバイダーを選択
2. 「新規チャネル作成」→「Messaging API」を選択
3. 必要情報を入力：
   - チャネル名: 「G-progress顧客連携」など
   - チャネル説明: 「建設プロジェクト管理システム」など
   - 大業種・小業種: 建設・不動産関連を選択
   - プライバシーポリシーURL（任意）
   - 利用規約URL（任意）

### 3. 必要な情報を取得

作成したチャネルの「Messaging API設定」タブで以下を取得：

#### チャネルID
- 場所: 「基本設定」タブ
- 形式: 10桁の数字（例: 1234567890）
- 用途: LINE APIの識別

#### チャネルシークレット
- 場所: 「基本設定」タブ
- 形式: 32文字の英数字
- 用途: Webhook検証

#### チャネルアクセストークン
- 場所: 「Messaging API設定」タブ
- 操作: 「発行」ボタンをクリック
- 形式: 長い英数字文字列
- 用途: LINE APIへのアクセス認証
- **重要**: 発行後は再表示できないため、必ず安全に保存

### 4. Webhook設定（実装時）

実装時には以下の設定が必要になります：

- Webhook URL: `https://your-domain.com/api/line/webhook`
- Webhookの利用: 「オン」に設定
- 応答メッセージ: 「オフ」推奨（自動応答を無効化）

---

## G-progressでの設定方法

### 設定画面へのアクセス

1. G-progressにログイン
2. サイドバーから「設定」をクリック
3. 「LINE連携」タブを選択

### LINE API設定の入力

#### 1. チャネルID
- LINE Developersコンソールで取得した10桁の数字を入力
- 例: `1234567890`

#### 2. チャネルシークレット
- LINE Developersコンソールで取得した32文字の文字列を入力
- パスワード形式で保存されます

#### 3. チャネルアクセストークン
- LINE Developersコンソールで発行したトークンを入力
- パスワード形式で保存されます
- **重要**: 一度しか表示されないため、発行時に必ず保存

#### 4. Webhook URL（参考）
- 実装時に自動生成される予定
- 現時点では参考情報として表示
- 形式: `https://your-domain.com/api/line/webhook`

### 動作設定

#### LINE連携を有効化
- トグルボタンでON/OFF切り替え
- ONにするとLINEメッセージの受信を開始（実装後）
- 初期値: OFF

#### 自動返信機能
- 営業時間外の自動返信メッセージ送信（将来実装予定）
- 初期値: OFF

#### メッセージ保存期間
- 保存期間を日数で設定（30〜3650日）
- 期間を超えたメッセージは自動アーカイブ
- 初期値: 365日

### 設定の保存

1. すべての項目を入力
2. 「設定を保存」ボタンをクリック
3. 保存成功のトースト通知を確認

**注意**: 現時点では設定情報の保存のみで、実際の連携は行われません。

---

## 将来の実装について

### フェーズ1: 基盤構築（未実装）

- Supabase Edge Functionsの作成
  - Webhook受信エンドポイント
  - LINE Signature検証
  - メッセージのデータベース保存
- データベーステーブルの作成
  - `line_messages`: メッセージ履歴
  - `line_attachments`: 添付ファイル
  - `line_users`: LINEユーザー情報

### フェーズ2: UI実装（未実装）

- プロジェクト詳細画面に「LINE履歴」タブ追加
- チャット形式でメッセージ表示
- 画像・ファイルのプレビュー機能
- メッセージ検索・フィルタリング

### フェーズ3: 高度な機能（未実装）

- メッセージからタスク自動生成
- AIによる要約機能
- 重要メッセージの自動抽出
- 営業時間外の自動返信

---

## データベース設計（将来用）

実装時には以下のテーブルを作成予定です：

### line_messages テーブル

顧客とのLINEメッセージを保存

```sql
CREATE TABLE line_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  project_id UUID REFERENCES projects(id),
  line_user_id TEXT NOT NULL,
  message_type TEXT NOT NULL, -- text, image, video, file, location, sticker
  content TEXT,
  direction TEXT NOT NULL, -- inbound, outbound
  timestamp TIMESTAMPTZ NOT NULL,
  read_status BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_line_messages_customer ON line_messages(customer_id);
CREATE INDEX idx_line_messages_project ON line_messages(project_id);
CREATE INDEX idx_line_messages_timestamp ON line_messages(timestamp);
```

### line_attachments テーブル

画像・ファイルなどの添付データを保存

```sql
CREATE TABLE line_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES line_messages(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL, -- image, video, audio, file
  file_url TEXT NOT NULL, -- Supabase Storageへのパス
  file_size BIGINT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_line_attachments_message ON line_attachments(message_id);
```

### line_users テーブル

LINEユーザー情報とG-progressの顧客を紐付け

```sql
CREATE TABLE line_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_user_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  display_name TEXT,
  picture_url TEXT,
  status_message TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_line_users_customer ON line_users(customer_id);
CREATE INDEX idx_line_users_line_id ON line_users(line_user_id);
```

---

## セキュリティ上の注意

### 認証情報の管理

- **チャネルシークレット**と**チャネルアクセストークン**は機密情報です
- データベースには暗号化して保存されます
- 絶対に外部に漏洩しないよう注意してください

### アクセス制御

- LINE設定画面へのアクセスは管理者のみに制限
- プロジェクト担当者のみが該当プロジェクトのLINE履歴を閲覧可能（実装時）

### データ保護

- メッセージデータは暗号化通信で送受信
- 保存期間を超えたデータは自動削除またはアーカイブ
- GDPR・個人情報保護法に準拠した運用

---

## トラブルシューティング

### 設定が保存できない

**原因**: データベース接続エラー
**対処**: Supabaseの接続状態を確認

### チャネルアクセストークンが無効

**原因**: トークンの有効期限切れまたは無効化
**対処**: LINE Developersコンソールで新しいトークンを発行

### Webhookが動作しない（実装後）

**原因**: Webhook URLの設定ミスまたはSSL証明書エラー
**対処**:
1. URLが正しいか確認
2. HTTPSであることを確認
3. SSL証明書が有効か確認

---

## 参考リンク

- [LINE Developers公式サイト](https://developers.line.biz/ja/)
- [Messaging API リファレンス](https://developers.line.biz/ja/reference/messaging-api/)
- [Supabase Edge Functions ドキュメント](https://supabase.com/docs/guides/functions)

---

## お問い合わせ

LINE連携機能の実装に関するご質問は、システム開発チームまでお問い合わせください。

---

**最終更新日**: 2025-10-26
**バージョン**: 1.0（設定画面実装済み、連携機能は未実装）
