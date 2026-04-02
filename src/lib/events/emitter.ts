/**
 * SSE 事件流 - 实时推送克隆任务进度
 * 基于 Open Lovable 的 SSE 模式
 */

export interface CloneEvent {
  type: 'progress' | 'scraping' | 'analyzing' | 'generating' | 'testing' | 'fixing' | 'uploading' | 'done' | 'error' | 'stream';
  taskId: string;
  progress?: number;
  currentStep?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

type EventListener = (event: CloneEvent) => void;

class CloneEventEmitter {
  private listeners: Map<string, Set<EventListener>> = new Map();

  emit(taskId: string, event: Omit<CloneEvent, 'taskId' | 'timestamp'>): void {
    const fullEvent: CloneEvent = {
      ...event,
      taskId,
      timestamp: Date.now(),
    };

    const listeners = this.listeners.get(taskId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(fullEvent);
        } catch (err) {
          console.error('[CloneEventEmitter] Listener error:', err);
        }
      }
    }
  }

  subscribe(taskId: string, listener: EventListener): () => void {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, new Set());
    }
    this.listeners.get(taskId)!.add(listener);

    return () => {
      const listeners = this.listeners.get(taskId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(taskId);
        }
      }
    };
  }

  unsubscribe(taskId: string): void {
    this.listeners.delete(taskId);
  }

  getListenerCount(taskId: string): number {
    return this.listeners.get(taskId)?.size ?? 0;
  }
}

export const cloneEventEmitter = new CloneEventEmitter();

/**
 * 创建 SSE 流响应
 */
export function createCloneEventStream(taskId: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const sendEvent = (event: CloneEvent) => {
        const message = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      unsubscribe = cloneEventEmitter.subscribe(taskId, sendEvent);

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'connected',
        taskId,
        timestamp: Date.now(),
      })}\n\n`));
    },

    cancel() {
      unsubscribe?.();
    },
  });
}

/**
 * SSE 辅助函数 - 发送带类型的数据
 */
export function createSSEStream(
  generator: AsyncGenerator<CloneEvent, void, unknown>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of generator) {
          const message = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(message));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
