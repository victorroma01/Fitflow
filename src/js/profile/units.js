/* ═══ profile/units ═══
   Unidades de carga kg/lb.
   Define: ffUL, ffDW, ffUW, ffVT, ffLb, unitUI  · acciones/registros: 1
*/
const ffUL=()=>S.un=='lb'?'lb':'kg';
const ffDW=v=>{v=+v||0;return S.un=='lb'?Math.round(v*2.20462*10)/10:Math.round(v*100)/100};
const ffUW=v=>{v=+v||0;return S.un=='lb'?Math.round(v/2.20462*100)/100:v};
const ffVT=(v,d)=>{const x=(S.un=='lb'?ffDW(v):v)/1000;return(d?R1(x):Z(x))+(S.un=='lb'?' k lb':' t')};
const ffLb=()=>S.un=='lb';
const unitUI=()=>'<label>Unidades de carga</label>'+ffSeg('un',ffLb()?'lb':'kg',[['kg','Kilos (kg)'],['lb','Libras (lb)']])+'<small class="mu" style="display:block;margin-top:4px">Cambia pesos, discos, volumen y récords. El peso corporal sigue en kg.</small>';
A.un=(i,b)=>{S.un=b.dataset.v=='lb'?'lb':'kg';ZPW=ffLb()?135:60;ZPB=ffLb()?45:20;sv();R()};
