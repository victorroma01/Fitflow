/* StrataFit · los tipos del guardado por partes y de la sincronización (core/parts, core/persist, cloud/merge, cloud/docs,
   cloud/sync), para el comprobador de tipos (tools/types.js). No es código: no entra en la app. */

/** Las huellas de los elementos de un documento en la última sincronización: { clave del elemento: huella }. */
type Hashes = Record<string, string>;
/** Los elementos de un documento, por su clave: un entreno por su id, un día de comidas por su fecha, el historial de un
    ejercicio por su nombre, cada clave del núcleo. */
type Items = Map<string, any>;
/** Cómo se trata un tipo de documento al juntar lo de dos dispositivos (cloud/merge: KINDS). */
interface DocKind {
  /** el documento, partido en elementos */
  split: (value: any) => Items;
  /** los elementos, otra vez como documento */
  join: (items: Items) => any;
  /** qué hacer con un elemento cambiado en los dos lados */
  both: (local: any, remote: any, localNewer: boolean) => any;
}
/** Lo que se recuerda de un documento sincronizado: su versión en la nube y las huellas de sus elementos (del perfil, solo las huellas). */
interface DocBase {
  r?: string;
  h: Hashes;
}
/** Lo que cloud/sync recuerda de la última sincronización (Store.K.sync). */
interface SyncMeta {
  /** id de este dispositivo */
  dev: string;
  /** de cada documento, lo de DocBase */
  base: Record<string, DocBase>;
  /** cuándo cambió por última vez en el móvil cada tipo de documento (ms) */
  lt: Record<string, number>;
  /** y las preferencias */
  pt: number;
  /** 1 tras entrar: en un conflicto gana la nube */
  fresh: number;
  /** última sincronización completa (ms) */
  last: number;
}
/** El estado guardado, repartido en claves (core/parts: splitState): el texto de cada una y las claves de todas sus partes. */
interface StateSplit {
  out: Record<string, string>;
  keys: string[];
}
/** Un documento leído de Firestore (cloud/firestore): sus campos y su versión (updateTime), para escribir con condición. */
interface RemoteDoc {
  data: Record<string, any>;
  ut: string;
  id?: string;
}
/** La sesión de la cuenta en este dispositivo (cloud/session; Store.K.acct). */
interface Account {
  uid: string;
  /** usuario */
  u: string;
  /** token de sesión, token de renovación y cuándo caduca el de sesión (ms) */
  it: string;
  rt: string;
  exp: number;
  /** 1 si la sesión ya no vale y hay que volver a entrar; 2 si es porque la cuenta ya no existe */
  x?: number;
  /** 1 o 2 si hay que cambiar una contraseña temporal */
  mc?: number;
  /** constancia de la aceptación de las condiciones y del consentimiento (cloud/consent) y 1 si aún no ha subido a la nube */
  cs?: Consent;
  csu?: number;
}
/** Una marca de la constancia: versión del texto, cuándo y, en el consentimiento, su estado (1 dado, 0 retirado; retirado,
    `ga` es cuándo se había dado). */
interface ConsentMark {
  v: string;
  at: number;
  st?: number;
  ga?: number;
}
/** Lo que la cuenta ha aceptado: t, las condiciones de uso; h, el consentimiento para tratar los datos de salud. */
interface Consent {
  t?: ConsentMark;
  h?: ConsentMark;
}
/** El adaptador al que core/store avisa de lo que se guarda (cloud/sync). */
interface RemoteAdapter {
  /** una clave se ha escrito (o borrado: sin valor) */
  changed?: (key: string, value?: string | null) => void;
  /** un guardado ha terminado bien y no queda nada sin escribir */
  saved?: () => void;
}
