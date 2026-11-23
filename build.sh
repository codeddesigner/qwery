#!/usr/bin/env bash
# Builds the Qwery SPA into ./dist. Vercel serves ./dist and deploys ./api as serverless functions.
set -euo pipefail
cd "$(dirname "$0")"
ESBUILD="${ESBUILD:-}"
if [ -z "$ESBUILD" ]; then
  if [ -x node_modules/.bin/esbuild ]; then ESBUILD=node_modules/.bin/esbuild; else ESBUILD=/opt/npm-tools/node_modules/esbuild/bin/esbuild; export NODE_PATH=/home/claude/.npm-global/lib/node_modules; fi
fi
rm -rf dist && mkdir -p dist
cp -r public/* dist/
"$ESBUILD" src/main.jsx \
  --bundle --minify --format=esm --target=es2020 \
  --jsx=automatic --loader:.js=jsx --define:process.env.NODE_ENV='"production"' \
  --entry-names=app-[hash] --chunk-names=c-[hash] --splitting --external:/fonts/* --outdir=dist/assets
JS=$(cd dist/assets && ls app-*.js | head -1)
CSS=$(cd dist/assets && ls app-*.css | head -1)
sed -e "s#__APP_JS__#/assets/$JS#" -e "s#__APP_CSS__#/assets/$CSS#" src/index.html > dist/index.html
cp dist/index.html dist/app.html
echo "built: $JS $CSS"
