/* ═══ core/registry ═══
   Registros de eventos delegados: A (data-a), C (data-c change) y U (data-u input).
   Define: A, C, U
*/
/* Cada función con interfaz añade sus manejadores junto a su código:  A.nombre=(i,b)=>{…}  ←  data-a="nombre" data-i=i
   A: clic (data-a) · C: cambio de select/checkbox (data-c) · U: escritura en inputs (data-u). Una clave no puede definirse dos veces
   (tools/check.js lo comprueba). Estas tres const deben ser lo primero que se carga después de core/util. */
const A={},C={},U={};
