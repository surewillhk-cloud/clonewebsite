/**
 * @deprecated Use @/lib/db instead
 */

export { query, isDbConfigured, transaction, getClient, closePool } from '@/lib/db';
export { isDbConfigured as isSupabaseConfigured } from '@/lib/db';
