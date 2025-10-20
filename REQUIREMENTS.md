# G-progress システム要件定義書

## プロジェクト概要
株式会社Gハウスの建設プロジェクト管理システム。契約から完了まで、建設プロジェクトのタスク、スケジュール、支払い、チーム割り当てを追跡し、**業務の遅延を防ぐ**ことを主目的とする。

## システムの目的
1. 常にタスクが見える・忘れない
2. 管理者がタスクを追加設定できる
3. タスク詳細にマニュアルがあり、新人でもすぐ作業できる
4. 作業が流れてやってくるので業務フローを理解できる
5. 誰が遅れの案件をどれくらい持っているかを管理者が把握できる
6. 月ごとの入金日がまとめて分かる
7. 月ごとの契約数・引き渡し数・着工数が分かる
8. 予実管理ができる
9. 期ごとの成績・目標との進捗・乖離がいつでも分かる
10. 見やすいこと・使いやすいことが大事
11. シンプルに、デザインもカラーも美しく

---

## サイドバー設計（2025-10-19追加）

### サイドバー構成
```
⓪ モード切替
① 2025年度（2025年8月～2026年7月完工）
② ダッシュボード
---------
③ 案件管理
④ 入金管理
⑤ 性能管理
⑥ カレンダー
---------
⑦ 案件マスタ
⑧ タスクマスタ
⑨ 従業員マスタ
⑩ 履歴ログ
⑪ 設定
```

---

## ⓪ モード切替

### 3つのモード
- **担当者モード**: 自分の担当案件・タスクのみ表示
- **拠点モード**: 自分の拠点の案件・タスクを表示（従業員情報に紐づく）
- **全社モード**: 全案件・全タスクを表示（管理者のみ）

### 動作
- モードに応じた数値が②③④⑤⑥で表示される
- 担当者モードでは編集権限は自分の案件のみ
- 拠点モード・全社モードでは権限に応じた編集が可能

---

## ① 年度選択

### 仕様
- プルダウンで2024年度や2023年度も選択できる
- 年度は8月～翌7月（例：2025年度 = 2025年8月～2026年7月完工）
- 2026年8月引き渡し物件ができると、自動的に2026年度が作成される
- 年度選択により、②～⑥の表示内容が変わる

---

## ② ダッシュボード

### 表示項目
1. **完工予定数**: その年度の「完工予定数」から「カウントしない案件」を引いた数
2. **請負契約数**: 8月～7月の12か月分の棒グラフ（月ごとに数値表示）
3. **変更契約数**: 8月～7月の12か月分の棒グラフ（月ごとに数値表示）
4. **着工数**: 8月～7月の12か月分の棒グラフ（月ごとに数値表示）
5. **引き渡し数**: 8月～7月の12か月分の棒グラフ（月ごとに数値表示）
6. **入金予定・実績**:
   - 8月～7月の12か月分の棒グラフ
   - 予定は青、実績は赤色で同じグラフに表示
   - 毎月は予定・実績の合計額を表示（税込）
   - 横にそれを1.1で割った税別金額を表示（予定売上高）
7. **粗利益高グラフ**:
   - 税別表記
   - 合計が予定粗利益高になる
8. **遅れ案件数**:
   - 案件一覧での遅れタスク数の合計
   - ボタンを押すと、誰が何件遅れタスクを抱えているかが見える
9. **商品構成**:
   - 表形式
   - 数と割合（％）を表示
   - 合計も表示
10. **平均坪数**: 案件一覧から取得
11. **平均契約金額**:
    - 消費税込み
    - 1.1で割った税別金額も出力

---

## ③ 案件管理

### 仕様
- 個別の案件管理（現在のProjectDetailを拡張）
- タスクを押すとタスク詳細が表示される
- 上部に「未着手」「着手中」「完了」「遅れ」のステータス表示
- 予定期日よりも遅れると、自動的に「遅れ」のステータスになる
- 未着手日と本日の乖離日数（+〇日、-〇日）を表示

---

## ④ 入金管理

### 仕様
- 月を選択（初期表示は現在の月）
- 横軸：「案件」「名目」「金額」「予定」「実績」
- 縦軸：案件名

### 列の詳細
- **案件**: 案件名
- **名目**: 以下のいずれか
  - 建築申込金
  - 契約金
  - 着工金
  - 上棟金
  - 最終金
  - 追加工事金
  - 外構
  - 土地仲介手数料
  - 土地手付金
  - 土地残代金
  - その他
