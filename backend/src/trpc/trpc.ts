/**
 * tRPC router initialization for SheetBrain AI
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

interface Context {
  userId?: string;
  organizationId?: string;
  headers: Headers;
}

export const createContext = async (opts: FetchCreateContextFnOptions): Promise<Context> => {
  const headers = new Headers(opts.req.headers);
  return {
    userId: headers.get('x-user-id') || undefined,
    organizationId: headers.get('x-user-org') || undefined,
    headers,
  };
};

const t = initTRPC.context<Context>().create();

/**
 * Create a protected procedure that requires authentication
 */
export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be authenticated to perform this action',
    });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      userId: opts.ctx.userId,
      organizationId: opts.ctx.organizationId || '',
    },
  });
});

export const router = t.router;
export const procedure = t.procedure;
