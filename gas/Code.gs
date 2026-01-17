/**
 * Manus Works Gallery - Google Apps Script API
 *
 * このスクリプトはGoogle Formの回答が保存されたスプレッドシートから
 * 作品データを取得し、JSON形式で返すWeb APIです。
 *
 * セットアップ:
 * 1. Google Formを作成（SETUP.mdを参照）
 * 2. フォームの回答をスプレッドシートに連携
 * 3. スプレッドシートの「拡張機能」→「Apps Script」を開く
 * 4. このコードを貼り付けてデプロイ
 */

// スプレッドシートの列インデックス（0始まり）
// Google Formの質問順序に合わせて調整してください
const COLUMNS = {
  TIMESTAMP: 0,      // タイムスタンプ（自動）
  TITLE: 1,          // 作品タイトル
  AUTHOR: 2,         // 作者名
  CATEGORY: 3,       // カテゴリ
  DESCRIPTION: 4,    // 作品説明
  IMAGE_URL: 5,      // 画像URL（任意）
  WORK_URL: 6,       // 作品URL（任意）
  MANUS_URL: 7,      // Manus URL（任意）
  APPROVED: 8        // 承認済み（手動で追加する列）
};

// カテゴリのマッピング（Formの選択肢 → JSのカテゴリID）
const CATEGORY_MAP = {
  'Apps & Tools': 'apps',
  'Documents': 'documents',
  'Data & Analysis': 'data',
  'Creative': 'creative',
  'Others': 'others'
};

/**
 * GETリクエストを処理
 * @param {Object} e - リクエストパラメータ
 * @returns {TextOutput} JSON形式のレスポンス
 */
function doGet(e) {
  try {
    const works = getWorks();
    const response = {
      success: true,
      works: works,
      count: works.length,
      timestamp: new Date().toISOString()
    };
    return createJsonResponse(response);
  } catch (error) {
    console.error('Error in doGet:', error);
    return createJsonResponse({
      success: false,
      error: error.message,
      works: []
    });
  }
}

/**
 * スプレッドシートから作品データを取得
 * @returns {Array} 作品オブジェクトの配列
 */
function getWorks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  // ヘッダー行をスキップ
  const rows = data.slice(1);

  const works = [];

  rows.forEach((row, index) => {
    // 空の行をスキップ
    if (!row[COLUMNS.TITLE]) return;

    // 承認列がある場合、承認済みのみ表示
    // 承認列がない場合は全て表示
    const hasApprovalColumn = row.length > COLUMNS.APPROVED;
    if (hasApprovalColumn && row[COLUMNS.APPROVED] !== true && row[COLUMNS.APPROVED] !== 'TRUE' && row[COLUMNS.APPROVED] !== '承認済み') {
      return;
    }

    const categoryText = row[COLUMNS.CATEGORY] || '';
    const categoryId = CATEGORY_MAP[categoryText] || 'others';

    works.push({
      id: index + 1,
      title: row[COLUMNS.TITLE] || '',
      author: row[COLUMNS.AUTHOR] || '匿名',
      category: categoryId,
      description: row[COLUMNS.DESCRIPTION] || '',
      imageUrl: row[COLUMNS.IMAGE_URL] || '',
      workUrl: row[COLUMNS.WORK_URL] || '',
      manusUrl: row[COLUMNS.MANUS_URL] || '',
      timestamp: row[COLUMNS.TIMESTAMP] ? new Date(row[COLUMNS.TIMESTAMP]).toISOString() : ''
    });
  });

  // 新しい順にソート
  works.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return works;
}

/**
 * JSONレスポンスを作成
 * @param {Object} data - レスポンスデータ
 * @returns {TextOutput} JSON形式のレスポンス
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * テスト用関数 - スクリプトエディタから実行して動作確認
 */
function testGetWorks() {
  const works = getWorks();
  console.log('取得した作品数:', works.length);
  console.log('作品データ:', JSON.stringify(works, null, 2));
}
