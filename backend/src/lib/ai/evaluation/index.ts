/**
 * Evaluation utilities for audit results quality
 */

/**
 * Evaluate confidence score of audit analysis
 */
export function evaluateConfidence(analysis: {
  hasIssues: boolean;
  policyMatches: number;
  formulaSyntaxValid: boolean;
}): number {
  let score = 0.5; // Base score

  if (analysis.formulaSyntaxValid) {
    score += 0.2;
  }

  if (analysis.policyMatches > 0) {
    score += Math.min(analysis.policyMatches * 0.1, 0.3);
  }

  return Math.min(score, 1);
}

/**
 * Check if analysis contains hallucinations
 */
export function detectHallucinations(analysis: {
  formula: string;
  suggestions: Array<{ recommended: string }>;
}): boolean {
  // Check if suggested formulas are valid
  const validFormulaPattern = /^=[\w(),:\s+*/!&|><="'.-]+$/;

  return analysis.suggestions.some((s) => !validFormulaPattern.test(s.recommended));
}

/**
 * Rank suggestion quality
 */
export function rankSuggestion(suggestion: {
  current: string;
  recommended: string;
  explanation: string;
}): number {
  let score = 0.5;

  // Check if recommendation is different
  if (suggestion.recommended !== suggestion.current) {
    score += 0.2;
  }

  // Check explanation clarity
  if (suggestion.explanation && suggestion.explanation.length > 20) {
    score += 0.3;
  }

  return Math.min(score, 1);
}

/**
 * Validate audit result structure
 */
interface AuditResultLike {
  id?: string;
  analysis?: unknown;
  confidenceScore?: number;
  explanation?: string;
}

export function validateAuditResult(result: AuditResultLike): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!result.id) errors.push('Missing audit ID');
  if (!result.analysis) errors.push('Missing analysis');
  if (!result.confidenceScore || result.confidenceScore < 0 || result.confidenceScore > 1) {
    errors.push('Invalid confidence score');
  }
  if (!result.explanation) errors.push('Missing explanation');

  return {
    valid: errors.length === 0,
    errors,
  };
}
