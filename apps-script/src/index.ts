/**
 * Google Sheets Add-on entry point
 * Initializes the sidebar UI and manages authentication
 */

import { SheetBrainSidebar } from './ui/sidebar';
import { initializeAuth } from './auth/oauth';

const scriptProperties = PropertiesService.getScriptProperties();

function getBackendBaseUrl(): string {
  return (
    scriptProperties.getProperty('BACKEND_BASE_URL') ||
    'http://localhost:3000'
  );
}

function setBackendBaseUrl(url: string): void {
  scriptProperties.setProperty('BACKEND_BASE_URL', url);
}

/**
 * Fetch a backend JWT (dev/debug helper)
 */
function getBackendToken(): string {
  const userEmail = Session.getActiveUser().getEmail() || 'sheetbrain.dev@localhost';
  const userId = `apps-script-${userEmail}`;
  const orgId = 'sheetbrain-dev-org';

  const payload = {
    userId,
    email: userEmail,
    orgId,
    role: 'editor',
  };

  const response = UrlFetchApp.fetch(`${getBackendBaseUrl()}/api/auth/debug-login`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());
  if (!result?.accessToken) {
    throw new Error('Failed to obtain backend token');
  }
  return result.accessToken;
}

/**
 * Creates the sidebar panel when user opens the add-on
 */
function onHomepage() {
  const html = HtmlService.createTemplateFromFile('sidebar').evaluate();
  html.setWidth(350).setHeight(600);
  SpreadsheetApp.getUi().showModelessDialog(html, 'SheetBrain AI');
}

/**
 * Initializes the add-on when document opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('SheetBrain AI')
    .addItem('Open Audit Panel', 'showSidebar')
    .addSeparator()
    .addItem('Settings', 'showSettings')
    .addItem('Documentation', 'openDocumentation')
    .addToUi();
}

/**
 * Shows the audit sidebar
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutput(`
    <div id="app"></div>
    <script src="bundle.js"></script>
  `);
  html.setWidth(350);
  SpreadsheetApp.getUi().showModelessDialog(html, 'SheetBrain AI Audit');
}

/**
 * Gets the currently selected range from the active sheet
 */
function getSelectedRange() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = SpreadsheetApp.getActiveRange();

  return {
    sheetName: sheet.getName(),
    sheetId: sheet.getSheetId(),
    address: range.getA1Notation(),
    values: range.getValues(),
    formulas: range.getFormulas(),
  };
}

/**
 * Gets the current sheet context for auditing
 */
function getSheetContext() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = SpreadsheetApp.getActiveRange();

  return {
    sheetName: sheet.getName(),
    sheetId: sheet.getSheetId(),
    spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    range: range.getA1Notation(),
    data: {
      values: range.getValues(),
      formulas: range.getFormulas(),
      backgrounds: range.getBackgrounds(),
      fontColors: range.getFontColors(),
    },
  };
}

/**
 * Applies a suggested formula improvement to the selected range
 */
function applySuggestion(newFormula: string, cellAddress: string) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getRange(cellAddress);
  range.setFormula(newFormula);

  return {
    success: true,
    message: 'Formula applied successfully',
  };
}

/**
 * Opens the documentation
 */
function openDocumentation() {
  const url = 'https://docs.sheetbrain.ai';
  const html = HtmlService.createHtmlOutput(
    `<script>window.open('${url}', '_blank');google.script.host.close();</script>`
  );
  SpreadsheetApp.getUi().showModelessDialog(html, 'SheetBrain Docs');
}

/**
 * Shows settings dialog
 */
function showSettings() {
  const html = HtmlService.createHtmlOutput(`
    <h2>SheetBrain AI Settings</h2>
    <p>Settings dialog coming soon...</p>
  `);
  html.setWidth(400).setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Settings');
}

// Export for testing
export {
  onOpen,
  onHomepage,
  showSidebar,
  getSelectedRange,
  getSheetContext,
  applySuggestion,
  openDocumentation,
  showSettings,
  getBackendBaseUrl,
  setBackendBaseUrl,
  getBackendToken,
};
