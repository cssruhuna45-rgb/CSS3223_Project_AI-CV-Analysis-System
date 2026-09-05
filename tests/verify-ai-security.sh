#!/usr/bin/env bash
#
# Smoke test for the AI service gateway.
#
# Asserts that the Python AI service cannot be reached without the
# internal key, that the Spring proxy refuses unauthenticated callers,
# that a logged-in user does get through, and that CORS is not open.
#
# Usage (Git Bash / WSL):
#
#   ./tests/verify-ai-security.sh EMAIL PASSWORD
#
# Optional overrides:
#   SPRING_URL   default http://localhost:8080
#   AI_URL       default http://localhost:8000
#   ALLOWED_ORIGIN default http://localhost:3000

set -u

SPRING_URL="${SPRING_URL:-http://localhost:8080}"
AI_URL="${AI_URL:-http://localhost:8000}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-http://localhost:3000}"

EMAIL="${1:-}"
PASSWORD="${2:-}"

pass=0
fail=0

check() {
    local name="$1" got="$2" want="$3"
    if [ "$got" = "$want" ]; then
        printf '  \033[32mPASS\033[0m  %-50s %s\n' "$name" "$got"
        pass=$((pass + 1))
    else
        printf '  \033[31mFAIL\033[0m  %-50s got %s, want %s\n' "$name" "$got" "$want"
        fail=$((fail + 1))
    fi
}

code() { curl -s -o /dev/null -w '%{http_code}' --max-time 150 "$@"; }

echo
echo "AI service : $AI_URL"
echo "Backend    : $SPRING_URL"
echo

# ------------------------------------------------------------
echo "1. AI service rejects callers without the internal key"
# ------------------------------------------------------------

for path in \
    /api/v1/interview/start \
    /api/v1/interview/answer \
    /api/v1/interview/finish \
    /api/v1/resume/analyze \
    /api/v1/skill-gap/analyze \
    /api/v1/rag/query \
    /api/v1/rag/index
do
    check "POST $path" \
          "$(code -X POST "$AI_URL$path" -H 'Content-Type: application/json' -d '{}')" \
          401
done

check "POST /api/v1/interview/start with a wrong key" \
      "$(code -X POST "$AI_URL/api/v1/interview/start" \
              -H 'Content-Type: application/json' \
              -H 'X-Internal-Api-Key: definitely-not-the-key' -d '{}')" \
      401

check "GET /api/v1/health stays public" "$(code "$AI_URL/api/v1/health")" 200

# ------------------------------------------------------------
echo
echo "2. Backend proxy rejects callers without a valid login"
# ------------------------------------------------------------

check "POST /api/v1/ai/interview/start, no JWT" \
      "$(code -X POST "$SPRING_URL/api/v1/ai/interview/start" \
              -H 'Content-Type: application/json' -d '{}')" \
      403

check "POST /api/v1/ai/interview/start, garbage JWT" \
      "$(code -X POST "$SPRING_URL/api/v1/ai/interview/start" \
              -H 'Authorization: Bearer x.y.z' \
              -H 'Content-Type: application/json' -d '{}')" \
      403

# ------------------------------------------------------------
echo
echo "3. CORS is not open"
# ------------------------------------------------------------

acao() {
    curl -s -D - -o /dev/null -X OPTIONS "$SPRING_URL/api/v1/ai/interview/start" \
        -H "Origin: $1" -H 'Access-Control-Request-Method: POST' \
        | grep -i '^access-control-allow-origin' | tr -d '\r' | awk '{print $2}'
}

check "arbitrary origin gets no allow-origin header" "$(acao http://evil.example)" ""
check "configured origin is allowed" "$(acao "$ALLOWED_ORIGIN")" "$ALLOWED_ORIGIN"

# ------------------------------------------------------------
echo
echo "4. A logged-in user does get through"
# ------------------------------------------------------------

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "  SKIP  no credentials given (pass EMAIL PASSWORD to run this section)"
else
    TOKEN=$(curl -s -X POST "$SPRING_URL/api/v1/auth/login" \
                -H 'Content-Type: application/json' \
                -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
            | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

    if [ -z "$TOKEN" ]; then
        printf '  \033[31mFAIL\033[0m  login failed for %s\n' "$EMAIL"
        fail=$((fail + 1))
    else
        check "GET /api/v1/ai/health with JWT" \
              "$(code "$SPRING_URL/api/v1/ai/health" -H "Authorization: Bearer $TOKEN")" \
              200

        # Reaching FastAPI validation proves the whole chain: the JWT was
        # accepted, the internal key was added, and the AI service replied.
        check "bad payload returns the AI service's own 422" \
              "$(code -X POST "$SPRING_URL/api/v1/ai/interview/start" \
                      -H "Authorization: Bearer $TOKEN" \
                      -H 'Content-Type: application/json' -d '{}')" \
              422

        # Reindex is deliberately not proxied.
        check "POST /api/v1/ai/rag/index is not exposed" \
              "$(code -X POST "$SPRING_URL/api/v1/ai/rag/index" \
                      -H "Authorization: Bearer $TOKEN" \
                      -H 'Content-Type: application/json' -d '{}')" \
              404
    fi
fi

echo
echo "passed: $pass   failed: $fail"
[ "$fail" -eq 0 ]
