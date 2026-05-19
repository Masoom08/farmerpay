/**
 * offlineQueue — Unit Tests (G5 — Spec §5.7)
 *
 * Tests:
 *   ENQUEUE
 *   1.  enqueue adds item with QUEUED status
 *   2.  enqueue persists to storage
 *   3.  enqueue assigns unique id
 *   4.  multiple enqueues maintain FIFO order
 *
 *   PENDING / BADGE
 *   5.  pendingCount counts QUEUED + FAILED items
 *   6.  hasRetryBadge true when task has FAILED item
 *   7.  hasRetryBadge true when task has DEAD item
 *   8.  hasRetryBadge false when all DONE or QUEUED
 *
 *   REPLAY (online reconnect)
 *   9.  replay uploads in FIFO order
 *  10.  replay marks successful items as DONE
 *  11.  replay increments retryCount on failure
 *  12.  replay stops on first failure (order preserved)
 *  13.  replay returns correct counts
 *  14.  replay retries FAILED items on second pass
 *
 *   EXPONENTIAL BACKOFF
 *  15.  calcBackoff returns 1s for retry 1
 *  16.  calcBackoff returns 2s, 4s, 8s, 16s for retries 2-5
 *  17.  calcBackoff caps at MAX_BACKOFF_MS
 *  18.  replay skips items still in backoff window
 *  19.  replay processes items past backoff window
 *
 *   DEAD (MAX_RETRIES exceeded)
 *  20.  item reaching MAX_RETRIES is marked DEAD
 *  21.  DEAD items are not retried
 *
 *   HOUSEKEEPING
 *  22.  pruneCompleted removes DONE items
 *  23.  clear removes everything
 *
 *   SUBMIT OFFLINE → QUEUED → RECONNECT → REPLAYS
 *  24.  Full scenario: offline submit → queue → reconnect replay → DONE
 *
 *   SERVER 5xx → RETRY BADGE
 *  25.  Server failure → FAILED status → hasRetryBadge true
 */

import {
  OfflineQueue,
  calcBackoff,
  MAX_RETRIES,
  BASE_BACKOFF_MS,
  MAX_BACKOFF_MS,
  _resetIdCounter,
  type StorageAdapter,
  type UploadFn,
  type QueueItem,
} from "../../src/lib/offlineQueue";

// ─── In-memory storage adapter for tests ──────────────────

function createMemoryAdapter(): StorageAdapter & { store: Record<string, string> } {
  const store: Record<string, string> = {};
  return {
    store,
    async get(key) { return store[key] ?? null; },
    async set(key, value) { store[key] = value; },
    async remove(key) { delete store[key]; },
  };
}

// ─── Setup ────────────────────────────────────────────────

let adapter: ReturnType<typeof createMemoryAdapter>;
let queue: OfflineQueue;

beforeEach(() => {
  adapter = createMemoryAdapter();
  queue = new OfflineQueue(adapter);
  _resetIdCounter();
});

// ─── Enqueue ──────────────────────────────────────────────

describe("offlineQueue (enqueue)", () => {
  it("enqueue adds item with QUEUED status", async () => {
    const item = await queue.enqueue("t1", "/sathi/tasks/t1/complete", { a: 1 });
    expect(item.status).toBe("QUEUED");
    expect(item.taskId).toBe("t1");
    expect(item.endpoint).toBe("/sathi/tasks/t1/complete");
    expect(item.retryCount).toBe(0);
  });

  it("enqueue persists to storage", async () => {
    await queue.enqueue("t1", "/api/test", { x: 1 });
    const loaded = await queue.load();
    expect(loaded).toHaveLength(1);
  });

  it("enqueue assigns unique id", async () => {
    const a = await queue.enqueue("t1", "/a", {});
    const b = await queue.enqueue("t2", "/b", {});
    expect(a.id).not.toBe(b.id);
  });

  it("multiple enqueues maintain FIFO order", async () => {
    await queue.enqueue("t1", "/first", {});
    await queue.enqueue("t2", "/second", {});
    await queue.enqueue("t3", "/third", {});

    const items = await queue.load();
    expect(items).toHaveLength(3);
    expect(items[0].endpoint).toBe("/first");
    expect(items[1].endpoint).toBe("/second");
    expect(items[2].endpoint).toBe("/third");
  });
});

// ─── Pending / badge ──────────────────────────────────────

