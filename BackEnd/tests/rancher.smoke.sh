#!/usr/bin/env bash
set -euo pipefail

# Rancher MVP smoke tests
# Run with:
# chmod +x CattleCoin/BackEnd/tests/rancher.smoke.sh
# ./CattleCoin/BackEnd/tests/rancher.smoke.sh
# What this covers:
# - Listing/viewing rancher herds
# - Tracking herd status
# - Viewing rancher investment metrics
# - Creating/listing/moving herd
# - Ownership protection on herd updates

API="${API:-http://localhost:3000/api}"
DB_CONTAINER="${DB_CONTAINER:-cattlecoin-db}"
DB_USER="${DB_USER:-cattlecoin}"
DB_NAME="${DB_NAME:-cattlecoin}"

TOTAL_TESTS=0
PASSED_TESTS=0

if [[ -t 1 ]]; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_GREEN=$'\033[32m'
  C_RED=$'\033[31m'
  C_CYAN=$'\033[36m'
else
  C_RESET=""
  C_BOLD=""
  C_GREEN=""
  C_RED=""
  C_CYAN=""
fi

print_header() {
  local title="$1"
  echo
  echo "${C_CYAN}============================================================${C_RESET}"
  echo "${C_BOLD}$title${C_RESET}"
  echo "${C_CYAN}============================================================${C_RESET}"
}

print_summary() {
  echo
  echo "${C_BOLD}Summary:${C_RESET} ${PASSED_TESTS}/${TOTAL_TESTS} tests passed"
}

pretty_print_body() {
  local file="$1"
  if [[ ! -s "$file" ]]; then
    echo "    (empty response body)"
    return
  fi

  if command -v jq >/dev/null 2>&1 && jq . "$file" >/dev/null 2>&1; then
    jq . "$file" | sed 's/^/    /'
    return
  fi

  sed 's/^/    /' "$file"
}

start_test() {
  local label="$1"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo
  printf "%sTest %02d%s - %s\n" "$C_BOLD" "$TOTAL_TESTS" "$C_RESET" "$label"
}

assert_request_capture() {
  local expected_status="$1"
  local label="$2"
  local out_tmp_var="$3"
  shift 3

  start_test "$label"

  local tmp
  tmp="$(mktemp)"
  local status
  status="$(curl -sS -o "$tmp" -w "%{http_code}" "$@")"

  echo "  expected HTTP: $expected_status"
  echo "  received HTTP: $status"
  echo "  response body:"
  pretty_print_body "$tmp"

  if [[ "$status" != "$expected_status" ]]; then
    echo "  ${C_RED}FAIL${C_RESET}"
    rm -f "$tmp"
    print_summary
    exit 1
  fi

  PASSED_TESTS=$((PASSED_TESTS + 1))
  echo "  ${C_GREEN}PASS${C_RESET}"
  printf -v "$out_tmp_var" "%s" "$tmp"
}

assert_request() {
  local expected_status="$1"
  local label="$2"
  shift 2
  local tmp_path=""
  assert_request_capture "$expected_status" "$label" tmp_path "$@"
  rm -f "$tmp_path"
}

print_header "Preflight checks"

# Tests API + DB connectivity so route failures are not caused by environment issues.
assert_request "200" "Health check (API and DB reachable)" "$API/health"

# Tests that seeded data exists and gets test IDs for rancher-level scenarios.
RANCHER_ID="$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -At -c "SELECT rancher_id FROM herds ORDER BY created_at LIMIT 1;")"
OTHER_RANCHER_ID="$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -At -c "SELECT rancher_id FROM herds WHERE rancher_id <> '${RANCHER_ID}' ORDER BY created_at LIMIT 1;")"
HERD_ID="$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -At -c "SELECT herd_id FROM herds WHERE rancher_id='${RANCHER_ID}' ORDER BY created_at LIMIT 1;")"

echo "RANCHER_ID=$RANCHER_ID"
echo "OTHER_RANCHER_ID=$OTHER_RANCHER_ID"
echo "HERD_ID=$HERD_ID"

if [[ -z "$RANCHER_ID" || -z "$OTHER_RANCHER_ID" || -z "$HERD_ID" ]]; then
  echo "FAILED: missing seeded IDs (run migrations/seed first)." >&2
  exit 1
fi

print_header "Read routes (listing/viewing/tracking)"

# Tests rancher herd listing endpoint.
assert_request "200" "List rancher herds (GET /rancher/me/herds)" \
  -H "x-rancher-id: $RANCHER_ID" \
  "$API/rancher/me/herds"

# Tests rancher herd listing with status filter.
assert_request "200" "List rancher herds by status=available (GET /rancher/me/herds?status=available)" \
  -H "x-rancher-id: $RANCHER_ID" \
  "$API/rancher/me/herds?status=available"

# Tests rancher summary dashboard totals.
assert_request "200" "Rancher summary metrics (GET /rancher/me/summary)" \
  -H "x-rancher-id: $RANCHER_ID" \
  "$API/rancher/me/summary"

# Tests status board grouped by available/pending/sold.
assert_request "200" "Rancher status board (GET /rancher/me/status-board)" \
  -H "x-rancher-id: $RANCHER_ID" \
  "$API/rancher/me/status-board"

