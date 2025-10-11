# PWAアイコン作成ガイド

G-progressアプリをPWA（Progressive Web App）として完全に機能させるために、アイコン画像を作成する必要があります。

## 必要なアイコン

以下の2つのPNG画像ファイルを作成してください：

1. **`/public/icon-192.png`** - 192x192ピクセル
2. **`/public/icon-512.png`** - 512x512ピクセル

## デザイン推奨事項

### カラー
- **メインカラー**: `#2563eb` (青 - theme-colorと一致)
- **背景**: 白または透明
- **スタイル**: シンプルでモダン、視認性の高いデザイン

### コンセプト
- **G-progress**のロゴマーク
- 建設・プロジェクト管理を表現
- モバイルでも見やすいシンプルなアイコン

## 作成方法

### オプション1: オンラインツールを使用（推奨）

1. **Canva** (https://www.canva.com/)
   - 「Custom Size」で 512x512 を選択
   - 以下のデザイン例を参考に作成：
     ```
     - 背景: #2563eb (青)
     - 文字: "G" (白、太字フォント)
     - または建設ツールアイコン（ハンマー、定規など）
     ```
   - PNG形式でダウンロード（512x512）
   - 同じデザインを192x192でも作成

2. **Figma** (https://www.figma.com/)
   - フレームサイズ: 512x512、192x192
   - エクスポート形式: PNG

3. **PWA Icon Generator** (https://www.pwabuilder.com/)
   - ベース画像（512x512以上）をアップロード
   - 自動で複数サイズを生成

### オプション2: シンプルなデザイン例

**推奨デザイン:**
```
┌─────────────────┐
│                 │
│                 │
│       G         │  ← 白い"G"の文字
│                 │
│                 │
└─────────────────┘
青色背景 (#2563eb)
```

または

```
┌─────────────────┐
│                 │
│      🏗️         │  ← 建設アイコン
│                 │
│   G-progress    │
│                 │
└─────────────────┘
```

## クイックセットアップ（テンポラリ）

開発・テスト用に、以下のコマンドで仮アイコンを生成できます：

```bash
# ImageMagickがインストールされている場合
convert -size 192x192 xc:#2563eb -gravity center -pointsize 120 -fill white -annotate +0+0 "G" public/icon-192.png
convert -size 512x512 xc:#2563eb -gravity center -pointsize 320 -fill white -annotate +0+0 "G" public/icon-512.png
```

## 配置

作成したアイコンを以下のパスに配置：
```
G-progress/
  public/
    icon-192.png  ← ここに配置
    icon-512.png  ← ここに配置
    manifest.json (既に設定済み)
    sw.js (既に設定済み)
```

## 確認方法

1. アイコンを配置後、開発サーバーを起動:
   ```bash
   npm run dev
   ```

2. ブラウザで http://localhost:5174/ を開く

3. Chrome DevToolsを開く (F12)

4. 「Application」タブ → 「Manifest」で以下を確認:
   - Name: "G-progress 業務管理システム"
   - Icons: 192x192 と 512x512 が表示される
   - Start URL: "/"

5. 「Service Workers」でService Workerが登録されているか確認

## PWAインストール

アイコン配置後、以下の方法でPWAとしてインストール可能：

- **Chrome (デスクトップ)**: アドレスバーの右側に表示される「インストール」ボタン
- **Chrome (モバイル)**: メニュー → 「ホーム画面に追加」
- **Safari (iOS)**: 共有ボタン → 「ホーム画面に追加」

## トラブルシューティング

### アイコンが表示されない場合

1. ブラウザのキャッシュをクリア
2. Service Workerを削除して再登録:
   - Chrome DevTools → Application → Service Workers → "Unregister"
   - ページをリロード

3. manifest.jsonの設定を確認:
   ```json
   {
     "icons": [
       {
         "src": "/icon-192.png",
         "sizes": "192x192",
         "type": "image/png",
         "purpose": "any maskable"
       },
       {
         "src": "/icon-512.png",
         "sizes": "512x512",
         "type": "image/png",
         "purpose": "any maskable"
       }
     ]
   }
   ```

## 本番デプロイ時の注意

- Vercelなどにデプロイする際、`public/`フォルダ内のファイルが全て含まれることを確認
- HTTPSが必須（PWAはHTTPSでのみ動作）
- manifest.jsonの`start_url`がデプロイ先のURLと一致していることを確認

---

**完了後は、G-progressが完全なPWAとして動作し、オフライン対応、ホーム画面追加、プッシュ通知などの機能が利用可能になります！** 🎉