- **金額**: 金額
- **予定**: 予定の額のみ表示（実績に入っていたら0）
- **実績**: 入金済みの額のみ表示（予定に入っていたら0）

### 機能
- 一番下に予定・実績・合計の3つの合計額が表示される
- CSV出力・PDF出力が可能

---

## ⑤ 性能管理

### 仕様
- 縦軸：案件
- 横軸：以下の項目
  - **太陽光有無**: 割合（％）で表示
  - **太陽光kW数**: 平均kW数を表示
  - **蓄電池有無**: 割合（％）で表示
  - **UA値**: 平均値・最小値・最大値を表示
  - **C値**: 平均値・最小値・最大値を表示

---

## ⑥ カレンダー

### 仕様
- 月と曜日と六曜が表示
- タスクが色分けされて表示（未着手・着手中・完了・遅れ）
- タスクをクリックするとステータスの変更が可能
- 入金情報も表示
- CSV出力・PDF印刷が可能（その月の全タスクが表示される）

---

## ⑧ タスクマスタ

### 仕様
- モーダルで動作
- 入力項目：
  - タスク名
  - 責任部署
  - 期日（トリガー設定）
  - トリガー判定有無
  - 目的
  - マニュアル（ドラッグアンドドロップでアップロード）
  - 動画（URL）
  - Do's
  - Dont's
- 保存とキャンセルボタン
- モーダル右上に以下のマスタ：
  - 部署名マスタ
  - 役割名マスタ
  - 拠点名マスタ
  - 役職名マスタ

---

## UI/UXガイドライン

### デザイン原則
- **シンプル第一**: 余計な機能はつけない
- **検索や通知のアイコンは不要**
- **サイドバーより右はなるべくシンプルなビューに**
- Apple調のモノクロデザイン
- ステータス表示のみ信号機カラー（赤・黄・青）使用可
- 大きく明確な文字（最小でもtext-base、重要な情報はtext-xl以上）
- 視覚的コミュニケーション（UIでは絵文字アイコンを使用しない）
- 太いボーダーのカードベースレイアウト
- 高齢者にも使いやすいアクセシビリティ

---

## データベース設計（拡張予定）

### projectsテーブルに追加
- `exclude_from_count` BOOLEAN DEFAULT false (完工予定数カウント除外フラグ)
- `solar_panel` BOOLEAN (太陽光有無)
- `solar_kw` DECIMAL (太陽光kW数)
- `battery` BOOLEAN (蓄電池有無)
- `ua_value` DECIMAL (UA値)
- `c_value` DECIMAL (C値)
- `total_floor_area` DECIMAL (坪数)
- `gross_profit` DECIMAL (粗利益)
- `fiscal_year` VARCHAR (年度：例 "2025")
- `product_type` VARCHAR (商品種別)

### paymentsテーブルを拡張
- `payment_type` VARCHAR (名目：契約金、着工金など)
- `scheduled_date` DATE (予定日)
- `actual_date` DATE (実績日)
- `scheduled_amount` DECIMAL (予定額)
- `actual_amount` DECIMAL (実績額)

### employeesテーブルに追加
- `branch_id` UUID (拠点ID)

### 新規テーブル
- **fiscal_years**: 年度マスタ
  - id, year, start_date, end_date
- **branches**: 拠点マスタ
  - id, name, created_at

---

## データベーストリガー修正

### 問題
`update_updated_at_column()`関数が`NEW.version`を更新しようとするが、employeesテーブルにはversionフィールドがない。

### 解決策
テーブルごとに適切なトリガー関数を使用する。

### 実装ファイル
`supabase/fix_employee_trigger.sql`に以下の関数とトリガーを定義：

1. **employeesテーブル用**: `update_employees_updated_at()` - updated_atのみ更新
2. **tasks/projectsテーブル用**: `update_with_version()` - updated_atとversionを更新
3. **vendorsテーブル用**: `update_vendors_updated_at()` - updated_atのみ更新
4. **customersテーブル用**: `update_customers_updated_at()` - updated_atのみ更新
5. **paymentsテーブル用**: `update_payments_updated_at()` - updated_atのみ更新

### 適用方法
Supabase SQL Editorで`supabase/fix_employee_trigger.sql`を実行

