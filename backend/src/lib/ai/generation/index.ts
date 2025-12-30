/**
 * LLM-based formula generation and suggestions
 */

import { AuditResult, AuditSuggestion } from '@sheetbrain/shared';

const AUDIT_PROMPT_TEMPLATE = `You are SheetBrain AI, a world-class spreadsheet auditor with expertise in:
1. Complex formula optimization (Google Sheets & Excel)
2. Business logic validation against organizational SOPs
3. Error detection and data consistency checking
4. Performance optimization for large datasets

CRITICAL INSTRUCTIONS:
- ALWAYS reference specific SOP documents when available
- Provide actionable suggestions with EXACT formula replacements
- Flag inconsistencies with company standards IMMEDIATELY
- Explain complex concepts using the user's business terminology
- Include efficiency ratings (⭐ to ⭐⭐⭐⭐⭐)

AUDIT CONTEXT:
Organization: {{orgName}}
Department: {{department}}
Sheet Purpose: {{sheetPurpose}}

RETRIEVED BUSINESS RULES:
{{#each rules}}
{{@index}}. {{this.content}}
   [Source: {{this.source}}, Authority: {{this.authority}}, Confidence: {{this.confidence}}]
{{/each}}

FORMULA UNDER AUDIT:
Cell: {{cellAddress}}
Formula: {{formula}}
Data Sample: {{sampleData}}

YOUR ANALYSIS MUST FOLLOW THIS STRUCTURE (JSON):
{
  "analysis": {
    "complexity": "low|medium|high",
    "risk_level": "none|low|medium|high|critical",
    "optimization_potential": "0-100%",
    "compliance_status": "compliant|warning|non_compliant"
  },
  "issues": [
    {
      "type": "syntax|logic|performance|policy",
      "severity": "low|medium|high",
      "description": "clear explanation",
      "cell_reference": "B5",
      "sop_reference": "FIN-POL-2024-12"
    }
  ],
  "suggestions": [
    {
      "priority": "high|medium|low",
      "current": "original formula",
      "recommended": "improved formula",
      "explanation": "why this is better",
      "expected_impact": "performance improvement"
    }
  ],
  "explanation": "plain English summary",
  "alternative_formulas": ["option1", "option2"],
  "sop_references": ["doc-id-1", "doc-id-2"],
  "confidence_score": 0.95
}

BEGIN AUDIT:`;

interface GenerationContext {
  orgName?: string;
  department?: string;
  sheetPurpose?: string;
  rules: Array<{
    content: string;
    source: string;
    authority: string;
    confidence: number;
  }>;
  cellAddress: string;
  formula: string;
  sampleData: unknown;
}

/**
 * Generates audit analysis for a formula using Claude
 */
export async function generateAuditAnalysis(context: GenerationContext): Promise<AuditResult> {
  const prompt = AUDIT_PROMPT_TEMPLATE
    .replace('{{orgName}}', context.orgName || 'Unknown')
    .replace('{{department}}', context.department || 'General')
    .replace('{{sheetPurpose}}', context.sheetPurpose || 'Unknown')
    .replace('{{cellAddress}}', context.cellAddress)
    .replace('{{formula}}', context.formula)
    .replace('{{sampleData}}', JSON.stringify(context.sampleData));

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      id: `audit_${Date.now()}`,
      userId: 'system',
      organizationId: 'system',
      formulaContext: {
        formula: context.formula,
        cellReference: {
          sheet: 'Sheet1',
          row: 1,
          column: 1,
          address: context.cellAddress,
        },
        sheetName: 'Sheet1',
        sheetId: 'default',
      },
      analysis: analysis.analysis,
      issues: analysis.issues || [],
      suggestions: analysis.suggestions || [],
      explanation: analysis.explanation || '',
      alternativeFormulas: analysis.alternative_formulas || [],
      sopReferences: analysis.sop_references || [],
      confidenceScore: analysis.confidence_score || 0.8,
      createdAt: new Date(),
      durationMs: 0,
      modelUsed: 'claude-3-5-sonnet-20241022',
      tokensUsed: {
        prompt: data.usage?.input_tokens || 0,
        completion: data.usage?.output_tokens || 0,
      },
    };
  } catch (error) {
    console.error('Generation error:', error);
    throw error;
  }
}

/**
 * Generates alternative formula suggestions
 */
export async function generateAlternativeFormulas(
  formula: string,
  context: Partial<GenerationContext>
): Promise<AuditSuggestion[]> {
  const prompt = `Given this Google Sheets formula: ${formula}

Context:
- Department: ${context.department || 'Unknown'}
- Purpose: ${context.sheetPurpose || 'Unknown'}

Provide 2-3 alternative formulas that are:
1. More efficient
2. More readable
3. Better aligned with best practices

Format your response as a JSON array of objects with:
- current: original formula
- recommended: improved formula
- explanation: why it's better
- expected_impact: performance/clarity improvement
- priority: high|medium|low`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data.content[0].text;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (error) {
    console.error('Error generating alternatives:', error);
    return [];
  }
}
