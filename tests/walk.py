"""Paseo aleatorio diferencial: ejecuta la misma secuencia de acciones (semilla) sobre dos compilaciones y compara,
paso a paso, el DOM, el estado guardado y los pitidos. Sirve para demostrar que un refactor no cambia el comportamiento.

  python3 tests/walk.py run REFERENCIA.html CANDIDATA.html 0,1,2,3 150
  python3 tests/walk.py trace ARCHIVO.html SEMILLA PASOS salida.json ; python3 tests/walk.py cmp a.json b.json
Requiere:  pip install playwright  &&  playwright install chromium
"""
import os,sys,json,random,hashlib,datetime
from playwright.sync_api import sync_playwright
HERE=os.path.dirname(os.path.abspath(__file__))
def _rd(n):
    t=open(os.path.join(HERE,n),encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))
COMPAT=_rd('compat.js');SEED=COMPAT+_rd('seed.js');EXTRA=COMPAT+_rd('extra.js');INIT=_rd('init.js')
SKIP={'rst','zrs','zrd','bkf','f2exd','f2sh','f2sc','f2ln','f2bk','pha','phv','f2os','upr','zbc','shg','shf','pgio','pgi'}  # borrar todo, descargas, cámara, red, recargas
CAND="""()=>{const out=[];const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!='hidden'&&!e.disabled};
 document.querySelectorAll('[data-a],[data-c],[data-u]').forEach(e=>{if(!vis(e))return;
  const a=e.getAttribute('data-a'),c=e.getAttribute('data-c'),u=e.getAttribute('data-u');
  out.push([a?'a':(c?'c':'u'),a||c||u,e.tagName,(e.getAttribute('type')||''),(e.dataset.i||''),(e.dataset.j||''),(e.dataset.v||''),(e.dataset.n||'').slice(0,20)])});
 return out}"""
CLICK="""([k,key,idx,val,txt])=>{const sel=k=='a'?'[data-a]':(k=='c'?'[data-c]':'[data-u]');const attr=k=='a'?'data-a':(k=='c'?'data-c':'data-u');
 const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!='hidden'&&!e.disabled};
 const els=[...document.querySelectorAll(sel)].filter(e=>e.getAttribute(attr)==key&&vis(e));const e=els[idx];if(!e)return 'noel';
 if(k=='a'){e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return 'ok'}
 if(e.type=='checkbox'){e.checked=!e.checked;e.dispatchEvent(new Event('change',{bubbles:true}));return 'ok'}
 if(e.tagName=='SELECT'){const o=[...e.options];if(o.length){e.value=o[Math.floor(val*o.length)%o.length].value}e.dispatchEvent(new Event('change',{bubbles:true}));return 'ok'}
 if(e.type=='file'){return 'file'}
 if(e.type=='number'||e.inputMode=='decimal'||e.inputMode=='numeric'){e.value=String(Math.round(val*200)/2);}
 else if(e.type=='range'){e.value=String(val)}
 else e.value=txt;
 e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return 'ok'}"""
SIG="""()=>{const b=document.body.cloneNode(true);b.querySelectorAll('script,canvas').forEach(x=>x.remove());
 const h=b.innerHTML;let ls='';try{ls=(localStorage.getItem('ff')||'')+'|'+(localStorage.getItem('ffw')||'')}catch(e){}
 const f=s=>{let x=5381;for(let i=0;i<s.length;i++)x=((x<<5)+x+s.charCodeAt(i))|0;return x>>>0};
 return {h:f(h),l:f(ls),t:document.body.innerText.replace(/\\s+/g,' ').slice(0,260),n:h.length,b:window.__beeps}}"""