---

## 実装順序（現状）

1. ⏳ データベーススキーマ拡張（部分的に完了）
2. ❌ サイドバー＋年度選択UI
3. ❌ モード切替機能（担当者・拠点・全社）
4. ⏳ ダッシュボードの各種グラフ（基礎のみ）
5. ❌ 入金管理ページ
6. ❌ 性能管理ページ
7. ✅ カレンダーのPDF/CSV出力
8. ❌ タスクマスタのモーダル化

**凡例**: ✅完了 / ⏳部分完了 / ❌未着手

---

## 技術スタック
- **フロントエンド**: React + TypeScript + Vite
- **バックエンド**: Supabase (PostgreSQL)
- **スタイリング**: 手書きTailwind風CSS（シンプル・モノクロ）
- **日付処理**: date-fns
- **グラフ**: Recharts
- **PDF出力**: jsPDF
- **CSV出力**: papaparse

---

## フランチャイズ対応（マルチテナント）

### 目的
本社と複数のフランチャイズ拠点で同一システムを使用し、データを完全分離しながらも本社が全体を統括できる仕組み。

### 組織構造
```
本社（Headquarters）
├── FC横浜（Franchise）
├── FC大阪（Franchise）
└── FC名古屋（Franchise）
```

### organizationsテーブル
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL, -- "本社", "FC横浜", "FC大阪"
  type VARCHAR(20) NOT NULL CHECK (type IN ('headquarters', 'franchise')),
  parent_organization_id UUID REFERENCES organizations(id), -- 本社のID
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled')),
  contract_start_date DATE,
  contract_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### データ分離方針
- 全テーブル（employees, projects, tasks, payments等）に `organization_id` カラムを追加
- RLSポリシーで組織ごとにデータを分離
- 本社管理者のみ全組織のデータを閲覧・編集可能
- FC管理者は自組織のデータのみ閲覧・編集可能

### 権限設計
| ロール | 本社データ | 自FCデータ | 他FCデータ | マスタ管理 |
|--------|-----------|----------|-----------|----------|
| 本社管理者 | ✅ 全権限 | ✅ 全権限 | ✅ 全権限 | ✅ 可能 |
| 本社一般 | ✅ 閲覧 | ✅ 閲覧 | ✅ 閲覧 | ❌ 不可 |
| FC管理者 | ❌ 不可 | ✅ 全権限 | ❌ 不可 | ⚠️ 一部可能 |
| FC一般 | ❌ 不可 | ✅ 編集 | ❌ 不可 | ❌ 不可 |

---

## バックアップ戦略（データ保護）

### 目的
万が一のデータ喪失・破損・改ざんに備え、**多層バックアップ**で会社の業務継続性を担保する。

### 第1層：Supabase自動バックアップ（PITR）
- **頻度**: 毎日自動
- **保持期間**: 7日間
- **RPO**: 最大24時間
- **RTO**: 30分-1時間
- **リカバリ方法**: Supabaseダッシュボードから復元

### 第2層：毎日のフルバックアップ
- **頻度**: 毎日午前2時（Supabase Cron Job）
- **保存先**: Supabase Storage（暗号化） + AWS S3
- **保持期間**: 30日間
- **形式**: CSV（全テーブル）

### 第3層：週次オフサイトバックアップ
- **頻度**: 毎週日曜午前3時
- **保存先**: AWS S3（別リージョン）
- **保持期間**: 1年間
- **形式**: JSON（全テーブル + 添付ファイル）
- **暗号化**: AES256

### 第4層：月次長期アーカイブ
- **頻度**: 毎月1日午前4時
- **保存先**: AWS Glacier
- **保持期間**: 7年間（税務要件対応）
- **形式**: 圧縮JSON

### 第5層：監査ログの永続化
- **対象**: audit_logsテーブル
- **保存先**: 別データベース（改ざん防止）
- **保持期間**: 永続

### バックアップテスト
- **頻度**: 毎月15日
- **内容**: ステージング環境への復元テスト
- **目的**: リカバリ手順の検証とRTO計測

### データ復旧手順書
`docs/DISASTER_RECOVERY.md` に詳細手順を記載

