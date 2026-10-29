/* ═══ workout/rest ═══
   Descansos por defecto y selector de descanso.
   Define: CP, RO, rsDefault, rsx, rsel, RSH, rs0
*/
const CP=/^(Press banca|Press militar|Sentadilla|Peso muerto|Dominadas|Remo con barra|Remo T|Remo Pendlay|Prensa|Hack|Hip thrust|Clean|Snatch|Thruster|Power|Overhead|Push press|Buenos)/,RO=[30,45,60,75,90,120,150,180,210,240,300];
function rsDefault(n){const e=EX.concat(S.cx).find(x=>x.n==n),g=e?gk(e):'';if(CP.test(n))return 150;if(g=='Cardio'||g=='CrossFit')return 60;if(g=='Hyrox')return 90;if(g=='Funcional')return 45;if(['Bíceps','Tríceps','Antebrazos','Gemelos','Abdomen'].includes(g)||/Elevaciones|Pájaros|Face pull/.test(n))return 60;return g?90:S.rest}
const rsx=e=>e.r||rs0(e.n);
const rsel=e=>{const r=rsx(e);return '<select data-c="rx" data-i="'+S.plan[S.sel].ex.indexOf(e)+'" style="width:auto;padding:5px 10px;font-size:13px">'+RO.concat(RO.includes(r)?[]:[r]).sort((a,b)=>a-b).map(v=>'<option value="'+v+'"'+(v==r?' selected':'')+'>Descanso '+F(v)+' por serie</option>').join('')+'</select>'};
const RSH=new Set(['Press plano','Press inclinado','Press declinado','Press vertical','Dominadas','Remo horizontal','Cadena posterior','Sentadilla','Prensa y hack','Bisagra de cadera','Empuje de cadera','Halterofilia']);
function rs0(n){const e=exAll().find(x=>x.n==n),u=uD(n);if(u)return u.u=='min'?60:u.u=='s'?45:u.u=='cal'?90:u.rg[0]>=400?120:90;if(/Burpee|Wall ball|Thruster|Double under|Toes to bar|Box jump|Swing|Snatch|Clean/i.test(n))return 60;const bar=e&&['Barra','Smith','Barra Z'].includes(e.q),hv=e&&RSH.has(e.t);if(hv&&bar)return /Peso muerto|Sentadilla/i.test(n)&&!/rumano|búlgara|goblet|frontal/i.test(n)?180:150;if(hv)return /Máquina|Polea/.test(e.q)?90:120;if(e&&gk(e)=='Abdomen')return 45;return rsDefault(n)}

/* — manejadores de esta función (registros A / C / U) — */
C.rx=(e,i)=>{S.plan[S.sel].ex[i].r=+e.value;sv();if(!W)R()};
C.rs=e=>{S.rest=+e.value||120;sv()};
