/**
 * Google Sheets Add-on entry point
 * Initializes the sidebar UI and manages authentication
 */
declare function getBackendBaseUrl(): string;
declare function setBackendBaseUrl(url: string): void;
/**
 * Fetch a backend JWT (dev/debug helper)
 */
declare function getBackendToken(): string;
/**
 * Creates the sidebar panel when user opens the add-on
 */
declare function onHomepage(): void;
/**
 * Initializes the add-on when document opens
 */
declare function onOpen(): void;
/**
 * Shows the audit sidebar
 */
declare function showSidebar(): void;
/**
 * Gets the currently selected range from the active sheet
 */
declare function getSelectedRange(): {
    sheetName: string;
    sheetId: number;
    address: string;
    values: any[][];
    formulas: string[][];
};
/**
 * Gets the current sheet context for auditing
 */
declare function getSheetContext(): {
    sheetName: string;
    sheetId: number;
    spreadsheetId: string;
    range: string;
    data: {
        values: any[][];
        formulas: string[][];
        backgrounds: string[][];
        fontColors: string[][];
    };
};
/**
 * Applies a suggested formula improvement to the selected range
 */
declare function applySuggestion(newFormula: string, cellAddress: string): {
    success: boolean;
    message: string;
};
/**
 * Opens the documentation
 */
declare function openDocumentation(): void;
/**
 * Shows settings dialog
 */
declare function showSettings(): void;
export { onOpen, onHomepage, showSidebar, getSelectedRange, getSheetContext, applySuggestion, openDocumentation, showSettings, getBackendBaseUrl, setBackendBaseUrl, getBackendToken, };
//# sourceMappingURL=index.d.ts.map