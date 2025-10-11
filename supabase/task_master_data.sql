-- Gハウス業務フロー - タスクマスタデータ投入
-- 全56業務を登録

-- 【集客フェーズ】

-- 業務1: モデルハウスの開店準備
INSERT INTO task_masters (business_no, task_order, title, description, phase, task_category, importance, purpose, dos, donts, responsible_department, target, what, when_to_do, tools, required_materials, manual_url, notes)
VALUES (
  1, 1, 'モデルハウスの開店準備',
  E'【作業内容】\n1. 移動作業\n2. モデルハウス施錠解除作業\n3. モデルハウス状態確認作業\n4. 清掃作業\n5. セミナー準備作業\n6. イベントお出迎え準備作業',
  '集客', 'K', 'B',
  'モデルハウス見学説明会にお客様が来場しても良い状態にする。',
  '・モデルハウスは商品のため常に美化意識を持つ\n・快適な空気環境になっているかをチェック',
  '・セミナー講師役（サブ）が不足\n・資料や資源の不足',
  '営業', NULL, 'モデルハウス開店準備', 'イベント開始1時間前',
  'Googleカレンダー、キーボックス、チェックシート',
  '社用車、カギ、資料、水、掃除道具、PC、バインダー、スリッパ、モニター',
  'https://docs.google.com/spreadsheets/d/1DMjl73PJHRvgpfPj81GObw65bCYY3Hsn74eIeQahhg0/edit?gid=486535308#gid=486535308',
  NULL
);

-- 業務2: セミナー業務
INSERT INTO task_masters (business_no, task_order, title, description, phase, task_category, importance, purpose, dos, donts, responsible_department, tools, manual_url)
VALUES (
  2, 2, 'セミナー業務',
  E'【作業内容】\n1. 受付作業\n2. セミナー実施作業\n3. アンケート受付作業\n4. モデルハウス案内作業\n5. お見送り作業',
  '集客', 'K', 'S',
  'お客様をＧハウスで建てたいと思う状態にする。',
  'Gハウスの魅力をワクワクするように伝える',
  '無理やり、限定会員に入会いただく。',
  '営業',
  'イベント管理表、Googleフォーム、セミナーパワーポイント、YouTube、バインダー、モニター、お客様スマートフォン',
  'https://docs.google.com/spreadsheets/d/1j1TllahGbgVr5mGFdggu7rKbTKEoAbCpSyS_4FmvyqE/edit?gid=0#gid=0'
);

-- 業務3: モデルハウスの閉店
INSERT INTO task_masters (business_no, task_order, title, description, phase, task_category, importance, purpose, responsible_department, manual_url)
VALUES (
  3, 3, 'モデルハウスの閉店',
  E'【作業内容】\n1. モデルハウス状態確認作業\n2. 清掃作業\n3. モデルハウス内資料計数作業\n4. 結果報告作業\n5. モデルハウス施錠作業\n6. 移動作業',
  '集客', 'K', 'B',
  '来た時と同じ状態にする。',
  '営業',
  'https://docs.google.com/spreadsheets/d/1DMjl73PJHRvgpfPj81GObw65bCYY3Hsn74eIeQahhg0/edit?gid=486535308#gid=486535308'
);

-- 業務4: イベント担当者割振り
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, dos, donts, responsible_department, target)
VALUES (
  4, 4, 'イベント担当者割振り', '集客', 'J', 'S',
  '営業が自分の担当お客様へ連絡が出来る状態にする。',
  '割り振り順に間違いがないか確認する',
  '顧客被りで2名以上の営業から連絡する',
  '部門長', '営業'
);

-- 業務5: アポイント取得（電話）
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, dos, donts, responsible_department, target, when_to_do)
VALUES (
  5, 5, '電話でアポイント取得', 'アポイント取得', 'J', 'S',
  '次回個別相談のアポイントがある状態にする。',
  '社名や名前を伝えイベントの感想を聞く',
  '・夜21時以降に電話するなどの配慮不足\n・名前間違いや読み方間違い',
  '営業', 'お客様', 'イベント終了当日又は翌日'
);

