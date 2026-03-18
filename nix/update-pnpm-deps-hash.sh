#! /usr/bin/env bash

set -eu

cd "$(dirname "${BASH_SOURCE[0]}")"

# Set fake hash to trigger fixed-output hash mismatch and print "got: ..."
echo -n "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" > pnpm-deps-hash.txt
BUILD_LOG="$(mktemp)"
nix build -L ..#alicization.pnpmDeps 2>&1 | tee "$BUILD_LOG"

NEXT_HASH="$(
  grep -oE 'got:[[:space:]]+[^[:space:]]+' "$BUILD_LOG" \
    | awk '{ print $2 }' \
    | tail -n1
)"

if [[ -z "${NEXT_HASH}" ]]; then
  echo "failed to extract pnpm deps hash from build log" >&2
  echo "log file: ${BUILD_LOG}" >&2
  exit 1
fi

echo -n "${NEXT_HASH}" > pnpm-deps-hash.txt
