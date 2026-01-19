// ========================================
// Google Apps Script for Manus Works Gallery
// 新スプレッドシート対応版
// ========================================
//
// スプレッドシートのカラム構成（Form_Responses）:
// A (0): タイムスタンプ
// B (1): コンプライアンス同意確認（同意します）
// C (2): ニックネーム
// D (3): X（旧Twitter）アカウント名
// E (4): 作品名
// F (5): 作品のカテゴリ
// G (6): 作品の概要・アピールポイント
// H (7): 作品のスクリーンショット（Google Drive URL）
// I (8): 作品のリンク（任意）
// J (9): どこでこの情報を知りましたか？
// --- 以下は管理用カラム（自動追加） ---
// K (10): Status（PENDING / APPROVED / REJECTED）
// L (11): Public_Image_URL（公開用画像URL）
// M (12): Compliance_Result（AI判定結果）
// N (13): Compliance_Reason（AI判定理由）
// O (14): Reviewed_At（審査日時）

// ========================================
// 設定
// ========================================
const CONFIG = {
  // 新スプレッドシートID
  SPREADSHEET_ID: '1hTUDTN135xPqGYYn9qIz3xfkemvO28yzxWKrMt9_upo',

  // シート名（フォーム回答シート）
  SHEET_NAME: 'Form_Responses',

  // 承認済み画像を格納するGoogle DriveフォルダID
  APPROVED_FOLDER_ID: '1oQSx-hBHCt1J9pQG_x-7lnJXTUMXT3Q_',

  // OpenRouter API設定
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  MODEL_NAME: 'google/gemma-3-27b-it:free', // 無料モデル（デプロイ不要）
  MODEL_NAME_LEGACY: 'openai/gpt-4o', // レガシーモデル

  // カラムインデックス（0始まり）- 新構成
  COL: {
    TIMESTAMP: 0,         // A: タイムスタンプ
    USER_CONSENT: 1,      // B: コンプライアンス同意
    NICKNAME: 2,          // C: ニックネーム
    TWITTER: 3,           // D: X（旧Twitter）アカウント
    TITLE: 4,             // E: 作品名
    CATEGORY: 5,          // F: カテゴリ
    DESCRIPTION: 6,       // G: 概要・アピール
    ORIGINAL_IMAGE: 7,    // H: スクリーンショット
    PROJECT_URL: 8,       // I: 作品リンク（任意）
    SOURCE: 9,            // J: 情報源
    STATUS: 10,           // K: 管理ステータス
    PUBLIC_IMAGE_URL: 11, // L: 公開画像URL
    COMPLIANCE_RESULT: 12,// M: AI判定結果
    COMPLIANCE_REASON: 13,// N: AI判定理由
    REVIEWED_AT: 14       // O: 審査日時
  },

  // ステータス値
  STATUS: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    PENDING_REVIEW: 'PENDING_REVIEW'
  }
};

// ========================================
// スプレッドシート取得ヘルパー
// ========================================
function getTargetSpreadsheet() {
  // このスクリプトがバインドされているスプレッドシートを取得
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getTargetSheet() {
  const ss = getTargetSpreadsheet();
  // シート名で検索、なければ最初のシート
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
  }
  return sheet;
}

// ========================================
// カスタムメニュー
// ========================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Manus Gallery')
    .addItem('コンプライアンスチェック実行', 'checkComplianceForPendingRows')
    .addItem('選択行を承認', 'approveSelectedRows')
    .addItem('選択行を拒否', 'rejectSelectedRows')
    .addSeparator()
    .addItem('新規投稿にPENDINGを設定', 'initializePendingStatus')
    .addItem('管理用ヘッダーを追加', 'addAdminHeaders')
    .addItem('画像URL再生成', 'regeneratePublicImageUrls')
    .addSeparator()
    .addItem('トリガー設定', 'setupAllTriggers')
    .addItem('接続テスト', 'testConnection')
    .addToUi();
}

