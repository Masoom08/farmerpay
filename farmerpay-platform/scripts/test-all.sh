#!/usr/bin/env bash
#
# Run tests across all FarmerPay apps.
# Usage: ./scripts/test-all.sh
#
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

run_tests() {
  local dir="$1"
  local name="$2"
  echo ""
  echo "━━━ Testing $name ━━━"
  if cd "$ROOT/$dir" && npm test -- --ci --forceExit 2>&1; then
    echo "✅ $name passed"
  else
    echo "❌ $name failed"
    FAILED=1
  fi
}

run_tests "dashboard" "Dashboard (Banker)"
run_tests "dashboard-sathi" "Dashboard (Sathi)"
run_tests "dashboard-farmer" "Dashboard (Farmer)"
run_tests "farmer-app" "Farmer App"
run_tests "i18n" "i18n"

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "✅ All test suites passed"
else
  echo "❌ Some test suites failed"
  exit 1
fi
