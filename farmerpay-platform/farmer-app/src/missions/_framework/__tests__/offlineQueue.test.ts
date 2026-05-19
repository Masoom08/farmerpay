/**
 * offlineQueue — Unit Tests (F6 — Spec §4.5)
 *
 * Tests:
 *   ENQUEUE
 *   1.  enqueue adds item with QUEUED status
 *   2.  enqueue persists to AsyncStorage
 *   3.  enqueue assigns unique id
 *   4.  multiple enqueues maintain FIFO order
 *
 *   LOAD / COUNT
 *   5.  loadQueue returns empty array when nothing stored
 *   6.  pendingCount counts QUEUED + FAILED items
 *   7.  getItemsForMission filters by missionId
 *
 *   PROCESS QUEUE
 *   8.  processQueue uploads in FIFO order
 *   9.  processQueue marks successful items as DONE
 *  10.  processQueue increments retryCount on failure
 *  11.  processQueue stops on first failure (order preserved)
 *  12.  processQueue returns correct counts
 *  13.  processQueue retries FAILED items
 *  14.  Item exceeding MAX_RETRIES stays FAILED
 *
 *   HOUSEKEEPING
 *  15.  pruneCompleted removes DONE items
 *  16.  clearQueue removes everything
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  enqueue,
  loadQueue,
  saveQueue,
  pendingCount,
  getItemsForMission,
  processQueue,
  pruneCompleted,
  clearQueue,
  MAX_RETRIES,
  QUEUE_STORAGE_KEY,
  type QueueItem,
  type UploadFn,
} from "../offlineQueue";

// ─── Mock ──────────────────────────────────────────────────────

jest.mock("@react-native-async-storage/async-storage", () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    __clear: () => { store = {}; },
  };
});

const clearStore = () => (AsyncStorage as any).__clear();

// ─── Enqueue ───────────────────────────────────────────────────

describe("offlineQueue (enqueue)", () => {
  beforeEach(() => {
    clearStore();
    jest.clearAllMocks();
  });

  it("enqueue adds item with QUEUED status", async () => {
    const item = await enqueue("aa-f1", "/trust/recompute", { id: 1 });
    expect(item.status).toBe("QUEUED");
    expect(item.missionId).toBe("aa-f1");
    expect(item.endpoint).toBe("/trust/recompute");
  });

  it("enqueue persists to AsyncStorage", async () => {
    await enqueue("aa-f1", "/api/test", { x: 1 });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      QUEUE_STORAGE_KEY,
      expect.any(String),
    );
    const queue = await loadQueue();
    expect(queue).toHaveLength(1);
  });

  it("enqueue assigns unique id", async () => {
    const a = await enqueue("m1", "/a", {});
    const b = await enqueue("m2", "/b", {});
    expect(a.id).not.toBe(b.id);
  });

  it("multiple enqueues maintain FIFO order", async () => {
    await enqueue("m1", "/first", {});
    await enqueue("m2", "/second", {});
    await enqueue("m3", "/third", {});

    const queue = await loadQueue();
    expect(queue).toHaveLength(3);
    expect(queue[0].endpoint).toBe("/first");
    expect(queue[1].endpoint).toBe("/second");
    expect(queue[2].endpoint).toBe("/third");
  });
});

// ─── Load / Count ──────────────────────────────────────────────

describe("offlineQueue (load/count)", () => {
  beforeEach(() => {
    clearStore();
    jest.clearAllMocks();
  });

  it("loadQueue returns empty array when nothing stored", async () => {
    const queue = await loadQueue();
    expect(queue).toEqual([]);
  });

  it("pendingCount counts QUEUED + FAILED items", async () => {
    await enqueue("m1", "/a", {});
    await enqueue("m2", "/b", {});

    // Manually mark one as DONE
    const queue = await loadQueue();
    queue[0].status = "DONE";
    await saveQueue(queue);

    const count = await pendingCount();
    expect(count).toBe(1);
  });

  it("getItemsForMission filters by missionId", async () => {
    await enqueue("aa-f1", "/a", {});
    await enqueue("pmfby-f1", "/b", {});
    await enqueue("aa-f1", "/c", {});

    const items = await getItemsForMission("aa-f1");
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.missionId === "aa-f1")).toBe(true);
  });
});

// ─── Process queue ─────────────────────────────────────────────

describe("offlineQueue (processQueue)", () => {
  beforeEach(() => {
    clearStore();
    jest.clearAllMocks();
  });

  it("processQueue uploads in FIFO order", async () => {
    await enqueue("m1", "/first", { n: 1 });
    await enqueue("m2", "/second", { n: 2 });

    const callOrder: string[] = [];
    const uploadFn: UploadFn = async (endpoint) => {
      callOrder.push(endpoint);
    };

    await processQueue(uploadFn);
    expect(callOrder).toEqual(["/first", "/second"]);
  });

  it("processQueue marks successful items as DONE", async () => {
    await enqueue("m1", "/a", {});
    const uploadFn: UploadFn = async () => {};

    await processQueue(uploadFn);

    const queue = await loadQueue();
    expect(queue[0].status).toBe("DONE");
  });

  it("processQueue increments retryCount on failure", async () => {
    await enqueue("m1", "/a", {});
    const uploadFn: UploadFn = async () => {
      throw new Error("network");
    };

    await processQueue(uploadFn);

    const queue = await loadQueue();
    expect(queue[0].retryCount).toBe(1);
  });

  it("processQueue stops on first failure (order preserved)", async () => {
    await enqueue("m1", "/first", {});
    await enqueue("m2", "/second", {});

    let callCount = 0;
    const uploadFn: UploadFn = async () => {
      callCount++;
      if (callCount === 1) throw new Error("fail");
    };

    const result = await processQueue(uploadFn);

    expect(callCount).toBe(1); // Only first item attempted
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);

    // Second item still QUEUED
    const queue = await loadQueue();
    expect(queue[1].status).toBe("QUEUED");
  });

  it("processQueue returns correct counts", async () => {
    await enqueue("m1", "/a", {});
    await enqueue("m2", "/b", {});

    const uploadFn: UploadFn = async () => {};
    const result = await processQueue(uploadFn);

    expect(result.processed).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("processQueue retries FAILED items", async () => {
    await enqueue("m1", "/a", {});

    // First pass: fail
    let shouldFail = true;
    const uploadFn: UploadFn = async () => {
      if (shouldFail) throw new Error("fail");
    };

    await processQueue(uploadFn);
    let queue = await loadQueue();
    expect(queue[0].status).toBe("QUEUED"); // retryCount < MAX
    expect(queue[0].retryCount).toBe(1);

    // Second pass: succeed
    shouldFail = false;
    await processQueue(uploadFn);

    queue = await loadQueue();
    expect(queue[0].status).toBe("DONE");
  });

  it("item exceeding MAX_RETRIES stays FAILED", async () => {
    await enqueue("m1", "/a", {});

    const uploadFn: UploadFn = async () => {
      throw new Error("fail");
    };

    // Fail MAX_RETRIES times
    for (let i = 0; i < MAX_RETRIES; i++) {
      await processQueue(uploadFn);
    }

    const queue = await loadQueue();
    expect(queue[0].retryCount).toBe(MAX_RETRIES);
    expect(queue[0].status).toBe("FAILED");

    // One more attempt — should not process (status is FAILED and retryCount >= MAX)
    // Actually our logic re-processes FAILED items, but they get set to FAILED again
    // since retryCount will exceed MAX_RETRIES
    await processQueue(uploadFn);
    const queue2 = await loadQueue();
    expect(queue2[0].status).toBe("FAILED");
  });
});

// ─── Housekeeping ──────────────────────────────────────────────

describe("offlineQueue (housekeeping)", () => {
  beforeEach(() => {
    clearStore();
    jest.clearAllMocks();
  });

  it("pruneCompleted removes DONE items", async () => {
    await enqueue("m1", "/a", {});
    await enqueue("m2", "/b", {});

    // Mark first as DONE
    const queue = await loadQueue();
    queue[0].status = "DONE";
    await saveQueue(queue);

    const removed = await pruneCompleted();
    expect(removed).toBe(1);

    const remaining = await loadQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].missionId).toBe("m2");
  });

  it("clearQueue removes everything", async () => {
    await enqueue("m1", "/a", {});
    await enqueue("m2", "/b", {});

    await clearQueue();

    const queue = await loadQueue();
    expect(queue).toEqual([]);
  });
});
