#!/bin/bash
# Double-click (or run) on a Mac: builds Yap.dmg for THIS Mac and opens the folder.
set -e
cd "$(dirname "$0")"
xcode-select -p >/dev/null 2>&1 || { echo "Install Xcode tools first: run  xcode-select --install  then run this again."; exit 1; }
command -v node >/dev/null || { echo "Install Node 22 from https://nodejs.org (LTS), then run this again."; exit 1; }
[ "$(uname -m)" = "arm64" ] && ARCH=--arm64 || ARCH=--x64
npm ci
npm run build
npm run build:native
YAP_SIGN_IDENTITY=- npx electron-builder --mac $ARCH --publish never
open release
echo "Done. Open the .dmg in the release folder and drag Yap to Applications."