# Tests investment/tracking metrics derived from token pools + ownership.
assert_request "200" "Rancher investments view (GET /rancher/me/investments)" \
  -H "x-rancher-id: $RANCHER_ID" \
  "$API/rancher/me/investments"

# Tests global herd list filtered by rancherId (used by some frontend paths).
assert_request "200" "List herds by rancherId (GET /herds?rancherId=...)" \
  "$API/herds?rancherId=$RANCHER_ID&limit=5"

# Tests single herd details lookup.
assert_request "200" "Get herd details (GET /herds/:herdId)" \
  "$API/herds/$HERD_ID"

print_header "Write routes (create/list/move)"

# Tests creating a new herd from the Rancher UI-style payload (snake_case + step-1 fields).
CREATE_TMP=""
assert_request_capture "201" "Create herd (POST /herds, Rancher UI payload)" CREATE_TMP \
  -X POST "$API/herds" \
  -H "Content-Type: application/json" \
  -H "x-rancher-id: $RANCHER_ID" \
  -d '{"name":"Smoke Test Herd","genetics_label":"Angus x Hereford","breed_code":"AN","season":"Spring","head_count":25,"listing_price":12345,"purchase_status":"pending","verifiedFlag":false}'

NEW_HERD_ID="$(sed -n 's/.*"herd_id":"\([^"]*\)".*/\1/p' "$CREATE_TMP" | head -n1)"
rm -f "$CREATE_TMP"

if [[ -z "$NEW_HERD_ID" ]]; then
  echo "FAILED: could not parse NEW_HERD_ID from create response." >&2
  exit 1
fi

echo "NEW_HERD_ID=$NEW_HERD_ID"

# Generate unique test cow identifiers so this smoke test is re-runnable
# without requiring a DB reset between runs.
RUN_ID="$(date +%s)-$RANDOM"
COW1_REG="SMOKE-REG-${RUN_ID}-001"
COW2_REG="SMOKE-REG-${RUN_ID}-002"
BASE_SUFFIX_NUM=$(( $(date +%s) * 100 + (RANDOM % 90 + 10) ))
COW1_EID_SUFFIX="$(printf "%012d" "$BASE_SUFFIX_NUM")"
COW2_EID_SUFFIX="$(printf "%012d" "$((BASE_SUFFIX_NUM + 1))")"

CATTLE_BULK_PAYLOAD=$(
  cat <<JSON
{"cattle":[{"registration_number":"$COW1_REG","official_id_suffix":"$COW1_EID_SUFFIX","breed_code":"AN","sex_code":"C","birth_date":"2025-01-15","weight_lbs":525,"animal_name":"Smoke Cow 1"},{"registration_number":"$COW2_REG","official_id_suffix":"$COW2_EID_SUFFIX","breed_code":"AN","sex_code":"H","birth_date":"2025-01-20","weight_lbs":510,"animal_name":"Smoke Cow 2"}]}
JSON
)

# Tests bulk cattle registration (step-2 queue submit).
assert_request "201" "Register cattle in bulk (POST /herds/:herdId/cattle/bulk)" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-rancher-id: $RANCHER_ID" \
  -d "$CATTLE_BULK_PAYLOAD" \
  "$API/herds/$NEW_HERD_ID/cattle/bulk"

# Tests listing endpoint updates herd listing price and marks as available.
assert_request "200" "List herd for sale (POST /herds/:herdId/list)" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-rancher-id: $RANCHER_ID" \
  -d '{"listingPrice":22222}' \
  "$API/herds/$NEW_HERD_ID/list"

# Tests publish alias route used by step-3 language in UI.
assert_request "200" "Publish herd (POST /herds/:herdId/publish)" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-rancher-id: $RANCHER_ID" \
  -d '{}' \
  "$API/herds/$NEW_HERD_ID/publish"

# Tests moving herd status one step in workflow.
assert_request "200" "Move herd status forward (PATCH /herds/:herdId/move direction=next)" \
  -X PATCH \
  -H "Content-Type: application/json" \
  -H "x-rancher-id: $RANCHER_ID" \
  -d '{"direction":"next"}' \
  "$API/herds/$NEW_HERD_ID/move"

# Tests explicit status move to sold.
assert_request "200" "Move herd to sold explicitly (PATCH /herds/:herdId/move toStatus=sold)" \
  -X PATCH \
  -H "Content-Type: application/json" \
  -H "x-rancher-id: $RANCHER_ID" \
  -d '{"toStatus":"sold"}' \
  "$API/herds/$NEW_HERD_ID/move"

# Tests authorization guard: different rancher should be blocked from moving another rancher's herd.
assert_request "403" "Ownership guard blocks non-owner herd move (PATCH /herds/:herdId/move)" \
  -X PATCH \
  -H "Content-Type: application/json" \
  -H "x-rancher-id: $OTHER_RANCHER_ID" \
  -d '{"direction":"next"}' \
  "$API/herds/$NEW_HERD_ID/move"

print_header "Smoke tests passed"
echo "All rancher MVP smoke tests completed successfully."
print_summary
