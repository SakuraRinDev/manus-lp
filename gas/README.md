# Manus Works Gallery - Google Apps Script

Google Form からの作品投稿を管理し、AI による自動審査を経て公開する仕組み。

## 構成

```
gas/
├── Code.gs      # メインスクリプト（GAS にコピーして使用）
├── SETUP.md     # セットアップ手順
├── Agent.md     # AI エージェント機能について
└── Claude.md    # AI モデル設定について
```

## 機能

| 機能 | 説明 |
|------|------|
| Web API | 承認済み作品を JSON で返す (`doGet`) |
| 自動審査 | AI によるコンプライアンスチェック |
| 自動承認 | 審査通過で即公開 |
| 画像処理 | Drive にコピー & 公開 URL 生成 |

## クイックスタート

1. スプレッドシートの Apps Script に `Code.gs` をコピー
2. スクリプトプロパティに `OPENROUTER_API_KEY` を設定
3. メニュー `[Manus Gallery] > [トリガー設定]` を実行
4. Web アプリとしてデプロイ

詳細は [SETUP.md](SETUP.md) を参照。

## スプレッドシート構成

| 列 | 内容 |
|----|------|
| A-J | フォーム回答データ |
| K | Status (PENDING / APPROVED / REJECTED) |
| L | Public_Image_URL |
| M | Compliance_Result |
| N | Compliance_Reason |
| O | Reviewed_At |
