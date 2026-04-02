/**
 * 任务状态存储
 * 使用 PostgreSQL (pg) 连接池
 */

import { query, isDbConfigured } from '@/lib/db';

export interface TaskStatusState {
  status: string;
  progress: number;
  currentStep: string;
  qualityScore?: number;
  downloadUrl?: string | null;
  r2Key?: string | null;
  localZipPath?: string | null;
  retryCount: number;
  cloneType?: string;
}

const memoryStore = new Map<string, TaskStatusState>();
const memoryOwnerMap = new Map<string, string>();

function toDbRow(updates: Partial<TaskStatusState>) {
  const row: Record<string, unknown> = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.progress !== undefined) row.progress = updates.progress;
  if (updates.currentStep !== undefined) row.current_step = updates.currentStep;
  if (updates.qualityScore !== undefined) row.quality_score = updates.qualityScore;
  if (updates.r2Key !== undefined) row.r2_key = updates.r2Key;
  if (updates.localZipPath !== undefined) row.local_zip_path = updates.localZipPath;
  if (updates.retryCount !== undefined) row.retry_count = updates.retryCount;
  if (updates.status === 'failed' && updates.currentStep)
    row.error_message = updates.currentStep;
  if (updates.status === 'done' || updates.status === 'failed')
    row.completed_at = new Date().toISOString();
  return row;
}

function fromDbRow(row: Record<string, unknown>): TaskStatusState {
  return {
    status: (row.status as string) ?? 'queued',
    progress: (row.progress as number) ?? 0,
    currentStep: (row.current_step as string) ?? '',
    qualityScore: row.quality_score as number | undefined,
    r2Key: row.r2_key as string | null | undefined,
    localZipPath: row.local_zip_path as string | null | undefined,
    retryCount: (row.retry_count as number) ?? 0,
    cloneType: row.clone_type as string | undefined,
  };
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusState | undefined> {
  const withOwner = await getTaskStatusWithOwner(taskId);
  return withOwner?.status;
}

export async function getTaskStatusWithOwner(
  taskId: string
): Promise<{ status: TaskStatusState; userId: string } | undefined> {
  if (isDbConfigured()) {
    try {
      const result = await query(
        `SELECT user_id, status, progress, current_step, quality_score, r2_key, 
         local_zip_path, retry_count, clone_type 
         FROM clone_tasks WHERE id = $1`,
        [taskId]
      );

      if (result.rows.length === 0) {
        const mem = memoryStore.get(taskId);
        if (!mem) return undefined;
        const owner = memoryOwnerMap.get(taskId) ?? 'anon';
        return { status: mem, userId: owner };
      }

      const row = result.rows[0];
      return {
        status: fromDbRow(row),
        userId: String(row.user_id ?? 'anon'),
      };
    } catch (err) {
      console.error('[task-store] DB query error:', err);
      const mem = memoryStore.get(taskId);
      if (!mem) return undefined;
      const owner = memoryOwnerMap.get(taskId) ?? 'anon';
      return { status: mem, userId: owner };
    }
  }

  const mem = memoryStore.get(taskId);
  if (!mem) return undefined;
  const owner = memoryOwnerMap.get(taskId) ?? 'anon';
  return { status: mem, userId: owner };
}

export async function setTaskStatus(
  taskId: string,
  updates: Partial<TaskStatusState>
): Promise<void> {
  if (isDbConfigured()) {
    try {
      const row = toDbRow(updates);
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(row)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      if (setClauses.length > 0) {
        values.push(taskId);
        await query(
          `UPDATE clone_tasks SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
          values
        );
      }
    } catch (err) {
      console.error('[task-store] DB update error:', err);
    }
  }

  const existing = memoryStore.get(taskId);
  const newValue = existing ? { ...existing, ...updates } : {
    status: 'queued',
    progress: 0,
    currentStep: '',
    retryCount: 0,
    ...updates,
  };
  memoryStore.set(taskId, newValue);
}

export async function createTaskInStore(
  taskId: string,
  task: {
    userId: string;
    cloneType: string;
    targetUrl: string;
    complexity: string;
    creditsUsed: number;
    deliveryMode: string;
    targetLanguage: string;
    stripePaymentIntentId?: string;
  },
  initialStatus: TaskStatusState
): Promise<void> {
  if (isDbConfigured()) {
    try {
      await query(
        `INSERT INTO clone_tasks 
         (id, user_id, clone_type, target_url, complexity, credits_used, 
          delivery_mode, target_language, status, progress, current_step, retry_count,
          stripe_payment_intent_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
        [
          taskId,
          task.userId,
          task.cloneType,
          task.targetUrl,
          task.complexity,
          task.creditsUsed,
          task.deliveryMode,
          task.targetLanguage,
          initialStatus.status,
          initialStatus.progress,
          initialStatus.currentStep,
          initialStatus.retryCount,
          task.stripePaymentIntentId ?? null,
        ]
      );
    } catch (err) {
      console.error('[task-store] DB insert error:', err);
    }
  }

  memoryStore.set(taskId, initialStatus);
  memoryOwnerMap.set(taskId, task.userId);
}
