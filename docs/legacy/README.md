# Legacy Documentation

このフォルダには、プロジェクト初期段階で作成された古いドキュメントファイルが含まれています。

## ⚠️ 注意

これらのドキュメントは**古い情報**を含んでおり、現在は使用されていません。
最新の情報については、プロジェクトルートの以下のドキュメントを参照してください：

### 📖 最新ドキュメント

**開発者向け**:
- [CLAUDE.md](../../CLAUDE.md) - プロジェクト概要・開発ガイド
- [REQUIREMENTS.md](../../REQUIREMENTS.md) - 要件定義書
- [README.md](../../README.md) - セットアップ手順
- [DEPLOYMENT.md](../../DEPLOYMENT.md) - デプロイ手順書

**運用チーム向け**:
- [OPERATIONS_MANUAL.md](../../OPERATIONS_MANUAL.md) - 運用マニュアル
- [SECURITY_CHECKLIST.md](../../SECURITY_CHECKLIST.md) - セキュリティチェックリスト
- [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) - 災害復旧計画

**プロジェクト管理**:
- [RELEASE_CHECKLIST.md](../../RELEASE_CHECKLIST.md) - リリース工程表
- [RELEASE_SUMMARY.md](../../RELEASE_SUMMARY.md) - リリースサマリー

---

## このフォルダに含まれるファイル

### SUPABASE_SETUP.md
- **作成日**: 初期
- **内容**: Supabase初期セットアップ手順
- **現在**: `DEPLOYMENT.md` に統合済み

### QUICK_START.md
- **作成日**: 初期
- **内容**: クイックスタートガイド
- **現在**: `README.md` に統合済み

### PWA_SETUP.md
- **作成日**: 初期
- **内容**: PWA（Progressive Web App）セットアップ
- **現在**: 未実装（将来の改善項目）

### DATABASE_MIGRATION.md
- **作成日**: 初期
- **内容**: データベースマイグレーション手順
- **現在**: `supabase/migrations/` + `DEPLOYMENT.md` に統合済み

### IMPLEMENTATION_COMPLETE.md
- **作成日**: 中期
- **内容**: 実装完了ステータス（当時のスナップショット）
- **現在**: `RELEASE_SUMMARY.md` に置き換え

### SUPABASE_AUTH_SETUP.md
- **作成日**: 初期
- **内容**: Supabase認証セットアップ
- **現在**: `DEPLOYMENT.md` に統合済み

### mobile-compatibility-check.md
- **作成日**: 中期
- **内容**: モバイル互換性チェック（チェックリスト）
- **現在**: 実装完了済み

### MOBILE_RESPONSIVE_COMPLETE.md
- **作成日**: 中期
- **内容**: モバイルレスポンシブ対応完了レポート
- **現在**: 実装完了済み

### SQL_SETUP_GUIDE.md
- **作成日**: 初期
- **内容**: SQL セットアップガイド
- **現在**: `DEPLOYMENT.md` + マイグレーションファイルに統合済み

---

## なぜこのフォルダに移動したか

プロジェクトが成熟するにつれ、ドキュメントが重複・分散し、以下の問題が発生しました：

1. **情報の重複**: 同じ内容が複数のファイルに記載
2. **古い情報**: 最新の実装状況と乖離した情報
3. **ドキュメントの分散**: 情報が散在し、必要な情報を見つけにくい

そのため、2025年10月22日に以下の統合作業を実施：

- ✅ 関連情報を最新ドキュメントに統合
- ✅ 古いファイルを `docs/legacy/` に移動
- ✅ `README.md` にドキュメント構造を明記

---

**最終更新**: 2025-10-22
**整理実施者**: Claude Code
