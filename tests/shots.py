"""Capturas de 47 pantallas en 6 configuraciones (tema claro/oscuro, niveles de cristal, tamaños de iPhone) y comparación píxel a píxel.

  python3 tests/shots.py snap ARCHIVO.html carpeta a,b,c,d,e,f [mapa.txt]   (genera carpeta/<cfg>_<pantalla>.png)
  Con mapa.txt («registro viejo nuevo», tests/nombres-1.0.2.txt), ARCHIVO es de antes de renombrar las acciones: las pantallas se
  abren con sus nombres viejos.
  python3 tests/shots.py cmp carpeta_referencia carpeta_candidata   (código de salida 1 si hay diferencias)
Requiere:  pip install playwright pillow numpy  &&  playwright install chromium
"""
import os,sys,json,hashlib,re
from playwright.sync_api import sync_playwright
from browser import app_url, context_opts
HERE=os.path.dirname(os.path.abspath(__file__))
def _rd(n):
    t=open(os.path.join(HERE,n),encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))
SEED=_rd('seed.js');EXTRA=_rd('extra.js');INIT=_rd('init.js')
# pantallas: nombre -> js (se ejecuta tras cargar y sembrar). Solo se usan las que existen en la app (A.x)
SCR={
 'workout':"S.tab=0;R()",
 'workout_open':"S.tab=0;R();A.levelMenuToggle&&A.levelMenuToggle()",
 'overview':"A.openOverview&&A.openOverview(0)",
 'edit':"A.openOverview&&A.openOverview(0);A.overviewEdit&&A.overviewEdit()",
 'lib':"A.openLibrary()",
 'crear':"A.routineEditorBack()",
 'nutri':"S.tab=1;R()",
 'nutri_open':"S.tab=1;R();document.querySelectorAll('details').forEach(d=>d.open=true)",
 'dash':"S.meals[dayKey(new Date(Date.now()-864e5))]={0:[{n:'Arroz',g:400,b:[130,28,2.7,.3,0,0]}]};S.tab=2;R()",  # (con comidas de ayer: sale la tarjeta de nutrición de 7 días)
 'perfil':"S.tab=3;R()",
 'perfil_open':"S.tab=3;R();document.querySelectorAll('details').forEach(d=>d.open=true)",
 'menu':"A.openMenu()",
 'prog':"A.openPrograms()",
 'prev':"A.openPrograms();A.openProgramPreview(3,{dataset:{}})",
 'cpn':"A.createProgram()",
 'cpg':"A.createGuided()",
 'cpm':"A.createFromRoutines()",
 'cal':"A.openCalendar()",
 'logs':"A.openLogs()",
 'dlg':"confirmDialog('Prueba','Texto de prueba para el diálogo.','doNothing','Aceptar')",
 'go':"A.startWorkout()",
 'go_rest':"A.startWorkout();document.querySelector('.ck:not(.on)').click()",
 'go_open':"A.startWorkout();A.openOverview&&0;document.querySelectorAll('details').forEach(d=>d.open=true)",
 'nuadd':"S.tab=1;R();A.openAddFood(0)",
 'wodcfg':"S.tab=0;R();A.openWod()",
 'cardio':"A.openCardio()",
 'ms':"A.openMeasures()",
 'msnew':"A.openMeasures();A.measureNew()",
 'ach':"A.openAchievements()",
 'csv':"A.openCsvExport()",
 'scan':"S.tab=1;R();A.openAddFood(0);A.openScanner&&0",
 'bk':"A.openBackup()",
 'wdsum':"S.tab=0;R();window.lastSummary=null;showSummary&&0",
 'nutri_my':"S.tab=1;R();A.openMyNutrition&&A.openMyNutrition()",
 'nutri_manual':"S.tab=1;R();A.openMyNutrition&&(A.openMyNutrition(),A.openManualGoals())",
 'nutri_buscar':"S.tab=1;R();A.openFoodSearch&&A.openFoodSearch(0)",
 'ajustes':"S.tab=3;R();A.openSettings&&A.openSettings()",
 'ajustes_tema':"S.tab=3;R();A.openSettings&&(A.openSettings(),A.openSettingsPage(0,{dataset:{v:'tema'}}))",
 'informe':"S.tab=3;R();A.openReport&&(A.openSettings(),A.openReport())",
 'peso':"S.weighReminder={n:2,u:'w',t:Date.now()};S.tab=2;R();A.openWeight&&A.openWeight()",
 'analisis':"S.tab=3;R();A.openAnalysis&&A.openAnalysis()",
 'avisos':"S.reports=[{id:'prueba-1793782800000',k:'f',a:'Algo se ve mal',t:'La gráfica de peso no se ve bien',ca:1793782800000,s:1,st:'v',rp:'Arreglado en la próxima versión',ra:1793869200000}];S.tab=3;R();A.openMyReports&&A.openMyReports()",
 'nota':"S.tab=3;R();A.openSettings&&(A.openSettings(),A.openSettingsPage(0,{dataset:{v:'nota'}}))",
 'acento':"S.accent=-1;S.accentColor='#ff2d55';S.tab=3;R();A.openSettings&&(A.openSettings(),A.openSettingsPage(0,{dataset:{v:'acento'}}))",
 'inicio':"S.tab=3;R();A.openSettings&&(A.openSettings(),A.openSettingsPage(0,{dataset:{v:'inicio'}}))",
 'recorrido':"S.tab=0;R();A.tourReplay&&A.tourReplay()",
 'recorrido_fin':"S.tab=0;R();A.tourReplay&&(A.tourReplay(),A.tourNext(),A.tourNext(),A.tourNext(),A.tourNext(),A.tourNext())",
}
CFG={ # nombre: (w,h,scheme,gm,gl)
 'a':(390,844,'dark',3,1),'b':(390,844,'light',3,1),'c':(390,844,'dark',0,0),'d':(390,844,'dark',1,1),'e':(320,568,'dark',3,1),'f':(430,932,'light',2,1),
}
def old_names(js,path):
    """Un script con los nombres de antes del mapa: A.nuevo → A.viejo, S.nuevo → S.viejo, data-a=nuevo → data-a=viejo."""
    back={'A':{},'C':{},'U':{},'S':{},'W':{}}
    for l in open(path,encoding='utf-8'):
        l=l.strip()
        if l and not l.startswith('#'):
            r,o,n=l.split();back[r][n]=o
    js=re.sub(r'(?<![\w.$])([ACUSW])\.(\w+)',lambda m:m.group(1)+'.'+back[m.group(1)].get(m.group(2),m.group(2)),js)
    return re.sub(r'data-(a|c|u)=(\w+)',lambda m:'data-%s=%s'%(m.group(1),back[m.group(1).upper()].get(m.group(2),m.group(2))),js)
