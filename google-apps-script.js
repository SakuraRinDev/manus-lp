// ========================================
// Google Apps Script for Manus Works Gallery
// コンプライアンスチェック機能付き
// ========================================
const CONFIG = {
  APPROVED_FOLDER_ID: '1oQSx-hBHCt1J9pQG_x-7lnJXTUMXT3Q_',
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  MODEL_NAME: 'openai/gpt-4o',
  COL: {
    TIMESTAMP: 0,
    NICKNAME: 1,
    TWITTER: 2,
    TITLE: 3,
    CATEGORY: 4,
    DESCRIPTION: 5,
    ORIGINAL_IMAGE: 6,
    PROJECT_URL: 7,
    STATUS: 10,
    PUBLIC_IMAGE_URL: 11,
    COMPLIANCE_RESULT: 12,
    COMPLIANCE_REASON: 13
  }
};

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
    if (work.title && (work.author || work.twitter)) {
      works.push(work);
    }
  }
  works.reverse();
  return works;
}

function checkComplianceForPendingRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const COL = CONFIG.COL;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const currentStatus = (row[COL.STATUS] || '').toString().toUpperCase().trim();
    if (currentStatus === 'APPROVED' || currentStatus === 'REJECTED' || row[COL.COMPLIANCE_RESULT]) continue;
    if (!row[COL.TITLE]) continue;
    const resultCell = sheet.getRange(i + 1, COL.COMPLIANCE_RESULT + 1);
    const reasonCell = sheet.getRange(i + 1, COL.COMPLIANCE_REASON + 1);
    try {
      resultCell.setValue('CHECKING...');
      SpreadsheetApp.flush();
      const result = executeOpenRouterCheck(row);
      resultCell.setValue(result.is_compliant ? 'COMPLIANT' : 'FLAGGED');
      reasonCell.setValue(`[${result.risk_level}] ${result.reason}`);
      if (result.is_compliant) {
        sheet.getRange(i + 1, COL.STATUS + 1).setValue('APPROVED');
        processApproval(sheet, i + 1);
      } else {
        sheet.getRange(i + 1, COL.STATUS + 1).setValue('PENDING_REVIEW');
      }
    } catch (e) {
      resultCell.setValue('ERROR');
      reasonCell.setValue(e.message);
    }
  }
}

function executeOpenRouterCheck(row) {
  const COL = CONFIG.COL;
  const apiKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('Script Property "OPENROUTER_API_KEY" is not set.');
  const description = row[COL.DESCRIPTION] || '';
  const title = row[COL.TITLE] || '';
  const imageUrl = row[COL.ORIGINAL_IMAGE] || '';
  const projectUrl = row[COL.PROJECT_URL] || '';
  let linkContent = "";
  if (projectUrl) {
    try {
      const response = UrlFetchApp.fetch(projectUrl, { muteHttpExceptions: true });
      if (response.getResponseCode() === 200) {
        linkContent = response.getContentText().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 1000);
      }
    } catch (e) {}
  }
  const messages = [
    { role: "system", content: "..." },
    { role: "user", content: [{ type: "text", text: `Title: ${title}\nDescription: ${description}` }] }
  ];
  const payload = { model: CONFIG.MODEL_NAME, messages: messages, response_format: { type: "json_object" } };
  const options = { method: 'post', contentType: 'application/json', headers: { 'Authorization': `Bearer ${apiKey}` }, payload: JSON.stringify(payload), muteHttpExceptions: true };
  const response = UrlFetchApp.fetch(CONFIG.OPENROUTER_API_URL, options);
  const json = JSON.parse(response.getContentText());
  return JSON.parse(json.choices[0].message.content);
}

function installedOnEdit(e) {
  const range = e.range;
  const col = range.getColumn();
  if (col !== CONFIG.COL.STATUS + 1) return;
  const newValue = range.getValue().toString().toUpperCase().trim();
  if (newValue === 'APPROVED') processApproval(e.source.getActiveSheet(), range.getRow());
}

function processApproval(sheet, row) {
  const originalImageUrl = sheet.getRange(row, CONFIG.COL.ORIGINAL_IMAGE + 1).getValue();
  if (!originalImageUrl) return;
  try {
    const fileId = extractFileId(originalImageUrl);
    if (!fileId) return;
    const publicUrl = copyToApprovedFolder(fileId);
    if (publicUrl) sheet.getRange(row, CONFIG.COL.PUBLIC_IMAGE_URL + 1).setValue(publicUrl);
  } catch (error) {}
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
  return 'https://lh3.googleusercontent.com/d/' + copiedFile.getId();
}

function convertDriveLink(url) {
  if (!url) return '';
  const fileId = extractFileId(url);
  return fileId ? 'https://lh3.googleusercontent.com/d/' + fileId : url;
}

function mapCategory(categoryInput) {
  const input = (categoryInput || '').toString().toLowerCase();
  if (input.includes('apps')) return 'apps';
  if (input.includes('document')) return 'documents';
  if (input.includes('data')) return 'data';
  if (input.includes('creative')) return 'creative';
  return 'others';
}

function setupAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('installedOnEdit').forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onEdit().create();
  ScriptApp.newTrigger('checkComplianceForPendingRows').timeBased().everyMinutes(10).create();
}