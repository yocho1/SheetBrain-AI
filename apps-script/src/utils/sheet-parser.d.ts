/**
 * Sheet parsing and validation utilities
 */
export interface ParsedRange {
    sheetName: string;
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
    address: string;
}
/**
 * Parses A1 notation into row/column indices
 */
export declare function parseA1Notation(notation: string): ParsedRange;
/**
 * Validates if a formula is valid Google Sheets syntax
 */
export declare function isValidFormula(formula: string): boolean;
/**
 * Extracts all cell references from a formula
 */
export declare function extractCellReferences(formula: string): string[];
/**
 * Gets formula complexity score (0-100)
 */
export declare function getFormulaComplexity(formula: string): number;
/**
 * Sanitizes a formula for display (redacts sensitive patterns)
 */
export declare function sanitizeFormula(formula: string): string;
//# sourceMappingURL=sheet-parser.d.ts.map