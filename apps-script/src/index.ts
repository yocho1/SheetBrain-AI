/**
 * Google Sheets Add-on entry point
 * SheetBrain AI - Intelligent Formula Auditor
 */

// ==================== CONFIGURATION ====================

const CONFIG = {
  BACKEND_URL: 'https://sheetbrain-ai.vercel.app',
  API_VERSION: 'v1',
  TIMEOUT_MS: 30000,
};

const scriptProperties = PropertiesService.getScriptProperties();
const userProperties = PropertiesService.getUserProperties();

// ==================== AUTHENTICATION ====================

/**
 * Get or create authentication token
 */
function getAuthToken(): string {
  let token = userProperties.getProperty('access_token');
  
  if (!token) {
    token = authenticateUser();
  }
  
  return token;
}

/**
 * Authenticate user with backend
 */
function authenticateUser(): string {
  const userEmail = Session.getActiveUser().getEmail();
  const userId = `apps-script-${userEmail}`;
  const orgId = scriptProperties.getProperty('org_id') || 'sheetbrain-default';

  const response = UrlFetchApp.fetch(`${CONFIG.BACKEND_URL}/api/auth/debug-login`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      userId,
      email: userEmail,
      orgId,
      role: 'editor',
    }),
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());
  
  if (!result?.accessToken) {
    throw new Error('Authentication failed');
  }
  
  userProperties.setProperty('access_token', result.accessToken);
  return result.accessToken;
}

/**
 * Clear authentication
 */
function logout() {
  userProperties.deleteProperty('access_token');
  SpreadsheetApp.getUi().alert('Logged out successfully');
}

// ==================== MENU & UI ====================

/**
 * Initialize add-on when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🧠 SheetBrain AI')
    .addItem('📊 Audit Formulas', 'showAuditSidebar')
    .addItem('📤 Upload Policy', 'uploadPolicy')
    .addSeparator()
    .addItem('⚙️ Settings', 'showSettings')
    .addItem('📖 Help', 'showHelp')
    .addItem('🚪 Logout', 'logout')
    .addToUi();
}

/**
 * Install trigger for onOpen
 */
function onInstall() {
  onOpen();
}

/**
 * Show audit sidebar
 */
function showAuditSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('SheetBrain AI Audit')
    .setWidth(350);
  
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Show settings dialog
 */
function showSettings() {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input { width: 100%; padding: 8px; box-sizing: border-box; }
          button { background: #1f2937; color: white; padding: 10px 20px; border: none; cursor: pointer; }
          button:hover { background: #111827; }
        </style>
      </head>
      <body>
        <h2>SheetBrain AI Settings</h2>
        <div class="form-group">
          <label>Organization ID:</label>
          <input type="text" id="orgId" value="${scriptProperties.getProperty('org_id') || ''}" />
        </div>
        <div class="form-group">
          <label>Backend URL:</label>
          <input type="text" id="backendUrl" value="${CONFIG.BACKEND_URL}" />
        </div>
        <button onclick="saveSettings()">Save</button>
        
        <script>
          function saveSettings() {
            google.script.run
              .withSuccessHandler(() => alert('Settings saved!'))
              .withFailureHandler((error) => alert('Error: ' + error))
              .saveUserSettings(
                document.getElementById('orgId').value,
                document.getElementById('backendUrl').value
              );
          }
        </script>
      </body>
    </html>
  `)
    .setWidth(400)
    .setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Settings');
}

/**
 * Save user settings
 */
function saveUserSettings(orgId: string, backendUrl: string) {
  scriptProperties.setProperty('org_id', orgId);
  scriptProperties.setProperty('backend_url', backendUrl);
}

/**
 * Show help documentation
 */
function showHelp() {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head><base target="_top"></head>
      <body style="font-family: Arial; padding: 20px;">
        <h2>SheetBrain AI - Quick Guide</h2>
        <h3>How to Use:</h3>
        <ol>
          <li>Select cells with formulas</li>
          <li>Click "🧠 SheetBrain AI" → "📊 Audit Formulas"</li>
          <li>Review audit results and recommendations</li>
          <li>Apply suggestions with one click</li>
        </ol>
        <h3>Features:</h3>
        <ul>
          <li>✅ Formula compliance checking</li>
          <li>🔍 Error detection</li>
          <li>⚡ Performance optimization</li>
          <li>🎯 Risk assessment</li>
        </ul>
        <p><a href="https://docs.sheetbrain.ai" target="_blank">Full Documentation →</a></p>
      </body>
    </html>
  `)
    .setWidth(400)
    .setHeight(350);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Help');
}

// ==================== SHEET OPERATIONS ====================

/**
 * Get selected range data
 */
function getSelectedRange() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = SpreadsheetApp.getActiveRange();

  if (!range) {
    throw new Error('No range selected');
  }

  return {
    sheetName: sheet.getName(),
    sheetId: sheet.getSheetId(),
    address: range.getA1Notation(),
    values: range.getValues(),
    formulas: range.getFormulas(),
  };
}