describe("offlineQueue (pending/badge)", () => {
  it("pendingCount counts QUEUED + FAILED items", async () => {
    await queue.enqueue("t1", "/a", {});
    await queue.enqueue("t2", "/b", {});

    // Mark one as DONE manually
    const items = await queue.load();
    items[0].status = "DONE";
    await queue.save(items);

    expect(await queue.pendingCount()).toBe(1);
  });

  it("hasRetryBadge true when task has FAILED item", async () => {
    await queue.enqueue("t1", "/a", {});
    const items = await queue.load();
    items[0].status = "FAILED";
    await queue.save(items);

    expect(await queue.hasRetryBadge("t1")).toBe(true);
  });

  it("hasRetryBadge true when task has DEAD item", async () => {
    await queue.enqueue("t1", "/a", {});
    const items = await queue.load();
    items[0].status = "DEAD";
    await queue.save(items);

    expect(await queue.hasRetryBadge("t1")).toBe(true);
  });

  it("hasRetryBadge false when all DONE or QUEUED", async () => {
    await queue.enqueue("t1", "/a", {});
    expect(await queue.hasRetryBadge("t1")).toBe(false); // still QUEUED

    const items = await queue.load();
    items[0].status = "DONE";
    await queue.save(items);
    expect(await queue.hasRetryBadge("t1")).toBe(false);
  });
});

// ─── Replay ───────────────────────────────────────────────

describe("offlineQueue (replay)", () => {
  it("replay uploads in FIFO order", async () => {
    await queue.enqueue("t1", "/first", { n: 1 });
    await queue.enqueue("t2", "/second", { n: 2 });

    const callOrder: string[] = [];
    const uploadFn: UploadFn = async (endpoint) => { callOrder.push(endpoint); };

    await queue.replay(uploadFn);
    expect(callOrder).toEqual(["/first", "/second"]);
  });

  it("replay marks successful items as DONE", async () => {
    await queue.enqueue("t1", "/a", {});
    const uploadFn: UploadFn = async () => {};

    await queue.replay(uploadFn);
    const items = await queue.load();
    expect(items[0].status).toBe("DONE");
  });

  it("replay increments retryCount on failure", async () => {
    await queue.enqueue("t1", "/a", {});
    const uploadFn: UploadFn = async () => { throw new Error("5xx"); };

    await queue.replay(uploadFn);
    const items = await queue.load();
    expect(items[0].retryCount).toBe(1);
  });

  it("replay stops on first failure (order preserved)", async () => {
    await queue.enqueue("t1", "/first", {});
    await queue.enqueue("t2", "/second", {});

    let callCount = 0;
    const uploadFn: UploadFn = async () => {
      callCount++;
      if (callCount === 1) throw new Error("fail");
    };

    const result = await queue.replay(uploadFn);
    expect(callCount).toBe(1);
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);

    const items = await queue.load();
    expect(items[1].status).toBe("QUEUED"); // untouched
  });

  it("replay returns correct counts", async () => {
    await queue.enqueue("t1", "/a", {});
    await queue.enqueue("t2", "/b", {});

    const uploadFn: UploadFn = async () => {};
    const result = await queue.replay(uploadFn);

    expect(result.processed).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("replay retries FAILED items on second pass", async () => {
    await queue.enqueue("t1", "/a", {});

    // First pass: fail
    let shouldFail = true;
    const uploadFn: UploadFn = async () => {
      if (shouldFail) throw new Error("fail");
    };

    await queue.replay(uploadFn);
    let items = await queue.load();
    expect(items[0].status).toBe("FAILED");
    expect(items[0].retryCount).toBe(1);

    // Second pass: succeed (set now past backoff window)
    shouldFail = false;
    const futureNow = Date.now() + 60000; // well past any backoff
    await queue.replay(uploadFn, futureNow);

    items = await queue.load();
    expect(items[0].status).toBe("DONE");
  });
});

// ─── Exponential backoff ──────────────────────────────────

describe("offlineQueue (exponential backoff)", () => {
  it("calcBackoff returns 1s for retry 1", () => {
    expect(calcBackoff(1)).toBe(BASE_BACKOFF_MS); // 1000
  });

  it("calcBackoff returns 2s, 4s, 8s, 16s for retries 2-5", () => {
    expect(calcBackoff(2)).toBe(2000);
    expect(calcBackoff(3)).toBe(4000);
    expect(calcBackoff(4)).toBe(8000);
    expect(calcBackoff(5)).toBe(16000);
  });

  it("calcBackoff caps at MAX_BACKOFF_MS", () => {
    expect(calcBackoff(10)).toBe(MAX_BACKOFF_MS);
    expect(calcBackoff(20)).toBe(MAX_BACKOFF_MS);
  });

  it("replay skips items still in backoff window", async () => {
    await queue.enqueue("t1", "/a", {});

    // Fail once to set backoff
    const failFn: UploadFn = async () => { throw new Error("fail"); };
    const now = Date.now();
    await queue.replay(failFn, now);

    // Item is FAILED with nextRetryAfter = now + 1000
    let items = await queue.load();
    expect(items[0].status).toBe("FAILED");
    expect(items[0].nextRetryAfter).toBe(now + BASE_BACKOFF_MS);

    // Try replay immediately (still in backoff) — should skip
    let callCount = 0;
    const countFn: UploadFn = async () => { callCount++; };
    await queue.replay(countFn, now + 500); // 500ms into 1000ms backoff

    expect(callCount).toBe(0);
    items = await queue.load();
    expect(items[0].status).toBe("FAILED"); // unchanged
  });

  it("replay processes items past backoff window", async () => {
    await queue.enqueue("t1", "/a", {});

    const failFn: UploadFn = async () => { throw new Error("fail"); };
    const now = Date.now();
    await queue.replay(failFn, now);

    // Replay after backoff expires
    const successFn: UploadFn = async () => {};
    await queue.replay(successFn, now + BASE_BACKOFF_MS + 1);

    const items = await queue.load();
    expect(items[0].status).toBe("DONE");
  });
});

// ─── DEAD (MAX_RETRIES) ──────────────────────────────────

describe("offlineQueue (DEAD)", () => {
  it("item reaching MAX_RETRIES is marked DEAD", async () => {
    await queue.enqueue("t1", "/a", {});
    const failFn: UploadFn = async () => { throw new Error("fail"); };

    let now = Date.now();
    for (let i = 0; i < MAX_RETRIES; i++) {
      now += 60000; // jump past any backoff
      await queue.replay(failFn, now);
    }

    const items = await queue.load();
    expect(items[0].retryCount).toBe(MAX_RETRIES);
    expect(items[0].status).toBe("DEAD");
  });

  it("DEAD items are not retried", async () => {
    await queue.enqueue("t1", "/a", {});

    // Force to DEAD
    const items = await queue.load();
    items[0].status = "DEAD";
    items[0].retryCount = MAX_RETRIES;
    await queue.save(items);

    let callCount = 0;
    const countFn: UploadFn = async () => { callCount++; };
    await queue.replay(countFn);

    expect(callCount).toBe(0);
  });
});

// ─── Housekeeping ─────────────────────────────────────────

describe("offlineQueue (housekeeping)", () => {
  it("pruneCompleted removes DONE items", async () => {
    await queue.enqueue("t1", "/a", {});
    await queue.enqueue("t2", "/b", {});

    const items = await queue.load();
    items[0].status = "DONE";
    await queue.save(items);

    const removed = await queue.pruneCompleted();
    expect(removed).toBe(1);

    const remaining = await queue.load();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].taskId).toBe("t2");
  });

  it("clear removes everything", async () => {
    await queue.enqueue("t1", "/a", {});
    await queue.enqueue("t2", "/b", {});

    await queue.clear();
    const items = await queue.load();
    expect(items).toEqual([]);
  });
});

