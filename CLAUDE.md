# CLAUDE.md

このファイルはClaude Codeがこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト概要

Manus Works Collection - AIエージェント「Manus」を使用した作品を集め、展示するイベントのランディングページ。

- **イベント期間**: 1.19 - 1.24
- **主催**: Manus × SakuraRin × トキワバレー
- **デプロイ先**: Vercel (https://manus.tokiwavalley.com)

## 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **フォント**: IBM Plex Sans JP, Shippori Mincho
- **ホスティング**: Vercel
- **バックエンド**: Google Apps Script (ギャラリーAPI)

## プロジェクト構成

```
manus-lp/
├── index.html          # メインHTMLファイル
├── style.css           # スタイルシート
├── script.js           # JavaScript (アニメーション、ギャラリー、モーダル)
├── Assets/
│   └── background/
│       ├── desktop/    # デスクトップ用背景動画 (横向き)
│       ├── mobile/     # モバイル用背景動画 (縦向き)
│       └── music/      # BGM
└── .vercel/            # Vercel設定
```

## 開発コマンド

```bash
# ローカル開発サーバー起動
python3 -m http.server 8000
# または
npx serve .
```

## 主要機能

### ヒーロー動画
- `initHeroVideo()`: 画面サイズに応じてモバイル/デスクトップ用動画を自動選択
- 動画終了時に別の動画をランダム再生

### ギャラリー
- Google Apps Script APIから作品データを取得
- カテゴリフィルタリング機能
- モーダルで作品詳細表示
- `GALLERY_CONFIG.API_URL`: APIエンドポイント設定

### アニメーション
- `initScrollAnimations()`: スクロール連動フェードイン
- `initHeroAnimation()`: ヒーローセクションの入場アニメーション
- `initSmoothScroll()`: アンカーリンクのスムーススクロール

### BGM
- `initBackgroundMusic()`: 自動再生（ブラウザ制限時はユーザー操作後に開始）

## 注意点

- 静的サイトのため、ビルドプロセスは不要
- 画像URLはGoogle Drive形式からlh3形式に自動変換される
- XSS対策として`escapeHtml()`と`sanitizeUrl()`を使用
