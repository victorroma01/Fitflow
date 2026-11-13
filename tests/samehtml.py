"""El HTML de cada pantalla en dos compilaciones: para comprobar que un cambio interno (partir una vista, mover un cálculo de
módulo) no cambia nada de lo que se pinta. Más rápido y preciso que comparar capturas: dice el primer carácter distinto.

Abre en las dos las pantallas de tests/shots.py con los mismos datos y la misma fecha, y compara el HTML de la página (sin el
código ni los estilos, y con los estilos puestos por core/dynstyle). No es una prueba de la batería: se usa a mano.
Lo que depende del momento y no del código no se compara: los tiempos y el espacio medidos de Diagnóstico y la clase que
anima la burbuja de la barra de pestañas (se pone en el siguiente fotograma). Así, dos compilaciones iguales dan 0 distintas.

  python3 tests/samehtml.py antes.html despues.html [pantalla,pantalla…]
  python3 tests/samehtml.py antes.html despues.html --mas     (además, las pantallas de MORE: subpáginas, avisos y estados
                                                               que no salen en las capturas, unas 50 más)
"""
import os, re, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shots import SCR, SEED, EXTRA, INIT  # noqa: E402
from browser import app_url, context_opts  # noqa: E402

BODY = "(()=>{const c=document.body.cloneNode(true);c.querySelectorAll('script,style').forEach(e=>e.remove());c.querySelectorAll('nav').forEach(n=>n.classList.remove('nbon'));return c.innerHTML})()"
# las líneas de Diagnóstico con medidas del momento, y la dirección de la página (cada compilación va en su puerto)
NOISE = re.compile(r'(Tiempo de pintado|Espacio usado): [^\n<]*')
ADDRESS = re.compile(r'127\.0\.0\.1:\d+/[\w.-]+')


# más estados que los de las capturas: lo que se ve al editar, las subpáginas de Ajustes, los avisos y las ventanas de un entreno
MORE = {
    # Workout
    'semana: editar': "S.tab=0;R();A.toggleWeekView()",
    'día de descanso': "S.tab=0;R();(()=>{for(let j=0;j<7;j++)if(!S.plan[planIndex(j)].ex.length){A.selectDay(j);return}})()",
    'semana de descarga': "S.tab=0;S.deloadWeeks={[S.week]:1};R()",
    'overview: editar': "S.tab=0;R();A.openOverview();A.overviewEdit()",
    'añadir ejercicio': "A.openPicker()",
    'grupo de la librería': "A.openLibrary();A.libraryGroup(0,{dataset:{v:'Pecho'}})",
    'ficha de ejercicio': "A.openLibrary();A.exerciseDetail(0)",
    'ficha de ejercicio propio': "A.openLibrary();A.exerciseDetail(exAll().length-1)",
    'renombrar ejercicio': "A.openLibrary();A.customRenamePage(exAll().length-1)",
    'eliminar ejercicio': "A.openLibrary();A.customDeleteAsk(exAll().length-1)",
    'entreno: historial': "A.startWorkout();A.exerciseHistory(0)",
    'entreno: swap': "A.startWorkout();A.openSwap(0)",
    'entreno: discos': "A.startWorkout();A.openPlates(0)",
    'entreno: guardar': "A.startWorkout();W.sets.forEach(a=>a.forEach(s=>{s.ok=1}));A.finishSave()",
    'entreno: terminar': "A.startWorkout();W.sets[0][0].ok=1;R();A.finishAsk&&A.finishAsk()",
    'entreno: descartar': "A.startWorkout();A.discardAsk&&A.discardAsk()",
    'resumen': "showSummary()",
    'workouts: editar': "A.routineEditorBack();A.routineEdit(0)",
    'workouts: borrar': "A.routineEditorBack();A.routineListDeleteAsk(0)",
    # Programas
    'programas': "A.openPrograms()",
    'programa: vista previa': "A.openPrograms();A.openProgramPreview(1)",
    'programa propio': "A.openPrograms();A.openOwnProgram(0)",
    'programa: importar': "A.openPrograms();A.openImport()",
    # Nutrición
    'nutrición: ayer': "S.tab=1;R();A.nutritionDay(-1)",
    'mi nutrición': "S.tab=1;R();A.openMyNutrition()",
    'objetivos a mano': "S.tab=1;R();A.openMyNutrition();A.openManualGoals()",
    'añadir alimento: librería': "S.tab=1;R();A.openAddFood(0);A.addTab(1)",
    'añadir alimento: mis alimentos': "S.tab=1;R();A.openAddFood(0);A.addTab(2)",
    # Dashboard
    'peso: historial': "S.tab=2;R();A.openWeight();document.querySelectorAll('details').forEach(d=>d.open=true)",
    'peso: borrar': "S.tab=2;R();A.openWeight();(b=>b&&b.click())(document.querySelector('[data-a=weightDeleteAsk]'))",
    'estancamiento': "S.tab=2;R();A.stagnationInfo(0)",
    'registros: borrar': "A.openLogs();A.logDeleteAsk(0)",
    'medidas: borrar': "A.openMeasures();A.measureDeleteAsk(0)",
    'cardio': "A.openCardio()",
    # Perfil y Ajustes
    'menú': "A.openMenu()",
    'ajustes: acento': "S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'acento'}})",
    'ajustes: inicio': "S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'inicio'}})",
    'ajustes: unidades': "S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'unidades'}})",
    'ajustes: sonido': "S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'sonido'}})",
    'ajustes: cuenta': "S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'cuenta'}})",
    'ajustes: contraseña': "S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'clave'}})",
    'ajustes: privacidad': "S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'privacidad'}})",
    'ajustes: legal': "S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'legal'}})",
    'ajustes: icono': "S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'icono'}})",
    'ajustes: avanzado': "S.tab=3;R();A.openSettings();A.openSettingsPage(0,{dataset:{v:'avanzado'}})",
    'copia de seguridad': "S.tab=3;R();A.openBackup()",
    'copia: restaurar': "A.openBackup();pendingRestore=parseBackup(buildBackup());confirmDialog('¿Restaurar esta copia?','x','doNothing','Restaurar')",
    'exportar a CSV': "A.openCsvExport()",
    'informar de un fallo': "A.openReport()",
    'mis fallos y sugerencias': "A.openMyReports()",
    'borrar todo': "S.tab=3;R();A.openSettings();A.resetAllAsk()",
}