// ========================================
// Web API: 承認済み作品のみ返す
// ========================================
function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const works = getApprovedWorks();
    output.setContent(JSON.stringify({
      success: true,
      count: works.length,
      works: works,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    output.setContent(JSON.stringify({
      success: false,
      error: error.message
    }));
  }

  return output;
}

function getApprovedWorks() {
  const sheet = getTargetSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return [];

  const works = [];
  const COL = CONFIG.COL;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = normalizeStatus(row[COL.STATUS]);

    if (status !== CONFIG.STATUS.APPROVED) continue;

    // タイトルがない行はスキップ
    if (!row[COL.TITLE]) continue;

    const work = {
      id: i,
      timestamp: formatTimestamp(row[COL.TIMESTAMP]),
      author: String(row[COL.NICKNAME] || '').trim(),
      twitter: cleanTwitterHandle(row[COL.TWITTER]),
      title: String(row[COL.TITLE] || '').trim(),
      category: mapCategory(row[COL.CATEGORY]),
      description: String(row[COL.DESCRIPTION] || '').trim(),
      imageUrl: row[COL.PUBLIC_IMAGE_URL] || convertDriveLink(row[COL.ORIGINAL_IMAGE]),
      workUrl: String(row[COL.PROJECT_URL] || '').trim()
    };

    // 作者情報がある場合のみ追加
    if (work.author || work.twitter) {
      works.push(work);
    }
  }

  // 新しい順にソート
  works.reverse();
  return works;
}

// ========================================
// ユーティリティ関数
// ========================================

function normalizeStatus(value) {
  const status = String(value || '').toUpperCase().trim();
  // 日本語ステータスの対応
  if (status === '承認済み' || status === '承認' || status === 'APPROVED') {
    return CONFIG.STATUS.APPROVED;
  }
  if (status === '拒否' || status === '却下' || status === 'REJECTED') {
    return CONFIG.STATUS.REJECTED;
  }
  if (status === '保留' || status === '審査中' || status === 'PENDING' || status === 'PENDING_REVIEW') {
    return CONFIG.STATUS.PENDING;
  }
  return status;
}

function formatTimestamp(ts) {
  if (!ts) return '';
  if (ts instanceof Date) {
    return ts.toISOString();
  }
  return String(ts);
}

function cleanTwitterHandle(handle) {
  if (!handle) return '';
  let cleaned = String(handle).trim();
  // @を除去して純粋なハンドル名に
  cleaned = cleaned.replace(/^@/, '');
  // URLからハンドルを抽出
  const urlMatch = cleaned.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/i);
  if (urlMatch) {
    cleaned = urlMatch[1];
  }
  return cleaned;
}

function mapCategory(categoryInput) {
  const input = String(categoryInput || '').toLowerCase();

  if (input.includes('apps') || input.includes('アプリ') || input.includes('app')) {
    return 'apps';
  }
  if (input.includes('document') || input.includes('ドキュメント') || input.includes('資料')) {
    return 'documents';
  }
  if (input.includes('data') || input.includes('データ') || input.includes('分析')) {
    return 'data';
  }
  if (input.includes('creative') || input.includes('クリエイティブ') || input.includes('ai生成') || input.includes('画像')) {
    return 'creative';
  }
  return 'others';
}

function convertDriveLink(url) {
  if (!url) return '';
  url = String(url).trim();

  // 既にlh3形式ならそのまま
  if (url.includes('lh3.googleusercontent.com')) {
    return url;
  }

  const fileId = extractFileId(url);
  if (fileId) {
    // lh3形式を返す（最も信頼性の高い直接リンク）
    return 'https://lh3.googleusercontent.com/d/' + fileId + '=w1000';
  }
  return url;
}

function extractFileId(url) {
  if (!url) return null;
  url = String(url);

  // ?id= 形式
  const idParam = url.match(/[?&]id=([^&]+)/);
  if (idParam) return idParam[1];

  // /file/d/XXX/ 形式
  const fileD = url.match(/\/file\/d\/([^\/]+)/);
  if (fileD) return fileD[1];

  // /d/XXX/view 形式
  const dView = url.match(/\/d\/([^\/]+)\/view/);
  if (dView) return dView[1];

  // /open?id= 形式
  const openId = url.match(/\/open\?id=([^&]+)/);
  if (openId) return openId[1];

  return null;
}

