/* ═══ cloud/hooks ═══
   Tareas que cloud/sync lanza sin conocer a quien las hace. Módulo sin dependencias, así cualquiera se apunta al cargar. Cada
   tarea se ocupa de sus errores.
   - afterSync: después de cada sincronización que termina bien (no tras la primera al entrar, que va sin pintar la app): la
     copia semanal en la nube (cloud/backup) y los fallos y sugerencias (system/report).
   - afterWithdrawal: cuando una sincronización ve que el consentimiento se retiró en otro dispositivo (account/privacy borra
     lo que queda en este).
   Define: afterSync, afterWithdrawal
*/
export const afterSync = [];
export const afterWithdrawal = [];
