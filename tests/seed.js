// Estado de prueba determinista (entrenos, comidas, medidas…): se inyecta en la app con A y S ya cargados.
(()=>{const d=new Date();S.logs=[];for(let i=40;i>=1;i--){const t=new Date(d-i*864e5);S.logs.push({d:dk(t),n:['Pecho','Espalda','Pierna','Hombro'][i%4],v:4000+i*37,s:16,m:55,q:7,dl:0})}
 S.hist={'Press banca':[{d:'2026-10-01',s:[[5,80,0],[5,82.5,0]]},{d:'2026-10-08',s:[[5,85,0]]}],'Sentadilla':[{d:'2026-10-02',s:[[8,100,0]]}]};
 S.pr={'Press banca':{w:100,r:5,e:116,d:'2026-10-01'}};S.wl=[{d:'2026-10-01',w:80.5},{d:'2026-10-10',w:80}];S.wt={'2026-10-28':1500};
 const k=dk(d);S.meals[k]={0:[{n:'Arroz',g:150,b:[130,28,2.7,.3,0,0]}],1:[{n:'Pollo',g:180,b:[165,0,31,3.6,0,0]}]};S.meals['2026-10-20']={0:[{n:'Avena',g:60,b:[370,60,13,7,10,1]}]};
 S.cf=[{n:'Tarta de la abuela',b:[300,40,5,12,1,20]},{n:'Batido casero',b:[120,10,20,1,0,8]}];S.lib=[{n:'Plato fuerte',it:[{n:'Arroz',g:150,b:[130,28,2.7,.3,0,0]}]}];
 S.tp={t:{0:[{n:'Avena',g:60,b:[370,60,13,7,10,1]}]}};S.dt={'2026-10-28':'r'};S.fq={'Arroz':{c:3,g:150,b:[130,28,2.7,.3,0,0],t:Date.now()}};
 S.cx=[{n:'Mi ejercicio',c:'Culturismo',g:'Propio',t:'Personalizado',p:[],s:[],q:'Otro'}];S.cr=[{n:'Mi rutina',bl:[{ex:['Press banca'],s:3}]}];
 S.cp=[{n:'Mio',plan:cpClone(S.plan),t:1,src:'mine',d:'Hecho con tus workouts'}];S.notes={'Press banca':'Codos a 45'};S.bio={e:30,h:180,w:80};
 S.acc=1;S.gm=3;S.gl=1;S.theme='dark';S.wk=3;S.done={'3-0':true};S.rest=150;sv()})()
