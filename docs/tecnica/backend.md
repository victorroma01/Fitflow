# Servidor: Firebase

Diseño aprobado en M0 (4 de noviembre de 2026) y programado en M2. El móvil sigue mandando y Firebase es la copia de referencia
y el punto de encuentro entre dispositivos: la app abre al instante, lee siempre del almacenamiento local y funciona en un
gimnasio sin cobertura (*offline-first*).

## Decisiones

| Tema | Decisión |
| --- | --- |
| Plan | **Spark**: gratis y sin tarjeta. Solo Authentication y Firestore; sin Cloud Functions ni Cloud Storage. |
| Proyecto | `stratafit-960ec`, con Firestore en `europe-southwest1` (Madrid). La configuración web no es secreta: va en el código (`cloud/config`). La clave de la API está limitada a `https://victorroma01.github.io/*` (Google Cloud → Credenciales). |
| Cliente | La API REST de Firebase, **sin SDK**: ninguna dependencia en tiempo de ejecución, la CSP abre solo tres dominios y todo se prueba sin red (`tests/fakefb.py`) y con el emulador. |
| Cuentas | Registro libre con usuario y contraseña. Authentication usa un correo técnico interno, `usuario@stratafit-960ec.firebaseapp.com`, que el usuario nunca ve y al que nunca se envía nada: su dominio es el del propio proyecto de Firebase, que no tiene buzones. Hasta la V1.0.31 fue `usuario@stratafit.app` ([el cambio](#el-dominio-de-las-cuentas)). |
| Usuario | Único, de 3 a 20 caracteres: letras sin tilde, números, punto, guion y guion bajo, sin punto al principio, al final ni dos seguidos (no valdría como correo); sin distinguir mayúsculas (se guarda como se registró). |
| Contraseña | 8 caracteres o más. Firebase bloquea un rato los intentos fallidos repetidos y la app añade una espera que se dobla a partir del quinto fallo (5 s, 10 s… hasta 5 min). |
| Roles | Admin y Usuario, con *custom claims* (`role: "admin"`) en el token de la sesión: la app no puede cambiarlos. Admin: `VictorAdmin_`. |
| Contraseña olvidada | La restablece el admin con un flujo de GitHub Actions, solo para el usuario que lo necesita (más adelante, el propio usuario). |
| Datos personales | Ninguno: ni nombre, ni correo, ni teléfono, ni fotos de progreso. La foto de perfil se queda, con consentimiento, y solo la ve su dueño. |
| Aviso de pesaje | Dentro de la app, al abrirla o volver a ella (M5: `dashboard/reminder`). Una notificación con la app cerrada desde el servidor necesitaría Cloud Functions (plan Blaze); en su lugar, la app crea un evento de calendario que se repite con su aviso (archivo .ics). |
| Copia de seguridad | En la nube (M5: `cloud/backup`): una sola por usuario, que se sustituye entera; semanal y a mano. El archivo del móvil, siempre con el mismo nombre. |
| Fallos y sugerencias | En Firestore (M5: `system/report`, `account/reports`): cada usuario crea los suyos y lee solo los suyos; el admin los lee todos y solo cambia el estado y la respuesta. Sin consultas ni índices: el usuario lee los suyos por id (los guarda en `S.rp`) y el admin lista la colección. |
| Análisis mensual | Se calcula y se hace el PDF en el móvil (M5: `profile/analysis`, `system/pdf`), sin servidor ni bibliotecas. |
| Datos de la serie de prueba (1.24 y anteriores) | No se migran: al entrar por primera vez se borran del móvil. |

## Módulos

| Módulo | Qué hace |
| --- | --- |
| `cloud/config` | Proyecto y direcciones de Authentication y Firestore. `build.py --emulador` las cambia por las del emulador. |
| `cloud/net` | Peticiones JSON con límite de tiempo; cada fallo, un código estable (`NETWORK`, `EMAIL_EXISTS`, `FAILED_PRECONDITION`…). |
| `cloud/session` | La sesión del dispositivo (Store `acct`) y de quién son los datos del móvil (`own`): si entra otra cuenta, se borran antes de leer el estado. |
| `cloud/auth` | Registro, entrada, renovación del token (dura una hora) y cambio de contraseña; textos de error en español. |
| `cloud/firestore` | Leer, leer varios, listar, escribir varios a la vez con condición (`commit`) y borrar. |
| `cloud/merge` | Fusión a tres bandas, código puro (`tests/merge.test.mjs`). |
| `cloud/docs` | Qué va en cada documento de Firestore y cómo vuelve a `S` lo que llega de ellos (`PREF_KEYS`, `LOCAL_ONLY`, `localDocs`, `applyDoc`). Sin red ni estado de la sincronización. |
| `cloud/sync` | La sincronización (abajo): cuándo se sube y se baja, y qué hacer si algo cambia entretanto. |
| `account/login` | Inicio de sesión, registro, contraseña temporal y volver a entrar si la sesión caduca. |
| `account/account` | Ajustes → Cuenta, Cambiar contraseña y «Cerrar sesión». |
| `account/admin` | Perfil → Administración. |
| `account/reports` | Administración → Fallos y sugerencias: estado y respuesta. |
| `cloud/backup` | Copia de seguridad en la nube: escribir, leer, la semanal y borrarla. |
| `cloud/hooks` | Tareas tras cada sincronización correcta (`afterSync`): la copia semanal y los avisos pendientes. |
| `core/repair` | Deja `S` válido al arrancar y tras juntar lo que llega de la nube. |

## Datos en Firestore

Firebase guarda lo mismo que el móvil, dividido en documentos de menos de 1 MB. Cada parte guarda su contenido como texto JSON
en el campo `j` (Firestore no admite listas dentro de listas, y el historial las tiene), con `m` (cuándo, en ms), `r` (su versión),
`v` (formato, 1) y `d` (dispositivo).

| Documento | Qué guarda | Lee | Escribe |
| --- | --- | --- | --- |
| `users/{uid}` | `u` usuario, `sx` sexo, `pr` preferencias (tema, color y color propio, Cristal, animaciones, unidades, sonido y avisos, pestaña al abrir y si ya se vio el recorrido), `ca` alta, `m` último cambio, `mc` si debe cambiar la contraseña y `os` el sistema del último móvil que abrió la app (`ios`, `android` u `otro`; desde la V1.0.1, solo para el recuento de Administración, T-28) | Su dueño y el admin | Su dueño crea `u` (el de su correo técnico) y cambia `sx`, `pr`, `m` y `os`; `mc` solo lo puede quitar |
| `users/{uid}/data/index` | `p`: la versión de cada parte (`{ "core": "…", "logs:2026": "…" }`) | Su dueño | Su dueño |
| `users/{uid}/data/core` | El núcleo de `S` sin lo que es del dispositivo, ni lo que tiene su propio documento, ni las preferencias | Su dueño | Su dueño |
| `users/{uid}/logs/{año}` | Entrenos de ese año (cada uno con su `id`) | Su dueño | Su dueño |
| `users/{uid}/hist/{año}` | Historial por ejercicio de ese año | Su dueño | Su dueño |
| `users/{uid}/meals/{año-mes}` | Comidas de ese mes | Su dueño | Su dueño |
| `users/{uid}/private/avatar` | Foto de perfil pequeña (JPEG de 160 × 160, unos 10 KB) y cuándo se dio el consentimiento | Su dueño | Su dueño |
| `adminInbox/{id}` | Contraseñas temporales (`u`, `p`, `exp`): caducan a las 24 h | El admin | GitHub Actions; el admin las borra al entregarlas |
| `users/{uid}/backup/meta` | La copia de seguridad: `at` cuándo, `v` versión, `n` trozos (1-24), `z` si va comprimida (gzip en base64), `sz` tamaño, `h` huella, `lg` entrenos y `md` días de comidas que tiene | Su dueño | Su dueño |
| `users/{uid}/backup/c0` … `c23` | Los trozos de la copia (`j`, de hasta 300.000 caracteres, e `i`, su orden): se escriben con la meta en una sola operación | Su dueño | Su dueño |
| `reports/{uid}-{ms}` | Un fallo o sugerencia: `uid`, `u` usuario, `k` tipo (`f` fallo, `s` sugerencia), `a` dónde, `t` texto, `dx` datos técnicos, `v` versión, `ca` cuándo, `st` estado (`p` pendiente, `v` vista, `a` arreglada), `rp` respuesta, `ra` cuándo se contestó, `sa` cuándo cambió el estado, `m` último cambio | Quien lo envió y el admin | Quien lo envía lo crea (pendiente, sin respuesta); el admin cambia `st`, `rp`, `ra`, `sa` y `m`, y lo borra |

Fuera de Firebase, en el código de la app: el catálogo de ejercicios con sus tips y explicaciones (T-05) y la nota de cada versión,
que sale del `CHANGELOG.md` (T-20). No se sincronizan el entreno en curso, el registro de errores ni las copias automáticas del
móvil, ni lo que es del dispositivo: pestaña y día elegidos, rango de la gráfica de peso, fecha de la última copia en archivo.
Firestore indexa todos los campos (los índices de serie). Nadie busca por `j` ni por `p`, pero quitarles el índice necesita un
permiso que la cuenta de servicio no tiene, y sin él todo funciona igual (I-16): desde la V1.0.1 no se intenta.

## Sincronización (`cloud/sync`)

1. Cada parte del estado que se guarda (`core/persist`) se avisa a `Store.remote` y se sincroniza como mucho 30 s después del primer
   cambio sin subir (`CHANGE_WAIT`): lo que se cambie entretanto (otro alimento, otro vaso de agua) va en la misma subida, así que se
   gastan menos escrituras. También al pasar la app a segundo plano (lo pendiente se sube ya), al volver a primer plano y al volver
   la red. Sin red no pasa nada: lo cambiado sigue en el móvil y se sube después, aunque se cierre la app.
2. **Perfil.** Se juntan las preferencias del móvil y las de la nube (cada una por separado, gana el cambio más reciente). Si no
   existe (cuenta recién creada), se crea. Después, si ha cambiado, se escribe aparte el sistema del móvil (`os`): si las reglas
   aún no lo admiten (una app publicada antes que ellas), solo falla eso y se reintenta en la siguiente sincronización.
3. **Bajar.** El índice dice qué partes cambiaron en la nube desde la última vez (su versión no es la recordada). Se bajan de una
   vez y se juntan con lo local **sin esperas por medio**, así nada cambia `S` mientras tanto. Con un entreno en curso se espera a
   que acabe.
4. **Subir.** Lo que cambió en el móvil se sube con el índice en una sola escritura (todo o nada) con la condición de que el índice
   siga como se leyó. Si otro dispositivo subió algo entretanto, la condición falla y se vuelve al paso 3.

Lo de cada parte en la última sincronización se recuerda por **huellas** (una por elemento, Store `sync`), no por copias, así el
móvil no duplica sus datos. La fusión es a tres bandas (`cloud/merge`): cada parte se divide en elementos (un entreno por su `id`,
un día de comidas, el historial de un ejercicio, cada clave del núcleo, cada preferencia) y

- lo que cambió en un solo lado gana; lo borrado en un lado y sin tocar en el otro se borra;
- si cambió en los dos: un día de comidas junta los alimentos de ambos, el historial de un ejercicio junta sus registros y en el
  resto gana el cambio más reciente;
- justo después de entrar, en un conflicto gana la nube (el móvil aún no tenía nada de la cuenta).

Lo que el móvil vació al arrancar porque estaba dañado (`core/persist`) **no cuenta como borrado**: sus huellas se olvidan y esas
partes se vuelven a bajar de la nube (con el núcleo dañado, todo, y en un conflicto gana la nube). Y si los datos del móvil no se
pudieron leer (IndexedDB falla o falta una parte), no se sincroniza nada hasta poder leerlos: con la mitad de los datos, la nube
creería que se borró el resto. Desde ese aviso, «Bajar de mi cuenta» borra lo del móvil y las huellas, y la app vuelve a bajarlo
todo, como al entrar. La pantalla de error de arranque, al «Restablecer», también olvida las huellas (V1.0.2).

Las huellas solo se guardan cuando lo que describen **está guardado en el móvil** (`saveMeta`). Si el móvil no puede guardar (sin
espacio; `savesBroken` de `core/persist`), lo nuevo sube igual a la nube, pero no se apunta; y lo que baja se apunta cuando ya
está escrito. Así, si la app se cierra sin haber podido guardar, al abrirla otra vez al móvil le falta eso y, como no consta que
lo tuviera, **baja de la nube en vez de borrarse de ella**. Cuando un guardado completo vuelve a salir bien, las huellas se
guardan con normalidad. Y si la app está abierta en otra pestaña o ventana que ha guardado después
([la app abierta dos veces](estado.md#la-app-abierta-dos-veces)), esta ni sincroniza ni guarda sus huellas: subiría lo suyo, que
ya no es lo último, y la nube daría por borrado lo que le falta.

Al entrar, los datos del móvil se borran si son de otra cuenta, se bajan los de la cuenta y la app se abre de nuevo con ellos.
«Cerrar sesión» intenta subir lo pendiente y avisa si no puede; después borra del móvil los datos de la cuenta. «Borrar todos los
datos» los borra primero de la nube (sin conexión no borra nada: si no, la siguiente sincronización los volvería a bajar).

## Seguridad

- **Reglas** (`firestore.rules`): cada cuenta lee y escribe solo lo suyo, con la forma y el tamaño que usa la app (sin campos de más,
  sin documentos con otros nombres, 1 MB por parte, 150 KB la foto, 24 trozos de 300.000 caracteres la copia); el admin lee además
  los perfiles, `adminInbox` y los fallos y sugerencias, nunca los datos ni la copia de nadie; un aviso solo lo crea su dueño (id con
  su uid, su usuario, pendiente y sin respuesta) y el admin solo le cambia el estado y la respuesta; en el perfil, solo las
  preferencias que conoce la app (el color propio como `#rrggbb`, la pestaña al abrir de 0 a 3, el recorrido y las animaciones 0 o 1);
  solo valen cuentas con correo técnico (con el dominio de ahora o, mientras [se pasan](#el-dominio-de-las-cuentas), con el
  anterior; un correo que solo se les parezca no entra en nada); lo demás está denegado.
- **Pruebas**: `tests/rules.test.mjs` las comprueba con el emulador en cada cambio (CI, «Reglas y nube»), junto con la app entera
  contra el emulador (`tests/cloud.py`). Se despliegan desde GitHub Actions al fusionar en `main` («Desplegar reglas»), antes de publicar la app.
- La clave de administrador (cuenta de servicio) solo existe como secreto de GitHub, `FIREBASE_SERVICE_ACCOUNT`: nunca en el código,
  en el registro ni en el chat. `.gitignore` excluye cualquier archivo de clave.
- La CSP (`build.py`) abre solo `identitytoolkit`, `securetoken` y `firestore.googleapis.com`, además de Open Food Facts (y, con
  App Check activado, reCAPTCHA Enterprise: su código, su marco y sus propias peticiones, como piden sus preguntas frecuentes; y
  `content-firebaseappcheck.googleapis.com`). No admite estilos en línea (I-14).
- Lo que llega de la nube pasa por `core/repair` antes de pintarse, y todo se escapa al pintar (`core/html`).
- El token de sesión se renueva una vez en cada apertura: un rol nuevo vale al volver a abrir la app. Al cambiar la contraseña,
  Firebase cierra las demás sesiones; la app lo avisa y deja volver a entrar sin perder lo del móvil.
- **App Check** (I-05, `cloud/appcheck`): con él, solo la app publicada puede usar Authentication y Firestore, y un programa no
  puede crear cuentas sin fin ni gastar la cuota. reCAPTCHA Enterprise (invisible) da un token, App Check lo cambia por el suyo
  (dura una hora) y la app lo envía en cada petición (`X-Firebase-AppCheck`). El código está listo desde la V1.0.2, pero
  **apagado** mientras `APP_CHECK` (`cloud/config`) esté vacío: entonces ni se carga reCAPTCHA ni la CSP lo admite. Al activarlo,
  la CSP abre el script y el marco de reCAPTCHA y el cambio de tokens, y Privacidad y el inicio de sesión lo dicen (su sello no se
  ve). reCAPTCHA es de Google y usa datos técnicos del navegador: activarlo es decisión del propietario.
  reCAPTCHA es un servidor más del que depende entrar y sincronizar, así que nada se queda esperándolo: una petición a Firebase
  espera su token 8 segundos como mucho y, si no llega (reCAPTCHA bloqueado, sin responder, o sin conexión), sale sin él; durante
  el minuto siguiente las demás ya no esperan. Antes de exigir App Check en la consola, una petición sin token vale igual. Un
  fallo que no sea de conexión (una clave mal puesta, por ejemplo) queda anotado una vez en Ajustes → Diagnóstico, como «App
  Check». Que el script de reCAPTCHA no cargue tampoco es un fallo de arranque: la pantalla «StrataFit no ha podido iniciarse»
  (`src/index.html`) solo cuenta el código de la propia app. La V1.0.3 se publicó contando cualquier script, y con el móvil en
  modo avión esa pantalla tapaba la app, que seguía funcionando debajo; se corrigió el mismo día, y `tests/deploy.py` y
  `tests/cloud.py` lo reproducen. Los servicios de verdad no se pueden usar fuera de la dirección de la app: `tests/cloud.py` lo prueba con reCAPTCHA y
  App Check simulados sobre una compilación con su CSP de verdad (`python3 build.py --appcheck`); que funciona con los de
  Google se ve en la consola (paso 4).

### Activar App Check

Estado a 16-11-2026: hechos los pasos 1 a 3 (la V1.0.3 ya lleva los dos valores); falta el 4, que es mirar en la consola y,
cuando casi todo salga verificado, exigirlo.

1. **Clave de reCAPTCHA Enterprise.** En la consola de Google Cloud, con el proyecto de Firebase (`stratafit-960ec`), la página de
   reCAPTCHA, que ahora se llama *Fraud Defense* (<https://console.cloud.google.com/security/recaptcha>; activa la API si lo
   pide) → *Crear clave*: plataforma *Sitio web*, dominio `victorroma01.github.io`, sin marcar «Usar desafío de casilla de
   verificación» (App Check necesita una clave por puntuación, invisible). No hace falta facturación: sin ella hay cuatro
   umbrales de puntuación (0,1, 0,3, 0,7 y 0,9) en vez de once, y 10.000 evaluaciones gratis al mes (cada token nuevo, una; la
   app pide uno al abrirse con sesión y otro por cada hora que siga abierta).
2. **Registrar la app web.** En la consola de Firebase: *Configuración del proyecto → General → Tus apps*; si no hay una app web,
   *Añadir app → Web* (sin Hosting). Anota su *ID de app* (`1:…:web:…`). Después, *Seguridad → App Check → Apps* → esa app →
   *reCAPTCHA Enterprise* → pega la clave de sitio → *Guardar* (la duración del token, la de serie: 1 hora). Todavía **no** se
   pulsa *Aplicar* en ningún servicio.
3. **Poner los dos valores en la app**: `APP_CHECK = { siteKey: '…', appId: '1:…:web:…' }` en `src/js/cloud/config.js` (no son
   secretos) y publicar la versión. Con ellos, la compilación abre la CSP a reCAPTCHA sola, y las pruebas usan un reCAPTCHA de
   prueba (`tests/browser.py`): no salen a internet.
4. **Mirar antes de exigir.** En *Seguridad → App Check → APIs*, para *Cloud Firestore* y *Authentication* (esta, en beta), las
   peticiones verificadas frente a las que no. Si con la versión nueva en los móviles no aparecen peticiones verificadas, algo
   está mal puesto: Ajustes → Diagnóstico lo dice en la app («App Check»). Cuando casi todas estén verificadas (unos días, con
   todos los móviles ya actualizados), *Aplicar* en cada una; tarda hasta 15 minutos en valer. Desde ese momento, una app sin
   App Check (una versión vieja o un programa) ya no puede usarlas.
5. **Alertas de uso** (opcional): en Google Cloud, *Monitoring → Alertas → Crear política* con la métrica de escrituras de
   documentos de Firestore (por ejemplo, más de 15.000 en un día: el límite del plan Spark es 20.000) y aviso por correo.

## Administración desde GitHub

Flujos de GitHub Actions que se lanzan a mano (Actions → el flujo → *Run workflow*) y usan la cuenta de servicio
(`tools/admin`, con `firebase-admin`). El usuario les llega por una variable de entorno, nunca pegado en el código del paso.

| Flujo | Archivo | Qué hace |
| --- | --- | --- |
| Restablecer contraseña | `admin-contrasena.yml` | Se escribe el usuario. Le pone una contraseña temporal, cierra sus sesiones y marca `mc` en su perfil; la contraseña solo se guarda en `adminInbox`, que el admin ve en Perfil → Administración durante 24 h. No aparece en el registro, que es público. |
| Asignar rol | `admin-rol.yml` | Usuario y rol (admin o usuario). Vale la próxima vez que esa persona abra la app. |
| Desplegar reglas | `firebase-reglas.yml` | Reglas de Firestore (`tools/admin/reglas.mjs`, con la API de reglas de Firebase; sin firebase-tools, que pide a la cuenta de servicio un permiso más). Al publicar, `pruebas.yml` lo llama tras las pruebas si cambian las reglas o el flujo, y la app no se publica hasta que termina bien (T-24). También a mano, desde `main`. |
| Comprobar Firebase | `firebase-comprobar.yml` | Sin cambiar nada: el secreto, Authentication (cuántas cuentas hay, cuántas tienen el correo técnico con el dominio de ahora y cuántas con el anterior, y el acceso con correo y contraseña), la base de datos y su ubicación, y las reglas. Resultado en el resumen del flujo. |
| Pasar las cuentas al dominio nuevo | `admin-dominio.yml` | `simulacro`, `aplicar` (solo si nadie lo va a notar) o `aplicar-todo` ([El dominio de las cuentas](#el-dominio-de-las-cuentas)). Solo desde `main`. No escribe usuarios ni correos, solo recuentos: el registro es público. |

Los flujos manuales solo aparecen en Actions cuando están en `main`.

## El dominio de las cuentas

Firebase identifica cada cuenta por un correo. El de StrataFit es técnico, `usuario@dominio`: nadie lo ve y nunca se le envía
nada. Hasta la V1.0.31 el dominio fue `stratafit.app`; desde la V1.0.32 es `stratafit-960ec.firebaseapp.com`, el del propio
proyecto de Firebase, que es de la app y no tiene buzones. Las cuentas que ya existían se pasan de uno a otro sin que cambie
nada más: el mismo identificador (uid), la misma contraseña, el mismo rol y los mismos datos.

**Publicar la V1.0.32 no cambia nada para nadie**: las cuentas siguen como estaban y la app entra con ellas igual. Lo único
que podría notarse es el paso de las cuentas, y está hecho para que no se note.

| Pieza | Durante el cambio |
| --- | --- |
| La app (`cloud/auth`, `cloud/config`) | Registra con el dominio de ahora. Al entrar prueba el de ahora y, si no hay tal cuenta, el anterior: una cuenta que aún no se ha pasado entra igual, con su usuario y su contraseña. |
| Las reglas (`firestore.rules`) | Admiten los dos (`techUser`, `ownName`), y ninguno que solo se les parezca. |
| `tools/admin` | «Restablecer contraseña» y «Asignar rol» buscan la cuenta con los dos (`findUser`). «Comprobar Firebase» dice cuántas hay con cada uno. |
| «Pasar las cuentas al dominio nuevo» (`tools/admin/dominio.mjs`, `cuentas.mjs`) | Cambia el correo de cada cuenta que sigue con el anterior, conservando sus sesiones abiertas. Antes comprueba que las reglas publicadas ya admiten el de ahora y ensaya con una cuenta de prueba: si algo de eso falla, no toca ninguna. |

### Las sesiones abiertas

Firebase da por caducadas las sesiones de una cuenta cuando cambia su correo: apunta el momento en «válidas desde»
(`validSince`, que firebase-admin enseña como `tokensValidAfterTime`) y ya no renueva las que se abrieron antes. Dejado así,
cada móvil tendría que volver a entrar, y uno con una versión anterior a la 1.0.32, que no conoce el dominio nuevo, no podría
hasta actualizar.

Por eso, al pasar una cuenta se le devuelve ese dato a su valor de antes (`moveOne`), en la misma petición que cambia el
correo, y después se lee la cuenta para comprobarlo. Si Firebase no lo respeta ahí, o no admite las dos cosas juntas, va en
otra petición justo después: entonces, durante unas décimas de segundo, esa cuenta no podría renovar su sesión (un móvil la
renueva una vez por hora; si cayese justo en ese momento, pediría volver a entrar). El ensayo averigua cuál de las dos
maneras funciona, y las cuentas de verdad se pasan de esa. Las sesiones que valían siguen valiendo, las que ya no valían
siguen sin valer y el móvil no nota nada: sigue sincronizando, ahora con el correo nuevo, tenga la versión que tenga.

Como esto depende de cómo se porte Firebase de verdad, **antes de tocar ninguna cuenta se ensaya** con una de prueba
(`rehearse`): se crea con el dominio anterior, entra por la API pública como entraría un móvil, se pasa como las de verdad y se
intenta renovar su sesión. El resumen lo dice en «Las sesiones abiertas se conservan». La cuenta de prueba se borra; su nombre
tiene más de 20 caracteres, así que no puede ser la de ningún usuario ni entrar en nada.

### Pasar las cuentas

Con la V1.0.32 ya publicada (al publicarse, las reglas nuevas se despliegan antes que la app). En GitHub, Actions → **Pasar
las cuentas al dominio nuevo** → *Run workflow*, con uno de estos modos:

| Modo | Qué hace |
| --- | --- |
| `simulacro` | No cambia ninguna cuenta. Comprueba las reglas publicadas, hace el ensayo y cuenta. El resumen dice si las sesiones se conservan y cuántas cuentas quedan «Por pasar». |
| `aplicar` | Pasa las cuentas **solo si el ensayo dice que las sesiones se conservan**. Si no, no pasa ninguna y lo dice. |
| `aplicar-todo` | Las pasa aunque las sesiones no se conserven: en cada móvil sale **Tu sesión ha caducado** y hay que volver a entrar una vez, con la contraseña de siempre (lo que haya en el móvil se conserva y se sube al entrar). Un móvil con una versión anterior a la 1.0.32 tiene que actualizar antes. |

1. `simulacro`. Tienen que salir «Reglas de Firestore publicadas: Correcto», «Ensayo con una cuenta de prueba: Correcto» y
   «Las sesiones abiertas se conservan: Sí».
2. `aplicar`. En el resumen: «Pasadas ahora», las que había por pasar, y «Quedan en el dominio anterior: 0». Nadie tiene que
   hacer nada.
3. «Comprobar Firebase» confirma el final: «Dominio de las cuentas», todas con el de ahora.

Se puede lanzar las veces que haga falta: las cuentas ya pasadas no se tocan. Lo que puede salir en el resumen:

- **Las sesiones abiertas se conservan: No** (o «Sin comprobar»): Firebase no deja devolver la validez de las sesiones, o no se
  ha podido entrar con la cuenta de prueba (por ejemplo, con App Check exigido: el ensayo no lleva su token). `aplicar` no pasa
  ninguna. Queda decidir entre dejarlas como están o pasarlas con `aplicar-todo`, avisando antes a quien use la app.
- **Las reglas publicadas aún no aceptan el dominio nuevo**: la versión no está publicada, o el despliegue de las reglas falló
  (Actions → «Pruebas», el trabajo «Desplegar reglas de Firestore»). No se pasa ninguna cuenta.
- **Con el usuario ya ocupado en el dominio nuevo**: alguien se registró con ese nombre entre la publicación y el paso. Esa
  cuenta no se pasa sola (sigue entrando con el dominio anterior); el resumen da su identificador para decidir en la consola de
  Firebase (Authentication → Usuarios) cuál de las dos se queda, borrar la otra y volver a lanzarlo.
- **Pasadas, pero con la sesión cerrada**: en esas cuentas no se pudo devolver la validez; en sus móviles hay que volver a
  entrar una vez.
- **La cuenta de prueba no se ha podido borrar**: se borra a mano en la consola, por el identificador que da el resumen.

### Después

Con todas las cuentas pasadas, el dominio anterior ya no hace falta: una versión posterior lo quita de las reglas y de la
app (`OLD_TECH_DOMAIN`), y «Comprobar Firebase» avisa si aparece alguna cuenta con él.

## Límites del plan Spark

- Cada día, 50.000 lecturas y 20.000 escrituras de Firestore sin coste, para todas las cuentas. Una sincronización sin cambios
  cuesta una lectura (el índice; el perfil se vuelve a leer cada 10 minutos o al volver a la app) y una con cambios, una escritura
  por parte cambiada más el índice. Un día de uso intenso (un entreno, 12 alimentos, agua y peso) son unas 46 escrituras si cada
  cambio se sube por separado, y menos juntándolos (`CHANGE_WAIT`): las escrituras son lo primero que se acaba, con unos cientos de
  usuarios activos al día (unas 430 personas con ese uso intenso, sin juntar nada).
- 1 GiB guardado en total. Un año de uso ocupa unos 450 KB con uso intenso (5 entrenos por semana; 12 alimentos, agua y peso cada
  día) y unos 265 KB con uso normal (medido en la app, noviembre de 2026); con lo que añade Firestore (nombres de campos, índices y
  la copia semanal), unos 0,6 y 0,37 MB: da para unos 1.800-2.900 años de uso en total (por ejemplo, 500 usuarios intensos durante
  unos 3,5 años). Por usuario no hay un tope alcanzable: un documento admite 1 MB y el más lleno, el historial de un año, ocupa unos
  126 KB con uso intenso.
- Si un día se superase, Firestore dejaría de responder hasta el día siguiente (la app seguiría en local); no hay cobro posible
  porque no hay tarjeta.
- Notificaciones con la app cerrada o fotos en Cloud Storage necesitarían pasar a Blaze.

Fuentes: [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) ·
[Claves de API de Firebase](https://firebase.google.com/docs/projects/api-keys).
