/**
 * OpenRouter LLM integration
 * Unified access to 100+ models (Claude, GPT, Llama, Mistral, etc.)
 */

import { Anthropic } from '@anthropic-ai/sdk';

// Lazy client initialization - only created when first used
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    
    // Let Anthropic SDK handle missing key error with proper error message
    _client = new Anthropic({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
        'X-Title': 'SheetBrain',
      },
    });
  }
  return _client;
}

// Backward compatibility export
export const openrouter = {
  get messages() {
    return getClient().messages;
  },
};

// Model options available through OpenRouter
export const MODELS = {
  // Anthropic Claude models (fast, cost-effective)
  CLAUDE_3_5_SONNET: 'anthropic/claude-3.5-sonnet',
  CLAUDE_3_5_HAIKU: 'anthropic/claude-3.5-haiku',
  CLAUDE_3_OPUS: 'anthropic/claude-3-opus',

  // OpenAI GPT models
  GPT_4_TURBO: 'openai/gpt-4-turbo',
  GPT_4O: 'openai/gpt-4o',
  GPT_4O_MINI: 'openai/gpt-4o-mini',

  // Meta Llama models (open source, cost-effective)
  LLAMA_3_70B: 'meta-llama/llama-3-70b-instruct',
  LLAMA_2_70B: 'meta-llama/llama-2-70b-chat',

  // Mistral models
  MISTRAL_LARGE: 'mistralai/mistral-large',
  MISTRAL_MEDIUM: 'mistralai/mistral-medium',

  // Google Gemini
  GEMINI_2_FLASH: 'google/gemini-2.0-flash-exp',
} as const;

// Default model for SheetBrain audits
const DEFAULT_MODEL = MODELS.CLAUDE_3_5_SONNET;

export interface AuditRequest {
  formulas: string[];
  policies: string;
  context?: string;
}

export interface AuditResult {
  formula: string;
  compliant: boolean;
  risk: 'low' | 'medium' | 'high';
  issues: string[];
  recommendations: string[];
}

/**
 * Audit spreadsheet formulas against company policies using OpenRouter
 */
export async function auditFormulas(request: AuditRequest): Promise<AuditResult[]> {
  const { formulas, policies, context = '' } = request;

  const systemPrompt = `You are a spreadsheet formula auditor. Analyze the provided formulas against company policies and identify compliance issues.

Company Policies:
${policies}

${context ? `Additional Context:\n${context}` : ''}

For each formula, provide:
1. Whether it complies with policies
2. Risk level (low/medium/high)
3. Specific issues found
4. Recommendations for compliance

Respond in JSON format for each formula.`;

  const userPrompt = `Audit these formulas:\n\n${formulas.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nRespond with a JSON array of audit results.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
        'X-Title': 'SheetBrain',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenRouter response');
    }

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from OpenRouter response');
    }

    const results = JSON.parse(jsonMatch[0]) as AuditResult[];
    return results;
  } catch (error) {
    console.error('OpenRouter audit error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    throw error;
  }
}

/**
 * Generate formula recommendations based on policies
 */
export async function generateRecommendations(
  formula: string,
  policy: string,
  reason: string
): Promise<string> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
        'X-Title': 'SheetBrain',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Given this spreadsheet formula and policy violation, provide a corrected formula that complies with the policy.

Formula: ${formula}
Policy: ${policy}
Violation Reason: ${reason}

Provide only the corrected formula without explanation.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn('Failed to generate recommendation:', response.statusText);
      return formula;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() || formula;
  } catch (error) {
    console.error('OpenRouter recommendation error:', error);
    return formula;
  }
}

/**
 * Analyze document content for policy compliance
 */
export async function analyzeDocument(content: string, policies: string): Promise<string> {
  try {
    const response = await openrouter.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Analyze this document content for compliance with the following policies:

Policies:
${policies}

Document:
${content}

Provide a compliance report identifying any violations and recommendations.`,
        },
      ],
    });

    const responseContent = response.content[0];
    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return responseContent.text;
  } catch (error) {
    console.error('OpenRouter analysis error:', error);
    throw error;
  }
}

export default openrouter;