### コスト試算
| 項目 | 月額コスト |
|------|-----------|
| Supabase PITR（Pro plan込み） | $0 |
| AWS S3 週次バックアップ | $2.30 |
| AWS Glacier 月次アーカイブ | $4.00 |
| 監視・アラート（CloudWatch） | $3.00 |
| **合計** | **約$10/月** |

---

## 案件詳細フィールド（拡張版）

### projectsテーブルの拡張カラム

#### 基本情報
- `contract_number` VARCHAR(50) - 契約番号
- `customer_names` TEXT[] - お客様名（複数対応）
- `construction_address` TEXT - 建設地（住所）
- `product_id` UUID - 商品（商品マスタ参照）
- `sales_staff_id` UUID - 営業担当
- `design_staff_id` UUID - 設計担当
- `ic_staff_id` UUID - IC担当
- `construction_staff_id` UUID - 工事担当
- `exterior_staff_id` UUID - 外構担当
- `implementation_designer` VARCHAR(100) - 実施図者
- `design_office` VARCHAR(100) - 設計事務所（図面作成）
- `floors` INTEGER - 階数
- `construction_area` DECIMAL(10,2) - 坪数(施工)

#### スケジュール
- `contract_date` DATE - 請負契約日
- `design_hearing_date` DATE - 設計ヒアリング
- `plan_finalized_date` DATE - プラン確定
- `plan_financial_sent_date` DATE - プラン確定時資金計画書お客様送付
- `structure_go_date` DATE - 構造GO
- `application_go_date` DATE - 申請GO
- `structure_1st_cb_date` DATE - 構造1回目CB
- `structure_2nd_cb_date` DATE - 構造2回目CB
- `meeting_available_date` DATE - 打合せ可能日
- `weekday_web_meeting_campaign` BOOLEAN - 平日・WEB打合せキャンペーン
- `benefits_content` TEXT - 特典内容
- `original_kitchen` BOOLEAN - オリジナルキッチン
- `original_iron_stairs` BOOLEAN - オリジナルアイアン階段
- `ic_benefits_count` INTEGER - IC特典内容（回数）
- `meeting_count` INTEGER - 打合回数
- `youtube_recommended` BOOLEAN - YouTubeおすすめ
- `final_meeting_date` DATE - 最終打合
- `meeting_document_delivery_date` DATE - 会議図面渡し日
- `pre_change_contract_meeting_date` DATE - 変更契約前会議
- `drawing_upload_date` DATE - 図面UP
- `structure_drawing_upload_date` DATE - 構造図Up
- `construction_permit_date` DATE - 着工許可

#### 融資関連
- `long_term_loan` BOOLEAN - 長期
- `flat_loan` BOOLEAN - フラット有無
- `flat_design_notice_required_date` DATE - フラット設計に関する通知書必要日
- `building_permit_required` BOOLEAN - 建築確認済証（必要有無）
- `building_permit_required_date` DATE - 建築確認済証必要日
- `interim_inspection_cert_required` BOOLEAN - 中間検査合格証（必要有無）
- `interim_inspection_cert_required_date` DATE - 中間検査合格証必要日
- `completion_inspection_cert_required` BOOLEAN - 検査済証（必要有無）
- `completion_inspection_cert_required_date` DATE - 検査済証必要日

#### 解体・土地関連
- `demolition` BOOLEAN - 解体
- `demolition_contractor` VARCHAR(100) - 解体業者
- `demolition_subsidy` BOOLEAN - 解体補助金
- `shizume_toufuda` BOOLEAN - 鎮め物棟札
- `buried_cultural_property_area` VARCHAR(50) - 埋蔵文化財（区域内外・掘削）
- `demolition_start_date` DATE - 解体開始日
- `demolition_completion_date` DATE - 解体完了日
- `change_contract_date` DATE - 変更契約日
- `land_settlement_date` DATE - 土地決済
- `subdivision` BOOLEAN - 分筆有無
- `subdivision_completion_date` DATE - 分筆完了日
- `new_water_connection` BOOLEAN - 新規水道引き込み工事