// ========================================
// 管理機能
// ========================================

function addAdminHeaders() {
  const sheet = getTargetSheet();
  const COL = CONFIG.COL;

  const headers = [
    [COL.STATUS + 1, 'Status'],
    [COL.PUBLIC_IMAGE_URL + 1, 'Public_Image_URL'],
    [COL.COMPLIANCE_RESULT + 1, 'Compliance_Result'],
    [COL.COMPLIANCE_REASON + 1, 'Compliance_Reason'],
    [COL.REVIEWED_AT + 1, 'Reviewed_At']
  ];

  headers.forEach(([col, name]) => {
    const cell = sheet.getRange(1, col);
    if (!cell.getValue()) {
      cell.setValue(name);
    }
  });

  SpreadsheetApp.getUi().alert('管理用ヘッダーを追加しました（K〜O列）');
}

function initializePendingStatus() {
  const sheet = getTargetSheet();
  const data = sheet.getDataRange().getValues();
  const COL = CONFIG.COL;
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // タイトルがあり、ステータスが空の行にPENDINGを設定
    if (row[COL.TITLE] && !row[COL.STATUS]) {
      sheet.getRange(i + 1, COL.STATUS + 1).setValue(CONFIG.STATUS.PENDING);
      count++;
    }
  }

  SpreadsheetApp.getUi().alert(`${count}件の新規投稿にPENDINGを設定しました`);
}

function approveSelectedRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const selection = sheet.getActiveRange();
  const startRow = selection.getRow();
  const numRows = selection.getNumRows();
  const COL = CONFIG.COL;
  let count = 0;

  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    if (row === 1) continue; // ヘッダー行はスキップ

    sheet.getRange(row, COL.STATUS + 1).setValue(CONFIG.STATUS.APPROVED);
    sheet.getRange(row, COL.REVIEWED_AT + 1).setValue(new Date());
    processApproval(sheet, row);
    count++;
  }

  SpreadsheetApp.getUi().alert(`${count}件を承認しました`);
}

function rejectSelectedRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const selection = sheet.getActiveRange();
  const startRow = selection.getRow();
  const numRows = selection.getNumRows();
  const COL = CONFIG.COL;
  let count = 0;

  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    if (row === 1) continue;
    sheet.getRange(row, COL.STATUS + 1).setValue(CONFIG.STATUS.REJECTED);
    sheet.getRange(row, COL.REVIEWED_AT + 1).setValue(new Date());
    count++;
  }

  SpreadsheetApp.getUi().alert(`${count}件を拒否しました`);
}

// ========================================
// コンプライアンスチェック機能
// ========================================

function checkComplianceForPendingRows() {
  console.log('=== Compliance Check Started ===');
  const sheet = getTargetSheet();
  const data = sheet.getDataRange().getValues();
  const COL = CONFIG.COL;
  let checkedCount = 0;
  let approvedCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // タイトルがない行はスキップ
    if (!row[COL.TITLE]) continue;

    // ユーザーがコンプライアンス同意していない場合はスキップ
    const userConsent = String(row[COL.USER_CONSENT] || '').trim();
    if (!userConsent.includes('同意')) {
      console.log(`Row ${i + 1}: User consent not found, skipping`);
      continue;
    }

    // 既に判定済みまたは承認/拒否済みはスキップ
    const currentStatus = normalizeStatus(row[COL.STATUS]);
    if (currentStatus === CONFIG.STATUS.APPROVED ||
        currentStatus === CONFIG.STATUS.REJECTED ||
        row[COL.COMPLIANCE_RESULT]) {
      continue;
    }

    const resultCell = sheet.getRange(i + 1, COL.COMPLIANCE_RESULT + 1);
    const reasonCell = sheet.getRange(i + 1, COL.COMPLIANCE_REASON + 1);
    const statusCell = sheet.getRange(i + 1, COL.STATUS + 1);
    const reviewedAtCell = sheet.getRange(i + 1, COL.REVIEWED_AT + 1);

    try {
      console.log(`Checking row ${i + 1}: ${row[COL.TITLE]}`);
      resultCell.setValue('CHECKING...');
      SpreadsheetApp.flush();

      const result = executeOpenRouterCheck(row);
      checkedCount++;

      resultCell.setValue(result.is_compliant ? 'COMPLIANT' : 'FLAGGED');
      reasonCell.setValue(`[${result.risk_level}] ${result.reason}`);
      reviewedAtCell.setValue(new Date());

      if (result.is_compliant) {
        console.log(`Auto-approving row ${i + 1}`);
        statusCell.setValue(CONFIG.STATUS.APPROVED);
        processApproval(sheet, i + 1);
        approvedCount++;
      } else {
        statusCell.setValue(CONFIG.STATUS.PENDING_REVIEW);
      }

    } catch (e) {
      console.error(`Error on row ${i + 1}:`, e);
      resultCell.setValue('ERROR');
      reasonCell.setValue(e.message);
    }

    // API制限を考慮して少し待機
    Utilities.sleep(1000);
  }

  console.log(`=== Compliance Check Completed: ${checkedCount} checked, ${approvedCount} approved ===`);

  if (checkedCount > 0) {
    SpreadsheetApp.getUi().alert(
      `コンプライアンスチェック完了\n\n` +
      `チェック件数: ${checkedCount}件\n` +
      `自動承認: ${approvedCount}件\n` +
      `要レビュー: ${checkedCount - approvedCount}件`
    );
  }
}

