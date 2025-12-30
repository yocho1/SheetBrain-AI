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
export function parseA1Notation(notation: string): ParsedRange {
  // Handle sheet prefix (e.g., "Sheet1!A1:B10")
  const sheetMatch = notation.match(/^'?([^'!]+)'?!(.+)$/);
  const [sheetName, rangeString] = sheetMatch
    ? [sheetMatch[1], sheetMatch[2]]
    : ['Sheet1', notation];

  // Parse range
  const rangeParts = rangeString.match(/([A-Z]+)(\d+)?(?::([A-Z]+)(\d+)?)?/);
  if (!rangeParts) {
    throw new Error(`Invalid range notation: ${notation}`);
  }

  const startCol = columnLetterToIndex(rangeParts[1]);
  const startRow = parseInt(rangeParts[2]) || 1;
  const endCol = rangeParts[3] ? columnLetterToIndex(rangeParts[3]) : startCol;
  const endRow = rangeParts[4] ? parseInt(rangeParts[4]) : startRow;

  return {
    sheetName,
    startRow,
    startCol,
    endRow,
    endCol,
    address: notation,
  };
}

/**
 * Converts column letter(s) to 1-based index
 */
function columnLetterToIndex(letters: string): number {
  let index = 0;
  for (let i = 0; i < letters.length; i++) {
    index = index * 26 + (letters.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return index;
}

/**
 * Converts 1-based column index to letter(s)
 */
function columnIndexToLetter(index: number): string {
  let letter = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letter = String.fromCharCode('A'.charCodeAt(0) + remainder) + letter;
    index = Math.floor((index - 1) / 26);
  }
  return letter;
}

/**
 * Validates if a formula is valid Google Sheets syntax
 */
export function isValidFormula(formula: string): boolean {
  return formula.startsWith('=');
}

/**
 * Extracts all cell references from a formula
 */
export function extractCellReferences(formula: string): string[] {
  const cellRegex = /([A-Z]+\d+(?::[A-Z]+\d+)?)/g;
  const matches = formula.match(cellRegex);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Gets formula complexity score (0-100)
 */
export function getFormulaComplexity(formula: string): number {
  let score = 0;

  // Count nested functions
  const functionMatches = formula.match(/[A-Z_]+\(/g) || [];
  score += Math.min(functionMatches.length * 10, 30);

  // Count operators
  const operators = formula.match(/[+\-*/<>=&|]/g) || [];
  score += Math.min(operators.length * 5, 30);

  // Check for array formulas
  if (formula.includes('{') || formula.includes('}')) {
    score += 20;
  }

  // Check for LAMBDA usage
  if (formula.includes('LAMBDA')) {
    score += 20;
  }

  return Math.min(score, 100);
}

/**
 * Sanitizes a formula for display (redacts sensitive patterns)
 */
export function sanitizeFormula(formula: string): string {
  // Redact email addresses
  return formula.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
}
