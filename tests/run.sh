#!/usr/bin/env bash
# Compila y pasa todas las pruebas sobre la compilación actual.  Uso: bash tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/format.js --check
node tools/format_css.js --check
python3 build.py --check
run() { echo; echo "── $*"; "$@"; }
run python3 tests/smoke.py dist/stratafit.html
run python3 tests/smoke.py dist/app/index.html
run python3 tests/photos.py dist/stratafit.html
run python3 tests/security.py dist/stratafit.html
run python3 tests/safety.py dist/stratafit.html
run python3 tests/deploy.py dist/app
echo; echo "Todas las pruebas correctas"
