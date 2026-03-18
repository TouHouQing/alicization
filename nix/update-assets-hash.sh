#! /usr/bin/env bash

set -eu

cd "$(dirname "${BASH_SOURCE[0]}")"

# Ensure dependent pnpm deps hash is up to date before updating assets hash.
"$(dirname "${BASH_SOURCE[0]}")/update-pnpm-deps-hash.sh"

# Set fake hash to trigger rebuild
echo -n "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" > assets-hash.txt
BUILD_LOG="$(mktemp)"
nix build -L ..#alicization.assets 2>&1 | tee "$BUILD_LOG"

NEXT_HASH="$(
  grep -oE 'got:[[:space:]]+[^[:space:]]+' "$BUILD_LOG" \
    | awk '{ print $2 }' \
    | tail -n1
)"

if [[ -z "${NEXT_HASH}" ]]; then
  echo "failed to extract assets hash from build log" >&2
  echo "log file: ${BUILD_LOG}" >&2
  exit 1
fi

echo -n "${NEXT_HASH}" > assets-hash.txt
