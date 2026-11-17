#!/bin/bash
set -e

echo "Building ichido..."
npm run build

echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name ichido

echo "Done."
