/* ═══ cloud/hooks ═══
   Tareas para después de cada sincronización que termina bien (cloud/sync las lanza; no tras la primera al entrar, que va sin
   pintar la app): la copia semanal en la nube (cloud/backup) y los fallos y sugerencias (system/report). Módulo sin
   dependencias, así cualquiera se apunta al cargar. Cada tarea se ocupa de sus errores.
   Define: afterSync
*/
export const afterSync = [];
