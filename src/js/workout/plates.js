/* ═══ workout/plates ═══
   Calculadora de discos.
   Define: ZPW, ZPB, zbb, ffPlates, ffBars, zpc2, zpb2, zpsh2  · acciones/registros: 3
*/
let ZPW=60,ZPB=20;
const zbb=n=>{const e=exAll().find(x=>x.n==n);return e&&e.q?['Barra','Barra Z'].includes(e.q)&&!/Plancha|Giro|Hiperext|Superman|Encog/.test(n):/barra|banca|sentadilla|peso muerto/i.test(n)};
const ffPlates=()=>ffLb()?[45,35,25,10,5,2.5]:[25,20,15,10,5,2.5,1.25];
const ffBars=()=>ffLb()?[45,35,15]:[20,15,10];
const zpc2=(w,b)=>{let r=(w-b)/2;if(!(r>=0))return null;const o=[];ffPlates().forEach(q=>{const n=Math.floor(r/q+1e-9);if(n>0){o.push([q,n]);r-=n*q}});return{o,rem:Math.round(r*100)/100}};
const zpb2=()=>{const c=zpc2(ZPW,ZPB),u=ffUL();if(!c)return '<p class="mu">El peso total es menor que la barra.</p>';
 return(c.o.length?'<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">'+c.o.map(x=>'<span class="tg" style="font-size:16px;padding:9px 14px"><b>'+x[1]+' ×</b> '+x[0]+' '+u+'</span>').join('')+'</div>':'<p class="mu">Solo la barra.</p>')+'<p class="mu">Discos por cada lado con una barra de '+ZPB+' '+u+'.'+(c.rem?' Sobran '+c.rem+' '+u+' por lado: ajusta el peso.':'')+'</p>'};
const zpsh2=()=>'<h3>Calculadora de discos</h3><label>Peso total ('+ffUL()+')</label><input type="number" inputmode="decimal" data-u="zpw" value="'+ZPW+'"><label>Barra</label><div class="g2" style="grid-template-columns:repeat(3,1fr)">'+ffBars().map(b=>'<button data-a="zpbar" data-i="'+b+'" style="'+(ZPB==b?'border-color:var(--a2);color:var(--a1)':'')+'">'+b+' '+ffUL()+'</button>').join('')+'</div><div id="zpr">'+zpb2()+'</div>';
A.zpl=i=>{const a=W.x[i],q=a.find(x=>!x.ok&&+x.w>0)||a.find(x=>+x.w>0);ZPW=q?ffDW(q.w):(ffLb()?135:60);if(!ffBars().includes(ZPB))ZPB=ffBars()[0];sh(zpsh2())};
A.zpbar=i=>{ZPB=i;sh(zpsh2())};
U.zpw=v=>{ZPW=+v||0;const e=$('#zpr');if(e)e.innerHTML=zpb2()};
