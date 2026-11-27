/* StrataFit · el motor de las figuras 3D (src/fig3d) visto desde la app, para el comprobador de tipos (tools/types.js): lo que
   usa de él extras/figure3d. El motor no es un módulo de src/js (build.py lo mete en extras/motor3d al compilar), así que lo
   que da se dice aquí. No es código: no entra en la app. */

/** Una cámara del motor (Fig3D.camera): proyecta un punto 3D en el dibujo. */
interface Fig3DCamera {
  P(p: number[]): number[];
}

/** Un ejercicio del motor (Fig3D.make): su gesto entero y cómo se ve. */
interface Fig3DExercise {
  name: string;
  /** la cámara de tres cuartos: giro y elevación, en grados */
  yaw: number;
  pitch: number;
  /** dónde acaba el esfuerzo ('a', el momento 0; 'b', el 1) y dónde se descansa */
  up: string;
  rest?: string;
  /** lo que se espera en la postura final, en ms */
  pause: number;
  /** su propio reloj (ms → momento del gesto, de 0 a 1), en vez del de ida y vuelta del motor: un ciclo, un gesto que
      alterna los lados, una secuencia, una postura que se mantiene */
  beat?: (ms: number) => number;
}

/** El motor: lo que deja en Fig3D. */
interface Fig3D {
  /** los degradados y rayados que comparten todas las figuras (dentro de un <defs>) */
  DEFS: string;
  /** el ejercicio de una familia y sus variantes (palabras de data/figposes), con sus músculos principales y secundarios */
  make(name: string, words: string, P: string[], S: string[]): Fig3DExercise | null;
  /** la figura en el momento t (0 a 1) desde la cámara cam, en SVG; pre, el prefijo de lo que define; lite, sin el rayado */
  draw(ex: Fig3DExercise, t: number, cam: Fig3DCamera, pre?: string, lite?: boolean): string;
  camera(yaw: number, pitch: number): Fig3DCamera;
  /** el reloj de ida y vuelta: el momento del gesto a los ms de empezar */
  beat(ms: number, up: string, long: boolean, pause?: number, rest?: string): number;
}
