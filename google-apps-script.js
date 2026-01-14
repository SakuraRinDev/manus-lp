// ========================================
// Google Apps Script for Manus Works Gallery
// 承認ワークフロー対応版
// ========================================
//
// スプレッドシートのカラム順:
// 0: タイムスタンプ
// 1: ニックネーム（author）
// 2: X（旧Twitter）アカウント名（twitter）
// 3: 作品名（title）
// 4: 作品のカテゴリ（category）
// 5: 作品の概要・アピールポイント（description）
// 6: 作品のスクリーンショット（元画像URL）
// 7: 作品のリンク（workUrl）
// 8: Status（PENDING / APPROVED / REJECTED）
// 9: Public_Image_URL（公開用画像URL - 自動生成）
//
// --- Setup Instructions ---
// 1. スプレッドシートの列I に「Status」、列J に「Public_Image_URL」ヘッダーを追加
// 2. Google Drive に「01_approved」フォルダを作成し、「リンクを知っている全員」に共有
// 3. 下記の APPROVED_FOLDER_ID を作成したフォルダのIDに置き換え
// 4. このスクリプトをデプロイ → Web App URLを取得
// 5. トリガー設定: onEdit関数をスプレッドシートの編集時に実行するよう設定
//

// ========================================
// 設定
// ========================================
const CONFIG = {
  // 承認済み画像を格納するフォルダID
  // フォルダURLが https://drive.google.com/drive/folders/XXXX なら、XXXXの部分
  APPROVED_FOLDER_ID: '1oQSx-hBHCt1J9pQG_x-7lnJXTUMXT3Q_',

  // カラムインデックス（0始まり）
  COL: {
    TIMESTAMP: 0,
    NICKNAME: 1,
    TWITTER: 2,
    TITLE: 3,
    CATEGORY: 4,
    DESCRIPTION: 5,
    ORIGINAL_IMAGE: 6,
    PROJECT_URL: 7,
    STATUS: 8,
    PUBLIC_IMAGE_URL: 9
  }
};

// ========================================
// Web API: 承認済み作品のみ返す
// ========================================
function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const works = getApprovedWorks();
    output.setContent(JSON.stringify({ works: works }));
  } catch (error) {
    output.setContent(JSON.stringify({ error: error.message }));
  }

  return output;
}

function getApprovedWorks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const works = [];
  const COL = CONFIG.COL;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = (row[COL.STATUS] || '').toString().toUpperCase().trim();

    // APPROVED のみ返す
    if (status !== 'APPROVED') {
      continue;
    }

    const work = {
      id: i,
      timestamp: row[COL.TIMESTAMP],
      author: row[COL.NICKNAME] || '',
      twitter: row[COL.TWITTER] || '',
      title: row[COL.TITLE] || '',
      category: mapCategory(row[COL.CATEGORY]),
      description: row[COL.DESCRIPTION] || '',
      imageUrl: row[COL.PUBLIC_IMAGE_URL] || convertDriveLink(row[COL.ORIGINAL_IMAGE]),
      workUrl: row[COL.PROJECT_URL] || ''
    };

    if (work.title && work.author) {
      works.push(work);
    }
  }

  works.reverse();
  return works;
}

// ========================================
// onEdit トリガー: ステータス変更時に画像を公開
// ※シンプルトリガー(onEdit)ではなく、インストール可能リガーとして登録する関数
// ========================================
function installedOnEdit(e) {
  console.log('=== installedOnEdit triggered ===');
  console.log('Event object:', JSON.stringify(e));

  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();

  console.log('Row:', row, 'Col:', col, 'Expected Status Col:', CONFIG.COL.STATUS + 1);

  // Status列（I列 = 9）が編集された場合のみ処理
  if (col !== CONFIG.COL.STATUS + 1) {
    console.log('Not Status column, skipping');
    return;
  }

  // e.value ではなく、セルの値を直接読み取る
  const newValue = range.getValue().toString().toUpperCase().trim();
  console.log('New value (from cell):', newValue);

  if (newValue === 'APPROVED') {
    console.log('Processing approval for row:', row);
    processApproval(sheet, row);
  } else {
    console.log('Value is not APPROVED, skipping');
  }
}

function processApproval(sheet, row) {
  console.log('=== processApproval started ===');
  const COL = CONFIG.COL;
  const originalImageUrl = sheet.getRange(row, COL.ORIGINAL_IMAGE + 1).getValue();
  console.log('Original Image URL (G column):', originalImageUrl);

  if (!originalImageUrl) {
    console.log('ERROR: Original image URL is empty');
    return;
  }

  try {
    // Google DriveのファイルIDを抽出
    const fileId = extractFileId(originalImageUrl);
    console.log('Extracted file ID:', fileId);

    if (!fileId) {
      console.log('ERROR: Could not extract file ID from:', originalImageUrl);
      return;
    }

    // ファイルを公開フォルダにコピー
    console.log('Copying to approved folder...');
    const publicUrl = copyToApprovedFolder(fileId);
    console.log('Public URL:', publicUrl);

    if (publicUrl) {
      // Public_Image_URL列に書き込み
      sheet.getRange(row, COL.PUBLIC_IMAGE_URL + 1).setValue(publicUrl);
      console.log('SUCCESS: Written to column J');
    }
  } catch (error) {
    console.log('ERROR:', error.message);
    console.log('Stack:', error.stack);
  }
}

function extractFileId(url) {
  if (!url) return null;

  // https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (openMatch) return openMatch[1];

  // https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = url.match(/\/file\/d\/([^\/]+)/);
  if (fileMatch) return fileMatch[1];

  return null;
}

function copyToApprovedFolder(fileId) {
  const file = DriveApp.getFileById(fileId);
  const approvedFolder = DriveApp.getFolderById(CONFIG.APPROVED_FOLDER_ID);

  // ファイルをコピー
  const copiedFile = file.makeCopy(file.getName(), approvedFolder);

  // 公開設定: リンクを知っている全員が閲覧可能
  copiedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // 公開URL生成（lh3.googleusercontent.com形式 = クロスオリジンで動作）
  const publicUrl = 'https://lh3.googleusercontent.com/d/' + copiedFile.getId();

  return publicUrl;
}

// ========================================
// ユーティリティ関数
// ========================================
function convertDriveLink(url) {
  if (!url) return '';

  const fileId = extractFileId(url);
  if (fileId) {
    return 'https://drive.google.com/uc?export=view&id=' + fileId;
  }

  return url;
}

function mapCategory(categoryInput) {
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

// ========================================
// テスト・セットアップ用関数
// ========================================
function testGetApprovedWorks() {
  const works = getApprovedWorks();
  Logger.log(JSON.stringify(works, null, 2));
}

// 初回セットアップ: installedOnEditトリガーを登録
function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();

  // 既存のトリガーをすべて削除（クリーンアップ）
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  // 新しいトリガーを作成
  ScriptApp.newTrigger('installedOnEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  Logger.log('installedOnEdit trigger has been set up.');
}
