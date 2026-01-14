// ========================================
// Google Apps Script for Manus Works Gallery
// ========================================
//
// フォームフィールド（回答がスプレッドシートに記録される順序）:
// 0: タイムスタンプ
// 1: メールアドレス
// 2: ニックネーム（author）
// 3: X（旧Twitter）アカウント名（twitter）
// 4: 作品名（title）
// 5: 作品のカテゴリ（category）
// 6: 作品の概要・アピールポイント（description）
// 7: 作品のスクリーンショット（imageUrl - Google Driveリンク）
// 8: 作品のリンク（workUrl）
//
// Setup Instructions:
// 1. フォームに紐づいたスプレッドシートを開く
// 2. Extensions > Apps Script を開く
// 3. このコードを Code.gs に貼り付け
// 4. Deploy > New Deployment > Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Web App URLをコピーし、script.js の GALLERY_CONFIG.API_URL に設定
//

function doGet(e) {
  // CORS support
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const works = getWorksData();
    output.setContent(JSON.stringify({ works: works }));
  } catch (error) {
    output.setContent(JSON.stringify({ error: error.message }));
  }

  return output;
}

function getWorksData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  // Skip if only header row
  if (data.length <= 1) {
    return [];
  }

  const works = [];

  // Process from row 2 (row 1 is header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const work = {
      id: i,
      timestamp: row[0],
      author: row[2] || '',           // ニックネーム
      twitter: row[3] || '',          // X アカウント
      title: row[4] || '',            // 作品名
      category: mapCategory(row[5]),  // カテゴリ
      description: row[6] || '',      // 概要
      imageUrl: convertDriveLink(row[7]),  // スクリーンショット
      workUrl: row[8] || ''           // 作品のリンク
    };

    // Only include if required fields are present
    if (work.title && work.author) {
      works.push(work);
    }
  }

  // Sort by newest first
  works.reverse();

  return works;
}

// Google Driveのファイルリンクを直接参照可能なURLに変換
function convertDriveLink(url) {
  if (!url) return '';
  
  // Google Driveのファイルリンクから画像URLを生成
  // Format: https://drive.google.com/file/d/FILE_ID/view → https://drive.google.com/uc?id=FILE_ID
  const driveMatch = url.match(/\/file\/d\/([^\/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?id=${driveMatch[1]}`;
  }
  
  // Already a direct URL or other format
  return url;
}

function mapCategory(categoryInput) {
  // Map form selection to category ID
  const categoryMap = {
    'Apps & Tools（Webアプリ、Chrome拡張機能、自動化ツールなど）': 'apps',
    'Apps & Tools': 'apps',
    'apps': 'apps',
    'Documents（プロンプト集、AI活用のノウハウ記事、電子書籍など）': 'documents',
    'Documents': 'documents',
    'documents': 'documents',
    'Data & Analysis（データ分析レポート、予測モデル、可視化ダッシュボードなど）': 'data',
    'Data & Analysis': 'data',
    'data': 'data',
    'Creative（AI生成画像、動画、音楽、デザイン、小説など）': 'creative',
    'Creative': 'creative',
    'creative': 'creative',
    'Others（上記に当てはまらないもの）': 'others',
    'Others': 'others',
    'others': 'others'
  };

  return categoryMap[categoryInput] || 'others';
}

// Test function - run this to verify data extraction
function testGetWorks() {
  const works = getWorksData();
  Logger.log(JSON.stringify(works, null, 2));
}
