/**
 * Readiness Shadow Logger — Sathi Dashboard
 *
 * Wraps readiness API response objects in a Proxy that records every
 * property access. Batches entries and flushes to POST /readiness/telemetry
 * every 10 seconds (or on page unload).
 *
 * Lifecycle:
 *   1. Enable: set FEATURE_READINESS_SATHI_SHADOW_LOG=true on the backend
 *   2. The /readiness/flags endpoint returns { sathiShadowLog: true }
 *   3. readiness.ts checks the flag and wraps responses via instrumentReadiness()
 *   4. Run for ~1 week, then query logs for FHS_ACCESS_DETECTED warnings
 *   5. If zero FHS accesses: safe to delete FHS code paths from the Sathi bundle
 *   6. Disable flag + remove this file
 */

import { apiPost } from "./api";

// ─── Buffer ──────────────────────────────────────────────────────────

interface TelemetryEntry {
  field: string;
  path: string;
  source: string;
  ts: number;
}

let buffer: TelemetryEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let _token: string | null = null;

const FLUSH_INTERVAL_MS = 10_000;
const MAX_BUFFER_SIZE = 200;

function flush() {
  if (buffer.length === 0) return;
  const entries = buffer.splice(0, MAX_BUFFER_SIZE);
  const token = _token || localStorage.getItem("sathi_token") || "";

  // Fire-and-forget — don't block UI
  apiPost("/readiness/telemetry", { entries }, token).catch(() => {
    // Silently drop — telemetry is best-effort
  });
}

function ensureFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

  // Flush on page unload
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", flush);
  }
}

function record(field: string, path: string, source: string) {
  buffer.push({ field, path, source, ts: Date.now() });
  if (buffer.length >= MAX_BUFFER_SIZE) flush();
}

// ─── Proxy wrapper ──────────────────────────────────────────────────

/**
 * Recursively wrap an object so every property read is logged.
 * Handles nested objects (e.g., data.trust.band logs "trust" then "trust.band").
 */
function createTrackedProxy<T extends object>(
  obj: T,
  parentPath: string,
  source: string,
): T {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Skip internal/symbol props and common non-data props
      if (typeof prop === "symbol") return value;
      const propStr = String(prop);

      // Skip array iteration internals & JSON serialization
      if (["toJSON", "then", "length", "constructor", "$$typeof"].includes(propStr)) return value;
      if (/^\d+$/.test(propStr) && Array.isArray(target)) return value;

      const fullPath = parentPath ? `${parentPath}.${propStr}` : propStr;
      record(propStr, fullPath, source);

      // Recursively proxy nested objects
      if (value != null && typeof value === "object" && !Array.isArray(value)) {
        return createTrackedProxy(value, fullPath, source);
      }

      return value;
    },
  });
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Wrap a readiness API response in a tracking Proxy.
 * Call this only when the sathiShadowLog flag is on.
 *
 * @param data - The raw readiness API response object
 * @param source - Label for where the data is consumed (e.g., "farmers-list", "farmer-detail")
 * @param token - Auth token for flush requests
 */
export function instrumentReadiness<T extends object>(
  data: T,
  source: string,
  token?: string,
): T {
  if (token) _token = token;
  ensureFlushTimer();
  return createTrackedProxy(data, "", source);
}

/**
 * Force-flush any buffered telemetry. Call on component unmount if needed.
 */
export function flushTelemetry(): void {
  flush();
}

/**
 * Stop the flush timer and clear the buffer. For testing/cleanup.
 */
export function stopShadowLog(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  buffer = [];
}
