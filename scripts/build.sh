#!/bin/bash
set -xeuo pipefail
npm ci
npm run build
pushd dist
zip -r ../bundle.zip *
popd
du -hs bundle.zip dist dist/*