-- 【営業フェーズ】

-- 業務6: 個別相談準備
INSERT INTO task_masters (business_no, task_order, title, description, phase, task_category, importance, purpose, responsible_department, when_to_do, tools)
VALUES (
  6, 6, '個別相談準備',
  E'【作業内容】\n1. 本社案内図送付作業（来店の場合）\n2. オンラインＵＲＬ送付作業（オンラインの場合）\n3. 座席確保作業\n4. 商談準備作業',
  '営業', 'J', 'S',
  'スムーズに個別相談が出来る状態にする。',
  '営業', '個別相談予定日の前日',
  'Googleカレンダー、会社貸与パソコン、ZOOM、Googleミート'
);

-- 業務7: 個別相談実施
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, dos, donts, responsible_department, tools, manual_url)
VALUES (
  7, 7, '個別相談実施', '営業', 'K', 'S',
  'Ｇハウスの家造りに魅力を感じて建築申込へランクアップ。',
  'ＷＨＹからヒアリング',
  'ＷＨＡＴの話ばかり',
  '営業',
  '限定ガイドブック',
  'https://g-house-member.site/'
);

-- 業務8: 計画地情報収集（土地あり）
INSERT INTO task_masters (business_no, task_order, title, description, phase, task_category, importance, purpose, dos, donts, responsible_department, required_materials, manual_url)
VALUES (
  9, 9, '計画地情報収集（土地あり）',
  E'【作業内容】\n1. 計画地住所確認作業\n2. 資料収集作業（謄本、測量図、公図、地図）\n3. 現地確認作業',
  '営業', 'J', 'S',
  '土地整備費用にどれくらい費用が掛かるか営業が理解している状態。',
  '土地の状態確認（権利・現地・高低差・境界）',
  '場所間違い',
  '営業',
  '登記識別情報、アクセスID・パスワード、Googleマップ',
  'https://docs.google.com/spreadsheets/d/10_GzdbQ3bbR2wkjqNZyTUA7S3zA2jEkqu52ly5KZ1jE/edit?gid=1864728260#gid=1864728260'
);

-- 業務10: 要望ヒアリング（土地あり）
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, responsible_department, tools, manual_url)
VALUES (
  10, 10, '要望ヒアリング（土地あり）', '営業', 'J', 'B',
  '要望をお客様が理解している状態。',
  '営業',
  'お客様要望ヒアリングシート',
  'https://drive.google.com/open?id=1km0zQyroTFswBGkdTmAjsETWAjc2goQZ&usp=drive_fs'
);

-- 業務11: 初期プラン図チェック
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, dos, donts, purpose, responsible_department)
VALUES (
  11, 11, '初期プラン図チェック', '営業', 'J', 'B',
  'エアコン、エコキュートの配置\n2階搬入経路',
  'チェックしない',
  'お客様の要望が図面にしっかり落とし込みができているか',
  '営業'
);

-- 業務12: 資金計画書作成（土地あり）
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, dos, donts, responsible_department, tools, manual_url)
VALUES (
  12, 12, '資金計画書作成（土地あり）', '営業', 'C', 'B',
  '欲しいものがいくらになるのかお客様が理解している状態。',
  '出来るだけ詳細に作成する',
  '準防火地域、長期優良住宅取得不可地域の間違い',
  '営業',
  '資金計画書、プリンター又はＰＤＦ',
  'https://docs.google.com/spreadsheets/d/1--x6SoiT9LSHg31J-Ir55W3Eu4wWEhI_?rtpof=true&usp=drive_fs'
);

