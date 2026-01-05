/**
 * Google Sheets Add-on entry point
 * SheetBrain AI - Intelligent Formula Auditor
 */
declare const CONFIG: {
    BACKEND_URL: string;
    API_VERSION: string;
    TIMEOUT_MS: number;
};
declare const scriptProperties: GoogleAppsScript.Properties.Properties;
declare const userProperties: GoogleAppsScript.Properties.Properties;
/**
 * Get or create authentication token
 */
declare function getAuthToken(): string;
/**
 * Authenticate user with backend
 */
declare function authenticateUser(): string;
/**
 * Clear authentication
 */
declare function logout(): void;
/**
 * Initialize add-on when spreadsheet opens
 */
declare function onOpen(): void;
/**
 * Install trigger for onOpen
 */
declare function onInstall(): void;
/**
 * Show audit sidebar
 */
declare function showAuditSidebar(): void;
/**
 * Show settings dialog
 */
declare function showSettings(): void;
/**
 * Save user settings
 */
declare function saveUserSettings(orgId: string, backendUrl: string): void;
/**
 * Show help documentation
 */
declare function showHelp(): void;
/**
 * Get selected range data
 */
declare function getSelectedRange(): {
    sheetName: string;
    sheetId: number;
    address: string;
    values: any[][];
    formulas: string[][];
};
/**
 * Get full sheet context for audit
 */
declare function getSheetContext(): {
    sheetName: string;
    sheetId: number;
    spreadsheetId: string;
    spreadsheetName: string;
    range: string;
    data: {
        values: any[][];
        formulas: string[][];
    };
    formulas: string[][];
    organization: string;
    department: string;
};
/**
 * Apply formula suggestion to cell
 */
declare function applySuggestion(cellAddress: string, newFormula: string): {
    success: boolean;
    message: string;
};
/**
 * Highlight cells based on risk level
 */
declare function highlightCells(results: any[]): void;
/**
 * Audit formulas with backend API
 */
declare function auditFormulas(): any;
/**
 * Upload policy document
 */
declare function uploadPolicy(): void;
/**
 * Get audit results (called from sidebar)
 */
declare function getAuditResults(): any;
//# sourceMappingURL=index.d.ts.map