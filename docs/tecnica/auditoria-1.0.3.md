# Auditoría técnica de la V1.0.3

Auditoría completa de StrataFit sobre la V1.0.2 publicada (12 de noviembre de 2026): qué se miró y cómo, qué se encontró, qué
se corrigió en la V1.0.3 y qué queda pendiente. Lo que aquí se da por comprobado se ejecutó; lo que no se pudo ejecutar se dice.

## Qué es el proyecto

| | |
| --- | --- |
| Lenguaje y marco | JavaScript (módulos ES), sin framework ni dependencias en tiempo de ejecución. 119 módulos, unas 16.000 líneas; 29 trozos de CSS, unas 6.000 líneas. |
| Compilación | `build.py` + esbuild: 428 KB de código al arrancar y 227 KB que se cargan al usarlos (WOD, CSV, escáner, catálogo). |
| Dependencias | Tres, solo de desarrollo y con versión fija: esbuild, acorn y typescript. |
| Servidor | Firebase (Authentication y Firestore) por REST, plan Spark. La app funciona sin conexión y sincroniza después. |
| Datos | Núcleo en `localStorage`; entrenos, historial y comidas en IndexedDB; copia en la nube y en archivo. |
| Pruebas | Más de 800 comprobaciones en navegador (Chromium y WebKit) y con el emulador de Firebase. |

## Cómo se auditó

1. **Lectura dirigida** de los módulos de cálculo y de entrada de datos: nutrición (`nutrition/home`, `diet`, `add`), entreno
   (`workout/session`, `finish`, `progression`, `targets`), Dashboard (`dashboard/home`, `weight`) y Perfil.
2. **Búsqueda sistemática** de patrones de riesgo en todo `src/js`: cada lectura de un número escrito por el usuario, cada
   cuenta con fechas sumando horas, cada `raw(…)`, `innerHTML`, `eval`, `catch` vacío y campo de texto sin largo máximo.
3. **Comprobación en la app**: cada sospecha se reprodujo en el navegador antes de tocar nada (un total que no cuadra, un
   número negativo que entra, un día que se salta).
4. **Cuentas hechas aparte**: `tests/calc.py` repite fuera de la app las sumas y fórmulas y las compara con lo que la app
   enseña, con datos al azar.

## Diagnóstico por áreas

| Área | Estado | Lo encontrado |
| --- | --- | --- |
| Arquitectura | Bien | Módulos pequeños con dependencias explícitas, estado único, eventos delegados, sin código muerto (`tools/check.js` lo impide). Quedan dos módulos grandes (`core/persist`, 681 líneas; `cloud/sync`, 627) y vistas con líneas largas. |
| Nutrición | **Errores** | N1, N2, N3, N4 (abajo). Las sumas en sí eran correctas. |
| Entreno | **Error** | E1. El volumen, el 1RM y la progresión calculan bien. |
| Dashboard | **Errores menores** | D1. Todo sale de los registros reales; no hay cifras de ejemplo. |
| Perfil y datos | **Errores** | P1, P2. La persistencia y la sincronización están cubiertas por `storage.py` y `cloud.py`. |
| Seguridad | Bien | Todo valor insertado se escapa (`core/html`); `security.py` inyecta HTML en todos los campos y recorre 47 pantallas; CSP estricta; sin secretos en el código (la clave de API de Firebase es pública por diseño; la de servicio, solo en GitHub). App Check sigue apagado (I-05). |
| Rendimiento | Bien | Medido en la V1.0.2 ([Rendimiento](rendimiento.md)): pintar una pestaña, menos de 10 ms con años de datos. |
| Accesibilidad | Bien, con límites | Etiquetas, foco y ventanas comprobados (`a11y.py`). El contraste no se mide de forma automática. |
| Pruebas | Bien, con límites | Casi todo son pruebas de la app entera en el navegador; solo `cloud/merge` y el catálogo tienen pruebas de función suelta. |

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

### Comprobado y correcto

- **Sumas de nutrición**: total del día y de cada comida iguales a la suma de sus alimentos en 30 días al azar con 2 a 6
  comidas, y a las kcal del Dashboard. Se suma sin redondear y se redondea al enseñar.
- **Objetivos**: Mifflin-St Jeor por el factor de actividad, en 300 perfiles al azar; los porcentajes suman 100 y los gramos
  del objetivo dan sus kcal (4, 4 y 9 kcal/g).
- **Entreno**: el volumen guardado es la suma de repeticiones × peso de las series hechas, escribiendo en kg y en lb (se guarda
  en kg); el récord es el mejor 1RM de Epley.
- **Fechas**: día anterior y siguiente en los dos cambios de hora y en fin de año.

## Pendiente

| | Qué | Por qué no está hecho |
| --- | --- | --- |
| 1 | El análisis mensual y su PDF dicen «kg» y toneladas aunque las cargas estén en libras. | Detectado al leer; sin corregir ni probar aún. |
| 2 | Cada alimento enseña sus valores redondeados y el total se redondea aparte: la suma de lo que se ve puede diferir en 1. | Es lo correcto (redondear la suma, no sumar redondeos), pero no se explica en la app. |
| 3 | Pruebas de función suelta para los cálculos (sin navegador), más rápidas y precisas al fallar. | Hoy se prueban con la app entera. |
| 4 | Contraste de colores, medido de forma automática en los dos temas y los colores de acento. | No hay prueba; no se midió en esta auditoría. |
| 5 | `core/persist` y `cloud/sync` son los módulos más grandes; quedan vistas con líneas largas (R4). | Partirlos sin cambiar nada exige comparar cada pantalla; se hace por partes. |
| 6 | App Check (I-05), apagado hasta activarlo en la consola. | Paso del propietario. |
| 7 | Prueba en un Android de verdad (I-01) y con VoiceOver en un iPhone. | No hay dispositivos en este entorno: WebKit y Chromium en Linux. |
| 8 | Vulnerabilidades conocidas de las dependencias de desarrollo (`npm audit`). | Este entorno no tiene acceso al registro de npm; no se pudo ejecutar. |

## Limitaciones técnicas

- **Plan Spark de Firebase**: 20.000 escrituras al día y 1 GiB para todas las cuentas ([Servidor](backend.md#límites-del-plan-spark)).
- **Sin servidor propio**: nada se valida fuera del móvil salvo lo que comprueban las reglas de Firestore (forma y tamaño).
- **iPhone**: el icono de una app instalada no cambia solo, y no hay vibración ni notificaciones sin una app de tienda.

## Recomendaciones para versiones futuras

1. Corregir el punto 1 de «Pendiente» y añadir la prueba de contraste (punto 4).
2. Sacar los cálculos a un módulo sin estado (`sumas`, `objetivos`, `volumen`) con pruebas de función suelta: es la base para
   estadísticas avanzadas, planificación semanal y recomendaciones.
3. Seguimiento semanal de nutrición (media de kcal y macros frente al objetivo), que hoy solo existe en el análisis mensual.
4. Activar App Check antes de abrir la app a más gente.
