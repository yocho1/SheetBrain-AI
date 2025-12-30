/**
 * RAG Retrieval module for document search
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';
import { RetrievalContext, DocumentChunk } from '@sheetbrain/shared';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Embeds a query string into a vector
 */
async function embedQuery(query: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-large',
      input: query,
      dimensions: 1536,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Retrieves relevant context from vector store
 */
export async function retrieveRelevantContext(
  query: string,
  context: RetrievalContext
): Promise<DocumentChunk[]> {
  try {
    // Generate query embeddings
    const embedding = await embedQuery(query);

    // Get index
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

    // Vector search
    const results = await index.query({
      vector: embedding,
      topK: context.topK || 10,
      filter: {
        orgId: { $eq: context.orgId },
      },
      includeMetadata: true,
    });

    // Hybrid search with Supabase
    const { data: keywordResults } = await supabase.rpc('hybrid_search', {
      query_text: query,
      query_embedding: embedding,
      match_count: context.topK || 10,
      org_id: context.orgId,
    });

    // Combine and deduplicate results
    const combinedResults = [
      ...(results.matches || []),
      ...(keywordResults || []),
    ];

    // Convert to DocumentChunk format
    const chunks: DocumentChunk[] = combinedResults
      .filter((r) => (r.score || 0) >= (context.minConfidence || 0.7))
      .map((match) => ({
        id: match.id,
        orgId: context.orgId,
        content: match.metadata?.content || '',
        embedding: match.values || [],
        metadata: match.metadata || {},
      }));

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
    await supabase.from('document_chunks').insert({
      id: chunkId,
      org_id: orgId,
      content,
      embedding: `[${embedding.join(',')}]`,
      metadata,
    });

    return chunkId;
  } catch (error) {
    console.error('Ingestion error:', error);
    throw error;
  }
}

export { retrieveRelevantContext as retrieve };
