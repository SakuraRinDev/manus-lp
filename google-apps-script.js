// ========================================
// Google Apps Script for Manus Works Gallery
// コンプライアンスチェック機能付き
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
// 8: （未使用）
// 9: Status（PENDING / APPROVED / REJECTED）
// 10: Public_Image_URL
// 11: Compliance_Result (AI判定: COMPLIANT / FLAGGED / ERROR)
// 12: Compliance_Reason (AI判定理由)
//
// --- Setup Instructions ---
// 1. スプレッドシートのスクリプトプロパティに 'OPENROUTER_API_KEY' を設定してください。
// 2. 列L (Index 11) に "Compliance_Result"、列M (Index 12) に "Compliance_Reason" ヘッダーを追加。
// 3. トリガー設定: 'checkComplianceForPendingRows' を「フォーム送信時」または「時間主導型」で設定。

// ========================================
// 設定
// ========================================
const CONFIG = {
  // 承認済み画像を格納するフォルダID
  APPROVED_FOLDER_ID: '1oQSx-hBHCt1J9pQG_x-7lnJXTUMXT3Q_',

  // OpenRouter API設定
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  MODEL_NAME: 'openai/gpt-4o', // または 'anthropic/claude-3.5-sonnet'

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
    STATUS: 9,
    PUBLIC_IMAGE_URL: 10,
    COMPLIANCE_RESULT: 11, // 新規
    COMPLIANCE_REASON: 12  // 新規
  }
};

// ========================================
// Web API: 承認済み作品のみ返す (既存)
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
  // doGet実行時はgetActiveSheet()が不安定な場合があるため、先頭のシートを取得
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) return [];

  const works = [];
  const COL = CONFIG.COL;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = (row[COL.STATUS] || '').toString().toUpperCase().trim();

    if (status !== 'APPROVED') continue;

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
// コンプライアンスチェック機能 (新規)
// ========================================

/**
 * 未処理の行に対してコンプライアンスチェックを実行する
 * トリガー設定推奨: フォーム送信時 or 時間主導型
 */
function checkComplianceForPendingRows() {
  console.log('=== Compliance Check Started ===');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const COL = CONFIG.COL;

  // ヘッダー行をスキップ
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const resultCell = sheet.getRange(i + 1, COL.COMPLIANCE_RESULT + 1);
    const reasonCell = sheet.getRange(i + 1, COL.COMPLIANCE_REASON + 1);

    // すでに判定済み、またはデータがない行はスキップ
    if (row[COL.COMPLIANCE_RESULT] || !row[COL.TITLE]) {
      continue;
    }

    try {
      console.log(`Checking row ${i + 1}: ${row[COL.TITLE]}`);

      // 判定中ステータスをセット
      resultCell.setValue('CHECKING...');
      SpreadsheetApp.flush();

      // チェック実行
      const result = executeOpenRouterCheck(row);

      // 結果書き込み
      resultCell.setValue(result.is_compliant ? 'COMPLIANT' : 'FLAGGED');
      reasonCell.setValue(`[${result.risk_level}] ${result.reason}`);

      console.log(`Row ${i + 1} Result:`, result);

      // 自動承認ロジック
      if (result.is_compliant) {
        console.log(`Auto-approving row ${i + 1}`);
        const statusCell = sheet.getRange(i + 1, COL.STATUS + 1);
        statusCell.setValue('APPROVED');
        // 公開URL生成処理も実行
        processApproval(sheet, i + 1);
      }

    } catch (e) {
      console.error(`Error on row ${i + 1}:`, e);
      resultCell.setValue('ERROR');
      reasonCell.setValue(e.message);
    }
  }
}

/**
 * OpenRouter APIを呼び出して判定を行う
 */