def grab(path, screens):
    out, url = {}, app_url(path)
    with sync_playwright() as p:
        b = p.chromium.launch()
        c = b.new_context(viewport={'width': 390, 'height': 844}, **context_opts(path))
        c.add_init_script(INIT)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        for k in screens:
            pg.goto(url)
            pg.evaluate('localStorage.clear()')
            pg.reload()
            pg.clock.set_fixed_time('2026-10-29T12:00:00')
            pg.evaluate(SEED)
            pg.evaluate(EXTRA)
            pg.reload()
            pg.clock.set_fixed_time('2026-10-29T12:00:00')
            try:
                pg.evaluate(SCR[k] if k in SCR else MORE[k])
                pg.wait_for_timeout(900 if k in ('edit', 'overview', 'go_open') else 300)
                out[k] = ADDRESS.sub('(dirección)', NOISE.sub(r'\1: …', pg.evaluate(BODY)))
            except Exception as e:
                out[k] = 'EXC ' + str(e)[:200]
        out['(errores de JS)'] = str(errs)
        b.close()
    return out


def main(a, b, screens):
    x, y = grab(a, screens), grab(b, screens)
    bad = 0
    for k in x:
        if x[k] == y[k]:
            continue
        bad += 1
        i = next((i for i in range(min(len(x[k]), len(y[k]))) if x[k][i] != y[k][i]), min(len(x[k]), len(y[k])))
        print('DISTINTA %s (%d y %d caracteres)\n  antes:   …%s\n  después: …%s' % (k, len(x[k]), len(y[k]), x[k][max(0, i - 120):i + 120], y[k][max(0, i - 120):i + 120]))
    # una pantalla que no se abre (en las dos, igual) no compara nada: se dice, para arreglar la lista
    for k in x:
        if x[k].startswith('EXC '):
            print('NO SE ABRE %s: %s' % (k, x[k][4:150]))
    print('%d pantallas comparadas; %d distintas' % (len(x) - 1, bad))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    more = '--mas' in sys.argv
    args = [a for a in sys.argv[1:] if a != '--mas']
    main(args[0], args[1], args[2].split(',') if len(args) > 2 else list(SCR) + (list(MORE) if more else []))
