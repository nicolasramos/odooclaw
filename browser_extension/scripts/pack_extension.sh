#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT_DIR}/dist"
CHROME_PKG_NAME="odooclaw-browser-extension-chrome.zip"
FIREFOX_PKG_NAME="odooclaw-browser-extension-firefox.zip"

mkdir -p "${OUT_DIR}"
rm -f "${OUT_DIR}/${CHROME_PKG_NAME}" "${OUT_DIR}/${FIREFOX_PKG_NAME}"

cd "${ROOT_DIR}"
zip -r "${OUT_DIR}/${CHROME_PKG_NAME}" . \
  -x "*.DS_Store" \
  -x "dist/*" \
  -x "scripts/*"

zip -r "${OUT_DIR}/${FIREFOX_PKG_NAME}" . \
  -x "*.DS_Store" \
  -x "dist/*" \
  -x "scripts/*"

printf "Created: %s\n" "${OUT_DIR}/${CHROME_PKG_NAME}"
printf "Created: %s\n" "${OUT_DIR}/${FIREFOX_PKG_NAME}"
