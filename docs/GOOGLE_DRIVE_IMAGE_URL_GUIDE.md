# Google Drive 画像URL完全ガイド

> **最終更新**: 2025年1月
> **対象**: Manus Works Gallery プロジェクト

## 概要

Google Driveの画像をWebサイトに埋め込む際、URL形式によって動作が大きく異なります。
このドキュメントでは、各URL形式の特性、問題点、推奨される使用方法を詳細に記載します。

---

## URL形式一覧と評価

| 形式 | 信頼性 | CORS | レート制限 | 推奨度 |
|------|--------|------|------------|--------|
| `/thumbnail` | ★★★★☆ | OK | あり | **推奨** |
| `lh3.googleusercontent.com` | ★★★☆☆ | OK | あり | 条件付き |
| `/uc?export=view` | ★☆☆☆☆ | NG | 厳しい | **非推奨** |
| `/file/d/` | ☆☆☆☆☆ | NG | - | 使用不可 |

---

## 各URL形式の詳細

### 1. `/thumbnail` 形式 【推奨】

```
https://drive.google.com/thumbnail?id={FILE_ID}&sz=w{WIDTH}
https://drive.google.com/thumbnail?id={FILE_ID}&sz=s{SIZE}
```

**パラメータ:**
- `id`: Google DriveのファイルID
- `sz=w{WIDTH}`: 幅指定（例: `sz=w1000` = 幅1000px）
- `sz=s{SIZE}`: 最大辺指定（例: `sz=s4000` = 長辺4000px）
- `sz=h{HEIGHT}`: 高さ指定

**例:**
```
https://drive.google.com/thumbnail?id=1Tw3z7mAxAUHWgXJKIPJybFAZFBLJiPDI&sz=w1000
https://drive.google.com/thumbnail?id=1Tw3z7mAxAUHWgXJKIPJybFAZFBLJiPDI&sz=s4000
```

**メリット:**
- 2024年7月以降、最も安定して動作
- `<img>` タグで直接使用可能
- サイズ指定が柔軟

**デメリット:**
- **10枚以上の同時読み込みでレート制限の可能性**
- サイズ指定が小さいと画像がトリミングされる

**推奨サイズ設定:**
```javascript
// 一覧表示用
`https://drive.google.com/thumbnail?id=${fileId}&sz=w400`

// 詳細表示用
`https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`

// 高画質表示用
`https://drive.google.com/thumbnail?id=${fileId}&sz=s4000`
```

---

### 2. `lh3.googleusercontent.com` 形式

```
https://lh3.googleusercontent.com/d/{FILE_ID}
https://lh3.googleusercontent.com/d/{FILE_ID}=w{WIDTH}
https://lh3.googleusercontent.com/d/{FILE_ID}=w{WIDTH}-h{HEIGHT}
https://lh3.googleusercontent.com/d/{FILE_ID}=s{SIZE}
```

**例:**
```
https://lh3.googleusercontent.com/d/1Tw3z7mAxAUHWgXJKIPJybFAZFBLJiPDI=w1000
https://lh3.googleusercontent.com/d/1Tw3z7mAxAUHWgXJKIPJybFAZFBLJiPDI=s4000
```

**メリット:**
- Google内部のCDNを使用（高速）
- 認証不要でアクセス可能

**デメリット:**
- **不安定**: 動作したりしなかったりする
- Google内部APIのため、仕様変更リスクが高い
- 特定の条件下で403/404エラーが発生

**不安定な原因（推定）:**
1. Googleの内部的なキャッシュ状態
2. リファラーによるアクセス制限
3. ファイルのアクセス頻度によるキャッシュ有無
4. 地域/IPによる制限

---

### 3. `/uc?export=view` 形式 【非推奨】

```
https://drive.google.com/uc?export=view&id={FILE_ID}
```

**2024年1月以降、ほぼ使用不可**

**問題点:**
- CORS制限により`<img>`タグで読み込み不可
- "This URL does not appear to be an image" エラー
- "Too Many Requests" エラーが頻発
- HTMLページへのリダイレクトが発生

---

### 4. `/file/d/` 形式 【使用不可】

```
https://drive.google.com/file/d/{FILE_ID}/view
```

**`<img>`タグでは使用不可**（HTMLプレビューページを返す）

---

## 不安定な動作の原因と対策

### 原因1: レート制限

**症状:**
- 10枚以上の画像を同時読み込みすると一部が表示されない
- リロードすると異なる画像が表示されない

**対策:**
```javascript
// 遅延読み込み（Intersection Observer）
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
}, { rootMargin: '100px' });

// 画像の段階的読み込み
function loadImagesWithDelay(images, delay = 100) {
  images.forEach((img, index) => {
    setTimeout(() => {
      img.src = img.dataset.src;
    }, index * delay);
  });
}
```

### 原因2: ブラウザキャッシュ

**症状:**
- 同じURLなのにブラウザによって表示/非表示が異なる
- キャッシュクリアすると表示されなくなる

**対策:**
```javascript
// キャッシュバスター（非推奨だが緊急時に使用）
const url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000&t=${Date.now()}`;

// Service Workerでのキャッシュ制御（推奨）
// cache-control: no-cache を設定
```