function executeOpenRouterCheck(row) {
  const COL = CONFIG.COL;
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');

  if (!apiKey) {
    throw new Error('Script Property "OPENROUTER_API_KEY" is not set.');
  }

  // プロンプト構築
  const description = row[COL.DESCRIPTION] || '';
  const title = row[COL.TITLE] || '';
  const imageUrl = row[COL.ORIGINAL_IMAGE] || '';
  const projectUrl = row[COL.PROJECT_URL] || '';

  // リンク先テキスト取得 (簡易)
  let linkContent = "";
  if (projectUrl) {
    try {
      linkContent = fetchUrlContent(projectUrl);
    } catch (e) {
      linkContent = "(Link access failed: " + e.message + ")";
    }
  }

  // メッセージの構築 (マルチモーダル)
  const messages = [
    {
      role: "system",
      content: `あなたはコンテンツモデレーターです。以下の基準に基づいて、提供されたコンテンツが適切かどうか判定してください。
      
      【判定基準 - 以下の要素が含まれる場合はNG (is_compliant: false)】
      1. アダルト・性的なコンテンツ（露出過多、性的描写、アダルトサイトへのリンク）
      2. 暴力・グロテスク（流血、身体的損傷）
      3. ヘイトスピーチ・差別
      4. 詐欺・スパム・マルウェア
      
      【特にURLについての注意】
      - リンク先の内容が取得できない場合でも、URL文字列自体に「アダルトサイトの特徴（有名アダルトドメイン、性的キーワード）」が含まれる場合はリスクありとみなしてください。
      - 疑わしい場合は安全側に倒して FLAGGED (is_compliant: false) としてください。

      回答は以下のJSON形式のみで出力してください:
      {
        "is_compliant": boolean,
        "risk_level": "LOW" | "MEDIUM" | "HIGH",
        "category": "ADULT" | "VIOLENCE" | "SPAM" | "NONE" | "OTHER",
        "reason": "具体的な理由（日本語）"
      }`
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Title: ${title}\nDescription: ${description}\nTarget URL: ${projectUrl}\nLink Content Summary: ${linkContent}\n\nこの作品情報のコンプライアンスチェックを行ってください。特にURL先が不適切なコンテンツでないか厳格に確認してください。`
        }
      ]
    }
  ];

  // 画像がある場合は追加
  if (imageUrl) {
    const base64Image = getDriveImageAsBase64(imageUrl);
    if (base64Image) {
      messages[1].content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`
        }
      });
    } else if (imageUrl.startsWith('http')) {
      // Drive以外のURLの場合（OpenRouterが直接アクセスできる場合）
      messages[1].content.push({
        type: "image_url",
        image_url: { url: imageUrl }
      });
    }
  }

  const payload = {
    model: CONFIG.MODEL_NAME,
    messages: messages,
    response_format: { type: "json_object" }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://script.google.com',
      'X-Title': 'Manus Works Gallery Checker'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(CONFIG.OPENROUTER_API_URL, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode !== 200) {
    throw new Error(`API Error (${responseCode}): ${responseBody}`);
  }

  console.log('API Response Body:', responseBody); // デバッグ用ログ

  let json;
  try {
    json = JSON.parse(responseBody);
  } catch (e) {
    throw new Error(`Failed to parse API response body: ${e.message}. Body: ${responseBody}`);
  }

  if (!json.choices || !json.choices[0] || !json.choices[0].message) {
    throw new Error(`Unexpected API response structure: ${responseBody}`);
  }

  const content = json.choices[0].message.content;
  console.log('Model Content:', content); // デバッグ用ログ

  try {
    return JSON.parse(content);
  } catch (e) {
    // JSONとして解析できない場合は、AIが拒否したかエラーメッセージを返した可能性がある
    // 安全側に倒してFLAGGED扱いにする
    console.warn('Failed to parse model content as JSON. Content:', content);
    return {
      is_compliant: false,
      risk_level: "HIGH",
      category: "OTHER",
      reason: "AIからの応答が不正な形式でした（コンテンツ制限の可能性があります）。: " + content
    };
  }
}

/**
 * Google Driveの画像URLからBase64データを取得する
 */
