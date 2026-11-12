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
| Cuentas | Registro libre con usuario y contraseña. Authentication usa un correo técnico interno, `usuario@stratafit.app`, que el usuario nunca ve y al que nunca se envía nada. |
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
| `cloud/sync` | La sincronización (abajo). |
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

1. Cada parte del estado que se guarda (`core/persist`) se avisa a `Store.remote`; unos segundos después, y al volver la red o la
   app a primer plano, se sincroniza. Sin red no pasa nada: lo cambiado sigue en el móvil y se sube después, aunque se cierre la app.
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

Al entrar, los datos del móvil se borran si son de otra cuenta, se bajan los de la cuenta y la app se abre de nuevo con ellos.
«Cerrar sesión» intenta subir lo pendiente y avisa si no puede; después borra del móvil los datos de la cuenta. «Borrar todos los
datos» los borra primero de la nube (sin conexión no borra nada: si no, la siguiente sincronización los volvería a bajar).

## Seguridad

- **Reglas** (`firestore.rules`): cada cuenta lee y escribe solo lo suyo, con la forma y el tamaño que usa la app (sin campos de más,
  sin documentos con otros nombres, 1 MB por parte, 150 KB la foto, 24 trozos de 300.000 caracteres la copia); el admin lee además
  los perfiles, `adminInbox` y los fallos y sugerencias, nunca los datos ni la copia de nadie; un aviso solo lo crea su dueño (id con
  su uid, su usuario, pendiente y sin respuesta) y el admin solo le cambia el estado y la respuesta; en el perfil, solo las
  preferencias que conoce la app (el color propio como `#rrggbb`, la pestaña al abrir de 0 a 3, el recorrido y las animaciones 0 o 1);
  solo valen cuentas con correo técnico; lo demás está denegado.
- **Pruebas**: `tests/rules.test.mjs` las comprueba con el emulador en cada cambio (CI, «Reglas y nube»), junto con la app entera
  contra el emulador (`tests/cloud.py`). Se despliegan desde GitHub Actions al fusionar en `main` («Desplegar reglas»), antes de publicar la app.
- La clave de administrador (cuenta de servicio) solo existe como secreto de GitHub, `FIREBASE_SERVICE_ACCOUNT`: nunca en el código,
  en el registro ni en el chat. `.gitignore` excluye cualquier archivo de clave.
- La CSP (`build.py`) abre solo `identitytoolkit`, `securetoken` y `firestore.googleapis.com`, además de Open Food Facts (y, con
  App Check activado, reCAPTCHA Enterprise y `content-firebaseappcheck.googleapis.com`). No admite estilos en línea (I-14).
- Lo que llega de la nube pasa por `core/repair` antes de pintarse, y todo se escapa al pintar (`core/html`).
- El token de sesión se renueva una vez en cada apertura: un rol nuevo vale al volver a abrir la app. Al cambiar la contraseña,
  Firebase cierra las demás sesiones; la app lo avisa y deja volver a entrar sin perder lo del móvil.
- **App Check** (I-05, `cloud/appcheck`): con él, solo la app publicada puede usar Authentication y Firestore, y un programa no
  puede crear cuentas sin fin ni gastar la cuota. reCAPTCHA Enterprise (invisible) da un token, App Check lo cambia por el suyo
  (dura una hora) y la app lo envía en cada petición (`X-Firebase-AppCheck`). El código está listo desde la V1.0.2, pero
  **apagado** mientras `APP_CHECK` (`cloud/config`) esté vacío: entonces ni se carga reCAPTCHA ni la CSP lo admite. Al activarlo,
  la CSP abre el script y el marco de reCAPTCHA y el cambio de tokens, y Privacidad y el inicio de sesión lo dicen (su sello no se
  ve). reCAPTCHA es de Google y usa datos técnicos del navegador: activarlo es decisión del propietario.

### Activar App Check

1. **Clave de reCAPTCHA Enterprise.** En la consola de Google Cloud, con el proyecto de Firebase (`stratafit-960ec`): *Seguridad →
   reCAPTCHA* (activa la API si lo pide) → *Crear clave*: tipo *Sitio web*, dominio `victorroma01.github.io`, sin la casilla «No
   soy un robot» (por puntuación). No hace falta facturación: sin ella, App Check usa los umbrales 0,1-0,9 de diez en diez, y hay
   una cuota gratuita de evaluaciones al mes (cada token nuevo, una; la app pide uno por hora de uso).
2. **Registrar la app web.** En la consola de Firebase: *Configuración del proyecto → General → Tus apps*; si no hay una app web,
   *Añadir app → Web* (sin Hosting). Anota su *ID de app* (`1:…:web:…`). Después, *App Check → Apps* → esa app → *reCAPTCHA
   Enterprise* → pega la clave de sitio → *Guardar* (la duración del token, la de serie: 1 hora).
3. **Poner los dos valores en la app**: `APP_CHECK = { siteKey: '…', appId: '1:…:web:…' }` en `src/js/cloud/config.js` (no son
   secretos) y publicar la versión.
4. **Mirar antes de exigir.** En *App Check → APIs*, para *Cloud Firestore* y *Authentication*, las peticiones verificadas frente a
   las que no. Cuando casi todas estén verificadas (unos días, con todos los móviles ya actualizados), *Aplicar* en cada una.
   Desde ese momento, una app sin App Check (una versión vieja o un programa) ya no puede usarlas.
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
| Comprobar Firebase | `firebase-comprobar.yml` | Sin cambiar nada: el secreto, Authentication (cuentas y acceso con correo y contraseña), la base de datos y su ubicación, y las reglas. Resultado en el resumen del flujo. |

Los flujos manuales solo aparecen en Actions cuando están en `main`.

## Límites del plan Spark

- Cada día, 50.000 lecturas y 20.000 escrituras de Firestore sin coste. Una sincronización sin cambios cuesta una lectura (el índice;
  el perfil se vuelve a leer cada 10 minutos o al volver a la app) y una con cambios, una escritura por parte cambiada más el
  índice: da para cientos de usuarios activos al día.
- Si un día se superase, Firestore dejaría de responder hasta el día siguiente (la app seguiría en local); no hay cobro posible
  porque no hay tarjeta.
- Notificaciones con la app cerrada o fotos en Cloud Storage necesitarían pasar a Blaze.

Fuentes: [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) ·
[Claves de API de Firebase](https://firebase.google.com/docs/projects/api-keys).
