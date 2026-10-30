#!/usr/bin/env bash
# Compila y pasa todas las pruebas sobre la compilación actual.  Uso: bash tests/run.sh
# En GitHub Actions, cada fallo se publica además como anotación (visible en la solicitud de fusión sin abrir el registro).
set -uo pipefail
cd "$(dirname "$0")/.."
fallos=0
run() {
  echo; echo "── $*"
  local out; out=$("$@" 2>&1); local code=$?
  echo "$out"
  if [ $code -ne 0 ]; then
    fallos=$((fallos + 1))
    if [ -n "${GITHUB_ACTIONS:-}" ]; then
      local resumen; resumen=$( (echo "$out" | grep -E "FALLA|ERROR|Error|error|sin formatear|Traceback" | head -15; echo '…'; echo "$out" | tail -12) )
      resumen=${resumen//'%'/'%25'}; resumen=${resumen//$'\n'/'%0A'}
      echo "::error title=Falla: $*::$resumen"
    fi
  fi
}
run node tools/format.js --check
run node tools/format_css.js --check
run python3 build.py --check
run python3 tests/smoke.py dist/stratafit.html
run python3 tests/smoke.py dist/app/index.html
run python3 tests/photos.py dist/stratafit.html
run python3 tests/security.py dist/stratafit.html
run python3 tests/safety.py dist/stratafit.html
run python3 tests/storage.py dist/stratafit.html
run python3 tests/render.py dist/stratafit.html
run python3 tests/deploy.py dist/app
echo
if [ $fallos -eq 0 ]; then echo "Todas las pruebas correctas"; else echo "$fallos pruebas fallan"; exit 1; fi
