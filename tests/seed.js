// Estado de prueba determinista (entrenos, comidas, medidas…): se inyecta en la app con A y S ya cargados.
(()=>{const d=new Date();S.logs=[];for(let i=40;i>=1;i--){const t=new Date(d-i*864e5);S.logs.push({d:dayKey(t),n:['Pecho','Espalda','Pierna','Hombro'][i%4],v:4000+i*37,s:16,m:55,q:7,dl:0})}
 S.exerciseHistory={'Press banca':[{d:'2026-10-01',s:[[5,80,0],[5,82.5,0]]},{d:'2026-10-08',s:[[5,85,0]]}],'Sentadilla':[{d:'2026-10-02',s:[[8,100,0]]}]};
 S.records={'Press banca':{w:100,r:5,e:116,d:'2026-10-01'}};S.weightLog=[{d:'2026-10-01',w:80.5},{d:'2026-10-10',w:80}];S.water={'2026-10-28':1500};
 const k=dayKey(d);S.meals[k]={0:[{n:'Arroz',g:150,b:[130,28,2.7,.3,0,0]}],1:[{n:'Pollo',g:180,b:[165,0,31,3.6,0,0]}]};S.meals['2026-10-20']={0:[{n:'Avena',g:60,b:[370,60,13,7,10,1]}]};
 S.myFoods=[{n:'Tarta de la abuela',b:[300,40,5,12,1,20]},{n:'Batido casero',b:[120,10,20,1,0,8]}];S.savedDishes=[{n:'Plato fuerte',it:[{n:'Arroz',g:150,b:[130,28,2.7,.3,0,0]}]}];
 S.mealTemplates={t:{0:[{n:'Avena',g:60,b:[370,60,13,7,10,1]}]}};S.dt={'2026-10-28':'r'};S.frequentFoods={'Arroz':{c:3,g:150,b:[130,28,2.7,.3,0,0],t:Date.now()}};
 S.customExercises=[{n:'Mi ejercicio',c:'Culturismo',g:'Propio',t:'Personalizado',p:[],s:[],q:'Otro'}];S.routines=[{n:'Mi rutina',bl:[{ex:['Press banca'],s:3}]}];
 S.ownPrograms=[{n:'Mio',plan:clone(S.plan),t:1,src:'mine',d:'Hecho con tus workouts'}];S.exerciseNotes={'Press banca':'Codos a 45'};S.biometrics={e:30,h:180,w:80};
 S.accent=1;S.glassLevel=3;S.glassOn=1;S.theme='dark';S.week=3;S.doneDays={'3-0':true};S.defaultRest=150;saveState()})()
