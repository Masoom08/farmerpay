/**
 * no-score-imports — ESLint rule for the Sathi privacy firewall (G1 — Spec §5.6).
 *
 * The Sathi dashboard must NEVER import score-adjacent components.
 * A Sathi should never see, infer, or display a farmer's TRUST score.
 *
 * This rule blocks:
 *   1. Imports from paths containing score-adjacent substrings
 *   2. Imports of specific banned component/module names
 *
 * Blocked path substrings:
 *   - "trust/Score"        (ScoreRing, ScoreHero, etc.)
 *   - "trust/Band"         (BandBadge, etc.)
 *   - "trust/Gap"          (GapCard, GapList)
 *   - "trust/HelpSheet"    (score explainer)
 *   - "MyScore"            (farmer score screen)
 *   - "scoreStore"         (score state)
 *   - "ScoreRing"
 *   - "ScoreHero"
 *   - "BandBadge"
 *   - "GapCard"
 *   - "GapList"
 *
 * If a developer tries to import any of these, the lint rule fires with
 * a clear message about the privacy firewall.
 */

import type { Rule } from "eslint";

const BLOCKED_SUBSTRINGS = [
  "trust/Score",
  "trust/Band",
  "trust/Gap",
  "trust/HelpSheet",
  "MyScore",
  "scoreStore",
  "ScoreRing",
  "ScoreHero",
  "BandBadge",
  "GapCard",
  "GapList",
];

const MESSAGE =
  "Privacy firewall: Sathi bundle must NOT import score-adjacent components (§5.6). " +
  "A Sathi should never see or infer a farmer's TRUST score.";

function isBlocked(source: string): boolean {
  return BLOCKED_SUBSTRINGS.some((sub) => source.includes(sub));
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing score-adjacent components in the Sathi dashboard",
    },
    messages: {
      blocked: MESSAGE,
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source === "string" && isBlocked(source)) {
          context.report({ node, messageId: "blocked" });
        }
      },
      // Also catch dynamic imports: import("@/components/trust/ScoreRing")
      ImportExpression(node) {
        if (
          node.source &&
          node.source.type === "Literal" &&
          typeof node.source.value === "string" &&
          isBlocked(node.source.value)
        ) {
          context.report({ node, messageId: "blocked" });
        }
      },
      // Also catch require() calls
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length > 0 &&
          node.arguments[0].type === "Literal" &&
          typeof node.arguments[0].value === "string" &&
          isBlocked(node.arguments[0].value)
        ) {
          context.report({ node, messageId: "blocked" });
        }
      },
    };
  },
};

export default rule;
export { BLOCKED_SUBSTRINGS, MESSAGE };
