"""Medidas de rendimiento (T-26) con muchos datos: unos 700 entrenos, el historial de 150 ejercicios y tres años de comidas
(más de 1 MB). Mide el arranque hasta el primer pintado, lo que tarda un guardado (mirándolo todo y diciendo solo el núcleo:
I-10), lo que calcula la sincronización antes de hablar con Firebase y lo que tarda en pintarse cada pestaña. No es una prueba
que pase o falle: sirve para comparar dos compilaciones en el mismo ordenador (docs/tecnica/rendimiento.md). Una compilación
anterior a la V1.0.2, con las claves cortas en S (hist, wt…), recibe los mismos datos con sus nombres (core/schema).

  python3 tests/perf.py dist/stratafit.html [otra.html …]       (PERF_ROUNDS=5 para más vueltas)
Requiere:  pip install playwright  &&  playwright install chromium
"""
import os, re, sys, json, statistics
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


# las claves de S de core/schema: [guardada, nombre en el programa]
PAIRS = re.findall(r"\['(\w+)', '(\w+)'\]", open(os.path.join(HERE, '..', 'src', 'js', 'core', 'schema.js'), encoding='utf-8').read().split('const WORKOUT_KEYS')[0])


def old_names(js):
    """El mismo código con las claves cortas de S, para una compilación anterior a la V1.0.2."""
    for short, name in PAIRS:
        js = re.sub(r'\bS\.' + name + r'\b', 'S.' + short, js)
    return js


# muchos datos: entrenos cada día y medio desde noviembre de 2023, 150 ejercicios con 120 registros y 1.100 días de comidas
BIG = """(()=>{const L=[],H={},M={};const d0=new Date('2023-11-01');
for(let i=0;i<700;i++){const d=new Date(d0.getTime()+i*1.5*864e5).toISOString().slice(0,10);L.push({d,n:'Día '+(i%5),v:4000+i,s:16,m:55,q:7,x:[{n:'Press banca',s:[[8,80,8,0],[8,80,8,0],[8,80,8,0]]},{n:'Remo',s:[[10,60,8,0],[10,60,8,0]]}]})}
for(let e=0;e<150;e++){const a=[];for(let i=0;i<120;i++)a.push({d:'2024-'+String(1+i%12).padStart(2,'0')+'-'+String(1+i%28).padStart(2,'0'),s:[[8,60+i%20,8,0],[8,60+i%20,8,0]]});H['Ejercicio '+e]=a}
for(let i=0;i<1100;i++){const d=new Date(d0.getTime()+i*864e5).toISOString().slice(0,10);M[d]={0:[{n:'Avena',g:60,b:[370,60,13,7,10,0]},{n:'Leche',g:250,b:[46,5,3.4,1.5,0,.1]}],1:[{n:'Pollo',g:180,b:[165,0,31,3.6,0,.2]},{n:'Arroz',g:150,b:[130,28,2.7,.3,.4,0]}],2:[{n:'Yogur',g:125,b:[60,4,10,0,0,.1]}],3:[{n:'Salmón',g:150,b:[208,0,20,13,0,.1]},{n:'Patata',g:200,b:[77,17,2,.1,2,0]}]}}
S.logs=L;S.exerciseHistory=H;S.meals=M;saveState()})()"""
# cuándo pinta la app por primera vez (window.__ffok = 1 en core/boot), desde que empieza a cargar la página
FIRST_PAINT = "Object.defineProperty(window,'__ffok',{set(v){window.__tok=performance.now()},get(){return window.__tok?1:undefined},configurable:true})"
# mediana de n veces lo que tarda js
TIMED = "(async()=>{const r=[];for(let i=0;i<%d;i++){const t=performance.now();%s;r.push(performance.now()-t)}r.sort((a,b)=>a-b);return r[Math.floor(r.length/2)]})()"


def measure(path):
    out = {}
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, **context_opts(path))
        c.add_init_script(rd('init.js'))
        c.add_init_script(FIRST_PAINT)
        pg = c.new_page()
        pg.goto(app_url(path))
        pg.wait_for_timeout(800)
        js = (lambda t: t) if pg.evaluate("'exerciseHistory' in S") else old_names
        pg.evaluate(js(rd('seed.js')))
        pg.evaluate(js(BIG))
        pg.wait_for_timeout(1500)
        out['datos (MB)'] = round(pg.evaluate('JSON.stringify(S).length') / 1048576, 2)
        paint = []
        for _ in range(5):
            pg.reload()
            pg.wait_for_timeout(300)
            paint.append(pg.evaluate('window.__tok'))
        out['primer pintado (ms)'] = round(statistics.median(paint))
        pg.wait_for_timeout(3000)
        water = js("S.water[dayKey(new Date())]=(S.water[dayKey(new Date())]||0)+1")
        # el guardado, como lo hace la acción: a la vuelta de la tarea (lo que espera IndexedDB no frena la pantalla)
        out['guardar, mirándolo todo (ms)'] = round(pg.evaluate(TIMED % (20, water + ";saveState();await Promise.resolve();await Promise.resolve()")), 1)
        if pg.evaluate("typeof mealsPart=='function'"):
            out['guardar, solo el núcleo (ms)'] = round(pg.evaluate(TIMED % (20, water + ";saveState('core');await Promise.resolve();await Promise.resolve()")), 1)
        # lo que hace la sincronización antes de hablar con Firebase: las huellas de cada elemento de todo (cloud/sync)
        out['ver qué hay que subir (ms)'] = round(pg.evaluate(TIMED % (15, 'pendingDocs()')), 1)
        for t, name in enumerate(['Workout', 'Nutrición', 'Dashboard', 'Perfil']):
            out['pintar %s (ms)' % name] = round(pg.evaluate(TIMED % (15, 'S.tab=%d;R()' % t)), 1)
        b.close()
    return out


if __name__ == '__main__':
    # las compilaciones, por turnos (A, B, A, B…) para que lo que haga el ordenador a la vez les toque a todas por igual; de cada
    # medida, la mediana de las vueltas (PERF_ROUNDS, 3 si no se dice)
    files = sys.argv[1:]
    rounds = int(os.environ.get('PERF_ROUNDS', '3'))
    runs = {f: [] for f in files}
    for _ in range(rounds):
        for f in files:
            runs[f].append(measure(f))
    for f in files:
        out = {k: statistics.median(r[k] for r in runs[f]) for k in runs[f][0]}
        print(os.path.basename(f), json.dumps(out, ensure_ascii=False))
