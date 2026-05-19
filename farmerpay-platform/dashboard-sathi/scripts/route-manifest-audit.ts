#!/usr/bin/env tsx
/**
 * route-manifest-audit — CI script for Sathi dashboard (G1 — Spec §5.6).
 *
 * Walks `src/app/**\/page.tsx` and fails if any route segment is forbidden.
 * Forbidden segments: /score, /trust-score, /my-score, /band
 *
 * Usage:
 *   npx tsx scripts/route-manifest-audit.ts
 *
 * Exit code 0 = clean, 1 = forbidden routes found.
 */

import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.resolve(__dirname, "../src/app");

const FORBIDDEN_SEGMENTS = ["/score", "/trust-score", "/my-score", "/band"];

export interface Violation {
  route: string;
  file: string;
  segment: string;
}

/**
 * Recursively find all page.tsx files under a directory.
 */
function findPages(dir: string, pages: string[] = []): string[] {
  if (!fs.existsSync(dir)) return pages;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findPages(full, pages);
    } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
      pages.push(full);
    }
  }
  return pages;
}

/**
 * Convert a file path to a Next.js route.
 * e.g., src/app/dashboard/queue/page.tsx -> /dashboard/queue
 */
function fileToRoute(filePath: string, appDir: string): string {
  const rel = path.relative(appDir, filePath);
  const dir = path.dirname(rel);
  if (dir === ".") return "/";
  return "/" + dir.split(path.sep).join("/");
}

/**
 * Check if a route contains any forbidden segment.
 */
function checkRoute(route: string): string | null {
  const segments = route.split("/").filter(Boolean);
  for (const seg of segments) {
    const asSegment = "/" + seg;
    if (FORBIDDEN_SEGMENTS.includes(asSegment)) {
      return asSegment;
    }
  }
  return null;
}

/**
 * Run the audit. Returns violations array.
 */
export function audit(appDir: string = APP_DIR): Violation[] {
  const pages = findPages(appDir);
  const violations: Violation[] = [];

  for (const filePath of pages) {
    const route = fileToRoute(filePath, appDir);
    const forbidden = checkRoute(route);
    if (forbidden) {
      violations.push({
        route,
        file: path.relative(path.resolve(appDir, ".."), filePath),
        segment: forbidden,
      });
    }
  }

  return violations;
}

// -- CLI entry point --

if (require.main === module) {
  const violations = audit();

  if (violations.length === 0) {
    console.log("Route manifest audit passed — no forbidden segments found.");
    process.exit(0);
  }

  console.error("Route manifest audit FAILED — forbidden segments detected:\n");
  for (const v of violations) {
    console.error("  " + v.route + "  (segment: " + v.segment + ")  ->  " + v.file);
  }
  console.error(
    "\n" + violations.length + " violation(s). Sathi dashboard must NOT have score-related routes (S5.6).",
  );
  process.exit(1);
}