/**
 * Get full sheet context for audit
 */
function getSheetContext() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = SpreadsheetApp.getActiveRange();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!range) {
    throw new Error('No range selected');
  }

  return {
    sheetName: sheet.getName(),
    sheetId: sheet.getSheetId(),
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    range: range.getA1Notation(),
    data: {
      values: range.getValues(),
      formulas: range.getFormulas(),
    },
    formulas: range.getFormulas(),
    organization: scriptProperties.getProperty('org_id') || 'default',
    department: scriptProperties.getProperty('department') || 'general',
  };
}

/**
 * Apply formula suggestion to cell
 */
function applySuggestion(cellAddress: string, newFormula: string) {
  try {
    const sheet = SpreadsheetApp.getActiveSheet();
    const range = sheet.getRange(cellAddress);
    range.setFormula(newFormula);
    
    return {
      success: true,
      message: `Formula applied to ${cellAddress}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Highlight cells based on risk level
 */
function highlightCells(results: any[]) {
  const sheet = SpreadsheetApp.getActiveSheet();
  
  results.forEach((result) => {
    if (!result.cell) return;
    
    const range = sheet.getRange(result.cell);
    const color = result.riskLevel === 'high' ? '#fee2e2' 
                : result.riskLevel === 'medium' ? '#fef3c7'
                : '#dcfce7';
    
    range.setBackground(color);
  });
}

// ==================== API CALLS ====================

/**
 * Audit formulas with backend API
 */
function auditFormulas() {
  try {
    const context = getSheetContext();
    const token = getAuthToken();
    
    const response = UrlFetchApp.fetch(`${CONFIG.BACKEND_URL}/api/audit`, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: JSON.stringify(context),
      muteHttpExceptions: true,
    });

    const statusCode = response.getResponseCode();
    const result = JSON.parse(response.getContentText());

    if (statusCode !== 200) {
      throw new Error(result.error || 'Audit failed');
    }

    return result;
  } catch (error) {
    Logger.log('Audit error: ' + error.message);
    throw error;
  }
}

/**
 * Upload policy document
 */
function uploadPolicy() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.prompt(
    'Upload Policy',
    'Enter policy title:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) return;
  
  const title = response.getResponseText();
  
  const contentResponse = ui.prompt(
    'Upload Policy',
    'Enter policy content:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (contentResponse.getSelectedButton() !== ui.Button.OK) return;
  
  const content = contentResponse.getResponseText();
  
  try {
    const token = getAuthToken();
    
    const response = UrlFetchApp.fetch(`${CONFIG.BACKEND_URL}/api/ingest`, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: JSON.stringify({
        title,
        content,
        department: 'general',
        tags: [],
      }),
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() === 200) {
      ui.alert('Success', 'Policy uploaded successfully!', ui.ButtonSet.OK);
    } else {
      ui.alert('Error', 'Failed to upload policy', ui.ButtonSet.OK);
    }
  } catch (error) {
    ui.alert('Error', error.message, ui.ButtonSet.OK);
  }
}

/**
 * Get audit results (called from sidebar)
 */
function getAuditResults() {
  return auditFormulas();
}