def run(file,out,cfgs,ren=None):
    os.makedirs(out,exist_ok=True);res={}
    scr={k:old_names(js,ren) if ren else js for k,js in SCR.items()}
    extra,init=(old_names(x,ren) for x in (EXTRA,INIT)) if ren else (EXTRA,INIT)
    # por HTTP, como el resto de pruebas (tests/browser.py): con file://, Chromium a veces recarga con el almacenamiento vacío
    url=app_url(file)
    with sync_playwright() as p:
        b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for cn in cfgs:
            w,h,sch,gm,gl=CFG[cn]
            c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2,color_scheme=sch,has_touch=True,is_mobile=True,**context_opts(file))
            # con la sesión de prueba (tests/init.js): sin cuenta, la app solo enseña el inicio de sesión
            c.add_init_script(init)
            pg=c.new_page();errs=[]
            pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)))
            for k,js in scr.items():
                # cada pantalla desde cero: sin el entreno en curso ni la pestaña que dejó la anterior (si no, lo que hay detrás de
                # una hoja depende de si un guardado llegó a escribirse antes de cambiar de página)
                pg.goto(url);pg.wait_for_timeout(250)
                pg.evaluate("localStorage.clear()");pg.reload();pg.wait_for_timeout(250)
                pg.clock.set_fixed_time('2026-10-29T12:00:00')
                sd=SEED.replace("S.glassLevel=3;S.glassOn=1;S.theme='dark';","S.glassLevel=%d;S.glassOn=%d;S.theme='%s';"%(gm,gl,sch))
                pg.evaluate(old_names(sd,ren) if ren else sd)
                # (pg.reload espera a que lo guardado quede escrito: con IndexedDB, location.reload() podía cortarlo)
                pg.evaluate(extra);pg.reload();pg.wait_for_timeout(350)
                pg.clock.set_fixed_time('2026-10-29T12:00:00')
                try:
                    pg.evaluate(js);pg.wait_for_timeout(900 if k in('edit','overview','go_open') else 220)
                    pg.screenshot(path=f'{out}/{cn}_{k}.png',animations='disabled')
                    res[f'{cn}_{k}']=pg.evaluate("document.body.innerText.length")
                except Exception as e:
                    res[f'{cn}_{k}']='EXC '+str(e)[:100]
            res[cn+'_ERRS']=errs
            c.close()
        b.close()
    json.dump(res,open(out+'/res.json','w'))
def cmp(a,b):
    from PIL import Image,ImageChops
    bad=[];n=0
    for f in sorted(os.listdir(b)):
        if not f.endswith('.png'):continue
        n+=1
        if not os.path.exists(f'{b}/{f}'):bad.append((f,'missing'));continue
        x=Image.open(f'{a}/{f}').convert('RGB');y=Image.open(f'{b}/{f}').convert('RGB')
        if x.size!=y.size:bad.append((f,'size'));continue
        d=ImageChops.difference(x,y).getbbox()
        if d:
            import numpy as np
            dd=np.asarray(ImageChops.difference(x,y)).astype(int).sum(axis=2)
            bad.append((f,'diff px',int((dd>0).sum()),d))
    ra=json.load(open(a+'/res.json'));rb=json.load(open(b+'/res.json'))
    rd=[(k,ra.get(k),rb[k]) for k in rb if ra.get(k)!=rb[k]]
    print('compared',n,'imágenes;',len(bad),'con diferencias;',len(rd),'textos distintos')
    for x in bad[:40]:print(' ',x)
    for x in rd[:20]:print(' txt',x)
    return not bad and not rd
if __name__=='__main__':
    if sys.argv[1]=='snap':run(sys.argv[2],sys.argv[3],sys.argv[4].split(','),sys.argv[5] if len(sys.argv)>5 else None)
    else:sys.exit(0 if cmp(sys.argv[2],sys.argv[3]) else 1)
