// Compatibilidad para comparar con compilaciones anteriores a 1.20.0 (antes del renombrado de globales):
// si un nombre nuevo no existe en la página, lo define apuntando al antiguo. En compilaciones nuevas no hace nada.
(()=>{const M={saveState:'sv',dayKey:'dk',clone:'cpClone',confirmDialog:'zcf',showSummary:'f2Sum',sheet:'sh',groupOf:'gk',exSearchText:'exHay',nutriDayOffset:'ND'};
for(const n in M){let has=true;try{eval(n)}catch(e){has=false}if(!has){try{window[n]=eval(M[n])}catch(e){}}}})();
