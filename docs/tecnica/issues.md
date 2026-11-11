# Informe de issues · V1.0.0

Revisión final del código (T-04) y pruebas (T-21) de la rama `desarrollo-1.0.0`, en el cierre de la versión (M8, T-22). Recoge todas
las issues encontradas, de cualquier tipo: las que ya se han corregido en M8 y las que quedan abiertas. Las abiertas están en
GitHub como issues [#7 a #21](https://github.com/victorroma01/Fitflow/issues) (I-01 es la #7, I-02 la #8, y así hasta I-15, la
#21), con su prioridad (High, Medium, Low) y su tipo como etiquetas; las de la publicación (I-01, I-02 e I-07), en el milestone M8.
I-16 y C15 salieron al publicar; I-16 es la [#25](https://github.com/victorroma01/Fitflow/issues/25).

**Estado tras la V1.0.1** (decisiones del propietario del 11 de noviembre de 2026): I-02 está cerrada (comprobaciones hechas);
I-12, cerrada como «no se hará por ahora»; I-16 e I-15, corregidas en la V1.0.1 (sin el paso de los índices; iconos propios de los
accesos directos); I-07, hecha en la rama y que se comprueba al publicar la V1.0.1; I-03 pasa al milestone «App móvil»; I-04, I-05 (con App Check), I-06,
I-08 a I-11, I-13 e I-14, a la V1.0.2; I-01 sigue abierta hasta la prueba en un Android. Lo encontrado al probar la V1.0.0 en el
iPhone son las issues I-17 a I-29 (#26 a #38), en los milestones de la V1.0.1 y la V1.0.2.

## Resumen

| Prioridad | Abiertas | Corregidas en M8 | Total |
| --- | --- | --- | --- |
| Critical | 0 | 0 | 0 |
| High | 2 | 2 | 4 |
| Medium | 3 | 4 | 7 |
| Low | 11 | 9 | 20 |
| **Total** | **16** | **15** | **31** |

No hay ninguna issue crítica. Las dos abiertas de prioridad alta son comprobaciones de la publicación, no fallos del código.
Coste de las abiertas: **40 PF** y unas **75 horas**; lo corregido en M8 suma 38 PF y unas 11,5 horas.

## Cómo se clasifica

| Prioridad | Cuándo | Cuándo se corrige |
| --- | --- | --- |
| Critical | La app no se puede usar, o se pierden o se exponen datos de los usuarios. | Antes de publicar. |
| High | Falla una función principal, se pierden datos en un caso concreto, o falta una comprobación obligatoria. | Antes de publicar o al publicar. |
| Medium | Falla una parte con alternativa, un requisito se cumple de otra forma, o hay un riesgo que puede llegar. | En la siguiente versión. |
| Low | Detalle, mejora técnica o riesgo pequeño. | Cuando se pueda. |

## Cómo se calcula el coste

En **puntos función IFPUG** (IFPUG 4.3.1, ISO/IEC 20926), con el recuento de un proyecto de mejora: **EFP = ADD + CHGA + DEL**, las
funciones que hay que añadir, cambiar o quitar para corregir la issue, sin factor de ajuste (VAF = 1,00, como pide la norma ISO).

| Función | Qué es | Baja | Media | Alta |
| --- | --- | --- | --- | --- |
| EI | Entrada: el usuario guarda o cambia algo (registrar una serie, cambiar un ajuste). | 3 | 4 | 6 |
| EO | Salida con cálculos (el entreno en curso, el análisis mensual, un aviso). | 4 | 5 | 7 |
| EQ | Consulta sin cálculos (la ficha de un ejercicio, el historial). | 3 | 4 | 6 |
| ILF | Datos propios de la app (perfil, entrenos, comidas). | 7 | 10 | 15 |
| EIF | Datos de otro sistema que la app solo lee (Open Food Facts). | 5 | 7 | 10 |

La complejidad (baja, media o alta) sale de los datos que maneja cada función y de los archivos que toca, con las tablas de IFPUG. Una
función cuenta como cambiada cuando hay que tocar su lógica, sus datos o lo que recibe o devuelve al usuario, y cuenta entera.

IFPUG solo mide funcionalidad: un cambio que no cambia ninguna función (solo el aspecto, el rendimiento, el código, las pruebas o el
despliegue) cuenta **0 PF**. Por eso cada issue lleva también un **esfuerzo orientativo** en horas de desarrollo y prueba.

## Orden recomendado de corrección

1. **I-02**, **I-16** e **I-01**: las comprobaciones de la publicación, el permiso de los índices y las pruebas en los móviles de
   verdad. Con la publicación.
2. **I-07**: las acciones de GitHub Pages, que solo se pueden probar al publicar. En la misma fusión.
3. **I-05**: proteger el alta de cuentas, antes de dar la app a más gente.
4. **I-03**: notificaciones programadas del pesaje, el único requisito que se cumple de otra forma.
5. **I-04**: el límite de almacenamiento del móvil, antes de un año de uso.
6. **I-06**: hojas y páginas para los lectores de pantalla.
7. **I-12**: recuperar la contraseña sin el administrador, cuando se permita un correo (F-35).
8. El resto de las bajas, en este orden: **I-11**, **I-08**, **I-09**, **I-10**, **I-13**, **I-15** e **I-14**.

## Issues abiertas

| Id | Prioridad | Tipo | Issue | PF | Horas |
| --- | --- | --- | --- | --- | --- |
| I-01 | High | Pruebas | Pruebas en un iPhone y un Android de verdad (T-06) | 0 | 2 |
| I-02 | High | Procedimiento | Comprobaciones de Firebase y de los datos al publicar | 0 | 1 |
| I-03 | Medium | Requisito | El recordatorio de pesaje no envía notificaciones programadas (T-13) | 19 | 16 |
| I-04 | Medium | Datos | El almacenamiento del móvil tiene un límite de unos 5 MB | 4 | 12 |
| I-05 | Medium | Seguridad | Cualquiera puede crear cuentas sin límite y gastar la cuota de Firebase | 0 | 6 |
| I-06 | Low | Accesibilidad | Hojas y páginas sin anunciarse como ventana ni recibir el foco | 0 | 3 |
| I-07 | Low | Mantenimiento | Acciones de GitHub Pages con Node.js 20 y paso de `ubuntu-latest` a Ubuntu 26 | 0 | 1 |
| I-08 | Low | Robustez | Con red inestable, la primera instalación puede guardar la página sin todo su código | 0 | 2 |
| I-09 | Low | Rendimiento | El service worker vuelve a pedir cada archivo en cada apertura | 0 | 1 |
| I-10 | Low | Rendimiento | Cada guardado vuelve a convertir todo el estado a texto | 0 | 4 |
| I-11 | Low | Robustez | Un borrado de la nube a medias deja el índice con documentos ya borrados | 10 | 2 |
| I-12 | Low | Funcional | Quien olvida la contraseña depende del administrador | 7 | 6 |
| I-13 | Low | Pruebas | `tests/deploy.py`: alguna recarga no termina (mitigado) | 0 | 2 |
| I-14 | Low | Seguridad | La política de seguridad (CSP) permite estilos en línea | 0 | 16 |
| I-15 | Low | Aspecto | Los accesos directos del icono usan el mismo icono que la app | 0 | 1 |
| I-16 | Low | Mantenimiento | La cuenta de servicio no puede cambiar los índices de Firestore | 0 | 0,25 |
| | | | **Total** | **40** | **75,25** |

### I-01 · Pruebas en un iPhone y un Android de verdad (T-06)

- **Prioridad**: High · **Tipo**: pruebas · **Dónde**: [Pruebas → En los móviles de verdad](pruebas.md#en-los-móviles-de-verdad-t-06).
- **Qué pasa**: los gestos, el «atrás» de Android, los accesos directos, el globo del icono, la vibración, las descargas (PDF, copia,
  CSV y evento del calendario) y la instalación se prueban en la CI con los motores de Chrome y de Safari y con toques simulados,
  pero aún no en un móvil de verdad.
- **Impacto**: algo que solo hace el sistema del móvil (un gesto del sistema, un permiso, «Compartir») puede comportarse distinto.
- **Corrección**: repasar la lista de comprobación en un iPhone (Safari, app instalada) y un Android (Chrome, app instalada) y abrir
  una issue por cada fallo. La dirección de la app solo publica `main`, así que se hace justo después de fusionar.
- **Coste**: 0 PF (prueba, no cambia ninguna función) · 2 horas.

### I-02 · Comprobaciones de Firebase y de los datos al publicar

- **Prioridad**: High · **Tipo**: procedimiento · **Dónde**: Google Cloud, GitHub Actions y [Servidor: Firebase](backend.md).
- **Qué pasa**: la publicación necesita pasos que no hace el código: (1) comprobar que la clave de la API sigue limitada a
  `https://victorroma01.github.io/*` (Google Cloud → Credenciales; según `backend.md`, lo está); (2) que al fusionar, *Desplegar
  reglas* y *Comprobar Firebase* terminan en verde; (3) crear la cuenta `VictorAdmin_` y darle el rol con *Asignar rol*. Además, la
  1.0.0 borra del móvil los datos de la 1.24 al entrar (decisión de M2: no se migran).
- **Impacto**: sin las reglas desplegadas, la sincronización falla; sin el rol, no hay Administración; lo de la 1.24 que no se anote
  antes se pierde.
- **Corrección**: seguir esos pasos al publicar, en ese orden, y apuntar antes lo que se quiera conservar de la 1.24.
- **Coste**: 0 PF (procedimiento) · 1 hora.

### I-03 · El recordatorio de pesaje no envía notificaciones programadas (T-13)

- **Prioridad**: Medium · **Tipo**: requisito · **Dónde**: `dashboard/reminder`, `static/sw.js`, `tools/admin`.
- **Qué pasa**: T-13 pide notificaciones programadas que se repitan. La app avisa al abrirla (aviso y tarjeta del Dashboard) y crea
  un evento que se repite en el calendario del móvil (archivo .ics), que es el que avisa; sin ese evento, con la app cerrada no llega
  nada. Una web no puede programar notificaciones en el móvil: hace falta Web Push (en iPhone, desde iOS 16.4 y con la app
  instalada) y algo que las envíe a su hora.
- **Impacto**: quien no añade el evento al calendario solo se entera al abrir la app.
- **Corrección**: Web Push con claves VAPID. La app pide permiso y guarda su suscripción en Firestore (`users/{uid}/push`), con el
  intervalo del recordatorio; un flujo programado de GitHub Actions, una vez al día y con la clave de servicio (sin plan de pago),
  busca a quién le toca pesarse y le envía el aviso, que el service worker enseña. Al quitar el recordatorio, se borra la
  suscripción.
- **Coste**: 19 PF = ILF nueva «Suscripciones» (baja, 7) + EI nueva «Activar o quitar los avisos» (baja, 3) + EO nueva «Enviar el aviso
  de pesaje» (media, 5) + EI cambiada «Configurar el recordatorio» (media, 4) · 16 horas.

### I-04 · El almacenamiento del móvil tiene un límite de unos 5 MB

- **Prioridad**: Medium · **Tipo**: datos · **Dónde**: `core/persist`, `core/store`.
- **Qué pasa**: todo se guarda en `localStorage`, que Safari y Chrome limitan a unos 5 MB por web. Con un uso diario, las comidas
  ocupan unos 0,4-0,5 MB al año y el historial de ejercicios unos 0,1 MB (ahora se guarda entero: C3), así que en unos años se llega
  al límite. Entonces la app avisa («No se ha podido guardar en este dispositivo»), pero lo nuevo ya no se guarda en el móvil: con
  conexión puede llegar a la nube en la siguiente sincronización; sin conexión, se pierde al cerrar la app.
- **Impacto**: a largo plazo, pérdida de lo que se registre sin conexión y una app que depende de la red.
- **Corrección**: pasar las partes que crecen (comidas, entrenos e historial) a IndexedDB, que ya se usa para las copias automáticas y
  admite mucho más, pasando lo que haya en `localStorage` la primera vez; y avisar cuando el uso pase del 80 % (el Diagnóstico ya
  enseña lo que ocupa cada parte).
- **Coste**: 4 PF = EO nueva «Aviso de espacio» (baja, 4); el cambio de almacenamiento no cambia ninguna función (0 PF) · 12 horas.

### I-05 · Cualquiera puede crear cuentas sin límite y gastar la cuota de Firebase

- **Prioridad**: Medium · **Tipo**: seguridad · **Dónde**: Firebase (Authentication y Firestore), `cloud/`.
- **Qué pasa**: el alta es abierta (F-32) y la clave de la API va en la app, como en toda app web de Firebase. Un programa podría crear
  muchas cuentas y escribir en cada una hasta lo que dejan las reglas (1 MB por documento). Las reglas no dejan leer ni tocar los
  datos de nadie: el riesgo es el abuso, no que se vean datos.
- **Impacto**: se puede agotar la cuota gratuita de Firestore (plan Spark: 1 GiB guardado y 20.000 escrituras al día) y dejar sin
  servicio a todos hasta el día siguiente.
- **Corrección**: App Check con reCAPTCHA Enterprise (invisible para el usuario) en Firestore y Authentication: solo la app publicada
  puede usarlos. Como la app usa la API REST, se pide el token de App Check y se envía en cada petición. Y alertas de uso en Firebase.
  Otra opción, si se quiere cerrar el alta: códigos de invitación que crea el admin (14 PF).
- **Coste**: 0 PF con App Check (no cambia ninguna función) · 6 horas.

### I-06 · Hojas y páginas sin anunciarse como ventana ni recibir el foco

- **Prioridad**: Low · **Tipo**: accesibilidad · **Dónde**: `core/ui` (`sheet`, `fullPage`, `dialog`).
- **Qué pasa**: el diálogo de confirmación y el menú ya se anuncian como ventana (C14), pero las hojas (#sh) y las páginas de Ajustes,
  no; y al abrir cualquiera de ellas el foco se queda donde estaba, así que con VoiceOver o con teclado se puede seguir por la pantalla
  de detrás.
- **Impacto**: más difícil de usar con un lector de pantalla.
- **Corrección**: `role="dialog"`, `aria-modal` y título en las hojas; llevar el foco a la hoja al abrirla (sin abrir el teclado) y
  devolverlo al cerrarla; y probarlo con VoiceOver en el iPhone, porque la barra de pestañas sigue a la vista con algunas páginas.
- **Coste**: 0 PF · 3 horas.

### I-07 · Acciones de GitHub Pages con Node.js 20 y paso de `ubuntu-latest` a Ubuntu 26

- **Prioridad**: Low · **Tipo**: mantenimiento · **Dónde**: `.github/workflows/pruebas.yml`.
- **Qué pasa**: las acciones de las pruebas ya van con Node.js 24 (C13), pero las de publicar en Pages (`upload-pages-artifact@v3` y
  `deploy-pages@v4`) siguen con Node.js 20, que GitHub da por obsoleto. Solo se ejecutan al publicar en `main`, así que no se han
  podido probar en la rama. Además, GitHub avisa de que `ubuntu-latest` pasa a Ubuntu 26 desde el 19 de octubre de 2026.
- **Impacto**: hoy, solo avisos. Algún día GitHub dejará de ejecutarlas.
- **Corrección**: al publicar, `upload-pages-artifact@v5` y `deploy-pages@v5`, y comprobar que la app se publica. Si Playwright falla
  con Ubuntu 26, fijar `ubuntu-24.04`.
- **Coste**: 0 PF · 1 hora.
- **V1.0.1**: hecha en `desarrollo-1.0.1` (`upload-pages-artifact@v5`, que usa `upload-artifact@v7`, y `deploy-pages@v5`, con
  Node.js 24). Las pruebas ya corren en Ubuntu 26.04 y pasan, así que no hace falta fijar la versión. Al publicar se comprueba que
  la app llega a GitHub Pages.

### I-08 · Con red inestable, la primera instalación puede guardar la página sin todo su código

- **Prioridad**: Low · **Tipo**: robustez · **Dónde**: `static/sw.js` (instalación).
- **Qué pasa**: al instalarse, el service worker guarda cada archivo por separado y sigue aunque alguno falle. Si falla un trozo de
  código, la página guardada abre sin conexión pero sin esa parte (por ejemplo, el WOD o el CSV) hasta que se abra con red.
  Al actualizar ya no pasa: un documento nuevo solo se guarda con todo su código (`putDoc`).
- **Corrección**: en la instalación, lo mismo que al actualizar: guardar la página solo con todo su código, o reintentar lo que falte
  al activarse.
- **Coste**: 0 PF · 2 horas.

### I-09 · El service worker vuelve a pedir cada archivo en cada apertura

- **Prioridad**: Low · **Tipo**: rendimiento · **Dónde**: `static/sw.js` (`fetch`).
- **Qué pasa**: responde al momento con lo guardado y, a la vez, pide el archivo a la red y lo vuelve a guardar. Lo hace también con el
  código (`js/…`), cuyo nombre cambia con cada versión y que, por tanto, nunca cambia.
- **Impacto**: peticiones y escrituras de más en cada apertura: algo más de datos y de batería.
- **Corrección**: el código con nombre por versión, solo desde la caché; revalidar el documento, `version.json` y las fotos.
- **Coste**: 0 PF · 1 hora.

### I-10 · Cada guardado vuelve a convertir todo el estado a texto

- **Prioridad**: Low · **Tipo**: rendimiento · **Dónde**: `core/persist` (`splitState`).
- **Qué pasa**: se escribe solo lo que cambia, pero para saberlo se convierte a JSON todo el estado (entrenos, historial y todas las
  comidas) en cada acción.
- **Impacto**: con años de datos, unos milisegundos más en cada toque que guarda, en un móvil.
- **Corrección**: marcar qué partes cambian (o recordar su huella) y convertir solo esas.
- **Coste**: 0 PF · 4 horas.

### I-11 · Un borrado de la nube a medias deja el índice con documentos ya borrados

- **Prioridad**: Low · **Tipo**: robustez · **Dónde**: `cloud/sync` (`wipeCloudData`, `pull`).
- **Qué pasa**: «Borrar todos los datos» borra en tandas de 400 y el índice va en la última. Solo con más de 400 documentos (décadas de
  datos) hay más de una tanda; si una falla, el índice sigue nombrando documentos ya borrados, y cada sincronización los pide y los
  salta hasta que se repite el borrado.
- **Impacto**: no se pierde nada; lecturas de más.
- **Corrección**: borrar el índice en la primera tanda y, al sincronizar, quitar del índice lo que ya no existe.
- **Coste**: 10 PF = EI cambiada «Borrar todos los datos» (media, 4) + EI cambiada «Sincronizar» (alta, 6) · 2 horas.

### I-12 · Quien olvida la contraseña depende del administrador

- **Prioridad**: Low · **Tipo**: funcional · **Dónde**: `account/login`, `cloud/auth`.
- **Qué pasa**: sin correo (F-35), no hay «He olvidado la contraseña»: el admin crea una temporal con *Restablecer contraseña*.
- **Impacto**: hace falta escribir al admin y esperar.
- **Corrección**: cuando se permita, un correo opcional para recuperarla (Firebase envía el enlace). Sin correo, haría falta una
  función en el servidor (plan Blaze) para comprobar códigos de recuperación.
- **Coste**: 7 PF = EI cambiada «Crear cuenta» (con el correo opcional; media, 4) + EI nueva «He olvidado la contraseña» (baja, 3) ·
  6 horas.

### I-13 · `tests/deploy.py`: alguna recarga no termina (mitigado)

- **Prioridad**: Low · **Tipo**: pruebas · **Dónde**: `tests/deploy.py`.
- **Qué pasa**: con el service worker, una recarga se quedó esperando dos veces en la CI de Chrome (M5 y M6). Desde M6 la prueba vuelve
  a abrir la página si pasa, y no ha vuelto a fallar. No se ha visto en el navegador normal.
- **Corrección**: buscar la causa con el registro del service worker; si es del navegador sin pantalla, dejarlo como está.
- **Coste**: 0 PF · 2 horas.

### I-14 · La política de seguridad (CSP) permite estilos en línea

- **Prioridad**: Low · **Tipo**: seguridad · **Dónde**: `build.py` (la CSP) y las plantillas con `style="…"` (175).
- **Qué pasa**: `style-src` lleva `'unsafe-inline'` porque muchas plantillas ponen estilos en línea. Los scripts sí están cerrados y
  todo lo que se pinta pasa por `html` (escapado), así que hoy no se puede inyectar nada (`tests/security.py`); es una defensa más.
- **Corrección**: pasar los estilos en línea a clases y quitar `'unsafe-inline'`.
- **Coste**: 0 PF · 16 horas.

### I-15 · Los accesos directos del icono usan el mismo icono que la app

- **Prioridad**: Low · **Tipo**: aspecto · **Dónde**: `static/manifest.webmanifest` (`shortcuts`).
- **Qué pasa**: «Empezar entreno», «Añadir comida» y «Registrar peso» (al mantener pulsado el icono en Android) llevan el icono de la
  app.
- **Corrección**: un icono propio para cada uno (pesa, plato, báscula), de 96 × 96.
- **Coste**: 0 PF · 1 hora.

### I-16 · La cuenta de servicio no puede cambiar los índices de Firestore

- **Prioridad**: Low · **Tipo**: mantenimiento · **Dónde**: Google Cloud (IAM) y `tools/admin/reglas.mjs`.
- **Qué pasa**: al publicar, *Desplegar reglas* puso las reglas, pero no pudo quitar los índices de los campos de texto grandes
  (`fieldOverrides` de `firestore.indexes.json`): la cuenta de servicio no tiene permiso para cambiar índices (403). El flujo lo avisa
  y sigue.
- **Impacto**: ninguno en el uso: Firestore solo indexa el principio de un texto largo. Los índices ocupan algo más de lo necesario.
- **Corrección**: en Google Cloud → IAM, dar a la cuenta de servicio de Firebase el rol *Cloud Datastore Index Admin* y volver a
  lanzar *Desplegar reglas* (Actions → Run workflow).
- **Coste**: 0 PF · 15 minutos.

## Corregidas en M8

| Id | Prioridad | Tipo | Issue | Corrección | PF | Horas |
| --- | --- | --- | --- | --- | --- | --- |
| C15 | High | Procedimiento | Al publicar, *Desplegar reglas* falló: firebase-tools comprueba antes qué APIs tiene activas el proyecto, y la cuenta de servicio no tiene permiso para eso (403). Las reglas de Firestore no eran las del repositorio. | `tools/admin/reglas.mjs`: las reglas, con la API de reglas de Firebase (firebase-admin); desplegadas el 5 de noviembre. | 0 | 1 |
| C3 | High | Datos | El historial de cada ejercicio se quedaba en sus 60 últimas sesiones (unos 5 meses a tres por semana) y lo anterior se borraba, también de la nube. | Se guarda entero. | 6 | 0,5 |
| C4 | Medium | Accesibilidad | Tema claro: el texto del color de acento tenía un contraste de 1,2 a 3,9 (Amarillo 1,4; Lima 1,3). | `--at`: el tono claro en el tema oscuro y el oscuro en el claro (7,2 a 14,9). | 0 | 2 |
| C7 | Medium | Contenido | El Overview y el aviso de estancamiento describían la descarga antigua («mitad de series»). | Peso al 65 % y 2 repeticiones menos, como el resto de la app. | 0 | 0,25 |
| C9 | Medium | Accesibilidad | Tema claro con Cristal medio o máximo: el diálogo, casi transparente sobre un fondo oscurecido, no se leía sobre una foto oscura (1,8). | Diálogo al 84 % en el tema claro (`--pd`). | 0 | 0,5 |
| C10 | Medium | Accesibilidad | Tema claro: macros y estados como texto con contraste de 1,6 a 3,5 («Grasas» 1,7; «Contestada» 1,9; ✓ del nivel 1,6); texto secundario sobre las tarjetas de Cristal (4,2); «MENÚ» (4,15). | Colores de texto por tema (`--ctx`, `--ptx`, `--gtx`, `--okx`, `--wnx`, `--erx`, `--snx`) y `--mu` más oscuro en el claro: 4,5 o más. | 0 | 2 |
| C1 | Low | Robustez | El límite de tiempo de la red no contaba la lectura de la respuesta: con el servidor a medias, la sincronización se quedaba «en marcha». | Se lee dentro del límite (`cloud/net`). | 6 | 0,5 |
| C2 | Low | Código | Código muerto: la descarga por los artefactos de Claude, `downloadAs` repetido en el CSV y el resultado `'delivered'` en 6 sitios. | Fuera. | 0 | 0,5 |
| C5 | Low | Funcional | «Notificaciones activadas» (Sonido y avisos) no hacía nada. | Fuera la casilla, la preferencia `notif` y su regla. | 10 | 0,5 |
| C6 | Low | Funcional | Al reanudar un entreno, un segundo bloqueo de pantalla no miraba el ajuste «Mantener la pantalla encendida» ni la pausa. | Fuera; el de `workout/wake`, como al empezar. | 3 | 0,5 |
| C8 | Low | Funcional | Superseries: «Separar» en medio de una triserie dejaba etiquetas de superserie en ejercicios sueltos; «Unir» no hacía nada a partir de tres en la semana y en el Overview salía «TRISERIE · 1/4». | Una sola función (`linkPrev`): parte el bloque, une con su pareja y, de cuatro en adelante, «CIRCUITO». | 10 | 1,5 |
| C11 | Low | Pruebas | `tests/walk.py` y `tests/shots.py` con `file://` (el paseo divergía al empezar); la comprobación de código comprimido fallaba con un trozo pequeño. | Por HTTP; media de más de 500 caracteres por línea y sin contar los de menos de 5 KB. | 0 | 0,5 |
| C12 | Low | Seguridad | «Volver a entrar» no hacía esperar tras cinco contraseñas fallidas y admitía dos peticiones a la vez. | La misma espera que al entrar y una petición a la vez (`tests/cloud.py`). | 3 | 0,5 |
| C13 | Low | Mantenimiento | CI con acciones de Node.js 20, ya obsoleto. | `checkout@v6`, `setup-node@v6` (sin caché automática), `setup-python@v6` y `setup-java@v5`. | 0 | 0,5 |
| C14 | Low | Accesibilidad | El diálogo de confirmación y el menú no se anunciaban como ventana. | `role="dialog"`, `aria-modal` y su título. | 0 | 0,25 |
| | | | | **Total** | **38** | **11,5** |

Coste de lo corregido: C1, EI cambiada «Sincronizar» (alta, 6); C3, EI cambiada «Terminar el entreno» (alta, 6); C5, EI cambiada
«Ajustes de sonido y avisos» (baja, 3) + ILF cambiada «Perfil y preferencias» (baja, 7); C6, EI cambiada «Reanudar el entreno» (baja,
3); C8, EI cambiada «Unir y separar ejercicios» (baja, 3) + EO cambiada «Entreno en curso» (alta, 7); C12, EI cambiada «Volver a
entrar» (baja, 3). El resto, 0 PF: no cambian ninguna función.

## Pospuesto por decisión del propietario

No son fallos: son requisitos que el propietario ha dejado para más adelante, hasta que diga de generar las imágenes.

| Requisito | Qué falta | PF | Horas |
| --- | --- | --- | --- |
| F-16 · Una sola imagen por ejercicio | Quitar la foto anatómica y dejar la del modelo, con una de respaldo si falta. | 15 | 6 + imágenes |
| F-17 y T-17 · Modelo masculino y femenino | La imagen según el sexo (F-05). Junto con F-16, toca las mismas funciones. | 0 más | 2 + imágenes |
| F-33 y T-18 · Fondo del login | La imagen del gimnasio desde arriba, en gris, detrás del inicio de sesión. | 0 | 1 + imagen |

F-16: EQ cambiada «Ficha del ejercicio» (media, 4) + EQ cambiada «Librería» (media, 4) + EO cambiada «Entreno en curso» (alta, 7).
