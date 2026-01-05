/**
 * SheetBrain AI - Google Sheets Add-on (Enhanced UI Version)
 * Production backend: https://sheetbrain-ai.vercel.app
 */

function getBackendBaseUrl() {
  var scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty('BACKEND_BASE_URL') || 'https://sheetbrain-ai.vercel.app';
}

function setBackendBaseUrl(url) {
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('BACKEND_BASE_URL', url);
}

/**
 * Fetch a backend JWT (dev/debug helper)
 */
function getBackendToken() {
  var userEmail = Session.getActiveUser().getEmail() || 'sheetbrain.dev@localhost';
  var userId = 'apps-script-' + userEmail;
  var orgId = 'sheetbrain-dev-org';

  var payload = {
    userId: userId,
    email: userEmail,
    orgId: orgId,
    role: 'editor',
  };

  var response = UrlFetchApp.fetch(getBackendBaseUrl() + '/api/auth/debug-login', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  var result = JSON.parse(response.getContentText());
  if (!result || !result.accessToken) {
    throw new Error('Failed to obtain backend token');
  }
  return result.accessToken;
}

/**
 * Initializes the add-on when document opens - CREATES THE MENU
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('SheetBrain AI')
    .addItem('Open Audit Panel', 'showSidebar')
    .addSeparator()
    .addItem('View Billing & Usage', 'showBillingDialog')
    .addItem('View Policies', 'showPoliciesDialog')
    .addSeparator()
    .addItem('Settings', 'showSettings')
    .addItem('Help', 'showHelp')
    .addToUi();
}

/**
 * Show the enhanced sidebar with modern UI
 */
function showSidebar() {
  var htmlContent =
    '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<base target="_top">' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<style>' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }' +
    'body { font-family: "Google Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #202124; line-height: 1.6; min-height: 100vh; }' +
    '.container { padding: 0; max-width: 350px; }' +
    '.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); position: relative; overflow: hidden; }' +
    '.header::before { content: ""; position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); animation: pulse 15s infinite; }' +
    '@keyframes pulse { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-10%,-10%) scale(1.1); } }' +
    '.header h1 { font-size: 24px; font-weight: 600; color: #ffffff; margin-bottom: 4px; position: relative; z-index: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }' +
    '.brain-icon { font-size: 48px; display: block; margin-bottom: 8px; animation: float 3s ease-in-out infinite; position: relative; z-index: 1; }' +
    '@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }' +
    '.content-wrapper { background: #ffffff; padding: 20px; min-height: calc(100vh - 150px); }' +
    '.section { margin-bottom: 24px; }' +
    '.btn { width: 100%; padding: 14px 20px; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); display: flex; align-items: center; justify-content: center; gap: 10px; position: relative; overflow: hidden; }' +
    '.btn::before { content: ""; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); transition: left 0.5s; }' +
    '.btn:hover::before { left: 100%; }' +
    '.btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; box-shadow: 0 4px 15px rgba(102,126,234,0.4); }' +
    '.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,0.5); }' +
    '.btn-primary:active { transform: translateY(0); }' +
    '.btn-primary:disabled { background: #cbd5e1; cursor: not-allowed; transform: none; box-shadow: none; }' +
    '.loading { display: none; text-align: center; padding: 40px 20px; }' +
    '.loading.active { display: block; }' +
    '.spinner { border: 4px solid #f3f4f6; border-top: 4px solid #667eea; border-radius: 50%; width: 50px; height: 50px; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }' +
    '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }' +
    '.loading-text { font-size: 14px; color: #6b7280; font-weight: 500; }' +
    '.results { display: none; animation: fadeIn 0.3s ease-in; }' +
    '.results.active { display: block; }' +
    '@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }' +
    '.result-card { background: #ffffff; border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }' +
    '.result-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }' +
    '.result-card.high-risk { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-color: #f87171; }' +
    '.result-card.medium-risk { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-color: #fbbf24; }' +
    '.result-card.low-risk { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-color: #34d399; }' +
    '.cell-label { font-family: Monaco, "Courier New", monospace; font-weight: 700; color: #1f2937; font-size: 13px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 8px; letter-spacing: 0.5px; }' +
    '.formula { font-family: Monaco, "Courier New", monospace; font-size: 13px; background: #f9fafb; padding: 12px; border-radius: 8px; border-left: 4px solid #667eea; margin: 12px 0; overflow-x: auto; color: #374151; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }' +
    '.risk-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; text-transform: uppercase; }' +
    '.risk-high { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; box-shadow: 0 2px 8px rgba(220,38,38,0.3); }' +
    '.risk-medium { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color: #ffffff; box-shadow: 0 2px 8px rgba(217,119,6,0.3); }' +
    '.risk-low { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; box-shadow: 0 2px 8px rgba(5,150,105,0.3); }' +
    '.issues-list { margin: 12px 0; padding-left: 20px; font-size: 14px; color: #4b5563; line-height: 1.6; }' +
    '.recommendation { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); padding: 12px; border-radius: 8px; font-size: 14px; margin-top: 12px; border-left: 4px solid #0ea5e9; line-height: 1.6; color: #0c4a6e; font-weight: 500; }' +
    '.apply-btn { margin-top: 12px; padding: 10px 18px; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: white; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 600; transition: all 0.3s; box-shadow: 0 2px 8px rgba(31,41,55,0.3); }' +
    '.apply-btn:hover { background: linear-gradient(135deg, #111827 0%, #000000 100%); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(31,41,55,0.4); }' +
    '.summary { background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); padding: 16px; border-radius: 12px; margin-bottom: 20px; border: 2px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }' +
    '.summary-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }' +
    '.summary-item:last-child { border-bottom: none; }' +
    '.summary-label { color: #374151; font-weight: 600; }' +
    '.summary-value { font-weight: 700; padding: 4px 12px; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 13px; }' +
    '.error { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 2px solid #f87171; color: #991b1b; padding: 16px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(248,113,113,0.2); font-weight: 600; font-size: 14px; line-height: 1.6; }' +
    '.empty-state { text-align: center; padding: 60px 20px; color: #6b7280; }' +
    '.empty-state-icon { font-size: 64px; margin-bottom: 20px; opacity: 0.4; filter: grayscale(100%); }' +
    '.empty-state-text { font-size: 15px; font-weight: 500; color: #9ca3af; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="container">' +
    '<div class="header">' +
    '<span class="brain-icon">🧠</span>' +
    '<h1>SheetBrain AI</h1>' +
    '</div>' +
    '<div class="content-wrapper">' +
    '<div class="info-card" style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #667eea;">' +
    '<div style="font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">📊 Your Plan</div>' +
    '<div id="planInfo" style="font-size: 13px; color: #4b5563;">Loading...</div>' +
    '</div>' +
    '<div class="section">' +
    '<button class="btn btn-primary" id="auditBtn">' +
    '<span>🔍</span>' +
    '<span>Audit Selected Formulas</span>' +
    '</button>' +
    '</div>' +
    '<div class="section" style="margin-top: 12px;">' +
    '<button class="btn" id="uploadBtn" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; box-shadow: 0 4px 15px rgba(16,185,129,0.4);">' +
    '<span>📤</span>' +
    '<span>Upload Policy Document</span>' +
    '</button>' +
    '</div>' +
    '<div class="loading" id="loading">' +
    '<div class="spinner"></div>' +
    '<p class="loading-text">Analyzing formulas...</p>' +
    '</div>' +
    '<div class="empty-state" id="emptyState">' +
    '<div class="empty-state-icon">📊</div>' +
    '<p class="empty-state-text">Select cells with formulas and click "Audit" to get started</p>' +
    '</div>' +
    '<div class="results" id="results">' +
    '<div class="summary" id="summary"></div>' +
    '<div id="resultsList"></div>' +
    '</div>' +
    '<div id="errorSection"></div>' +
    '</div>' +
    '</div>' +
    '<script>' +
    'let currentResults = null;' +
    'console.log("SheetBrain AI script loaded");' +
    'window.onload = function() {' +
    '  console.log("Window loaded, initializing...");' +
    '  loadPlanInfo();' +
    '  var auditBtn = document.getElementById("auditBtn");' +
    '  var uploadBtn = document.getElementById("uploadBtn");' +
    '  if (auditBtn) {' +
    '    auditBtn.addEventListener("click", runAudit);' +
    '    console.log("Audit button listener attached");' +
    '  }' +
    '  if (uploadBtn) {' +
    '    uploadBtn.addEventListener("click", showUploadDialog);' +
    '    console.log("Upload button listener attached");' +
    '  }' +
    '  console.log("All event listeners attached");' +
    '};' +
    'function loadPlanInfo() {' +
    '  console.log("Loading plan info...");' +
    '  google.script.run' +
    '    .withSuccessHandler(function(data) {' +
    '      console.log("Plan info received:", data);' +
    '      var planDiv = document.getElementById("planInfo");' +
    '      if (data && data.success) {' +
    '        var plan = data.plan || "Free";' +
    '        var usage = data.usage || 0;' +
    '        var limit = data.limit || 10;' +
    '        planDiv.innerHTML = "<strong>" + plan.toUpperCase() + " Plan</strong><br/>Usage: " + usage + " / " + (limit === -1 ? "Unlimited" : limit) + " audits";' +
    '      } else {' +
    '        planDiv.innerHTML = "Free Plan<br/>Usage: 0 / 10 audits";' +
    '      }' +
    '    })' +
    '    .withFailureHandler(function(err) {' +
    '      console.error("Plan info failed:", err);' +
    '      document.getElementById("planInfo").innerHTML = "Free Plan (default)";' +
    '    })' +
    '    .getBillingInfo();' +
    '}' +
    'function showUploadDialog() {' +
    '  console.log("Upload dialog triggered");' +
    '  var fileName = prompt("Enter policy document name (e.g., Financial_Policy.pdf):");' +
    '  if (!fileName) {' +
    '    console.log("Upload cancelled - no filename");' +
    '    return;' +
    '  }' +
    '  var content = prompt("Paste policy document content or URL:");' +
    '  if (!content) {' +
    '    console.log("Upload cancelled - no content");' +
    '    return;' +
    '  }' +
    '  console.log("Uploading policy:", fileName);' +
    '  document.getElementById("loading").classList.add("active");' +
    '  document.getElementById("emptyState").style.display = "none";' +
    '  google.script.run' +
    '    .withSuccessHandler(function(response) {' +
    '      console.log("Upload response:", response);' +
    '      document.getElementById("loading").classList.remove("active");' +
    '      if (response && response.success) {' +
    '        alert("✓ Policy uploaded successfully!");' +
    '      } else {' +
    '        alert("✗ Upload failed: " + (response.error || "Unknown error"));' +
    '      }' +
    '    })' +
    '    .withFailureHandler(function(error) {' +
    '      console.error("Upload failed:", error);' +
    '      document.getElementById("loading").classList.remove("active");' +
    '      alert("✗ Upload error: " + error.message);' +
    '    })' +
    '    .uploadPolicy(fileName, content);' +
    '}' +
    'function runAudit() {' +
    '  console.log("Audit triggered");' +
    '  const btn = document.getElementById("auditBtn");' +
    '  const loading = document.getElementById("loading");' +
    '  const results = document.getElementById("results");' +
    '  const emptyState = document.getElementById("emptyState");' +
    '  const errorSection = document.getElementById("errorSection");' +
    '  btn.disabled = true;' +
    '  loading.classList.add("active");' +
    '  results.classList.remove("active");' +
    '  emptyState.style.display = "none";' +
    '  errorSection.innerHTML = "";' +
    '  console.log("Calling getAuditResults...");' +
    '  google.script.run' +
    '    .withSuccessHandler(function(response) {' +
    '      console.log("Audit response:", response);' +
    '      btn.disabled = false;' +
    '      loading.classList.remove("active");' +
    '      if (response && response.success !== false && response.results) {' +
    '        currentResults = response;' +
    '        displayResults(response);' +
    '      } else {' +
    '        showError(response.error || "No results received from audit");' +
    '      }' +
    '    })' +
    '    .withFailureHandler(function(error) {' +
    '      console.error("Audit failed:", error);' +
    '      btn.disabled = false;' +
    '      loading.classList.remove("active");' +
    '      showError(error.message || "Audit failed");' +
    '    })' +
    '    .getAuditResults();' +
    '}' +
    'function displayResults(data) {' +
    '  const results = document.getElementById("results");' +
    '  const summary = document.getElementById("summary");' +
    '  const resultsList = document.getElementById("resultsList");' +
    '  const compliant = data.results.filter(r => r.compliant).length;' +
    '  const total = data.results.length;' +
    '  summary.innerHTML = "<div class=\\"summary-item\\"><span class=\\"summary-label\\">Total Formulas:</span><span class=\\"summary-value\\">" + total + "</span></div>" +' +
    '    "<div class=\\"summary-item\\"><span class=\\"summary-label\\">Compliant:</span><span class=\\"summary-value\\">" + compliant + "</span></div>" +' +
    '    "<div class=\\"summary-item\\"><span class=\\"summary-label\\">Non-Compliant:</span><span class=\\"summary-value\\">" + (total - compliant) + "</span></div>";' +
    '  resultsList.innerHTML = data.results.map(function(result, index) {' +
    '    var html = "<div class=\\"result-card " + result.riskLevel + "-risk\\">";' +
    '    html += "<div class=\\"cell-label\\">" + result.cell + "</div>";' +
    '    html += "<span class=\\"risk-badge risk-" + result.riskLevel + "\\">" + result.riskLevel + " risk</span> ";' +
    '    html += "<div class=\\"formula\\">" + result.formula.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</div>";' +
    '    if (result.issues && result.issues.length > 0) {' +
    '      html += "<ul class=\\"issues-list\\">";' +
    '      result.issues.forEach(function(issue) { html += "<li>" + issue + "</li>"; });' +
    '      html += "</ul>";' +
    '    }' +
    '    if (result.recommendation) {' +
    '      html += "<div class=\\"recommendation\\"><strong>💡 Recommendation:</strong><br/>" + result.recommendation + "</div>";' +
    '    }' +
    '    if (result.suggestedFormula) {' +
    '      html += "<button class=\\"apply-btn\\" data-cell=\\"" + result.cell + "\\" data-index=\\"" + index + "\\">Apply Suggestion</button>";' +
    '    }' +
    '    html += "</div>";' +
    '    return html;' +
    '  }).join("");' +
    '  results.classList.add("active");' +
    '  setTimeout(function() {' +
    '    var applyButtons = document.querySelectorAll(".apply-btn");' +
    '    applyButtons.forEach(function(btn) {' +
    '      btn.addEventListener("click", function() {' +
    '        var index = parseInt(btn.getAttribute("data-index"));' +
    '        var result = data.results[index];' +
    '        applySuggestion(result.cell, result.suggestedFormula);' +
    '      });' +
    '    });' +
    '  }, 100);' +
    '}' +
    'function applySuggestion(cell, formula) {' +
    '  google.script.run' +
    '    .withSuccessHandler(function(response) {' +
    '      if (response.success) alert("Formula applied successfully to " + cell);' +
    '      else alert("Error: " + response.message);' +
    '    })' +
    '    .withFailureHandler(function(error) {' +
    '      alert("Error applying formula: " + error.message);' +
    '    })' +
    '    .applySuggestion(cell, formula);' +
    '}' +
    'function showError(message) {' +
    '  const errorSection = document.getElementById("errorSection");' +
    '  errorSection.innerHTML = "<div class=\\"error\\"><strong>Error:</strong> " + message + "</div>";' +
    '}' +
    '</script>' +
    '</body>' +
    '</html>';

  var html = HtmlService.createHtmlOutput(htmlContent);
  html.setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Server-side function to get audit results - called from sidebar
 */
function getAuditResults() {
  try {
    var sheet = SpreadsheetApp.getActiveSheet();
    var range = sheet.getActiveRange();

    if (!range) {
      return {
        success: false,
        error: 'No cells selected',
      };
    }

    var formulas = range.getFormulas();
    var values = range.getValues();
    var startRow = range.getRow();
    var startCol = range.getColumn();

    var formulaData = [];
    for (var i = 0; i < formulas.length; i++) {
      for (var j = 0; j < formulas[i].length; j++) {
        if (formulas[i][j]) {
          var cellAddress = sheet.getRange(startRow + i, startCol + j).getA1Notation();
          formulaData.push({
            cell: cellAddress,
            formula: formulas[i][j],
            value: values[i][j],
          });
        }
      }
    }

    if (formulaData.length === 0) {
      return {
        success: false,
        error: 'No formulas found in selected cells',
      };
    }

    // Call backend audit API
    var token = getBackendToken();
    var payload = {
      sheetContext: {
        sheetId: sheet.getSheetId().toString(),
        sheetName: sheet.getName(),
        formulas: formulaData,
      },
    };

    var response = UrlFetchApp.fetch(getBackendBaseUrl() + '/api/audit', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + token,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    var result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200) {
      return {
        success: true,
        results: result.results || [],
      };
    } else {
      return {
        success: false,
        error: result.error || 'Audit failed with status ' + response.getResponseCode(),
      };
    }
  } catch (error) {
    Logger.log('Audit error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
    };
  }
}

/**
 * Get billing information for the current user
 */
function getBillingInfo() {
  try {
    var token = getBackendToken();
    var response = UrlFetchApp.fetch(getBackendBaseUrl() + '/api/billing', {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + token,
      },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() === 200) {
      var result = JSON.parse(response.getContentText());
      return {
        success: true,
        plan: result.subscription?.plan || 'free',
        usage: result.usage?.auditsThisMonth || 0,
        limit: result.subscription?.auditsPerMonth || 10,
      };
    } else {
      return {
        success: false,
        plan: 'free',
        usage: 0,
        limit: 10,
      };
    }
  } catch (error) {
    Logger.log('Billing info error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
    };
  }
}

/**
 * Upload policy document to backend for RAG
 */
function uploadPolicy(fileName, content) {
  try {
    var token = getBackendToken();
    var payload = {
      fileName: fileName,
      content: content,
      type: 'text',
    };

    var response = UrlFetchApp.fetch(getBackendBaseUrl() + '/api/ingest', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + token,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    var result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200) {
      return {
        success: true,
        message: 'Policy uploaded successfully',
        policyId: result.policyId,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Upload failed with status ' + response.getResponseCode(),
      };
    }
  } catch (error) {
    Logger.log('Policy upload error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
    };
  }
}

/**
 * Apply suggested formula to a cell
 */
function applySuggestion(cellAddress, newFormula) {
  try {
    var sheet = SpreadsheetApp.getActiveSheet();
    var range = sheet.getRange(cellAddress);
    range.setFormula(newFormula);

    return {
      success: true,
      message: 'Formula applied successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Show billing dialog with detailed usage info
 */
function showBillingDialog() {
  var ui = SpreadsheetApp.getUi();
  try {
    var billingInfo = getBillingInfo();
    if (billingInfo.success) {
      var plan = billingInfo.plan.toUpperCase();
      var usage = billingInfo.usage;
      var limit = billingInfo.limit === -1 ? 'Unlimited' : billingInfo.limit;
      var message =
        '📊 Current Plan: ' +
        plan +
        '\n\n' +
        '📈 Usage This Month:\n' +
        '   Audits: ' +
        usage +
        ' / ' +
        limit +
        '\n\n' +
        '💳 Upgrade Options:\n' +
        '   • Free: 10 audits/month\n' +
        '   • Pro: 1000 audits/month\n' +
        '   • Enterprise: Unlimited\n\n' +
        'Visit: ' +
        getBackendBaseUrl() +
        '/billing';
      ui.alert('Billing & Usage', message, ui.ButtonSet.OK);
    } else {
      ui.alert(
        'Billing Info',
        'Unable to fetch billing information.\n\nError: ' + billingInfo.error,
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    ui.alert('Error', 'Failed to load billing info: ' + error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Show policies dialog
 */
function showPoliciesDialog() {
  var ui = SpreadsheetApp.getUi();
  try {
    var token = getBackendToken();
    var response = UrlFetchApp.fetch(getBackendBaseUrl() + '/api/policies', {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + token,
      },
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() === 200) {
      var result = JSON.parse(response.getContentText());
      var policies = result.policies || [];

      if (policies.length === 0) {
        ui.alert(
          'Policies',
          '📄 No policies uploaded yet.\n\nUpload policy documents to enhance formula auditing with custom rules and guidelines.',
          ui.ButtonSet.OK
        );
      } else {
        var message = '📄 Uploaded Policies (' + policies.length + '):\n\n';
        policies.forEach(function (policy, index) {
          message += index + 1 + '. ' + policy.name + '\n';
          if (policy.createdAt)
            message += '   Created: ' + new Date(policy.createdAt).toLocaleDateString() + '\n';
        });
        ui.alert('Policies', message, ui.ButtonSet.OK);
      }
    } else {
      ui.alert(
        'Error',
        'Failed to fetch policies.\n\nStatus: ' + response.getResponseCode(),
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    ui.alert('Error', 'Failed to load policies: ' + error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Show settings dialog
 */
function showSettings() {
  var currentUrl = getBackendBaseUrl();
  var ui = SpreadsheetApp.getUi();
  var result = ui.prompt(
    'Backend URL Settings',
    'Current: ' + currentUrl + '\n\nEnter new backend URL (or click Cancel to keep current):',
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() == ui.Button.OK) {
    var newUrl = result.getResponseText().trim();
    if (newUrl) {
      setBackendBaseUrl(newUrl);
      ui.alert('Settings updated', 'Backend URL set to: ' + newUrl, ui.ButtonSet.OK);
    }
  }
}

/**
 * Show help dialog
 */
function showHelp() {
  var ui = SpreadsheetApp.getUi();
  var helpText =
    'SheetBrain AI - Formula Auditor\n\n' +
    'How to use:\n' +
    '1. Select cells containing formulas\n' +
    '2. Click "SheetBrain AI" > "Open Audit Panel"\n' +
    '3. Click "Audit Selected Formulas"\n' +
    '4. Review the results and apply suggestions\n\n' +
    'Backend: ' +
    getBackendBaseUrl() +
    '\n\n' +
    'Need help? Visit: github.com/yocho1/SheetBrain-AI';

  ui.alert('Help', helpText, ui.ButtonSet.OK);
}
