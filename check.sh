#!/bin/bash
# Local CI check script — mirrors code-quality.yml
# Run: ./check.sh
# Run specific check: ./check.sh fmt | lint | vet | complexity | fe-lint | fe-types | fe-fmt

set -e
PASS="\033[0;32m✔\033[0m"
FAIL="\033[0;31m✘\033[0m"
INFO="\033[0;34m»\033[0m"

run_check() {
  local name="$1"
  shift
  echo -e "$INFO $name..."
  if "$@" 2>&1; then
    echo -e "$PASS $name passed"
  else
    echo -e "$FAIL $name FAILED"
    exit 1
  fi
}

build_frontend() {
  if [ ! -d "web-app/dist" ]; then
    echo -e "$INFO Building frontend (required for go:embed)..."
    (cd web-app && npm ci --silent && npm run build --silent)
    echo -e "$PASS Frontend built"
  else
    echo -e "$PASS Frontend dist already exists, skipping build"
  fi
}

check_fmt() {
  echo -e "$INFO Checking Go formatting..."
  unformatted=$(gofmt -l .)
  if [ -n "$unformatted" ]; then
    echo -e "$FAIL Files need formatting:"
    echo "$unformatted"
    echo "Run: gofmt -w ."
    exit 1
  fi
  echo -e "$PASS Go formatting OK"
}

check_vet() {
  build_frontend
  run_check "go vet" go vet ./...
}

check_lint() {
  build_frontend
  local lint_bin
  lint_bin=$(command -v golangci-lint 2>/dev/null || echo "$(go env GOPATH)/bin/golangci-lint")
  if [ ! -x "$lint_bin" ]; then
    echo -e "$INFO Installing golangci-lint..."
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
    lint_bin="$(go env GOPATH)/bin/golangci-lint"
  fi
  run_check "golangci-lint" "$lint_bin" run --timeout=5m
}

check_complexity() {
  local threshold=90
  if ! $(go env GOPATH)/bin/gocyclo --help &>/dev/null && ! command -v gocyclo &>/dev/null; then
    echo -e "$INFO Installing gocyclo..."
    go install github.com/fzipp/gocyclo/cmd/gocyclo@latest
  fi
  local bin
  bin=$(command -v gocyclo 2>/dev/null || echo "$(go env GOPATH)/bin/gocyclo")
  echo -e "$INFO Checking Go code complexity (threshold: $threshold)..."
  # Use || true so set -e does not exit before we can check the output
  result=$("$bin" -over "$threshold" . 2>&1) || true
  if [ -n "$result" ]; then
    echo -e "$FAIL Functions exceed complexity threshold ($threshold):"
    echo "$result"
    exit 1
  fi
  echo -e "$PASS Complexity OK"
}

check_fe_lint() {
  run_check "Frontend lint" bash -c "cd web-app && npm run lint"
}

check_fe_types() {
  run_check "Frontend type-check" bash -c "cd web-app && npm run type-check"
}

check_fe_fmt() {
  run_check "Frontend format" bash -c "cd web-app && npm run lint"
}

# Parse argument or run all
case "${1:-all}" in
  fmt)        check_fmt ;;
  vet)        check_vet ;;
  lint)       check_lint ;;
  complexity) check_complexity ;;
  fe-lint)    check_fe_lint ;;
  fe-types)   check_fe_types ;;
  fe-fmt)     check_fe_fmt ;;
  all)
    check_fmt
    check_vet
    check_lint
    check_complexity
    check_fe_lint
    check_fe_types
    check_fe_fmt
    echo ""
    echo -e "$PASS All checks passed — safe to push!"
    ;;
  *)
    echo "Usage: $0 [fmt|vet|lint|complexity|fe-lint|fe-types|fe-fmt|all]"
    exit 1
    ;;
esac
