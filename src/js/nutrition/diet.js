/* ═══ nutrition/diet ═══
   Cálculo de gasto energético (TDEE) y tipos de dieta.
   Define: DT, AF, ACT, GL, GD, tdee, ap, dietUI
*/
const DT=[['Mini cut',.75,2.4,.8,'Déficit fuerte y corto (2-4 semanas) con mucha proteína'],['Recomposición',1,2.2,.9,'Calorías de mantenimiento con proteína alta'],['Hipocalórica',.85,2.2,.8,'Déficit moderado para perder grasa'],['Mantenimiento',1,1.8,1,'Peso estable'],['Hipercalórica',1.12,2,1,'Superávit para ganar masa']],AF=[1.2,1.375,1.55,1.725,1.9],ACT=[['Baja','sedentario, menos de 5.000 pasos'],['Media','5.000-8.000 pasos o 1-3 entrenos'],['Moderada','8.000-10.000 pasos o 3-5 entrenos'],['Alta','10.000-12.000 pasos o 6-7 entrenos'],['Muy alta','más de 12.000 pasos o trabajo físico']],GL=['Definir','Mantenimiento','Volumen','Recomposición'],GD=[2,3,4,1];
function tdee(){const b=S.bio,w=+b.w,h=+b.h,a=+b.age;if(!w||!h||!a)return 0;const bm=10*w+6.25*h-5*a+(b.sex=='F'?-161:5);return{bm,td:bm*AF[b.act==null?1:+b.act]}}
function ap(){const t=tdee();if(!t)return;const d=DT[S.nu.dt==null?3:S.nu.dt],w=+S.bio.w,k=Z(t.td*d[1]),pp=Math.round(d[2]*w*400/k),fp=Math.min(Math.round(d[3]*w*900/k),90-pp);S.nu.k=k;S.nu.p=pp;S.nu.f=fp;S.nu.c=100-pp-fp}
function dietUI(){const t=tdee(),i=S.nu.dt==null?3:S.nu.dt;return '<details class="cd"><summary>Tipo de dieta: '+DT[i][0]+'</summary><label>Elige tu dieta</label><select data-c="dt">'+DT.map((d,j)=>'<option value="'+j+'"'+(j==i?' selected':'')+'>'+d[0]+'</option>').join('')+'</select><p class="mu">'+DT[i][4]+'. Proteína '+DT[i][2]+' g/kg, grasas '+DT[i][3]+' g/kg e hidratos el resto.</p>'+(t?'<small>Metabolismo basal '+Z(t.bm)+' kcal · gasto total '+Z(t.td)+' kcal · objetivo '+Z(S.nu.k)+' kcal</small>':'<small style="color:var(--c)">Completa tus datos biométricos en Perfil para ajustar kcal y macros automáticamente.</small>')+'</details>'}

/* — manejadores de esta función (registros A / C / U) — */
C.dt=e=>{S.nu.dt=+e.value;ap();sv();R()};
