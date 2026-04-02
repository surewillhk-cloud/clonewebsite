/**
 * 任务状态存储
 * Supabase 已配置时使用 clone_tasks 表持久化，否则退化为内存 Map
 */

import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';

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
/** 内存模式下任务归属（Supabase 不可用时） */
const memoryOwnerMap = new Map<string, string>();

function toDbRow(updates: Partial<TaskStatusState>) {
  const row: {
    status?: string;
    progress?: number;
    current_step?: string;
    quality_score?: number;
    r2_key?: string | null;
    local_zip_path?: string | null;
    retry_count?: number;
    error_message?: string;
    completed_at?: string;
  } = {};
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

/** 获取任务状态及所属 userId（用于鉴权） */
export async function getTaskStatusWithOwner(
  taskId: string
): Promise<{ status: TaskStatusState; userId: string } | undefined> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('clone_tasks')
        .select('user_id, status, progress, current_step, quality_score, r2_key, local_zip_path, retry_count, clone_type')
        .eq('id', taskId)
        .single();

      if (error || !data) {
        const mem = memoryStore.get(taskId);
        if (!mem) return undefined;
        const owner = memoryOwnerMap.get(taskId) ?? 'anon';
        return { status: mem, userId: owner };
      }
      return {
        status: fromDbRow(data),
        userId: String((data as { user_id?: string }).user_id ?? 'anon'),
      };
    } catch {
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
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const row = toDbRow(updates);
      // @ts-expect-error Supabase 表类型在无 schema 生成时推断为 never
      const { error } = await supabase.from('clone_tasks').update(row).eq('id', taskId);

      if (error) {
        console.warn('[task-store] Supabase update failed:', error);
      }
    } catch (err) {
      console.warn('[task-store] Supabase setTaskStatus error:', err);
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
  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const row: Record<string, unknown> = {
        id: taskId,
        user_id: task.userId,
        clone_type: task.cloneType,
        target_url: task.targetUrl,
        complexity: task.complexity,
        credits_used: task.creditsUsed,
        delivery_mode: task.deliveryMode,
        target_language: task.targetLanguage,
        status: initialStatus.status,
        progress: initialStatus.progress,
        current_step: initialStatus.currentStep,
        retry_count: initialStatus.retryCount,
      };
      if (task.stripePaymentIntentId) {
        row.stripe_payment_intent_id = task.stripePaymentIntentId;
      }
      // @ts-expect-error Supabase 表类型在无 schema 生成时推断为 never
      await supabase.from('clone_tasks').insert(row);
    } catch (err) {
      console.warn('[task-store] Supabase insert failed:', err);
    }
  }
  memoryStore.set(taskId, initialStatus);
  memoryOwnerMap.set(taskId, task.userId);
}
