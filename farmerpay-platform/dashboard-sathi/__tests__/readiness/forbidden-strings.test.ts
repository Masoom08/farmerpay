/**
 * Forbidden-string test — ensures FHS / Financial Health references
 * never appear in Sathi dashboard source files.
 *
 * Sathis must only see TRUST band + coaching priority.
 * This test guards against accidental re-introduction.
 */

import * as fs from "fs";
import * as path from "path";

const SRC_DIR = path.resolve(__dirname, "../../src");

const FORBIDDEN = [
  /\bfhs\b/i,
  /\bfinancialHealth\b/i,
  /\bfinancial.health\b/i,
  /\bFinancial Health\b/i,
  /\bFHS\b/,
];

// Files that are allowed to mention FHS because their purpose is to
// detect/prevent/monitor FHS leaks. Adding to this list is a
// code-review gate — any new entry should come with a one-line reason.
const ALLOWLIST_SUBSTRINGS = [
  "readinessShadowLog.ts", // shadow-logs Sathi accesses to FHS fields
];

/** Recursively collect all .ts/.tsx files under a directory */
function collectFiles(dir: string, exts = [".ts", ".tsx"]): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

describe("Sathi dashboard — no FHS references", () => {
  const files = collectFiles(SRC_DIR);

  it("should have source files to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("should contain zero FHS / Financial Health references in any source file", () => {
    const violations: { file: string; line: number; text: string }[] = [];

    for (const filePath of files) {
      if (ALLOWLIST_SUBSTRINGS.some((s) => filePath.includes(s))) continue;
      const lines = fs.readFileSync(filePath, "utf-8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of FORBIDDEN) {
          if (pattern.test(lines[i])) {
            violations.push({
              file: path.relative(SRC_DIR, filePath),
              line: i + 1,
              text: lines[i].trim(),
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} → ${v.text}`)
        .join("\n");
      // `fail()` was removed in Jest 27+. Throwing an Error produces the
      // same red-fail with a message the runner will surface.
      throw new Error(
        `Found ${violations.length} forbidden FHS reference(s) in Sathi dashboard:\n${report}`
      );
    }
  });
});