// ─── Full scenario: offline → queue → reconnect → replay ──

describe("offlineQueue (full scenario)", () => {
  it("offline submit → queued → reconnect replay → DONE", async () => {
    // 1. Offline: submit is queued
    const item = await queue.enqueue("t1", "/sathi/tasks/t1/complete", {
      answers: { f1: "Rice" },
    });
    expect(item.status).toBe("QUEUED");
    expect(await queue.pendingCount()).toBe(1);

    // 2. Reconnect: replay succeeds
    const uploadFn: UploadFn = async () => {};
    const result = await queue.replay(uploadFn);
    expect(result.succeeded).toBe(1);

    // 3. Item is DONE
    const items = await queue.load();
    expect(items[0].status).toBe("DONE");
    expect(await queue.pendingCount()).toBe(0);
    expect(await queue.hasRetryBadge("t1")).toBe(false);
  });

  it("server 5xx → FAILED → hasRetryBadge true → backoff retry", async () => {
    // 1. Enqueue
    await queue.enqueue("t1", "/sathi/tasks/t1/complete", {});

    // 2. Server returns 5xx
    const failFn: UploadFn = async () => { throw new Error("500 Internal Server Error"); };
    const now = Date.now();
    await queue.replay(failFn, now);

    // 3. FAILED with retry badge
    let items = await queue.load();
    expect(items[0].status).toBe("FAILED");
    expect(items[0].retryCount).toBe(1);
    expect(await queue.hasRetryBadge("t1")).toBe(true);

    // 4. After backoff, retry succeeds
    const successFn: UploadFn = async () => {};
    await queue.replay(successFn, now + BASE_BACKOFF_MS + 1);

    items = await queue.load();
    expect(items[0].status).toBe("DONE");
    expect(await queue.hasRetryBadge("t1")).toBe(false);
  });
});
