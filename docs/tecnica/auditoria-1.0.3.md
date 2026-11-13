# Auditoría técnica de la V1.0.3

Auditoría completa de StrataFit sobre la V1.0.2 publicada (12 de noviembre de 2026): qué se miró y cómo, qué se encontró, qué
se corrigió en la V1.0.3 y qué queda pendiente. Lo que aquí se da por comprobado se ejecutó; lo que no se pudo ejecutar se dice
([Lo que no se pudo comprobar](#lo-que-no-se-pudo-comprobar)). Se hizo por fases dentro de la misma versión, en la rama
`desarrollo-1.0.3`, que se publica cuando el propietario lo confirme ([estado](#estado-por-fases)).

## Qué es el proyecto

| | |
| --- | --- |
| Lenguaje y marco | JavaScript (módulos ES), sin framework ni dependencias en tiempo de ejecución. 122 módulos, unas 16.000 líneas sin contar los datos; 29 trozos de CSS, unas 6.300 líneas. |
| Compilación | `build.py` + esbuild: 446 KB de código al arrancar y 227 KB que se cargan al usarlos (WOD, CSV, escáner, análisis, PDF y catálogo). |
| Dependencias | Tres, solo de desarrollo y con versión fija: esbuild, acorn y typescript. La app publicada no lleva ninguna librería de terceros. |
| Servidor | Firebase (Authentication y Firestore) por REST, plan Spark. La app funciona sin conexión y sincroniza después. |
| Datos | Núcleo en `localStorage`; entrenos, historial y comidas en IndexedDB; copia en la nube y en archivo. |
| Pruebas | Más de 1.100 comprobaciones en navegador (Chromium y WebKit) y con el emulador de Firebase; 34 pruebas de función suelta de los cálculos; el contraste de unos 35.000 textos en 32 configuraciones; 47 pantallas en 5 tamaños. |

## Cómo se auditó

1. **Lectura dirigida** de los módulos de cálculo y de entrada de datos: nutrición (`nutrition/home`, `diet`, `add`), entreno
   (`workout/session`, `finish`, `progression`, `targets`, `resume`), Dashboard (`dashboard/home`, `weight`, `history`,
   `progress`) y Perfil.
2. **Búsqueda sistemática** de patrones de riesgo en todo `src/js`: cada lectura de un número escrito por el usuario, cada
   cuenta con fechas sumando horas, cada `raw(…)`, `innerHTML`, `eval`, `catch` vacío y campo de texto sin largo máximo.
3. **Comprobación en la app**: cada sospecha se reprodujo en el navegador antes de tocar nada (un total que no cuadra, un
   número negativo que entra, un día que se salta, un entreno que no se puede guardar), con el reloj de prueba para los
   tiempos. Lo que no se pudo reproducir no se cuenta como error.
4. **Cuentas hechas aparte**: `tests/calc.py` y `tests/dashboard.py` repiten fuera de la app las sumas, las fórmulas y cada
   cifra del Dashboard, y las comparan con lo que la app enseña, con datos al azar (30 días de comidas, 300 perfiles, cinco
   meses de entrenos). Las reglas de la progresión se prueban sueltas con 3.000 sesiones al azar.
5. **Unidades**: con las cargas en libras, se recorrieron todas las pantallas buscando «kg» y toneladas.
6. **Contraste**: `tests/contrast.py` hace dos capturas de cada pantalla, una con las letras transparentes, y mide cada texto
   contra lo que tiene detrás de verdad (color, degradado, foto o vidrio), en 32 combinaciones de tema, estilo y color.
7. **Datos manipulados**: una copia de seguridad con código HTML en cada texto, en lugar de cada número y en claves nuevas,
   restaurada entera; se recorren 65 pantallas y avisos sin la política de seguridad (CSP), para que nada dependa de ella. La
   V1.0.2 pasó la misma prueba como control.
8. **Zonas táctiles**: en las 47 pantallas se toca alrededor de cada control (`elementFromPoint`) y se mide cuánto responde.
9. **Tamaños de pantalla**: las 47 pantallas a 320, 360, 430, 768 y 1.280 px de ancho, buscando desbordes, cosas que se salen
   y textos cortados; y los saltos de la pantalla al arrancar (layout shift).
10. **Revisión visual**: capturas de las 47 pantallas antes y después de cada fase, comparadas píxel a píxel y miradas una a una.
11. **Código repetido**: búsqueda automática de bloques y de texto repetidos entre módulos.
12. **Rendimiento**: `tests/perf.py` con 1,3 MB de datos (700 entrenos, 150 ejercicios con historial y tres años de comidas),
    alternando la V1.0.2 y la V1.0.3, y el perfil de CPU de Chromium para ver en qué se va el tiempo de cada pantalla.

## Diagnóstico por áreas

| Área | Estado al empezar | Lo encontrado |
| --- | --- | --- |
| Arquitectura | Bien | Módulos pequeños con dependencias explícitas, estado único, eventos delegados, sin código muerto (`tools/check.js` lo impide). Dos módulos grandes (`core/persist`, 681 líneas; `cloud/sync`, 627), vistas con líneas largas y unas pocas repeticiones entre módulos (fase 3). |
| Nutrición | **Errores** | N1 a N4. Las sumas en sí eran correctas. |
| Entreno | **Errores** | E1 a E11: lo que se guardaba de un entreno no siempre era lo que se hizo (pausa, reanudar, Swap) y la progresión fallaba en los bordes (pesos ligeros, pesos distintos por serie). |
| Dashboard y registros | **Errores** | D1 a D4. Todo sale de los registros reales; no hay cifras de ejemplo. Las marcas se calculaban en ocho sitios con reglas algo distintas. |
| Perfil y datos | **Errores** | P1 a P4. La persistencia y la sincronización están cubiertas por `storage.py` y `cloud.py`. |
| Unidades | **Error** | U1. El resto de la app ya convertía las cargas a libras. |
| Seguridad | **Un error** | S2: los datos guardados se daban por buenos al leerlos. Lo demás, bien: todo valor insertado se escapa (`core/html`), CSP estricta, sin secretos en el código (la clave de API de Firebase es pública por diseño; la de servicio, solo en GitHub). App Check sigue apagado (I-05). |
| Experiencia de uso | **Errores menores** | X1 a X5: avisos cortados, lo que se quita sin vuelta atrás, un fallo que no decía nada. |
| Accesibilidad | **Errores** | C1: 1.157 parejas de colores de texto y fondo no llegaban al contraste AA. A2 y A3: avisos sin anunciar y cuatro controles pequeños. Etiquetas, foco y ventanas, bien (`a11y.py`). |
| Compatibilidad | Bien, con un error | L1 (solo Chrome). Sin desbordes de 360 px en adelante; uno a 320 px (X3). |
| Rendimiento | Bien, con un punto lento | Medido en la V1.0.2 y otra vez en la V1.0.3 ([Rendimiento](rendimiento.md)): pintar una pestaña, menos de 10 ms con años de datos, y nada salta en la pantalla al arrancar (layout shift 0). R1: Registros tardaba en abrirse con muchos entrenos. |
| Pruebas | Bien, con límites | Casi todo eran pruebas de la app entera en el navegador; solo `cloud/merge` y el catálogo tenían pruebas de función suelta. Ahora también los cálculos y las reglas del entreno (`core/calc`). |

### Errores encontrados y corregidos

Todos se reprodujeron en la V1.0.2 antes de corregirlos, y cada uno tiene ahora su comprobación en la batería.

| Id | Gravedad | Qué pasaba | Corrección |
| --- | --- | --- | --- |
| N1 | Alta | Al reducir las comidas al día, lo anotado en las que ya no existían desaparecía de la lista y del total del día, pero el Dashboard sí lo contaba (100 kcal en Nutrición, 400 en Dashboard). | Esas comidas se siguen viendo («Comida 5 · Fuera de tus comidas del día») y cuentan en el total. |
| N2 | Media | Al añadir un alimento se aceptaban gramos negativos o disparatados (−500 g restaba kcal al día). Al cambiarlos después ya estaba limitado. | De 0,1 a 5.000 g, con coma o punto; si no, 100. |
| N3 | Media | Un alimento nuevo admitía valores negativos, de más de 100 g por 100 g y un nombre sin límite. | De 0 a 900 kcal y de 0 a 100 g; nombre de 80 letras. |
| N4 | Media | El día después del cambio de hora de marzo, entre las 00:00 y la 01:00, «ayer» se saltaba un día (se restaban 24 h a un día de 23 h): lo anotado iba a otra fecha. | El día se calcula por calendario (`nutriDate`). |
| E1 | Media | Una serie admitía repeticiones y peso negativos (−5 × −100 kg daban 500 kg de volumen). | De 0 a 100.000 (metros) y de 0 a 2.000 de peso. |
| E2 | Media | Guardar el entreno estando en pausa contaba la pausa en la duración (30 min de entreno y 20 de pausa: 50 min), y también el tiempo con la app cerrada si se cerró en pausa. | La duración sale de una sola cuenta (`elapsedMs`), que nunca incluye la pausa en curso. |
| E3 | Alta | Reanudar un entreno a medias después de cambiar los ejercicios de ese día del plan: las series hechas pasaban a otro ejercicio y, si el día tenía ahora menos ejercicios, el entreno no se podía guardar (fallaba al guardarlo). | El entreno a medias lleva sus ejercicios: se reanuda con ellos, cada serie va al historial de su ejercicio y, al guardar, el plan queda como lo dejó el usuario. |
| E4 | Baja | Un workout que se dejaba sin crear (salir del editor, o cerrar la app a medias) se quedaba vacío en la lista. | «Atrás» pregunta si se descarta, y uno vacío no se guarda ni se conserva al arrancar. |
| E5 | Media | Al cambiar un ejercicio por otro (Swap) con series ya hechas, esas series se guardaban en el historial del ejercicio nuevo, con sus récords. | Cada serie hecha recuerda con qué ejercicio se hizo; se avisa al cambiar. |
| E6 | Baja | Crear un ejercicio con el nombre de uno que ya existía lo duplicaba (dos fichas con el mismo nombre). | Se añade el que ya existe (sin mirar mayúsculas ni tildes). |
| E7 | Baja | Un día al que se le quitaban todos los ejercicios seguía ofreciendo «Empezar» y guardaba un entreno vacío. | Sin ejercicios no hay entreno. |
| E8 | Media | Semana de descarga (65 %) y bajada del 8 % con pesos ligeros: al redondear al escalón de carga, el peso propuesto no bajaba o subía (mancuernas de 2 kg: 2,5 kg). | La descarga y la bajada nunca dan más que el peso normal (`deloadWeight`, `nextWeight`). |
| E9 | Baja | Con menos peso que la barra, el calentamiento proponía aproximaciones más pesadas que la serie. | Solo aproximaciones por debajo del peso de trabajo; si no hay, lo dice. |
| E10 | Baja | El aviso «Nuevo récord» salía en cada serie con el mismo peso. | Sale una vez: al superar el historial y las series ya hechas de la sesión. |
| E11 | Media | Peso sugerido: si la última vez las series llevaban pesos distintos (de más a menos, por ejemplo), se proponía el mayor en todas. | Cada serie parte del peso que tuvo la última vez. |
| D1 | Baja | «Últimos 7 días» contaba ocho días de madrugada (comparaba horas con fechas en UTC). | Hoy y los seis días de antes, por fecha. |
| D2 | Media | Los ejercicios que se miden en metros o segundos con peso (trineo, paseo del granjero) salían en Récords con un 1RM imposible (los metros contaban como repeticiones); y una serie sin repeticiones, de más de 30 o un drop set contaban como marca. La regla estaba escrita en ocho sitios (récords, gráficas, ficha, estancamiento, análisis, resumen…), no siempre igual. | Una sola regla, `liftScore` (`core/calc`): de 1 a 30 repeticiones, sin series extra y solo en ejercicios de repeticiones. Los demás enseñan su peso máximo. |
| D3 | Media | Borrar un entreno en Registros dejaba sus series en el historial: los récords, las gráficas y la progresión seguían contando un entreno borrado. | Cada entreno y sus series llevan la misma marca (`t`) y se borran juntos; los récords y el último peso se recalculan. En entrenos antiguos, por fecha cuando no hay duda. |
| D4 | Baja | Cardio: la suma de kilómetros con decimales podía quedar una décima por debajo (coma flotante). | Se suma en centésimas (`kmTotal`). |
| P1 | Media | Evolución del peso aceptaba un peso negativo o imposible y una fecha futura, que pasaban al perfil y a los objetivos. | De 30 a 300 kg y hasta hoy; avisa si no. |
| P2 | Media | En Perfil, edad, altura y peso se guardaban sin comprobar (la bienvenida sí lo hacía), y con datos dañados el gasto salía negativo o «NaN». | Los mismos límites que la bienvenida; con datos imposibles no se calculan objetivos. |
| P3 | Baja | Con mucho peso y poco gasto, la proteína calculada pasaba del 90 % de las kcal y la grasa salía negativa; con poco gasto, menos de 800 kcal. | Proteína, 60 % como mucho; grasa, nunca negativa; mínimo 800 kcal. |
| P4 | Baja | Nombres (día, workout, plato, ejercicio, alimento) y notas sin largo máximo; un nombre podía quedarse vacío y un bloque no tenía tope de series. | 60-80 letras; notas, 2.000; un nombre vacío vuelve al anterior; 20 series como mucho. |
| U1 | Media | Con las cargas en libras, el análisis mensual y su PDF seguían dando el volumen en toneladas y los récords en kg. | Volumen en miles de libras y récords en libras; el peso corporal sigue en kg, como dice Ajustes. El ejemplo de la ventana del RPE también usa la unidad elegida. |
| S2 | Alta | Los datos guardados se daban por buenos al leerlos. Con una copia de seguridad manipulada (HTML donde va un número, una fecha o un texto propio de la app), la V1.0.2 pintaba ese HTML en 11 pantallas y avisos (la CSP impedía que se ejecutase, pero no debe depender de ella) y la página de peso dejaba de abrirse. El nombre de un entreno iba sin escapar al aviso de borrarlo. | `core/repair` valida al arrancar la forma y el tipo de cada dato (plan, historial, récords, pesajes, medidas, entrenos, workouts) y descarta lo que no vale; todo lo que va a un aviso se escapa. Ninguna de las 65 pantallas y avisos lo pinta ni falla, tampoco sin CSP. |
| C1 | Media | Contraste insuficiente (menos de 4,5:1) en 1.157 parejas de letra y fondo: el texto gris sobre las tarjetas de Cristal con el brillo de color detrás (los dos temas); las hojas del tema claro, que quedaban grises sobre el velo oscuro; el texto blanco sobre la parte clara del degradado del botón principal, el día elegido y la burbuja de pestañas (3:1); el texto de ayuda de los campos; los colores de los macros y de los estados sobre vidrio; el blanco sobre Naranja y Turquesa, y el texto sobre el brillo de Amarillo y Lima. | Colores de texto por nivel de Cristal (`css/90-glass`); hojas y páginas casi opacas en el tema claro; degradado del acento del tono principal a uno más oscuro (`--ag`); acento acotado detrás del texto (`--gmid`); Naranja y Turquesa algo más oscuros; un color propio elige el texto de encima con 4,5:1 (antes 3,2). Sin Cristal no cambia el gris. Ahora, ninguna pareja falla. |
| A2 | Baja | Los avisos breves no se anunciaban a los lectores de pantalla. | Región `role="status"` (`aria-live`). |
| A3 | Baja | Cuatro controles respondían en menos de 24 px de alto (dos desplegables y una casilla, 22 px), y el 89 % de los 975 medidos, en 44 × 44 px. | Zonas táctiles ampliadas con pseudo-elementos, sin cambiar el dibujo: ninguno por debajo de 24 px y el 92 %, en 44 × 44 px o más. |
| X1 | Media | Un aviso breve largo se cortaba por los dos lados de la pantalla (iba en una sola línea): el de no poder guardar, por ejemplo, no se leía entero. | Salta de línea, cabe a 320 px y dura más cuanto más largo es. |
| X2 | Baja | Quitar un alimento, un ejercicio del día, un plato guardado o una serie hecha, reiniciar la semana y guardar una plantilla sobre otra eran inmediatos y sin vuelta atrás. | El aviso trae «Deshacer» durante 6 segundos. Lo que no se puede recuperar así ya preguntaba antes. |
| X3 | Baja | A 320 px de ancho, la cuadrícula de grupos de la librería se salía 4 px y la hoja se desplazaba de lado. | Las figuras se ajustan al ancho de su columna. |
| X4 | Baja | «Atrás» dentro de un grupo de la librería cerraba la librería entera. | Vuelve a los grupos (`data-back`). |
| X5 | Baja | Un error inesperado no decía nada: lo que se había tocado parecía no hacer nada. | Aviso «Algo ha fallado…» (como mucho uno cada 30 s), además de anotarlo en Diagnóstico. |
| R1 | Baja | Con 700 entrenos, Registros tardaba 115 ms en abrirse en el ordenador de desarrollo (en un iPhone, del orden de medio segundo): cada fecha creaba su formato (`toLocaleDateString`), dos por entreno. El Dashboard calculaba en cada pintado el lunes de la semana de cada entreno. | Los formatos de fecha se reutilizan (`fmtDate`) y el lunes de cada día se recuerda (`mondayKey`): Registros, 35 ms; el Dashboard, un 30 % menos (de 6,1 a 4,3 ms). El HTML que sale es idéntico. |
| L1 | Media | En la app instalada, si fallaba la descarga de una parte que se carga al usarla (WOD, CSV, análisis, PDF, escáner), Chrome recordaba el fallo mientras durase la página: no se podía volver a intentar sin cerrar la app. Y mientras se descargaba no se decía nada. | Se reintenta con otra dirección (`core/lazy`: `lazyLoad`), y dice «Cargando…» si tarda más de medio segundo. |

### Comprobado y correcto

- **Sumas de nutrición**: total del día y de cada comida iguales a la suma de sus alimentos en 30 días al azar con 2 a 6
  comidas, y a las kcal del Dashboard. Se suma sin redondear y se redondea al enseñar.
- **Objetivos**: Mifflin-St Jeor por el factor de actividad, en 300 perfiles al azar (y 5.000 en la prueba suelta); los
  porcentajes suman 100 y los gramos del objetivo dan sus kcal (4, 4 y 9 kcal/g).
- **Entreno**: el volumen guardado es la suma de repeticiones × peso de las series hechas, escribiendo en kg y en lb (se guarda
  en kg); el récord es el mejor 1RM de Epley; la progresión propone lo que dice la regla en 60 sesiones al azar dentro de la
  app y en 3.000 sueltas (sube, baja o mantiene); los descansos y el reloj del WOD (`session.py`), y la duración sin pausas.
- **Dashboard**: con cinco meses de entrenos, cardio, WOD, pesajes, comidas e historial al azar, cada cifra y cada gráfica
  coincide con la misma cuenta hecha aparte: resumen, columnas de volumen, calendario, semana y rachas, récords, progreso de
  un ejercicio, cardio, peso, Registros, nutrición de 7 días y estancamiento. Todo se pone al día al guardar y al borrar.
- **Exportar e importar**: cada CSV lleva una fila por dato con sus valores, y una copia de seguridad restaurada sobre otros
  datos deja el estado idéntico.
- **Fechas**: día anterior y siguiente en los dos cambios de hora y en fin de año; las semanas, de lunes a domingo, en dos
  años enteros.
- **Contraste**: unos 35.000 textos en 32 configuraciones (los dos temas; sin Cristal y con el Cristal suave, el de serie y el
  intenso; los 11 colores de acento y uno propio): todos llegan a 4,5:1 (3:1 los grandes y los signos que hacen de icono).
- **Tamaños de pantalla**: las 47 pantallas a 320 × 568, 360 × 740, 430 × 932, 768 × 1024 y 1280 × 800: sin desplazamiento
  horizontal, nada se sale y ningún texto queda cortado; en pantallas grandes, una columna centrada. Layout shift al arrancar: 0.
- **Seguridad**: nombres, foto y datos con HTML malicioso en 47 pantallas y una copia manipulada entera en 65 pantallas y
  avisos: no se ejecuta ni se pinta nada, tampoco sin la CSP; con la CSP, nada inyectado conecta con otros sitios. Las reglas
  de Firestore, contra el emulador (`rules.test.mjs`).
- **Sin cambios de más**: al mover los cálculos a `core/calc`, el HTML de las 47 pantallas es idéntico al de antes
  (`tests/samehtml.py`); las zonas táctiles no cambian un píxel de las capturas.

### Lo que no se pudo comprobar

| Qué | Por qué | Cómo queda cubierto |
| --- | --- | --- |
| Un iPhone y un Android de verdad | No hay dispositivos en este entorno: solo Chromium y WebKit en Linux. | La [lista de comprobación](pruebas.md#en-los-móviles-de-verdad-t-06) del propietario antes de publicar. |
| VoiceOver y TalkBack | Igual. | Se comprueba lo que usan (nombres, roles, ventanas, foco, región de avisos), no cómo lo leen. |
| Firefox | No está instalado en este entorno. | Un trabajo informativo en GitHub Actions pasa la batería con Firefox en cada subida. |
| `npm audit` | Este entorno no tiene acceso al registro de npm. | Se pasa en GitHub Actions en cada subida y avisa si hay algo alto o crítico. |
| Cobertura mala de verdad | Se simula cortando y retrasando las descargas. | `ux.py` y `deploy.py`. |

## Mejoras y novedades de la V1.0.3

| | Qué |
| --- | --- |
| Novedad | **La semana en Nutrición**: una barra por día con sus kcal frente al objetivo, la media de kcal y de proteína de los días ya terminados y cuántos quedaron en objetivo; al tocar un día se va a él (`nutrition/week`). En el Dashboard, la tarjeta **Nutrición · 7 días**. |
| Novedad | **Ejercicios propios**: renombrarlos (con su historial, récords, notas y los días y workouts donde están) y eliminarlos (`library/custom`). |
| Novedad | **Historial de pesajes** en Evolución del peso, con borrado. |
| Novedad | **«Deshacer»** en lo que se quita de un toque (X2). |
| Mejora | **Contraste AA** en todo el texto, con cualquier tema, estilo y color (C1). |
| Mejora | **Validación** de todo número que se escribe (N2, N3, E1, P1, P2), con coma o punto decimal, y largo máximo en nombres y notas (P4). |
| Mejora | **Peso sugerido** serie a serie (E11) y **borrar un entreno** con sus series (D3). |
| Mejora | **Avisos** que caben, duran lo que hace falta y se anuncian (X1, A2); **zonas táctiles** más amplias (A3); **«Cargando…»** y reintento (L1); aviso de un error inesperado (X5). |
| Mejora | **Rendimiento**: Registros se abre más de 3 veces más rápido con muchos entrenos y el Dashboard se pinta un 30 % antes (R1). |
| Código | **`core/calc`**: sumas de nutrición, objetivos, volumen, mejor marca, semanas y las reglas del entreno (en qué se mide un ejercicio, qué serie cuenta, duración, progresión, descarga), en funciones sin estado. El Dashboard, Nutrición, la semana, el análisis mensual y el entreno usan las mismas, así que no pueden dar cifras distintas. |
| Código | **`core/repair`** valida al arrancar cada dato guardado (S2); **`core/toast`** y **`core/lazy`**, rehechos. |
| Pruebas | Nuevas: `calc.py`, `calc.test.mjs` (34 pruebas de función suelta), `contrast.py`, `samehtml.py`, `training.py` (76 comprobaciones), `dashboard.py` (39), `layout.py` (47 pantallas × 5 tamaños) y `ux.py` (26). Ampliadas: `security.py` (copia manipulada), `a11y.py` (zonas táctiles en todas las pantallas) y `safety.py`. En GitHub, `npm audit` y Firefox. |

## Estado por fases

La V1.0.3 se publica cuando estén todas y el propietario lo confirme; hasta entonces vive en la rama `desarrollo-1.0.3`.

| Fase | Estado | Hecho | Falta |
| --- | --- | --- | --- |
| 1 · Auditoría y diagnóstico | Hecha | Este documento. | — |
| 2 · Errores críticos | Hecha | N1-N4, E1, D1, P1-P4 y U1; después, E3 y S2. | — |
| 3 · Arquitectura y código | En parte | `core/calc`. | Partir `core/persist` y `cloud/sync`; vistas con líneas largas; lo repetido entre módulos. |
| 4 · Entrenamiento y nutrición | Hecha | Entreno a fondo (E2-E11), ejercicios propios, la semana de Nutrición y los cálculos comprobados. | — |
| 5 · Dashboard, perfil y persistencia | Hecha | Cada cifra frente a los registros (D2-D4), borrar con sus series, pesajes, CSV y copia de seguridad, datos manipulados (S2). | — |
| 6 · UX/UI, rendimiento y accesibilidad | Hecha | Contraste (C1), avisos y «Deshacer» (X1, X2, X5, A2), zonas táctiles (A3), cargas (L1), «atrás» (X4), saltos visuales y rendimiento medido de nuevo (R1). | — |
| 7 · Seguridad, pruebas y compatibilidad | Hecha, con límites | Tamaños de pantalla (X3), datos manipulados, `npm audit` y Firefox en GitHub. | Lo que no se pudo comprobar aquí (arriba). |
| 8 · Verificación final y documentación | Al final | — | Batería completa, capturas e informe final. |

## Pendiente

| | Qué | Por qué no está hecho |
| --- | --- | --- |
| 1 | Lo que falta de las fases 3 y 8 (tabla de arriba). | Se hace por tandas. |
| 2 | Cada alimento enseña sus valores redondeados y el total se redondea aparte: la suma de lo que se ve puede diferir en 1. | Es lo correcto (redondear la suma, no sumar redondeos), pero no se explica en la app. |
| 3 | Los logros de volumen («Mueve 10 toneladas») siguen en toneladas con las cargas en libras. | A propósito: es su nombre y su meta; el volumen del Dashboard y del análisis sí va en libras. |
| 4 | App Check (I-05), apagado hasta activarlo en la consola. | Paso del propietario. |
| 5 | Prueba en un Android de verdad (I-01) y con VoiceOver en un iPhone. | No hay dispositivos en este entorno. |
| 6 | Editar una serie de un entreno ya guardado (hoy se borra el entreno entero con sus series). | Función nueva: cambia el historial, los récords y la sincronización; mejor en una versión propia. |
| 7 | «Log out», el botón que guarda el entreno, puede confundirse con cerrar la sesión de la cuenta. | Es un cambio de nombre visible en la pantalla principal del entreno: decisión del propietario. |
| 8 | Alertas de Dependabot, desactivadas en el repositorio. | Ajuste del repositorio (Settings → Code security): paso del propietario. |

## Limitaciones técnicas

- **Plan Spark de Firebase**: 20.000 escrituras al día y 1 GiB para todas las cuentas ([Servidor](backend.md#límites-del-plan-spark)).
- **Sin servidor propio**: nada se valida fuera del móvil salvo lo que comprueban las reglas de Firestore (forma y tamaño).
  Por eso la app valida al arrancar todo lo que lee (S2).
- **iPhone**: el icono de una app instalada no cambia solo, y no hay vibración ni notificaciones sin una app de tienda.
- **Contraste sobre vidrio**: con Cristal, el fondo de cada texto depende de lo que haya detrás. La prueba mide las 47 pantallas
  con los datos de ejemplo; con otras fotos u otros datos, un texto puede quedar sobre un fondo que no se ha medido.
- **Entrenos de antes de la V1.0.3**: no llevan la marca que une un entreno con sus series; al borrar uno, sus series solo se
  borran si ese día no hay otro entreno (si no, no se sabe de cuál son y se avisa).
- **«Deshacer»** dura 6 segundos y solo cubre la última acción: no es un historial de cambios.

## Recomendaciones para versiones futuras

1. Estadísticas avanzadas sobre `core/calc`: volumen por grupo muscular y por semana, y progresión de cada ejercicio.
2. Planificación semanal de comidas a partir de las plantillas y de la semana.
3. Activar App Check antes de abrir la app a más gente, y las alertas de Dependabot en el repositorio.
4. Editar las series de un entreno guardado (pendiente 6) y decidir el nombre de «Log out» (pendiente 7).
5. Repetir la lista de comprobación en un iPhone y un Android de verdad en cada versión, y una pasada con VoiceOver.
