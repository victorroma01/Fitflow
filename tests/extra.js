// Datos adicionales de prueba: cardio, WOD, historial de un ejercicio y medidas.
(()=>{S.logs.push({d:'2026-10-25',n:'Cardio · Carrera',v:0,s:0,m:31,q:0,k:'c',x:'5.2 km · 31:00 · 5:57 /km',c:{t:'run',km:5.2,sec:1860}});
  S.logs.push({d:'2026-10-26',n:'WOD · AMRAP 12 min',v:0,s:0,m:12,q:0,k:'w',x:'5 rondas + 7 reps',w:{md:'amrap',r:5},nt:'Cindy con chaleco'});
  const n=S.plan[0].ex[0].n;const mk=(d,w)=>({d,s:[[5,w,0],[5,w-5,0]]});S.hist[n]=[mk('2026-10-27',90),mk('2026-10-20',90),mk('2026-10-13',92.5),mk('2026-10-06',95),mk('2026-09-29',92.5)];
  S.ms=[{d:'2026-09-01',v:{ci:84.5,br:36,pe:102}},{d:'2026-10-20',v:{ci:80.5,br:37.2,pe:103,mu:60,ge:38,ca:96,ho:118,cu:38}}];saveState()})()
