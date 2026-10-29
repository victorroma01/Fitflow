"""Capturas de 33 pantallas en 6 configuraciones (tema claro/oscuro, niveles de cristal, tamaños de iPhone) y comparación píxel a píxel.

  python3 tests/shots.py snap ARCHIVO.html carpeta a,b,c,d,e,f     (genera carpeta/<cfg>_<pantalla>.png)
  python3 tests/shots.py cmp carpeta_referencia carpeta_candidata   (código de salida 1 si hay diferencias)
Requiere:  pip install playwright pillow numpy  &&  playwright install chromium
"""
import os,sys,json,hashlib
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
def _rd(n):
    t=open(os.path.join(HERE,n),encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))
SEED=_rd('seed.js');EXTRA=_rd('extra.js')
# pantallas: nombre -> js (se ejecuta tras cargar y sembrar). Solo se usan las que existen en la app (A.x)
SCR={
 'workout':"S.tab=0;R()",
 'workout_open':"S.tab=0;R();A.lvo&&A.lvo()",
 'overview':"A.zov&&A.zov(0)",
 'edit':"A.zov&&A.zov(0);A.zove&&A.zove()",
 'lib':"A.lib()",
 'crear':"A.cr()",
 'nutri':"S.tab=1;R()",
 'nutri_open':"S.tab=1;R();document.querySelectorAll('details').forEach(d=>d.open=true)",
 'dash':"S.tab=2;R()",
 'perfil':"S.tab=3;R()",
 'perfil_open':"S.tab=3;R();document.querySelectorAll('details').forEach(d=>d.open=true)",
 'menu':"A.menu()",
 'prog':"A.pg()",
 'prev':"A.pg();A.pv(3,{dataset:{}})",
 'cpn':"A.cpn()",
 'cpg':"A.cpg()",
 'cpm':"A.cpm()",
 'cal':"A.cl2()",
 'logs':"A.lg()",
 'dlg':"zcf('Prueba','Texto de prueba para el diálogo.','zno','Aceptar')",
 'go':"A.go()",
 'go_rest':"A.go();document.querySelector('.ck:not(.on)').click()",
 'go_open':"A.go();A.zov&&0;document.querySelectorAll('details').forEach(d=>d.open=true)",
 'nuadd':"S.tab=1;R();A.add(0)",
 'wodcfg':"S.tab=0;R();A.wod()",
 'cardio':"A.cardio()",
 'ms':"A.f2ms()",
 'msnew':"A.f2ms();A.msnew()",
 'ach':"A.f2lg()",
 'csv':"A.f2ex()",
 'scan':"S.tab=1;R();A.add(0);A.f2sc&&0",
 'bk':"A.zbk()",
 'wdsum':"S.tab=0;R();window.FFS=null;f2Sum&&0",
}
CFG={ # nombre: (w,h,scheme,gm,gl)
 'a':(390,844,'dark',3,1),'b':(390,844,'light',3,1),'c':(390,844,'dark',0,0),'d':(390,844,'dark',1,1),'e':(320,568,'dark',3,1),'f':(430,932,'light',2,1),
}
def run(file,out,cfgs):
    os.makedirs(out,exist_ok=True);res={}
    with sync_playwright() as p:
        b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for cn in cfgs:
            w,h,sch,gm,gl=CFG[cn]
            c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2,color_scheme=sch,has_touch=True,is_mobile=True)
            pg=c.new_page();errs=[]
            pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)))
            for k,js in SCR.items():
                pg.goto('file://'+file);pg.wait_for_timeout(250)
                pg.clock.set_fixed_time('2026-10-29T12:00:00')
                pg.evaluate(SEED.replace("S.gm=3;S.gl=1;S.theme='dark';","S.gm=%d;S.gl=%d;S.theme='%s';"%(gm,gl,sch)))
                pg.evaluate(EXTRA);pg.evaluate("location.reload()");pg.wait_for_timeout(350)
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
    if sys.argv[1]=='snap':run(sys.argv[2],sys.argv[3],sys.argv[4].split(','))
    else:sys.exit(0 if cmp(sys.argv[2],sys.argv[3]) else 1)