function executeOpenRouterCheck(row) {
  const COL = CONFIG.COL;
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');

  if (!apiKey) {
    throw new Error('Script Property "OPENROUTER_API_KEY" is not set. スクリプトプロパティにAPIキーを設定してください。');
  }

  const title = String(row[COL.TITLE] || '');
  const description = String(row[COL.DESCRIPTION] || '');
  const imageUrl = String(row[COL.ORIGINAL_IMAGE] || '');
  const projectUrl = String(row[COL.PROJECT_URL] || '');

  // リンク先のコンテンツを取得
  let linkContent = '';
  if (projectUrl) {
    try {
      linkContent = fetchUrlContent(projectUrl);
    } catch (e) {
      linkContent = `(Link access failed: ${e.message})`;
    }
  }

  // DeepSeek R1推論モデル用最適化プロンプト
  const messages = [
    {
      role: 'system',
      content: `You are a content moderation expert. Analyze the provided content and determine if it violates any of the following policies.

VIOLATION CRITERIA (mark as is_compliant: false if ANY of these are detected):
1. Adult/Sexual Content: Excessive nudity, sexual imagery, links to adult sites
2. Violence/Gore: Blood, graphic injuries, violent imagery
3. Hate Speech/Discrimination: Targeting individuals or groups
4. Fraud/Spam/Malware: Scams, malicious links, spam patterns
5. Copyright Infringement: Clear unauthorized use of protected content

URL SAFETY CHECK:
- Even if content is inaccessible, flag URLs containing keywords of inappropriate services
- When in doubt, err on the side of caution (mark as FLAGGED)

RESPONSE FORMAT (JSON only):
{
  "is_compliant": boolean,
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "category": "ADULT" | "VIOLENCE" | "SPAM" | "COPYRIGHT" | "NONE" | "OTHER",
  "reason": "Specific reason in Japanese"
}

Think through the analysis step-by-step before providing your final JSON answer.`
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this submission for compliance:

Title: ${title}
Description: ${description}
Target URL: ${projectUrl}
Link Content: ${linkContent}

Provide your analysis and final judgment in the required JSON format.`
        }
      ]
    }
  ];

  // 画像がある場合は追加
  if (imageUrl) {
    const base64Image = getDriveImageAsBase64(imageUrl);
    if (base64Image) {
      messages[1].content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`
        }
      });
    } else if (imageUrl.startsWith('http')) {
      messages[1].content.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    }
  }

  const payload = {
    model: CONFIG.MODEL_NAME,
    messages: messages,
    response_format: { type: 'json_object' }
  };

  const response = UrlFetchApp.fetch(CONFIG.OPENROUTER_API_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://script.google.com',
      'X-Title': 'Manus Works Gallery Checker'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const responseBody = response.getContentText();
  if (response.getResponseCode() !== 200) {
    throw new Error(`API Error (${response.getResponseCode()}): ${responseBody}`);
  }

  const json = JSON.parse(responseBody);
  let content = json.choices[0].message.content;

  // DeepSeek R1の思考プロセス（reasoning）を除去してJSON部分のみを抽出
  // R1は<think>タグ内に推論プロセスを出力する場合がある
  if (content.includes('<think>')) {
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  }

  // JSONブロックの抽出（```json ... ```形式にも対応）
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                    content.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    content = jsonMatch[1] || jsonMatch[0];
  }

  try {
    const result = JSON.parse(content);

    // 必須フィールドの検証
    if (typeof result.is_compliant !== 'boolean') {
      throw new Error('is_compliant field is missing or invalid');
    }

    return result;
  } catch (e) {
    console.error('JSON Parse Error:', e.message);
    console.error('Raw content:', content.substring(0, 500));

    return {
      is_compliant: false,
      risk_level: 'HIGH',
      category: 'OTHER',
      reason: 'AIからの応答が不正な形式でした: ' + e.message
    };
  }
}