WORDS=['a','Prueba','12','Pollo','Press','x y','0','99','Arroz','Mi plan']
def trace(file,seed,steps):
    rng=random.Random(seed*7919+13)
    res={'seed':seed,'steps':[],'errs':[]}
    with sync_playwright() as p:
        b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True,is_mobile=True,color_scheme='dark' if seed%2==0 else 'light')
        c.add_init_script(INIT)
        pg=c.new_page()
        pg.on('pageerror',lambda e:res['errs'].append('PAGEERR '+str(e)[:200]))
        pg.on('dialog',lambda d:d.accept())
        pg.route('**/*',lambda r:r.continue_() if r.request.url.startswith('file:') else r.abort())
        pg.clock.install(time=datetime.datetime(2026,10,29,12,0,0))
        pg.clock.pause_at(datetime.datetime(2026,10,29,12,0,1))
        pg.goto('file://'+file);pg.wait_for_timeout(200)
        scen=seed%4
        if scen!=2:
            pg.evaluate(SEED.replace("S.gm=3;S.gl=1;S.theme='dark';","S.gm=%d;S.gl=1;S.theme='%s';"%(3 if scen in(0,1) else 0,'dark' if seed%2==0 else 'light')))
            pg.evaluate(EXTRA)
            pg.evaluate("location.reload()");pg.wait_for_timeout(200)
        pg.clock.run_for(500)
        if scen==1:
            pg.evaluate("A.go&&A.go()");pg.clock.run_for(300)
        res['steps'].append(['init',pg.evaluate(SIG)])
        for st in range(steps):
            cs=pg.evaluate(CAND)
            cs=[x for x in cs if x[1] not in SKIP]
            if not cs:
                pg.evaluate("S.tab=(S.tab+1)%4;R()") if False else None
                pg.evaluate("document.querySelector('nav button')&&document.querySelector('nav button').click()");act=['reset']
            else:
                # sesgo suave hacia acciones distintas (no solo las primeras)
                x=cs[rng.randrange(len(cs))]
                same=[y for y in cs if y[0]==x[0] and y[1]==x[1]]
                idx=same.index(x)
                val=rng.random();txt=WORDS[rng.randrange(len(WORDS))]
                r=pg.evaluate(CLICK,[x[0],x[1],idx,val,txt])
                act=[x[0],x[1],x[4],x[5],x[6],r]
            adv=rng.choice([0,50,400,1500,6000,31000]);
            try:pg.clock.run_for(adv)
            except Exception as e:res['errs'].append('CLOCK '+str(e)[:100])
            try:
                sg=pg.evaluate(SIG)
            except Exception as e:
                res['errs'].append('SIG '+str(e)[:100]);pg.wait_for_timeout(300);sg=pg.evaluate(SIG)
            res['steps'].append([act,sg,adv])
        b.close()
    return res
def compare(a,b):
    n=0
    for i,(x,y) in enumerate(zip(a['steps'],b['steps'])):
        sx,sy=(x[1],y[1])
        if sx['h']!=sy['h'] or sx['l']!=sy['l'] or sx['b']!=sy['b']:
            return ('DIVERGE',i,x[0],y[0],sx['t'],sy['t'],(sx['h']!=sy['h'],sx['l']!=sy['l'],sx['b']!=sy['b']))
        n+=1
    if len(a['steps'])!=len(b['steps']):return ('LEN',len(a['steps']),len(b['steps']))
    if a['errs']!=b['errs']:return ('ERRS',a['errs'][:3],b['errs'][:3])
    return ('OK',n)
if __name__=='__main__':
    cmd=sys.argv[1]
    if cmd=='trace':
        r=trace(sys.argv[2],int(sys.argv[3]),int(sys.argv[4]));json.dump(r,open(sys.argv[5],'w'));print('trace',sys.argv[3],len(r['steps']),'errs',r['errs'][:2])
    elif cmd=='cmp':
        a=json.load(open(sys.argv[2]));b=json.load(open(sys.argv[3]));print(sys.argv[2].split('/')[-1],compare(a,b))
    elif cmd=='run':
        # run FILE_A FILE_B seeds steps  → traza ambos y compara
        fa,fb,sd,ns=sys.argv[2],sys.argv[3],sys.argv[4].split(','),int(sys.argv[5])
        bad=0
        for s in sd:
            a=trace(fa,int(s),ns);b=trace(fb,int(s),ns)
            r=compare(a,b);print('seed',s,r if r[0]!='OK' else r,'errsA',len(a['errs']),'errsB',len(b['errs']))
            if r[0]!='OK':bad+=1
        sys.exit(1 if bad else 0)
