# Servidor: Firebase

Diseño aprobado en M0 (4 de noviembre de 2026) y que se programa en M2. Hasta entonces la app no tiene servidor: todo se guarda
en el móvil. El móvil sigue mandando y Firebase es la copia de referencia y el punto de encuentro entre dispositivos, así que la
app abre al instante y funciona en un gimnasio sin cobertura (*offline-first*).

## Decisiones

| Tema | Decisión |
| --- | --- |
| Plan | **Spark**: gratis y sin tarjeta. Solo Authentication y Firestore; sin Cloud Functions ni Cloud Storage. |
| Proyecto | `stratafit-960ec`, con Firestore en `europe-southwest1` (Madrid). La configuración web no es secreta: va en el código. |
| Dominio autorizado | `victorroma01.github.io` (la app sigue publicándose en GitHub Pages). |
| Cuentas | Registro libre con usuario y contraseña. Firebase Authentication usa un correo técnico interno, `usuario@stratafit.app`, que el usuario nunca ve y al que nunca se envía nada. |
| Usuario | Único, de 3 a 20 caracteres: letras sin tilde, números, punto, guion y guion bajo; sin distinguir mayúsculas. |
| Contraseña | 8 caracteres o más. Firebase bloquea un rato los intentos fallidos repetidos y la app añade una espera creciente a partir del quinto fallo. |
| Roles | Admin y Usuario, con *custom claims* (`role: "admin"`) en el token de la sesión: la app no puede cambiarlos. Admin: `VictorAdmin_`. |
| Contraseña olvidada | La restablece el admin con un flujo de GitHub Actions, solo para el usuario que lo necesita (más adelante, el propio usuario). |
| Datos personales | Ninguno: ni nombre, ni correo, ni teléfono, ni fotos de progreso. La foto de perfil se queda, con consentimiento, y solo la ve su dueño. |
| Aviso de pesaje | Dentro de la app, al abrirla. Una notificación con la app cerrada necesitaría Cloud Functions (plan Blaze). |
| Copia de seguridad | En la nube: una sola por usuario, que se sobrescribe. |
| Datos de la serie de prueba (1.24 y anteriores) | No se migran: son de prueba. |

## Datos en Firestore

Firebase guarda lo mismo que el móvil, dividido en las mismas partes (`core/persist`) y en documentos de menos de 1 MB.

| Documento | Qué guarda | Lee | Escribe |
| --- | --- | --- | --- |
| `users/{uid}` | Usuario, sexo, preferencias (tema, color, unidades, sonido), si vio el tour, aviso de pesaje (cada cuánto y próxima fecha) y si debe cambiar la contraseña | Su dueño y el admin | Su dueño, salvo el rol |
| `users/{uid}/data/core` | Núcleo del estado `S`: plan y programa activo, programas propios, semana y descarga elegida, datos biométricos, peso corporal, medidas, objetivos de nutrición y ajustes del entreno | Su dueño | Su dueño |
| `users/{uid}/logs/{año}` | Entrenos de ese año | Su dueño | Su dueño |
| `users/{uid}/hist/{año}` | Historial por ejercicio de ese año | Su dueño | Su dueño |
| `users/{uid}/meals/{año-mes}` | Comidas de ese mes | Su dueño | Su dueño |
| `users/{uid}/private/avatar` | Foto de perfil pequeña (JPEG de unos 30 KB), solo con consentimiento | Su dueño | Su dueño |
| `users/{uid}/backup/…` | Copia de seguridad: sus partes y una ficha con la fecha; cada copia sobrescribe la anterior | Su dueño | Su dueño |
| `reports/{id}` | Informe: fallo o sugerencia, categoría, texto, datos técnicos opcionales, estado y respuesta | Su autor y el admin | El autor lo crea; el admin cambia el estado y responde |
| `adminInbox/{id}` | Contraseñas temporales creadas desde GitHub, con caducidad de 24 h | El admin | GitHub Actions; el admin las borra al entregarlas |

El estado de un informe lo ve el admin como *pendiente, vista o arreglada* y su autor como *pendiente, vista o contestada*.

Fuera de Firebase, en el código de la app: el catálogo de ejercicios con sus tips y explicaciones (T-05) y la nota de cada versión,
que sale del `CHANGELOG.md` (T-20). Así funcionan sin conexión y van versionados. No se sincronizan el entreno en curso, el registro de
errores ni las copias automáticas del móvil: son de cada dispositivo.

## Sincronización

1. El móvil guarda por partes, como hasta ahora. `Store` avisa de cada parte que cambia a `Store.remote.changed(clave, valor)`
   (`core/store`), que la pone en una cola en el móvil y la sube cuando hay red. Lo escrito sin red no se pierde aunque se cierre la app.
2. Al entrar con red se bajan las partes más nuevas que las del móvil. Si una parte cambió en dos móviles, entrenos y comidas se juntan
   elemento a elemento; en el resto gana el cambio más reciente.
3. «Cerrar sesión» termina de subir lo pendiente, borra del móvil los datos de esa cuenta y vuelve al inicio de sesión.

## Seguridad

- Reglas de Firestore en el repositorio (`firestore.rules`): cada usuario solo lee y escribe lo suyo; el admin solo lee perfiles e
  informes; nadie puede ponerse un rol. Comprueban tipos y tamaños (un informe de 1500 caracteres como mucho, una foto de 100 KB como
  mucho).
- Las reglas se prueban con el emulador de Firebase en GitHub Actions y se despliegan desde allí al fusionar en `main`.
- La clave de administrador (cuenta de servicio) solo existe como secreto de GitHub, `FIREBASE_SERVICE_ACCOUNT`: nunca en el código.
- La política de seguridad de la página (CSP, `build.py`) se amplía solo a los dominios de Firebase.

## Administración desde GitHub

Flujos de GitHub Actions que se lanzan a mano (Actions → el flujo → *Run workflow*) y usan la cuenta de servicio:

| Flujo | Qué hace |
| --- | --- |
| Restablecer contraseña | Se escribe el usuario. Crea una contraseña temporal que el admin ve en su Perfil → Administración durante 24 h; al entrar con ella, el usuario tiene que cambiarla. No aparece en el registro de GitHub, que es público. |
| Asignar rol | Usuario y rol (admin o usuario). |
| Desplegar reglas | Se lanza solo al fusionar en `main`. |

## Límites del plan Spark

- Cada día, 50.000 lecturas y 20.000 escrituras de Firestore sin coste. La app usa unas decenas por sesión: da para cientos de
  usuarios activos al día.
- Si un día se superase, Firestore dejaría de responder hasta el día siguiente; no hay cobro posible porque no hay tarjeta.
- Notificaciones con la app cerrada o fotos en la nube necesitarían pasar a Blaze.

Fuente: [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).
