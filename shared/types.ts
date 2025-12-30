import { z } from 'zod';

// ============ Authentication ============
export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.literal('Bearer'),
});

export type AuthToken = z.infer<typeof AuthTokenSchema>;

// ============ User & Organization ============
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  organizationId: z.string(),
  role: z.enum(['admin', 'editor', 'viewer']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  policyDocuments: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// ============ Sheet & Formula ============
export const CellReferenceSchema = z.object({
  sheet: z.string(),
  row: z.number().int().positive(),
  column: z.number().int().positive(),
  address: z.string(), // e.g., "Sheet1!A1"
});

export type CellReference = z.infer<typeof CellReferenceSchema>;

export const FormulaContextSchema = z.object({
  formula: z.string(),
  cellReference: CellReferenceSchema,
  sheetName: z.string(),
  sheetId: z.string(),
  sampleData: z.array(z.any()).optional(),
  relatedFormulas: z.array(z.string()).optional(),
});

export type FormulaContext = z.infer<typeof FormulaContextSchema>;

// ============ Audit Request/Response ============
export const AuditIssueSchema = z.object({
  type: z.enum(['syntax', 'logic', 'performance', 'policy']),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string(),
  cellReference: z.string(),
  sopReference: z.string().optional(),
});

export type AuditIssue = z.infer<typeof AuditIssueSchema>;

export const AuditSuggestionSchema = z.object({
  priority: z.enum(['low', 'medium', 'high']),
  current: z.string(),
  recommended: z.string(),
  explanation: z.string(),
  expectedImpact: z.string(),
});

export type AuditSuggestion = z.infer<typeof AuditSuggestionSchema>;

export const AuditAnalysisSchema = z.object({
  complexity: z.enum(['low', 'medium', 'high']),
  riskLevel: z.enum(['none', 'low', 'medium', 'high', 'critical']),
  optimizationPotential: z.number().min(0).max(100),
  complianceStatus: z.enum(['compliant', 'warning', 'non_compliant']),
});

export type AuditAnalysis = z.infer<typeof AuditAnalysisSchema>;

export const AuditResultSchema = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  formulaContext: FormulaContextSchema,
  analysis: AuditAnalysisSchema,
  issues: z.array(AuditIssueSchema),
  suggestions: z.array(AuditSuggestionSchema),
  explanation: z.string(),
  alternativeFormulas: z.array(z.string()),
  sopReferences: z.array(z.string()),
  confidenceScore: z.number().min(0).max(1),
  createdAt: z.date(),
  durationMs: z.number(),
  modelUsed: z.string(),
  tokensUsed: z.object({
    prompt: z.number(),
    completion: z.number(),
  }),
});

export type AuditResult = z.infer<typeof AuditResultSchema>;

export const AuditRequestSchema = z.object({
  range: z.string(), // e.g., "Sheet1!A1:B10"
  context: z.object({
    sheetName: z.string(),
    sheetId: z.string(),
    organization: z.string().optional(),
    department: z.string().optional(),
    sheetPurpose: z.string().optional(),
  }),
});

export type AuditRequest = z.infer<typeof AuditRequestSchema>;

// ============ Document Ingestion ============
export const DocumentChunkSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  content: z.string(),
  embedding: z.array(z.number()),
  metadata: z.object({
    source: z.string(),
    chunkIndex: z.number(),
    contentType: z.string(),
    ingestedAt: z.string(),
    tags: z.array(z.string()).optional(),
  }),
});

export type DocumentChunk = z.infer<typeof DocumentChunkSchema>;

export const IngestDocumentRequestSchema = z.object({
  file: z.instanceof(File),
  organizationId: z.string(),
  department: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type IngestDocumentRequest = z.infer<typeof IngestDocumentRequestSchema>;

// ============ Billing & Usage ============
export const UsageRecordSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  auditsThisMonth: z.number(),
  auditsThisYear: z.number(),
  lastAuditAt: z.date().optional(),
  stripeCustomerId: z.string().optional(),
  subscriptionItemId: z.string().optional(),
  tier: z.enum(['free', 'pro', 'enterprise']),
});

export type UsageRecord = z.infer<typeof UsageRecordSchema>;

export const StripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
});

export type StripeWebhook = z.infer<typeof StripeWebhookSchema>;

// ============ RAG Context ============
export const RetrievalContextSchema = z.object({
  orgId: z.string(),
  department: z.string().optional(),
  minConfidence: z.number().min(0).max(1).default(0.7),
  topK: z.number().default(10),
});

export type RetrievalContext = z.infer<typeof RetrievalContextSchema>;

export const RerankingResultSchema = z.object({
  index: z.number(),
  score: z.number(),
  document: DocumentChunkSchema,
});

export type RerankingResult = z.infer<typeof RerankingResultSchema>;

// ============ Error Handling ============
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  timestamp: z.date(),
  requestId: z.string(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============ Audit Events (Analytics) ============
export const AuditEventSchema = z.object({
  userId: z.string(),
  orgId: z.string(),
  formula: z.string(),
  duration: z.number(),
  success: z.boolean(),
  model: z.string(),
  tokens: z.object({
    prompt: z.number(),
    completion: z.number(),
  }),
  confidence: z.number(),
  appliedSuggestions: z.number(),
  timestamp: z.date(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;
