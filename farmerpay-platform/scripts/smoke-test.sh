#!/usr/bin/env bash
# Post-deploy smoke test for FarmerPay backend.
# Runs against a deployed environment (staging or prod) to verify the
# security patches from the April 2026 audit are live, migrations
# applied, and critical endpoints behave as expected.
#
# Usage:
#   STAGING_URL=https://staging.farmerpay.in ./scripts/smoke-test.sh
#
# Exit codes:
#   0  all checks passed
#   1  at least one check failed
#
# This script only needs `curl` and `jq`. No dependency on the repo's
# node_modules so it runs on a minimal jump box.

set -u
set -o pipefail

URL="${STAGING_URL:-${PROD_URL:-http://localhost:3000}}"
API="${URL}/api/v1"

pass=0
fail=0

echo "=== FarmerPay smoke test against ${URL} ==="
echo

check() {
  local label="$1"
  local got="$2"
  local want="$3"
  if [[ "$got" == "$want" ]]; then
    echo "  ✅ ${label}"
    pass=$((pass + 1))
  else
    echo "  ❌ ${label}"
    echo "     expected: ${want}"
    echo "     got:      ${got}"
    fail=$((fail + 1))
  fi
}

# ─── 1. Health ────────────────────────────────────────────────
echo "1. Health endpoint"
STATUS=$(curl -sS -o /tmp/fp-health.json -w "%{http_code}" "${URL}/health" || echo 000)
check "health returns 200" "$STATUS" "200"
if [[ "$STATUS" == "200" ]]; then
  SERVICE=$(jq -r '.data.service // empty' /tmp/fp-health.json)
  check "health payload names the service" "${SERVICE:+set}" "set"
fi
echo

# ─── 2. Security headers (HSTS + frame guard) ─────────────────
echo "2. Security headers (AUTH-L18)"
HEADERS=$(curl -sSI "${URL}/health")
HSTS=$(echo "$HEADERS" | grep -i '^strict-transport-security' | head -1 || true)
FRAME=$(echo "$HEADERS" | grep -i '^x-frame-options' | head -1 || true)
NOSNIFF=$(echo "$HEADERS" | grep -i '^x-content-type-options' | head -1 || true)
check "HSTS header present" "${HSTS:+set}" "set"
check "X-Frame-Options present (deny)" "${FRAME:+set}" "set"
check "X-Content-Type-Options: nosniff present" "${NOSNIFF:+set}" "set"
echo

# ─── 3. Register endpoint — decoy behavior (AUTH-C3) ──────────
echo "3. Register decoy (AUTH-C3)"
# Registering an obviously-made-up mobile twice must return 201 both
# times — the decoy behavior in security PR #2. Pre-fix it returned
# 409 on the second call and leaked enrollment state.
MOBILE="9000$(date +%s | tail -c 7)"
R1=$(curl -sS -X POST "${API}/auth/register" \
  -H 'content-type: application/json' \
  -d "{\"firstName\":\"Smoke\",\"mobile\":\"${MOBILE}\"}" -w "\n%{http_code}" || true)
CODE1=$(echo "$R1" | tail -1)
R2=$(curl -sS -X POST "${API}/auth/register" \
  -H 'content-type: application/json' \
  -d "{\"firstName\":\"Smoke\",\"mobile\":\"${MOBILE}\"}" -w "\n%{http_code}" || true)
CODE2=$(echo "$R2" | tail -1)
check "first register 201" "$CODE1" "201"
check "duplicate register still 201 (decoy)" "$CODE2" "201"
echo

# ─── 4. Finacle webhook rejects without HMAC (BANK-C1) ────────
echo "4. Finacle webhook HMAC gate (BANK-C1)"
W=$(curl -sS -X POST "${API/\/api\/v1/}/bank/webhooks/finacle" \
  -H 'content-type: application/json' \
  -H 'x-finacle-event-type: loan_closed' \
  -d '{"accountNumber":"test","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' \
  -w "\n%{http_code}" || true)
WCODE=$(echo "$W" | tail -1)
# 401 = signature missing/invalid (correct).
# 503 = FINACLE_WEBHOOK_SECRET not set — deploy problem (env var missing).
if [[ "$WCODE" == "401" ]]; then
  echo "  ✅ webhook rejects unsigned payload (401)"
  pass=$((pass + 1))
elif [[ "$WCODE" == "503" ]]; then
  echo "  ❌ webhook returns 503 — FINACLE_WEBHOOK_SECRET not set in this env"
  fail=$((fail + 1))
else
  echo "  ❌ webhook returned unexpected code ${WCODE} (want 401)"
  fail=$((fail + 1))
fi
echo

# ─── 5. Rate limit on /auth/me (AUTH-L20) ─────────────────────
# Can't easily verify without a valid JWT — skip here, flag to manual.
echo "5. (skipped) Rate limit on /auth/me — needs auth; verify manually"
echo

# ─── 6. Unauthed banker endpoint returns 401 ──────────────────
echo "6. Banker portfolio requires auth"
BCODE=$(curl -sS -o /dev/null -w "%{http_code}" "${API}/bank/loan-accounts" || echo 000)
check "GET /bank/loan-accounts without token → 401" "$BCODE" "401"
echo

# ─── Summary ──────────────────────────────────────────────────
echo "=== Summary ==="
echo "  passed: ${pass}"
echo "  failed: ${fail}"
echo
if [[ "$fail" == "0" ]]; then
  echo "✅ Smoke test passed. Cleared for manual QA."
  exit 0
else
  echo "❌ Smoke test failed. Do NOT cut to prod."
  exit 1
fi
