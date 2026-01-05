/**
 * RAG Retrieval module for document search
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RetrievalContext, DocumentChunk } from '@sheetbrain/shared';
import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;
const pineconeApiKey = process.env.PINECONE_API_KEY;

const pinecone = pineconeApiKey
  ? new Pinecone({ apiKey: pineconeApiKey })
  : null;

const supabase: SupabaseClient | null =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

/**
 * Embeds a query string into a vector
 */
async function embedQuery(query: string): Promise<number[]> {
  if (!openai) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    dimensions: 1536, // supported for text-embedding-3-small
  });

  return response.data[0]?.embedding || [];
}

/**
 * Retrieves relevant context from vector store
 */
export async function retrieveRelevantContext(
  query: string,
  context: RetrievalContext
): Promise<DocumentChunk[]> {
  try {
    if (!pinecone) {
      console.warn('Pinecone not configured; returning empty retrieval context');
      return [];
    }

    // Generate query embeddings
    const embedding = await embedQuery(query);

    // Get index
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    // Vector search
    const results = await index.query({
      vector: embedding,
      topK: context.topK || 10,
      filter: context.orgId ? { orgId: { $eq: context.orgId } } : undefined,
      includeMetadata: true,
    });

    // Hybrid search with Supabase
    let keywordResults: unknown[] | undefined;
    if (supabase) {
      try {
        const { data } = await supabase.rpc('hybrid_search', {
          query_text: query,
          query_embedding: embedding,
          match_count: context.topK || 10,
          org_id: context.orgId,
        });
        keywordResults = data || [];
      } catch (err) {
        console.warn('Supabase hybrid_search failed; continuing with vector-only', err);
      }
    }

    // Combine and deduplicate results
    const combinedResults = [...(results.matches || []), ...(keywordResults || [])];

    type MatchRecord = {
      id?: string;
      score?: number;
      values?: number[];
      metadata?: Record<string, unknown> & { content?: string };
    };

    const seen = new Map<string, MatchRecord>();
    combinedResults.forEach((r: unknown) => {
      const record = r as MatchRecord;
      if (!record?.id) return;
      const existing = seen.get(record.id);
      if (!existing || (record.score || 0) > (existing.score || 0)) {
        seen.set(record.id, record);
      }
    });

    const deduped = Array.from(seen.values()).sort((a, b) => (b.score || 0) - (a.score || 0));

    // Convert to DocumentChunk format
    const chunks: DocumentChunk[] = deduped
      .filter((r) => (r.score || 0) >= (context.minConfidence || 0.7))
      .map((match) => ({
        id: match.id || '',
        orgId: context.orgId,
        content: (match.metadata?.content as string) || '',
        embedding: match.values || [],
        metadata: match.metadata || {},
      })) as DocumentChunk[];

    return chunks;
  } catch (error) {
    console.error('Retrieval error:', error);
    return [];
  }
}

/**
 * Ingests documents into vector store
 */
export async function ingestDocument(
  content: string,
  metadata: Record<string, unknown>
): Promise<string> {
  const chunkId = `doc_${Date.now()}_${Math.random()}`;

  if (!pinecone) {
    throw new Error('Pinecone not configured');
  }
  if (!metadata || typeof (metadata as { orgId?: unknown }).orgId !== 'string') {
    throw new Error('orgId is required in metadata for ingestion');
  }

  try {
    // Create embedding
    const embedding = await embedQuery(content);

    // Store in Pinecone
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
    await index.upsert([
      {
        id: chunkId,
        values: embedding,
        metadata: {
          content,
          ...metadata,
          ingestedAt: new Date().toISOString(),
        },
      },
    ]);

    // Store in Supabase for hybrid search
    const { orgId } = metadata as { orgId: string };
    if (supabase) {
      try {
        await supabase.from('document_chunks').insert({
          id: chunkId,
          org_id: orgId,
          content,
          embedding: `[${embedding.join(',')}]`,
          metadata,
        });
      } catch (err) {
        console.warn('Supabase insert failed; continuing with Pinecone only', err);
      }
    }

    return chunkId;
  } catch (error) {
    console.error('Ingestion error:', error);
    throw error;
  }
}

export { retrieveRelevantContext as retrieve };