function getDriveImageAsBase64(url) {
  const fileId = extractFileId(url);
  if (!fileId) return null;

  try {
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();

    // ファイルサイズチェック（10MB以下）
    if (blob.getBytes().length > 10 * 1024 * 1024) {
      console.log('Image too large, skipping base64 conversion');
      return null;
    }

    return Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    console.log('Failed to get Drive image:', e.message);
    return null;
  }
}

function fetchUrlContent(url) {
  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true
    });

    if (response.getResponseCode() === 200) {
      let content = response.getContentText();
      // HTMLタグを除去してテキストのみ抽出
      content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      content = content.replace(/<[^>]+>/g, ' ');
      content = content.replace(/\s+/g, ' ').trim();
      return content.substring(0, 1500);
    }
    return '';
  } catch (e) {
    return '';
  }
}

// ========================================
// 承認処理
// ========================================

function installedOnEdit(e) {
  if (!e || !e.range) return;

  const range = e.range;
  const col = range.getColumn();

  // Status列の変更のみ監視
  if (col !== CONFIG.COL.STATUS + 1) return;

  const newValue = normalizeStatus(range.getValue());
  if (newValue === CONFIG.STATUS.APPROVED) {
    processApproval(e.source.getActiveSheet(), range.getRow());
  }
}

function processApproval(sheet, row) {
  const COL = CONFIG.COL;
  const originalImageUrl = sheet.getRange(row, COL.ORIGINAL_IMAGE + 1).getValue();

  if (!originalImageUrl) {
    console.log(`Row ${row}: No image URL found`);
    return;
  }

  try {
    const fileId = extractFileId(originalImageUrl);
    if (!fileId) {
      console.log(`Row ${row}: Could not extract file ID from URL`);
      return;
    }

    const publicUrl = copyToApprovedFolder(fileId);
    if (publicUrl) {
      sheet.getRange(row, COL.PUBLIC_IMAGE_URL + 1).setValue(publicUrl);
      console.log(`Row ${row}: Image copied and URL set to ${publicUrl}`);
    }
  } catch (error) {
    console.error(`Row ${row} Approval Error:`, error);
  }
}

function copyToApprovedFolder(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const approvedFolder = DriveApp.getFolderById(CONFIG.APPROVED_FOLDER_ID);

    // 同名ファイルの重複を避けるためタイムスタンプを追加
    const timestamp = new Date().getTime();
    const newName = `${timestamp}_${file.getName()}`;

    const copiedFile = file.makeCopy(newName, approvedFolder);
    // 全員がアクセス可能に設定
    copiedFile.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);

    // lh3形式を返す（最も信頼性の高い直接リンク）
    return 'https://lh3.googleusercontent.com/d/' + copiedFile.getId() + '=w1000';
  } catch (e) {
    console.error('Copy to approved folder failed:', e);
    // フォールバック
    return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000';
  }
}

// ========================================
// フォーム送信時の処理
// ========================================

/**
 * フォーム送信時に自動実行される関数
 * 新規投稿を即座にコンプライアンスチェック
 */
