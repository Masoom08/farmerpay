#!/usr/bin/env bash
#
# Typecheck all FarmerPay TypeScript apps.
# Usage: ./scripts/typecheck-all.sh
#
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0

typecheck() {
  local dir="$1"
  local name="$2"
  echo ""
  echo "━━━ Typechecking $name ━━━"
  if cd "$ROOT/$dir" && npx tsc --noEmit 2>&1; then
    echo "✅ $name clean"
  else
    echo "⚠️  $name has type errors"
    FAILED=1
  fi
}

typecheck "dashboard" "Dashboard (Banker)"
typecheck "dashboard-sathi" "Dashboard (Sathi)"
typecheck "dashboard-farmer" "Dashboard (Farmer)"
typecheck "farmer-app" "Farmer App"
typecheck "i18n" "i18n"

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "✅ All typechecks passed"
else
  echo "⚠️  Some apps have type errors"
  exit 1
fi