#### 工事スケジュール
- `initial_contract_construction_start_date` DATE - 請負契約着工日
- `change_contract_construction_start_date` DATE - 変更契約着工日
- `pre_construction_work` TEXT - 着工前先行工事
- `ground_reinforcement` BOOLEAN - 地盤補強有無
- `ground_reinforcement_date` DATE - 地盤補強工事日
- `foundation_start_date` DATE - 基礎着工日
- `execution_budget_completion_date` DATE - 実行予算完成
- `roof_raising_date` DATE - 上棟日
- `interim_inspection_date` DATE - 中間検査
- `pre_completion_inspection_work` TEXT - 完了検査前先行工事
- `completion_inspection_date` DATE - 完了検査
- `handover_date` DATE - 引渡日
- `owner_desired_key_delivery_date` DATE - 施主希望カギ渡し日
- `exterior_work_start_date` DATE - 外構工事開始日
- `exterior_work_completion_date` DATE - 外構工事完了日

#### 進捗・備考
- `progress_status` TEXT - 進捗状況（問題点・アクションプラン）
- `notes` TEXT - 備考（お客様個別情報・注意点）

#### 補助金・融資詳細
- `subsidy_type` VARCHAR(100) - 補助金
- `long_term_requirements` TEXT - 長期要件
- `gx_requirements` TEXT - GX要件
- `bank_name` VARCHAR(100) - 銀行名
- `pre_application_approved` BOOLEAN - 事前申込許可
- `main_application_approved` BOOLEAN - 本申込許可

#### 金額
- `contract_amount` DECIMAL(15,2) - 契約金額
- `application_fee_date` DATE - 申込金日付
- `application_fee_amount` DECIMAL(15,2) - 申込金金額
- `contract_payment_date` DATE - 契約金日付
- `contract_payment_amount` DECIMAL(15,2) - 契約金金額
- `construction_start_payment_date` DATE - 着工金日付
- `construction_start_payment_amount` DECIMAL(15,2) - 着工金金額
- `roof_raising_payment_date` DATE - 上棟金日付
- `roof_raising_payment_amount` DECIMAL(15,2) - 上棟金金額
- `final_payment_date` DATE - 最終金日付
- `final_payment_amount` DECIMAL(15,2) - 最終金金額
- `fire_insurance_amount` DECIMAL(15,2) - 火災保険金額
- `fire_insurance_commission` DECIMAL(15,2) - 火災保険手数料金額
- `fixture_work_commission` BOOLEAN - 造作工事紹介料有無
- `fixture_work_commission_amount` DECIMAL(15,2) - 造作工事紹介料金額
- `title_registration_commission` DECIMAL(15,2) - 表題登記紹介料
- `judicial_scrivener_commission` DECIMAL(15,2) - 司法書士紹介料

#### 性能値
- `c_value` DECIMAL(10,2) - C値
- `ua_value` DECIMAL(10,2) - UA値
- `eta_ac_value` DECIMAL(10,2) - ηAC値
- `reduction_rate_no_renewable` DECIMAL(5,2) - 削減率％（再エネ無）
- `bei_no_renewable` DECIMAL(5,2) - BEI（再エネ無）
- `reduction_rate_renewable_self` DECIMAL(5,2) - 削減率％（再エネ有・自家消費）
- `bei_renewable_self` DECIMAL(5,2) - BEI（再エネ有・自家消費）
- `reduction_rate_renewable_sell` DECIMAL(5,2) - 削減率％（再エネ有・自家消費・売電）
- `bei_renewable_sell` DECIMAL(5,2) - BEI（再エネ有・自家消費・売電）
- `gx_requirements_met` BOOLEAN - GX要件
- `zeh_certified` BOOLEAN - ZEH

---

## 商品マスタ

### 目的
建築商品の種類を管理し、案件に紐づけることで商品別の分析を可能にする。

### productsテーブル
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- 商品名
  category VARCHAR(50), -- カテゴリ（注文住宅、企画住宅、リノベーション等）
  description TEXT, -- 商品説明
  base_price DECIMAL(15,2), -- 基本価格（参考値）
  is_active BOOLEAN DEFAULT true, -- 有効/無効
  display_order INTEGER DEFAULT 0, -- 表示順序
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 初期商品例
- ZERO-CUBE
- ZERO-CUBE MINI
- ZERO-CUBE WAREHOUSE
- ZERO-CUBE +BOX
- ZERO-CUBE +FUN
- FREEQ HOMES
- FREEQ COVACO
- スタンダード注文住宅
- プレミアム注文住宅
- リノベーション

### ダッシュボード連携
- ダッシュボードの「商品構成」は `products.name` を使用
- `projects.product_id` と `products.id` でJOIN
- 商品マスタで管理することで、商品名の一貫性を保証