function getDriveImageAsBase64(url) {
  const fileId = extractFileId(url);
  if (!fileId) return null;

  try {
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    // 画像サイズが大きいとAPI制限にかかる可能性があるため、必要ならリサイズ処理を入れる
    // ここではそのままBase64化
    return Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    console.error('Failed to encode image:', e);
    return null;
  }
}

/**
 * 外部URLのコンテンツテキストを簡易取得する
 */
function fetchUrlContent(url) {
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const text = response.getContentText();
      // HTMLタグを除去して先頭1000文字程度を抽出
      const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return plainText.substring(0, 1000);
    }
  } catch (e) {
    console.warn('URL Fetch failed:', e.message);
  }
  return "";
}

// ========================================
// onEdit トリガー: Status変更時の処理 (既存)
// ========================================
function installedOnEdit(e) {
  console.log('=== installedOnEdit triggered ===');
  // ... (既存のログ出力)

  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();

  // Status列（J列 = 9 -> +1 = 10）
  if (col !== CONFIG.COL.STATUS + 1) return;

  const newValue = range.getValue().toString().toUpperCase().trim();
  if (newValue === 'APPROVED') {
    processApproval(sheet, row);
  }
}

function processApproval(sheet, row) {
  console.log('=== processApproval started ===');
  const COL = CONFIG.COL;
  const originalImageUrl = sheet.getRange(row, COL.ORIGINAL_IMAGE + 1).getValue();

  if (!originalImageUrl) return;

  try {
    const fileId = extractFileId(originalImageUrl);
    if (!fileId) return;

    const publicUrl = copyToApprovedFolder(fileId);
    if (publicUrl) {
      sheet.getRange(row, COL.PUBLIC_IMAGE_URL + 1).setValue(publicUrl);
    }
  } catch (error) {
    console.log('ERROR:', error);
  }
}

function extractFileId(url) {
  if (!url) return null;
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (openMatch) return openMatch[1];
  const fileMatch = url.match(/\/file\/d\/([^\/]+)/);
  if (fileMatch) return fileMatch[1];
  return null;
}

function copyToApprovedFolder(fileId) {
  const file = DriveApp.getFileById(fileId);
  const approvedFolder = DriveApp.getFolderById(CONFIG.APPROVED_FOLDER_ID);
  const copiedFile = file.makeCopy(file.getName(), approvedFolder);
  copiedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  // uc?export=view形式を使用（より安定した画像表示）
  return 'https://drive.google.com/uc?export=view&id=' + copiedFile.getId();
}

// ========================================
// ユーティリティ関数 (既存)
// ========================================
function convertDriveLink(url) {
  if (!url) return '';
  const fileId = extractFileId(url);
  return fileId ? 'https://drive.google.com/uc?export=view&id=' + fileId : url;
}

function mapCategory(categoryInput) {
  const categoryMap = {
    'Apps & Tools': 'apps',
    'apps': 'apps',
    'Documents': 'documents',
    'documents': 'documents',
    'Data': 'data',
    'data': 'data',
    'Creative': 'creative',
    'creative': 'creative',
    'Others': 'others',
    'others': 'others',
    // 文字列マッチング用にキーを追加する場合はここに
  };
  // 部分一致やデフォルト処理
  for (const key in categoryMap) {
    if (categoryInput.toString().includes(key)) return categoryMap[key];
  }
  return 'others';
}

// ========================================
// セットアップ用関数 (更新)
// ========================================
function setupAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // 1. 承認用トリガー (onEdit)
  ScriptApp.newTrigger('installedOnEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  // 2. コンプライアンスチェック用トリガー (フォーム送信時)
  // ※フォームが紐付いている場合
  // ScriptApp.newTrigger('checkComplianceForPendingRows')
  //   .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
  //   .onFormSubmit()
  //   .create();

  // 代替: 時間主導型 (10分おきなど)
  ScriptApp.newTrigger('checkComplianceForPendingRows')
    .timeBased()
    .everyMinutes(10)
    .create();

  Logger.log('All triggers have been set up.');
}
