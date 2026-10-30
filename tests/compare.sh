#!/usr/bin/env bash
# Compara el comportamiento y la imagen de dos compilaciones de archivo único (para refactors: no debe cambiar nada).
#   bash tests/compare.sh referencia.html nueva.html [semillas] [pasos]
# Paseo aleatorio diferencial (DOM, datos guardados y sonidos paso a paso) y 33 pantallas × 6 configuraciones píxel a píxel.
set -uo pipefail
cd "$(dirname "$0")/.."
REF=$(realpath "$1"); NEW=$(realpath "$2"); SEEDS=${3:-0,1,2,3}; STEPS=${4:-150}
OUT=$(mktemp -d)
ok=0
echo "── paseo aleatorio ($SEEDS × $STEPS pasos)"
python3 tests/walk.py run "$REF" "$NEW" "$SEEDS" "$STEPS" || ok=1
echo "── capturas"
python3 tests/shots.py snap "$REF" "$OUT/ref" a,b,c,d,e,f >/dev/null && python3 tests/shots.py snap "$NEW" "$OUT/new" a,b,c,d,e,f >/dev/null && python3 tests/shots.py cmp "$OUT/ref" "$OUT/new" || ok=1
echo "(capturas en $OUT)"
[ $ok = 0 ] && echo "Sin diferencias" || echo "HAY DIFERENCIAS"
exit $ok
