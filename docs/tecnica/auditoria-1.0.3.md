# Auditoría técnica de la V1.0.3

Auditoría completa de StrataFit sobre la V1.0.2 publicada (12 de noviembre de 2026): qué se miró y cómo, qué se encontró, qué
se corrigió en la V1.0.3 y qué queda pendiente. Lo que aquí se da por comprobado se ejecutó; lo que no se pudo ejecutar se dice.
Se hace por tandas dentro de la misma versión, que se publica cuando estén todas las fases ([estado](#estado-por-fases)).

## Qué es el proyecto

| | |
| --- | --- |
| Lenguaje y marco | JavaScript (módulos ES), sin framework ni dependencias en tiempo de ejecución. 121 módulos, unas 16.000 líneas; 29 trozos de CSS, unas 6.000 líneas. |
| Compilación | `build.py` + esbuild: 428 KB de código al arrancar y 227 KB que se cargan al usarlos (WOD, CSV, escáner, catálogo). |
| Dependencias | Tres, solo de desarrollo y con versión fija: esbuild, acorn y typescript. |
| Servidor | Firebase (Authentication y Firestore) por REST, plan Spark. La app funciona sin conexión y sincroniza después. |
| Datos | Núcleo en `localStorage`; entrenos, historial y comidas en IndexedDB; copia en la nube y en archivo. |
| Pruebas | Más de 850 comprobaciones en navegador (Chromium y WebKit) y con el emulador de Firebase; 21 pruebas de función suelta de los cálculos, y el contraste de unos 35.000 textos en 32 configuraciones. |

## Cómo se auditó

1. **Lectura dirigida** de los módulos de cálculo y de entrada de datos: nutrición (`nutrition/home`, `diet`, `add`), entreno
   (`workout/session`, `finish`, `progression`, `targets`), Dashboard (`dashboard/home`, `weight`) y Perfil.
2. **Búsqueda sistemática** de patrones de riesgo en todo `src/js`: cada lectura de un número escrito por el usuario, cada
   cuenta con fechas sumando horas, cada `raw(…)`, `innerHTML`, `eval`, `catch` vacío y campo de texto sin largo máximo.
3. **Comprobación en la app**: cada sospecha se reprodujo en el navegador antes de tocar nada (un total que no cuadra, un
   número negativo que entra, un día que se salta).
4. **Cuentas hechas aparte**: `tests/calc.py` repite fuera de la app las sumas y fórmulas y las compara con lo que la app
   enseña, con datos al azar.

5. **Unidades**: con las cargas en libras, se recorrieron todas las pantallas buscando «kg» y toneladas.
6. **Contraste**: `tests/contrast.py` hace dos capturas de cada pantalla, una con las letras transparentes, y mide cada texto
   contra lo que tiene detrás de verdad (color, degradado, foto o vidrio), en 32 combinaciones de tema, estilo y color.

## Diagnóstico por áreas

| Área | Estado | Lo encontrado |
| --- | --- | --- |
| Arquitectura | Bien | Módulos pequeños con dependencias explícitas, estado único, eventos delegados, sin código muerto (`tools/check.js` lo impide). Quedan dos módulos grandes (`core/persist`, 681 líneas; `cloud/sync`, 627) y vistas con líneas largas. |
| Nutrición | **Errores** | N1, N2, N3, N4 (abajo). Las sumas en sí eran correctas. |
| Entreno | **Error** | E1. El volumen, el 1RM y la progresión calculan bien. |
| Dashboard | **Errores menores** | D1. Todo sale de los registros reales; no hay cifras de ejemplo. |
| Perfil y datos | **Errores** | P1, P2. La persistencia y la sincronización están cubiertas por `storage.py` y `cloud.py`. |
| Unidades | **Error** | U1. El resto de la app ya convertía las cargas a libras. |
| Seguridad | Bien | Todo valor insertado se escapa (`core/html`); `security.py` inyecta HTML en todos los campos y recorre 47 pantallas; CSP estricta; sin secretos en el código (la clave de API de Firebase es pública por diseño; la de servicio, solo en GitHub). App Check sigue apagado (I-05). |
| Rendimiento | Bien | Medido en la V1.0.2 ([Rendimiento](rendimiento.md)): pintar una pestaña, menos de 10 ms con años de datos. |
| Accesibilidad | **Errores** | C1: 1.157 parejas de colores de texto y fondo no llegaban al contraste AA. Etiquetas, foco y ventanas, bien (`a11y.py`). |
| Pruebas | Bien, con límites | Casi todo eran pruebas de la app entera en el navegador; solo `cloud/merge` y el catálogo tenían pruebas de función suelta. Ahora también los cálculos (`core/calc`). |

### Errores encontrados y corregidos

| Id | Gravedad | Qué pasaba | Corrección |
| --- | --- | --- | --- |
| N1 | Alta | Al reducir las comidas al día, lo anotado en las que ya no existían desaparecía de la lista y del total del día, pero el Dashboard sí lo contaba (100 kcal en Nutrición, 400 en Dashboard). | Esas comidas se siguen viendo («Comida 5 · Fuera de tus comidas del día») y cuentan en el total. |
| N2 | Media | Al añadir un alimento se aceptaban gramos negativos o disparatados (−500 g restaba kcal al día). Al cambiarlos después ya estaba limitado. | De 0,1 a 5.000 g, con coma o punto; si no, 100. |
| N3 | Media | Un alimento nuevo admitía valores negativos, de más de 100 g por 100 g y un nombre sin límite. | De 0 a 900 kcal y de 0 a 100 g; nombre de 80 letras. |
| N4 | Media | El día después del cambio de hora de marzo, entre las 00:00 y la 01:00, «ayer» se saltaba un día (se restaban 24 h a un día de 23 h): lo anotado iba a otra fecha. | El día se calcula por calendario (`nutriDate`). |
| E1 | Media | Una serie admitía repeticiones y peso negativos (−5 × −100 kg daban 500 kg de volumen). | De 0 a 100.000 (metros) y de 0 a 2.000 de peso. |
| D1 | Baja | «Últimos 7 días» contaba ocho días de madrugada (comparaba horas con fechas en UTC). | Hoy y los seis días de antes, por fecha. |
| P1 | Media | Evolución del peso aceptaba un peso negativo o imposible y una fecha futura, que pasaban al perfil y a los objetivos. | De 30 a 300 kg y hasta hoy; avisa si no. |
| P2 | Media | En Perfil, edad, altura y peso se guardaban sin comprobar (la bienvenida sí lo hacía), y con datos dañados el gasto salía negativo o «NaN». | Los mismos límites que la bienvenida; con datos imposibles no se calculan objetivos. |
| P3 | Baja | Con mucho peso y poco gasto, la proteína calculada pasaba del 90 % de las kcal y la grasa salía negativa; con poco gasto, menos de 800 kcal. | Proteína, 60 % como mucho; grasa, nunca negativa; mínimo 800 kcal. |
| P4 | Baja | Nombres (día, workout, plato, ejercicio, alimento) y notas sin largo máximo. | 60-80 letras; notas, 2.000. |
| U1 | Media | Con las cargas en libras, el análisis mensual y su PDF seguían dando el volumen en toneladas y los récords en kg. | Volumen en miles de libras y récords en libras; el peso corporal sigue en kg, como dice Ajustes. El ejemplo de la ventana del RPE también usa la unidad elegida. |
| C1 | Media | Contraste insuficiente (menos de 4,5:1) en 1.157 parejas de letra y fondo: el texto gris sobre las tarjetas de Cristal con el brillo de color detrás (los dos temas); las hojas del tema claro, que quedaban grises sobre el velo oscuro; el texto blanco sobre la parte clara del degradado del botón principal, el día elegido y la burbuja de pestañas (3:1); el texto de ayuda de los campos; los colores de los macros y de los estados sobre vidrio; el blanco sobre Naranja y Turquesa, y el texto sobre el brillo de Amarillo y Lima. | Colores de texto por nivel de Cristal (`css/90-glass`); hojas y páginas casi opacas en el tema claro; degradado del acento del tono principal a uno más oscuro (`--ag`); acento acotado detrás del texto (`--gmid`); Naranja y Turquesa algo más oscuros; un color propio elige el texto de encima con 4,5:1 (antes 3,2). Sin Cristal no cambia el gris. Ahora, ninguna pareja falla. |

### Comprobado y correcto

- **Sumas de nutrición**: total del día y de cada comida iguales a la suma de sus alimentos en 30 días al azar con 2 a 6
  comidas, y a las kcal del Dashboard. Se suma sin redondear y se redondea al enseñar.
- **Objetivos**: Mifflin-St Jeor por el factor de actividad, en 300 perfiles al azar; los porcentajes suman 100 y los gramos
  del objetivo dan sus kcal (4, 4 y 9 kcal/g).
- **Entreno**: el volumen guardado es la suma de repeticiones × peso de las series hechas, escribiendo en kg y en lb (se guarda
  en kg); el récord es el mejor 1RM de Epley.
- **Fechas**: día anterior y siguiente en los dos cambios de hora y en fin de año; las semanas, de lunes a domingo, en dos
  años enteros.
- **Contraste**: 35.460 textos en 32 configuraciones (los dos temas; sin Cristal y con el Cristal suave, el de serie y el
  intenso; los 11 colores de acento y uno propio): todos llegan a 4,5:1 (3:1 los grandes y los signos que hacen de icono).
- **Sin cambios de más**: al mover los cálculos a `core/calc`, el HTML de las 47 pantallas es idéntico al de antes
  (`tests/samehtml.py`).

## Mejoras y novedades de la V1.0.3

| | Qué |
| --- | --- |
| Novedad | **La semana en Nutrición**: una barra por día con sus kcal frente al objetivo, la media de kcal y de proteína de los días ya terminados y cuántos quedaron en objetivo; al tocar un día se va a él (`nutrition/week`). |
| Mejora | **Contraste AA** en todo el texto, con cualquier tema, estilo y color (C1). |
| Mejora | **Validación** de todo número que se escribe (N2, N3, E1, P1, P2), con coma o punto decimal, y largo máximo en nombres y notas (P4). |
| Código | **`core/calc`**: sumas de nutrición, objetivos, volumen, mejor marca y semanas, en funciones sin estado. El Dashboard, Nutrición, la semana y el análisis mensual suman con las mismas, así que no pueden dar cifras distintas. |
| Pruebas | `tests/calc.py` (cálculos y validación en la app), `tests/calc.test.mjs` (21 pruebas de función suelta), `tests/contrast.py` (contraste) y `tests/samehtml.py` (comparar el HTML de dos compilaciones). |

## Estado por fases

La V1.0.3 se publica cuando estén todas; hasta entonces vive en la rama `desarrollo-1.0.3`.

| Fase | Estado | Hecho | Falta |
| --- | --- | --- | --- |
| 1 · Auditoría y diagnóstico | Hecha | Este documento. | — |
| 2 · Errores críticos | Hecha | N1-N4, E1, D1, P1-P4 y U1. | — |
| 3 · Arquitectura y código | En parte | `core/calc`. | Partir `core/persist` y `cloud/sync`; vistas con líneas largas (R4); repaso módulo a módulo de lo duplicado. |
| 4 · Entrenamiento y nutrición | En parte | Cálculos comprobados, validación de lo que se escribe y la semana. | Repasar a fondo rutinas y ejercicios propios (crear, editar y borrar con historial), descansos y temporizadores, y la progresión con casos al azar. |
| 5 · Dashboard, perfil y persistencia | En parte | D1, P1-P3. Guardado y sincronización, revisados en la V1.0.2 (I-04, I-10, I-11). | Cada tarjeta y gráfica del Dashboard frente a los registros, como se hizo con Nutrición; calendario y progreso; exportar e importar con datos al azar. |
| 6 · UX/UI, rendimiento y accesibilidad | En parte | Contraste (C1). Rendimiento, medido en la V1.0.2. | Estados de carga y de error, confirmación de lo que no se puede deshacer, zonas táctiles fuera del entreno, pantallas grandes y saltos visuales. |
| 7 · Seguridad, pruebas y compatibilidad | En parte | Seguridad repasada, sin hallazgos nuevos. Pruebas nuevas de cálculos y de contraste. | Tamaños de pantalla de forma sistemática (del iPhone SE a una tableta); `npm audit`; Android e iPhone de verdad. |
| 8 · Verificación final y documentación | Al final | — | Batería completa, capturas e informe final. |

## Pendiente

| | Qué | Por qué no está hecho |
| --- | --- | --- |
| 1 | Lo que falta de las fases 3 a 8 (tabla de arriba). | Se hace por tandas. |
| 2 | Cada alimento enseña sus valores redondeados y el total se redondea aparte: la suma de lo que se ve puede diferir en 1. | Es lo correcto (redondear la suma, no sumar redondeos), pero no se explica en la app. |
| 3 | Los logros de volumen («Mueve 10 toneladas») siguen en toneladas con las cargas en libras. | A propósito: es su nombre y su meta; el volumen del Dashboard y del análisis sí va en libras. |
| 4 | App Check (I-05), apagado hasta activarlo en la consola. | Paso del propietario. |
| 5 | Prueba en un Android de verdad (I-01) y con VoiceOver en un iPhone. | No hay dispositivos en este entorno: WebKit y Chromium en Linux. |
| 6 | Vulnerabilidades conocidas de las dependencias de desarrollo (`npm audit`). | Este entorno no tiene acceso al registro de npm; no se pudo ejecutar. |

## Limitaciones técnicas

- **Plan Spark de Firebase**: 20.000 escrituras al día y 1 GiB para todas las cuentas ([Servidor](backend.md#límites-del-plan-spark)).
- **Sin servidor propio**: nada se valida fuera del móvil salvo lo que comprueban las reglas de Firestore (forma y tamaño).
- **iPhone**: el icono de una app instalada no cambia solo, y no hay vibración ni notificaciones sin una app de tienda.
- **Contraste sobre vidrio**: con Cristal, el fondo de cada texto depende de lo que haya detrás. La prueba mide las 47 pantallas
  con los datos de ejemplo; con otras fotos u otros datos, un texto puede quedar sobre un fondo que no se ha medido.

## Recomendaciones para versiones futuras

1. Estadísticas avanzadas sobre `core/calc`: volumen por grupo muscular y por semana, y progresión de cada ejercicio.
2. Planificación semanal de comidas a partir de las plantillas y de la semana.
3. Activar App Check antes de abrir la app a más gente.
