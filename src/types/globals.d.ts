/* StrataFit · lo que el comprobador de tipos (tools/types.js) no puede saber por el código: lo que la app deja en window para
   index.html y para las pruebas, y lo del navegador que TypeScript no trae. No es código: no entra en la app. */
interface Window {
  /** 1 desde que el código de la app empieza a ejecutarse (core/util) */
  __ffs?: number;
  /** 1 desde el primer pintado (core/boot) */
  __ffok?: number;
  /** se cumple al terminar el arranque (core/boot) */
  __ffready?: Promise<void>;
  /** la pantalla de error de arranque de index.html */
  __ffe?: (message: string) => void;
  /** tests/walk.py: la lista donde core/persist anota las partes que una acción tocó sin decirlo */
  __ffHintCheck?: string[];
  /** reCAPTCHA Enterprise, cuando lo ha cargado cloud/appcheck */
  grecaptcha?: any;
  /** el AudioContext de los Safari antiguos */
  webkitAudioContext?: typeof AudioContext;
}
interface Navigator {
  /** Safari en iOS: true si la app se abrió desde su icono */
  standalone?: boolean;
}
interface Error {
  /** el código de un fallo de red o de Firebase (cloud/net: netError) y el estado HTTP */
  code?: string;
  status?: number;
}
/** El lector de códigos de barras de Chrome en Android (extras/foods-online); Safari no lo tiene. */
declare class BarcodeDetector {
  constructor(options?: { formats?: string[] });
  detect(source: any): Promise<{ rawValue: string }[]>;
}
/** isNaN también vale para saber si una fecha es válida: isNaN(new Date('x')). */
declare function isNaN(value: number | Date): boolean;
/* Los elementos de la página. El comprobador no puede saber qué etiqueta hay detrás de un id o de un selector (si es un
   <input> con su .value, un <details> con su .open…), así que lo que se busca en la página vale por cualquier elemento, como
   el $ de core/util. Lo que sí comprueba es lo que la app hace con sus propios datos. */
interface Document {
  getElementById(id: string): any;
  querySelector(selectors: string): any;
  querySelectorAll(selectors: string): any;
}
interface DocumentFragment {
  querySelector(selectors: string): any;
  querySelectorAll(selectors: string): any;
}
interface Element {
  querySelector(selectors: string): any;
  querySelectorAll(selectors: string): any;
  closest(selectors: string): any;
}
/* Y lo que llega a un manejador de eventos: su `target` es un elemento de la página, con lo suyo. */
interface Document {
  addEventListener(type: string, listener: (event: any) => void, options?: boolean | AddEventListenerOptions): void;
}
interface Window {
  addEventListener(type: string, listener: (event: any) => void, options?: boolean | AddEventListenerOptions): void;
}
interface Element {
  addEventListener(type: string, listener: (event: any) => void, options?: boolean | AddEventListenerOptions): void;
}
