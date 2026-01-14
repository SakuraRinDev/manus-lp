// ========================================
// Google Apps Script for Manus Works Gallery
// ========================================
//
// Setup Instructions:
// 1. Create a Google Form with the following fields:
//    - 作品名 (Short answer, Required)
//    - 作者名 (Short answer, Required)
//    - カテゴリ (Dropdown: Apps & Tools, Documents, Data & Analysis, Creative, Others)
//    - 説明 (Paragraph)
//    - 画像URL (Short answer)
//    - 作品URL (Short answer)
//    - ManusへのリンクURL (Short answer)
//
// 2. Link the form to a Google Spreadsheet
//
// 3. Open the Spreadsheet > Extensions > Apps Script
//
// 4. Copy and paste this code into Code.gs
//
// 5. Deploy > New Deployment > Web App
//    - Execute as: Me
//    - Who has access: Anyone
//
// 6. Copy the Web App URL and set it in script.js GALLERY_CONFIG.API_URL
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
  // Expected columns: Timestamp, Title, Author, Category, Description, ImageURL, WorkURL, ManusURL
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    const work = {
      id: i,
      timestamp: row[0],
      title: row[1] || '',
      author: row[2] || '',
      category: mapCategory(row[3]),
      description: row[4] || '',
      imageUrl: row[5] || '',
      workUrl: row[6] || '',
      manusUrl: row[7] || ''
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

function mapCategory(categoryInput) {
  // Map form selection to category ID
  const categoryMap = {
    'Apps & Tools': 'apps',
    'apps': 'apps',
    'Documents': 'documents',
    'documents': 'documents',
    'Data & Analysis': 'data',
    'data': 'data',
    'Creative': 'creative',
    'creative': 'creative',
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