-- 業務13: 建築申込登録（土地あり）
INSERT INTO task_masters (business_no, task_order, title, description, phase, task_category, importance, purpose, responsible_department, tools, when_to_do, manual_url)
VALUES (
  13, 13, '建築申込登録（土地あり）',
  E'【作業内容】\n1. 建築申込URL送付作業\n2. Googleフォーム入力確認作業\n3. 入金振込日確認作業（申込金10万円）\n4. 入金確認後お礼作業',
  '営業', 'J', 'B',
  '建築申込登録',
  '営業',
  'Googleフォーム、スマートフォン、経理（入金チャット）',
  'Googleフォーム申込1週間以内',
  'https://docs.google.com/forms/d/e/1FAIpQLSctgAQ6t5kalPLoxpWHGMvo1SNvykN0DCp5xzmoYE_YnxHsgg/viewform'
);

-- 業務19: 融資事前審査申込み
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, dos, donts, responsible_department, days_from_contract)
VALUES (
  19, 19, '融資事前審査申込み', '営業', 'J', 'S',
  'お客様の資金不安の解消',
  E'・年収で考えられる上限での借入金額で事前審査申し込みする\n・初回面談時に申込書類お渡しまたは記入預かり\n・事前審査に記入漏れが出ないようにあらかじめ印を付ける\n・既存借り入れの有無（マイカーローン、カードローン、奨学金）を確認\n・銀行独自ルールに該当しないか銀行融資条件で確認する',
  E'・事前の申込金額が実際の資金計画と乖離してGハウスでは資金がショートする状態。\n・お客様の状態を確認していないのに期待を高めて審査へ進むこと（借入金額、借入金利）\n・営業が代筆して事前審査申し込みへ進む（ネット、アプリでの代行も同じく）',
  '営業',
  NULL
);

-- 【契約フェーズ】

-- 業務23: 請負契約
INSERT INTO task_masters (business_no, task_order, title, description, phase, task_category, importance, purpose, dos, responsible_department, tools, days_from_contract)
VALUES (
  23, 23, '請負契約',
  E'【作業内容】\n1. 契約ご案内作業\n2. 契約準備作業\n3. 契約書作成依頼作業（営業事務へ）\n4. 契約必要書類チェック\n5. 契約書チェック（営業リーダー）\n6. 契約手交作業\n7. 紹介打診作業\n8. 契約金着金確認作業',
  '契約', 'C', 'S',
  'お客様のお家を代理で設計建築する事',
  E'・入金案内（契約前日までに入金完了されているかチェック）\n・お客様の不安を残さないように丁寧な説明\n・紹介アナウンスの徹底（紹介獲得に向けて）\n・本審査の再アナウンス\n・SR見学と間取り確定までのスケジュール確定\n・契約書約款の読み合わせは専門用語をかみ砕き・事例を用いながら説明する',
  '営業',
  '電子契約アプリ、Googleチャット、経理部（入金チャット）',
  0
);

-- 【設計フェーズ】

-- 業務28: 間取り確定
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, dos, donts, responsible_department, days_from_contract)
VALUES (
  28, 28, '間取り確定', '設計', 'K', 'S',
  '建築計画の途中段階で資金の不安解消',
  E'・早急に間取り確定の資金計画書を送付する\n・進捗管理表を更新する',
  E'・資金計画書を作成忘れ\n・御客様に総費用に対してヒアリングをしない。',
  '営業',
  81
);

-- 業務29: 変更契約
INSERT INTO task_masters (business_no, task_order, title, description, phase, task_category, importance, purpose, dos, responsible_department, tools, days_from_contract)
VALUES (
  29, 29, '変更契約',
  E'【作業内容】\n1. 見積受領作業（ICより）\n2. 資金計画書作成作業\n3. 契約締結作業',
  '設計', 'C', 'S',
  '設計打合せの中で変更した資金の確定及び最終の建物費用が分かる状態',
  E'・着工日までに契約を手交する\n・金額変更に伴い着工金、上棟金が変更されていないかをチェックする\n・草刈りが完了しているか確認する\n・鎮め物が有るかの確認を忘れない',
  '営業',
  '電子契約アプリ',
  NULL
);

