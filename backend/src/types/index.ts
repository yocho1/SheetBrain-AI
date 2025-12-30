/**
 * API types and interfaces
 */

import { z } from 'zod';

// Re-export shared types
export * from '@sheetbrain/shared';

// Backend-specific types
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const ListResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: PaginationSchema,
  total: z.number(),
});

export type ListResponse<T> = z.infer<typeof ListResponseSchema> & {
  data: T[];
};

export const ErrorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'BAD_REQUEST',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
