import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noScoreImports from "./eslint-rules/no-score-imports.ts";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // ── Privacy firewall (§5.6) ──────────────────────────
  {
    plugins: {
      "sathi-firewall": {
        rules: {
          "no-score-imports": noScoreImports,
        },
      },
    },
    rules: {
      "sathi-firewall/no-score-imports": "error",
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Don't lint the rule itself or test fixtures
    "eslint-rules/**",
    "__tests__/fixtures/**",
  ]),
]);

export default eslintConfig;
