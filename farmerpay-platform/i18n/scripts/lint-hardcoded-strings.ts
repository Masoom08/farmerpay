/**
 * Hardcoded-string linter for TRUST v2
 *
 * Walks apps/ TSX files and flags JSX text nodes that contain 2+ consecutive
 * word characters outside a t(...) call.
 *
 * Allow-list:
 * - tokens/ directories
 * - test files (*.test.tsx, *.spec.tsx)
 * - stories (*.stories.tsx)
 * - __tests__/ directories
 * - __mocks__/ directories
 *
 * Usage:
 *   ts-node scripts/lint-hardcoded-strings.ts [--fix-dry-run]
 *
 * Exit code 1 if violations found.
 */

import * as fs from 'fs';
import * as path from 'path';

const PLATFORM_ROOT = path.resolve(__dirname, '..', '..');

// Directories to scan
const SCAN_DIRS = [
  path.join(PLATFORM_ROOT, 'dashboard', 'src'),
  path.join(PLATFORM_ROOT, 'dashboard-sathi', 'src'),
  path.join(PLATFORM_ROOT, 'dashboard-farmer', 'src'),
  path.join(PLATFORM_ROOT, 'farmer-app', 'src'),
];

// Skip patterns
const SKIP_PATTERNS = [
  /[\\/]tokens[\\/]/,
  /[\\/]__tests__[\\/]/,
  /[\\/]__mocks__[\\/]/,
  /\.test\.tsx?$/,
  /\.spec\.tsx?$/,
  /\.stories\.tsx?$/,
  /[\\/]node_modules[\\/]/,
  /[\\/]theme[\\/]/,
];

interface Violation {
  file: string;
  line: number;
  text: string;
}

function shouldSkip(filePath: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(filePath));
}

function collectTsxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      files.push(...collectTsxFiles(full));
    } else if (entry.isFile() && /\.tsx$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Detect hardcoded strings in JSX context.
 *
 * Heuristic: lines that contain JSX-like context (inside tags) with
 * literal text containing 2+ consecutive word characters that are NOT
 * inside a {t("...")} or {t('...')} call.
 *
 * This is intentionally simple — not a full AST parse, but catches
 * the most common cases of forgotten translations.
 */
function lintFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments, imports, type definitions
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('import ') ||
      trimmed.startsWith('export type') ||
      trimmed.startsWith('type ') ||
      trimmed.startsWith('interface ')
    ) {
      continue;
    }

    // Match text between > and < (JSX text nodes)
    // e.g. <p>Hello world</p> → "Hello world"
    const jsxTextMatches = line.matchAll(/>([^<>{]+)</g);
    for (const match of jsxTextMatches) {
      const text = match[1].trim();
      // Has 2+ consecutive word chars (actual text, not just whitespace/symbols)
      if (/\w{2,}/.test(text)) {
        // Exclude single-word technical tokens (className-like strings)
        // and very short strings that are likely enum values
        if (text.length > 3) {
          violations.push({
            file: path.relative(PLATFORM_ROOT, filePath),
            line: i + 1,
            text: text.substring(0, 60),
          });
        }
      }
    }
  }

  return violations;
}

function main(): void {
  const allFiles: string[] = [];
  for (const dir of SCAN_DIRS) {
    allFiles.push(...collectTsxFiles(dir));
  }

  const filesToLint = allFiles.filter((f) => !shouldSkip(f));

  const allViolations: Violation[] = [];
  for (const file of filesToLint) {
    allViolations.push(...lintFile(file));
  }

  if (allViolations.length > 0) {
    console.error(
      `\n❌ Found ${allViolations.length} potential hardcoded string(s):\n`,
    );
    for (const v of allViolations) {
      console.error(`  ${v.file}:${v.line}  "${v.text}"`);
    }
    console.error(
      '\nReplace with t("key") calls using @farmerpay/i18n translation keys.\n',
    );
    process.exit(1);
  } else {
    console.log('✅ No hardcoded strings found in scanned files.');
    process.exit(0);
  }
}

// Export for testing
export { collectTsxFiles, lintFile, shouldSkip };

// Run if executed directly
if (require.main === module) {
  main();
}