### 原因3: 共有設定

**症状:**
- 特定の画像だけ表示されない
- 管理者のブラウザでは表示されるが、他のユーザーでは表示されない

**対策:**
1. Google Driveで該当ファイルを右クリック
2. 「共有」→「一般的なアクセス」
3. **「リンクを知っている全員」** に設定
4. **「閲覧者」** 権限を確認

### 原因4: ファイル形式

**症状:**
- 特定のファイルだけ表示されない

**対策:**
- サポートされる形式: JPEG, PNG, GIF, WebP, BMP
- HEICやRAWは事前に変換が必要

---

## フォールバック戦略

### 推奨実装

```javascript
/**
 * Google Drive画像URLを最適な形式に変換
 * フォールバック付き
 */
async function loadDriveImage(fileId, imgElement, options = {}) {
  const { width = 1000, retries = 3, retryDelay = 500 } = options;

  // URL形式の優先順位
  const urlFormats = [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`,
    `https://lh3.googleusercontent.com/d/${fileId}=w${width}`,
  ];

  for (let attempt = 0; attempt < retries; attempt++) {
    for (const url of urlFormats) {
      try {
        const success = await tryLoadImage(imgElement, url);
        if (success) {
          console.log(`[DriveImage] Success: ${url}`);
          return true;
        }
      } catch (e) {
        console.warn(`[DriveImage] Failed: ${url}`, e);
      }
    }

    if (attempt < retries - 1) {
      await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
    }
  }

  // 全て失敗した場合はプレースホルダー
  imgElement.src = '/assets/placeholder.png';
  return false;
}

function tryLoadImage(imgElement, url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);

    const tempImg = new Image();
    tempImg.onload = () => {
      clearTimeout(timer);
      if (tempImg.naturalWidth > 0) {
        imgElement.src = url;
        resolve(true);
      } else {
        reject(new Error('zero width'));
      }
    };
    tempImg.onerror = () => {
      clearTimeout(timer);
      reject(new Error('load error'));
    };
    tempImg.src = url;
  });
}
```

---

## GAS側での推奨実装

```javascript
// Google Apps Script

/**
 * 画像URLを生成（推奨形式）
 */
function generatePublicImageUrl(fileId) {
  // 方法1: thumbnail形式（推奨）
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

/**
 * 承認済みフォルダにコピーして公開URL生成
 */
function copyToApprovedFolder(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const approvedFolder = DriveApp.getFolderById(CONFIG.APPROVED_FOLDER_ID);

    const timestamp = new Date().getTime();
    const newName = `${timestamp}_${file.getName()}`;

    const copiedFile = file.makeCopy(newName, approvedFolder);

    // 公開設定
    copiedFile.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);

    // thumbnail形式を返す（lh3より安定）
    return `https://drive.google.com/thumbnail?id=${copiedFile.getId()}&sz=w1000`;

  } catch (e) {
    console.error('Copy failed:', e);
    return null;
  }
}
```

---

## デバッグ方法

### ブラウザ開発者ツール

```javascript
// コンソールで実行して画像の状態を確認
document.querySelectorAll('img').forEach((img, i) => {
  console.log(`Image ${i}:`, {
    src: img.src,
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    error: img.naturalWidth === 0 && img.complete
  });
});
```

### ネットワークタブ確認事項

1. **ステータスコード**
   - 200: 正常
   - 403: アクセス権限なし
   - 404: ファイルが存在しない
   - 429: レート制限

2. **レスポンスヘッダー**
   - `Content-Type`: `image/*` であることを確認
   - `X-Frame-Options`: CORS制限の確認

---

## トラブルシューティング

### Q: 全ての画像が表示されない

**A:**
1. Google Driveの共有設定を確認（「リンクを知っている全員」）
2. ファイルIDが正しいか確認
3. ブラウザのキャッシュをクリア
4. 別のブラウザで試す

### Q: 一部の画像だけ表示されない

**A:**
1. 該当ファイルの共有設定を個別に確認
2. ファイル形式を確認（JPEG/PNG推奨）
3. ファイルサイズを確認（大きすぎると問題が発生）

### Q: リロードすると表示される画像が変わる

**A:**
1. レート制限の可能性 → 遅延読み込みを実装
2. 画像の数を減らす
3. キャッシュ設定を見直す

### Q: 特定のブラウザでのみ表示されない

**A:**
1. CORS設定を確認
2. `referrerpolicy="no-referrer"` を試す
3. `crossorigin="anonymous"` を試す

---

## 参考リンク

- [Google Sites Community - Images no longer working](https://support.google.com/sites/thread/253003338)
- [Embedding Google Drive Images in 2024](https://joe-walton.com/blog/embedding-google-drive-images-in-html-in-2024/)
- [DEV Community - Embed images from Google Drive](https://dev.to/googleworkspace/embed-images-from-google-drive-in-your-website-11k6)
- [Google Drive Image Link Generator](https://sites.google.com/view/drive-tools/google-drive-image-link-generator)

---

## 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-01-20 | 初版作成 |
| - | `/thumbnail`形式を推奨に変更 |
| - | レート制限対策を追加 |
| - | デバッグ方法を追加 |