-- 業務30: 金消契約
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, donts, responsible_department)
VALUES (
  30, 30, '金消契約', '設計', 'C', 'S',
  '土地及び建物費用の支払いに必要な融資を受けるため',
  '必要書類などを御客様や銀行任せで認知していない。',
  '営業又はお客様'
);

-- 【工事フェーズ】

-- 業務31: 着工～基礎
INSERT INTO task_masters (business_no, task_order, title, description, phase, task_category, importance, purpose, dos, responsible_department, days_from_contract)
VALUES (
  31, 31, '着工～基礎',
  E'【着工条件】\n・融資本承認\n・着工金入金予定日確定\n・変更契約完了\n・確認済証交付済み\n・長期優良認定済み（着工許可済み）',
  '工事', 'S', 'S',
  '建物の費用の30％のお支払いをしていただく',
  E'・提出必要書類（建築確認済証）の事前確認→営業事務\n・お客様の金消契約日や振込手続日のスケジュール確認→営業事務\n・銀行からの入金日の確認→営業事務\n・入金チャットでの入金報告の確認、お客様へのお礼連絡\n・工事中アクシデントの各所への報連相',
  'コンシェルジュ',
  130
);

-- 業務32: 上棟金
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, responsible_department, when_to_do)
VALUES (
  32, 32, '上棟金振込確認', '工事', 'S', 'S',
  '建物の費用の30％のお支払いをしていただく',
  'コンシェルジュ',
  '上棟日7日以内'
);

-- 業務33: 上棟～完了検査
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, dos, responsible_department, when_to_do)
VALUES (
  34, 34, '上棟立会', '工事', 'K', 'S',
  '安心して工事が進んでいることの確認及び見学',
  E'・提出必要書類（中間検査合格証・上棟証明書）の事前確認→営業事務\n・立会参加者（監督・IC・外構担当）のスケジュール把握→営業事務\n・余裕をもったお客様への候補日提示（〇週間前までに）→営業事務',
  '営業',
  'ボードが貼られるまで'
);

-- 業務35: 完了検査～鍵渡し
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, dos, responsible_department, when_to_do)
VALUES (
  35, 35, '竣工立会', '工事', 'K', 'S',
  'お引渡しの前に建物の傷の有無をチェックをするため',
  E'・現場監督へ竣工日の再確認\n・余裕をもったお客様への鍵渡し候補日の提示（〇週間前までに）',
  '営業',
  '引渡2週間～1週間前'
);

-- 業務36: 最終金・引き渡し
INSERT INTO task_masters (business_no, task_order, title, description, phase, task_category, importance, purpose, responsible_department, days_from_contract)
VALUES (
  36, 36, '最終金・引き渡し',
  E'【作業内容】\n1. 精算書作成作業\n2. 融資機関・司法書士連絡作業\n3. 振込確認作業（経理部・金融機関）\n4. カギ渡し作業\n5. 紹介打診',
  '工事', 'C', 'S',
  '完成した建物に対して費用をお支払いいただき所有権が移転する状態',
  '営業',
  266
);

-- 【管理業務】

-- 業務38: 最新営業状況反映
INSERT INTO task_masters (business_no, task_order, title, phase, task_category, importance, purpose, dos, donts, responsible_department, when_to_do, manual_url)
VALUES (
  38, 38, '営業スケジュール管理シート更新', '管理', 'K', 'S',
  '顧客情報の進捗の確認',
  '常に最新情報になるように指示',
  'お客様情報の入力漏れ、忘れ、偽装',
  '営業',
  '毎週日曜日夜まで',
  'https://docs.google.com/spreadsheets/d/1iZUQCYGZ3M-iWdQpVYUGOzrfFXr4QgPQRg6O8C8lyA4/edit?gid=707441532#gid=707441532'
);

COMMENT ON TABLE task_masters IS 'Gハウス業務フロー - 全56業務のタスクマスタ';
