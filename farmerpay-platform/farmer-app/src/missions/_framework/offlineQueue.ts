/**
 * offlineQueue — Cross-mission offline submission queue (F6 — Spec §4.5).
 *
 * Queues mission submissions when offline. On reconnect, uploads in FIFO order.
 * Uses AsyncStorage as the backing store (SQLite upgrade is a future option).
 *
 * Each queued item:
 *   - id: unique identifier
 *   - missionId: which mission produced this
 *   - endpoint: target API path
 *   - payload: JSON-serialisable request body
 *   - createdAt: epoch ms
 *   - retryCount: number of failed upload attempts
 *   - status: QUEUED | UPLOADING | DONE | FAILED
 *
 * The queue is drained via `processQueue(uploadFn)` which:
 *   1. Loads all QUEUED items sorted by createdAt (FIFO)
 *   2. Attempts upload for each in order
 *   3. Marks DONE on success, increments retryCount on failure
 *   4. Stops on first failure (preserves order guarantee)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ──────────────────────────────────────────────────────

export type QueueItemStatus = "QUEUED" | "UPLOADING" | "DONE" | "FAILED";

export interface QueueItem {
  id: string;
  missionId: string;
  endpoint: string;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  status: QueueItemStatus;
}

export type UploadFn = (
  endpoint: string,
  payload: Record<string, unknown>,
) => Promise<void>;

export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
}

// ─── Constants ──────────────────────────────────────────────────

export const QUEUE_STORAGE_KEY = "farmerpay:offline_queue";
export const MAX_RETRIES = 3;

// ─── Helpers ────────────────────────────────────────────────────

let idCounter = 0;

function generateId(): string {
  idCounter++;
  return `oq-${Date.now()}-${idCounter}`;
}

// ─── Queue operations ───────────────────────────────────────────

/**
 * Load the full queue from storage.
 */
export async function loadQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
}

/**
 * Persist the queue to storage.
 */
export async function saveQueue(queue: QueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Enqueue a new submission for offline upload.
 */
export async function enqueue(
  missionId: string,
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<QueueItem> {
  const item: QueueItem = {
    id: generateId(),
    missionId,
    endpoint,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
    status: "QUEUED",
  };

  const queue = await loadQueue();
  queue.push(item);
  await saveQueue(queue);

  return item;
}

/**
 * Get count of pending (QUEUED + FAILED) items.
 */
export async function pendingCount(): Promise<number> {
  const queue = await loadQueue();
  return queue.filter(
    (i) => i.status === "QUEUED" || i.status === "FAILED",
  ).length;
}

/**
 * Get all items for a specific mission.
 */
export async function getItemsForMission(
  missionId: string,
): Promise<QueueItem[]> {
  const queue = await loadQueue();
  return queue.filter((i) => i.missionId === missionId);
}

/**
 * Process the queue: upload items in FIFO order.
 * Stops on first failure to preserve ordering.
 */
export async function processQueue(
  uploadFn: UploadFn,
): Promise<ProcessResult> {
  const queue = await loadQueue();
  const result: ProcessResult = { processed: 0, succeeded: 0, failed: 0 };

  // Sort by createdAt to guarantee FIFO
  const pending = queue
    .filter((i) => i.status === "QUEUED" || i.status === "FAILED")
    .sort((a, b) => a.createdAt - b.createdAt);

  for (const item of pending) {
    // Find the actual item in the queue array (by reference via id)
    const idx = queue.findIndex((q) => q.id === item.id);
    if (idx === -1) continue;

    queue[idx].status = "UPLOADING";
    result.processed++;

    try {
      await uploadFn(item.endpoint, item.payload);
      queue[idx].status = "DONE";
      result.succeeded++;
    } catch {
      queue[idx].retryCount++;
      queue[idx].status =
        queue[idx].retryCount >= MAX_RETRIES ? "FAILED" : "QUEUED";
      result.failed++;

      // Stop on first failure to preserve order
      await saveQueue(queue);
      return result;
    }
  }

  await saveQueue(queue);
  return result;
}

/**
 * Remove all DONE items from the queue (housekeeping).
 */
export async function pruneCompleted(): Promise<number> {
  const queue = await loadQueue();
  const before = queue.length;
  const pruned = queue.filter((i) => i.status !== "DONE");
  await saveQueue(pruned);
  return before - pruned.length;
}

/**
 * Clear the entire queue.
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
}