function onFormSubmitHandler(e) {
  console.log('=== Form Submit Detected ===');

  try {
    // フォーム送信直後に即座にチェック実行
    checkComplianceForPendingRows();
    console.log('Compliance check triggered successfully');
  } catch (error) {
    console.error('Form submit handler error:', error);
    // エラーが発生しても10分後の定期実行でリトライされる
  }
}

// ========================================
// トリガー設定
// ========================================

function setupAllTriggers() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  const ss = getTargetSpreadsheet();

  // 編集時トリガー（ステータス変更の監視）
  ScriptApp.newTrigger('installedOnEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  // フォーム送信時トリガー（新規投稿の即座チェック）
  ScriptApp.newTrigger('onFormSubmitHandler')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  // 定期実行トリガー（10分ごとにコンプライアンスチェック - バックアップ）
  ScriptApp.newTrigger('checkComplianceForPendingRows')
    .timeBased()
    .everyMinutes(10)
    .create();

  // スプレッドシート起動時トリガー（メニュー追加）
  ScriptApp.newTrigger('onOpen')
    .forSpreadsheet(ss)
    .onOpen()
    .create();

  SpreadsheetApp.getUi().alert(
    'トリガーを設定しました:\n\n' +
    '- 編集時: ステータス変更を監視\n' +
    '- フォーム送信時: 即座にコンプライアンスチェック\n' +
    '- 10分毎: コンプライアンス自動チェック（バックアップ）\n' +
    '- 起動時: メニュー追加\n\n' +
    `対象スプレッドシート: ${ss.getName()}`
  );
}

// ========================================
// テスト・デバッグ用
// ========================================

function testConnection() {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = getTargetSheet();
    const data = sheet.getDataRange().getValues();

    SpreadsheetApp.getUi().alert(
      '接続テスト成功\n\n' +
      `スプレッドシート名: ${ss.getName()}\n` +
      `シート名: ${sheet.getName()}\n` +
      `データ行数: ${data.length - 1}件\n` +
      `カラム数: ${data[0] ? data[0].length : 0}列`
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('接続テスト失敗\n\n' + e.message);
  }
}

function testGetApprovedWorks() {
  const works = getApprovedWorks();
  console.log('Approved works count:', works.length);
  console.log(JSON.stringify(works, null, 2));
}

function testCheckSingleRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const selection = sheet.getActiveRange();
  const row = selection.getRow();

  if (row === 1) {
    SpreadsheetApp.getUi().alert('ヘッダー行は選択できません');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const rowData = data[row - 1];

  try {
    const result = executeOpenRouterCheck(rowData);
    SpreadsheetApp.getUi().alert(
      `判定結果 (DeepSeek R1):\n\n` +
      `適合: ${result.is_compliant ? 'はい' : 'いいえ'}\n` +
      `リスクレベル: ${result.risk_level}\n` +
      `カテゴリ: ${result.category}\n` +
      `理由: ${result.reason}`
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('エラー: ' + e.message);
  }
}

/**
 * レガシーモデル(GPT-4o)でのテスト実行
 */
function testCheckSingleRowLegacy() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const selection = sheet.getActiveRange();
  const row = selection.getRow();

  if (row === 1) {
    SpreadsheetApp.getUi().alert('ヘッダー行は選択できません');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const rowData = data[row - 1];

  // 一時的にモデルを変更
  const originalModel = CONFIG.MODEL_NAME;
  CONFIG.MODEL_NAME = CONFIG.MODEL_NAME_LEGACY;

  try {
    const result = executeOpenRouterCheck(rowData);
    SpreadsheetApp.getUi().alert(
      `判定結果 (GPT-4o Legacy):\n\n` +
      `適合: ${result.is_compliant ? 'はい' : 'いいえ'}\n` +
      `リスクレベル: ${result.risk_level}\n` +
      `カテゴリ: ${result.category}\n` +
      `理由: ${result.reason}`
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('エラー: ' + e.message);
  } finally {
    // モデルを元に戻す
    CONFIG.MODEL_NAME = originalModel;
  }
}

/**
 * 両方のモデルで比較テスト
 */
function compareModels() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const selection = sheet.getActiveRange();
  const row = selection.getRow();

  if (row === 1) {
    SpreadsheetApp.getUi().alert('ヘッダー行は選択できません');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const rowData = data[row - 1];

  try {
    // DeepSeek R1でテスト
    const r1Result = executeOpenRouterCheck(rowData);

    // GPT-4oでテスト
    const originalModel = CONFIG.MODEL_NAME;
    CONFIG.MODEL_NAME = CONFIG.MODEL_NAME_LEGACY;
    const gpt4Result = executeOpenRouterCheck(rowData);
    CONFIG.MODEL_NAME = originalModel;

    SpreadsheetApp.getUi().alert(
      `=== モデル比較結果 ===\n\n` +
      `【DeepSeek R1】\n` +
      `適合: ${r1Result.is_compliant ? 'はい' : 'いいえ'}\n` +
      `リスク: ${r1Result.risk_level}\n` +
      `理由: ${r1Result.reason}\n\n` +
      `【GPT-4o Legacy】\n` +
      `適合: ${gpt4Result.is_compliant ? 'はい' : 'いいえ'}\n` +
      `リスク: ${gpt4Result.risk_level}\n` +
      `理由: ${gpt4Result.reason}`
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('エラー: ' + e.message);
  }
}

// ========================================
// 初期セットアップガイド
// ========================================
function showSetupGuide() {
  const guide = `
=== Manus Works Gallery セットアップガイド ===

1. OpenRouter APIキーの設定
   - GASエディタで [プロジェクトの設定] > [スクリプトプロパティ]
   - プロパティ名: OPENROUTER_API_KEY
   - 値: あなたのAPIキー

2. 管理用ヘッダーの追加
   - メニューから [Manus Gallery] > [管理用ヘッダーを追加]

3. トリガーの設定
   - メニューから [Manus Gallery] > [トリガー設定]

4. 接続テスト
   - メニューから [Manus Gallery] > [接続テスト]

5. WebアプリとしてデプロイしてAPIエンドポイントを取得
   - [デプロイ] > [新しいデプロイ]
   - 種類: ウェブアプリ
   - アクセス: 全員

対象スプレッドシートID: ${CONFIG.SPREADSHEET_ID}
  `;

  console.log(guide);
  SpreadsheetApp.getUi().alert(guide);
}

// ========================================
// 画像URL再生成（既存承認済み作品用）
// ========================================

/**
 * 承認済み作品の画像URLを再生成する
 * PUBLIC_IMAGE_URLが空またはアクセス不可の場合に使用
 */
function regeneratePublicImageUrls() {
  const sheet = getTargetSheet();
  const data = sheet.getDataRange().getValues();
  const COL = CONFIG.COL;
  let count = 0;
  let errorCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = normalizeStatus(row[COL.STATUS]);

    // 承認済みの作品のみ処理
    if (status !== CONFIG.STATUS.APPROVED) continue;

    // タイトルがない行はスキップ
    if (!row[COL.TITLE]) continue;

    const originalImageUrl = row[COL.ORIGINAL_IMAGE];
    if (!originalImageUrl) continue;

    try {
      const fileId = extractFileId(originalImageUrl);
      if (!fileId) {
        console.log(`Row ${i + 1}: Could not extract file ID`);
        continue;
      }

      console.log(`Processing row ${i + 1}: ${row[COL.TITLE]}`);
      const publicUrl = copyToApprovedFolder(fileId);

      if (publicUrl) {
        sheet.getRange(i + 1, COL.PUBLIC_IMAGE_URL + 1).setValue(publicUrl);
        console.log(`Row ${i + 1}: Updated PUBLIC_IMAGE_URL to ${publicUrl}`);
        count++;
      }
    } catch (e) {
      console.error(`Row ${i + 1} Error:`, e.message);
      errorCount++;
    }

    // API制限を考慮
    Utilities.sleep(500);
  }

  SpreadsheetApp.getUi().alert(
    `画像URL再生成完了\n\n` +
    `更新件数: ${count}件\n` +
    `エラー: ${errorCount}件`
  );
}
