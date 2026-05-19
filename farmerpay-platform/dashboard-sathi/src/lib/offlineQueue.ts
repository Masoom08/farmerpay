/**
 * offlineQueue — Sathi dashboard offline submission queue (G5 — Spec §5.7).
 *
 * Queues task submissions when offline. Replays on reconnect.
 * Shows retry badge on task card after failed attempt.
 *
 * Storage: pluggable via `StorageAdapter`. Default uses localStorage
 * (swap to idb-keyval for IndexedDB when the dep is added).
 *
 * Replay strategy:
 *   - FIFO order
 *   - Exponential backoff on failure: 1s, 2s, 4s, 8s, 16s (capped)
 *   - MAX_RETRIES = 5 before item is marked DEAD
 *   - Stops on first failure to preserve ordering
 *
 * PRIVACY (§5.5): Queue payloads never contain score data.
 */

// ─── Types ────────────────────────────────────────────────

export type QueueStatus = "QUEUED" | "UPLOADING" | "DONE" | "FAILED" | "DEAD";

export interface QueueItem {
  id: string;
  taskId: string;
  endpoint: string;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  status: QueueStatus;
  lastAttempt: number | null;
  /** Next eligible retry time (epoch ms) — used for exponential backoff */
  nextRetryAfter: number | null;
}

export interface ReplayResult {
  processed: number;
  succeeded: number;
  failed: number;
}

export type UploadFn = (
  endpoint: string,
  payload: Record<string, unknown>,
) => Promise<void>;

// ─── Storage adapter ──────────────────────────────────────

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Default: localStorage adapter (works in SSR-safe way). */
export const localStorageAdapter: StorageAdapter = {
  async get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* full */ }
  },
  async remove(key) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },
};

// ─── Constants ────────────────────────────────────────────

export const QUEUE_KEY = "sathi:offline_queue";
export const MAX_RETRIES = 5;
export const BASE_BACKOFF_MS = 1000; // 1 second
export const MAX_BACKOFF_MS = 16000; // 16 seconds cap

// ─── ID generation ────────────────────────────────────────

let _idCounter = 0;

function generateId(): string {
  _idCounter++;
  return "sq-" + Date.now() + "-" + _idCounter;
}

/** Reset counter (for tests). */
export function _resetIdCounter(): void {
  _idCounter = 0;
}

// ─── Backoff calculation ──────────────────────────────────

/**
 * Exponential backoff: BASE * 2^(retryCount - 1), capped at MAX.
 * retryCount=1 → 1s, 2 → 2s, 3 → 4s, 4 → 8s, 5 → 16s
 */
export function calcBackoff(retryCount: number): number {
  if (retryCount <= 0) return 0;
  const delay = BASE_BACKOFF_MS * Math.pow(2, retryCount - 1);
  return Math.min(delay, MAX_BACKOFF_MS);
}

// ─── Queue class ──────────────────────────────────────────

export class OfflineQueue {
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter = localStorageAdapter) {
    this.storage = storage;
  }

  /** Load the full queue from storage. */
  async load(): Promise<QueueItem[]> {
    const raw = await this.storage.get(QUEUE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as QueueItem[];
    } catch {
      return [];
    }
  }

  /** Persist the queue. */
  async save(queue: QueueItem[]): Promise<void> {
    await this.storage.set(QUEUE_KEY, JSON.stringify(queue));
  }

  /** Enqueue a new submission. */
  async enqueue(
    taskId: string,
    endpoint: string,
    payload: Record<string, unknown>,
  ): Promise<QueueItem> {
    const item: QueueItem = {
      id: generateId(),
      taskId,
      endpoint,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
      status: "QUEUED",
      lastAttempt: null,
      nextRetryAfter: null,
    };

    const queue = await this.load();
    queue.push(item);
    await this.save(queue);
    return item;
  }

  /** Count of items needing upload (QUEUED + FAILED). */
  async pendingCount(): Promise<number> {
    const queue = await this.load();
    return queue.filter((i) => i.status === "QUEUED" || i.status === "FAILED").length;
  }

  /** Get items for a specific task (for retry badge). */
  async getItemsForTask(taskId: string): Promise<QueueItem[]> {
    const queue = await this.load();
    return queue.filter((i) => i.taskId === taskId);
  }

  /** Check if a task has any failed items (for retry badge on card). */
  async hasRetryBadge(taskId: string): Promise<boolean> {
    const items = await this.getItemsForTask(taskId);
    return items.some((i) => i.status === "FAILED" || i.status === "DEAD");
  }

  /**
   * Replay queued items in FIFO order.
   * Respects exponential backoff — skips items whose nextRetryAfter > now.
   * Stops on first failure to preserve ordering.
   */
  async replay(
    uploadFn: UploadFn,
    now: number = Date.now(),
  ): Promise<ReplayResult> {
    const queue = await this.load();
    const result: ReplayResult = { processed: 0, succeeded: 0, failed: 0 };

    // Eligible: QUEUED or FAILED items past their backoff window
    const pending = queue
      .filter(
        (i) =>
          (i.status === "QUEUED" || i.status === "FAILED") &&
          (i.nextRetryAfter == null || i.nextRetryAfter <= now),
      )
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const item of pending) {
      const idx = queue.findIndex((q) => q.id === item.id);
      if (idx === -1) continue;

      queue[idx].status = "UPLOADING";
      queue[idx].lastAttempt = now;
      result.processed++;

      try {
        await uploadFn(item.endpoint, item.payload);
        queue[idx].status = "DONE";
        result.succeeded++;
      } catch {
        queue[idx].retryCount++;

        if (queue[idx].retryCount >= MAX_RETRIES) {
          queue[idx].status = "DEAD";
        } else {
          queue[idx].status = "FAILED";
          queue[idx].nextRetryAfter = now + calcBackoff(queue[idx].retryCount);
        }

        result.failed++;

        // Stop on first failure — preserve FIFO order
        await this.save(queue);
        return result;
      }
    }

    await this.save(queue);
    return result;
  }

  /** Remove all DONE items. Returns count removed. */
  async pruneCompleted(): Promise<number> {
    const queue = await this.load();
    const before = queue.length;
    const remaining = queue.filter((i) => i.status !== "DONE");
    await this.save(remaining);
    return before - remaining.length;
  }

  /** Clear the entire queue. */
  async clear(): Promise<void> {
    await this.storage.remove(QUEUE_KEY);
  }
}

// ─── Singleton instance ───────────────────────────────────

export const offlineQueue = new OfflineQueue();
