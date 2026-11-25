# Cuenta

Desde la V1.0.0, StrataFit se usa con una cuenta: un **nombre de usuario** y una **contraseña**. No se pide ni se guarda ningún dato
personal (ni nombre, ni correo, ni teléfono).

## Crear la cuenta y entrar

Al abrir la app sin cuenta solo se ve la pantalla de inicio, con dos pestañas:

- **Crear cuenta**: usuario, contraseña y repetirla. El usuario tiene de 3 a 20 caracteres (letras sin tilde, números, punto, guion
  y guion bajo) y es único: si ya existe, la app lo dice. La contraseña tiene 8 caracteres o más. Da igual escribir el usuario con
  mayúsculas o minúsculas: sale siempre como se registró. Desde la V1.0.4 hay que marcar además dos casillas, que salen sin
  marcar: una dice que tienes 16 años o más y aceptas las condiciones de uso; la otra, que aceptas el tratamiento de tus datos
  de salud según el consentimiento informado. Cada una enlaza su texto entero. Sin las dos, la app dice cuál falta y no crea la
  cuenta.
- **Entrar**: usuario y contraseña. El ojo del campo enseña u oculta la contraseña.

Debajo, **Privacidad** y **Aviso legal** abren los dos textos sin tener cuenta, igual que los enlaces de las casillas.

Con una cuenta creada antes de la V1.0.4, la app pide lo mismo una vez, al abrirla o al entrar: la pantalla **Condiciones y
privacidad**, con las dos casillas y **Aceptar y continuar**. Hasta aceptar no baja ni enseña tus datos. Quien prefiera no
aceptar tiene ahí **Exportar una copia** (en un móvil en el que acabas de entrar, la copia se hace con lo que tu cuenta tiene en
la nube, sin que se quede en el móvil), **Borrar todos los datos**, **Eliminar cuenta** y **Cerrar sesión**
([Datos y privacidad](datos-y-privacidad.md#condiciones-y-consentimiento)).

Una cuenta recién creada empieza con la [bienvenida](experiencia.md#la-primera-vez): pide tus datos biométricos y, tras el recorrido,
te invita a elegir un programa.

Para crear la cuenta o entrar hace falta internet; después, la app funciona igual sin conexión. Si la contraseña falla cinco veces
seguidas, hay que esperar unos segundos antes de volver a probar (cada fallo más dobla la espera, hasta 5 minutos).

## Sin conexión y en varios móviles

Todo se guarda en el móvil y, cuando hay internet, también en la cuenta. Sin cobertura (en el gimnasio, por ejemplo) se sigue
usando todo; lo que hagas se sube solo al volver la red, aunque cierres la app entretanto.

Lo que cambias se sube junto, como mucho medio minuto después o al salir de la app. Con la misma cuenta en varios móviles, cada uno
recibe lo de los demás al abrir la app o al volver a ella. Si cambias lo mismo en dos
móviles sin conexión, al sincronizar se juntan: las comidas de un mismo día y los entrenos de los dos se conservan; en lo demás (un
programa, los objetivos…) se queda el cambio más reciente. Lo que borras en un móvil se borra también en los otros.

Con la app abierta dos veces en el mismo móvil u ordenador (dos pestañas del navegador o, en Android, la app instalada y una
pestaña), vale lo que guardas en la que estás usando. La otra lo nota: si la estás viendo, avisa («La app está abierta en otra
ventana») y se recarga con lo último al tocar **Recargar**; si no, se recarga sola al volver a ella. Así no se mezclan los datos
de una y otra. Si en esa había un entreno a medias, al recargarse te ofrece reanudarlo.

**Ajustes → Cuenta** enseña el usuario, el tipo de cuenta (Usuario o Administrador) y el estado de la sincronización («Al día», «Sin
conexión»…), con **Sincronizar ahora**. Al final, **Eliminar cuenta**.

## Contraseña

- **Cambiar contraseña** (Ajustes → Cuenta): la actual y la nueva dos veces. Al cambiarla se cierra la sesión en tus otros móviles.
- **Si la olvidas**, pídele al administrador una contraseña temporal. Al entrar con ella, la app pide elegir una nueva antes de nada.
- **Si la sesión caduca** (por ejemplo, porque se cambió la contraseña en otro móvil), la app lo avisa y deja **Volver a entrar** sin
  perder nada: lo hecho en el móvil se sube al entrar.

## Cerrar sesión

**Ajustes → Cerrar sesión**, en rojo, al final. Antes sube lo pendiente; si no puede (sin conexión), avisa de que esos cambios se
perderían y deja cancelar. Después borra del móvil los datos de la cuenta y vuelve a la pantalla de inicio. Los datos siguen en la
cuenta: al volver a entrar, en este móvil o en otro, vuelven.

## Eliminar cuenta

**Ajustes → Cuenta → Eliminar cuenta** (también en Privacidad → Tus datos y en la pantalla de Condiciones y privacidad). La
página dice qué se borra, pide tu contraseña y, tras una confirmación, borra para siempre la cuenta y todo lo suyo: programas,
entrenos, comidas, medidas, peso, foto, la copia de seguridad de la nube, lo que aceptaste y los avisos que enviaste, y los
datos de este móvil. Necesita conexión y no se puede deshacer; los archivos que hayas exportado antes siguen donde los
guardaste. Al terminar, la app se abre sin sesión y lo dice.

Si algo falla a medias, la app dice hasta dónde llegó y la cuenta sigue: se puede repetir. Con la sesión abierta en otro móvil,
ese avisa de que la cuenta ya no existe y **Cerrar sesión** borra lo que le quedaba.

Una cuenta que lleva dos años sin usarse se elimina sola
([Datos y privacidad](datos-y-privacidad.md#borrar)).

## Administración (solo el administrador)

El administrador ve en Perfil la fila **Administración**:

- **Fallos y sugerencias**: los de todos los usuarios, lo más nuevo primero, con cuántos hay pendientes y filtros por estado
  (pendientes, vistas, arregladas o todas). Al abrir uno pendiente pasa a visto; se le cambia el estado y se contesta: la respuesta
  la ve quien lo envió en su Perfil ([Perfil y Ajustes](perfil-y-ajustes.md#fallos-y-sugerencias)).
- **Contraseñas temporales**: las que ha creado para quien olvidó la suya, durante 24 horas. Cada una sale oculta; **Ver** la enseña,
  **Copiar** la copia y **Entregada** la borra.
- **Cuentas**: el usuario, el sexo, el sistema del último móvil con el que abrió la app (iPhone, Android u otro) y la fecha de alta
  de cada cuenta, y arriba cuántas usan cada sistema (las que aún no han abierto la V1.0.1 salen como «sin dato»). Nunca sus
  entrenos, comidas, medidas ni foto. Al volver a Administración desde Fallos y sugerencias, se ve lo ya cargado mientras se
  actualiza.

Las tareas de administración se hacen desde GitHub (Actions → el flujo → *Run workflow*):

| Flujo | Para qué |
| --- | --- |
| **Restablecer contraseña** | Se escribe el usuario. Crea su contraseña temporal, que aparece en Administración (nunca en GitHub). |
| **Asignar rol** | Hace a una cuenta administrador o usuario. Vale la próxima vez que esa persona abra la app. |
| **Comprobar Firebase** | Comprueba, sin cambiar nada, que la conexión con Firebase está bien configurada. |
| **Limpieza de cuentas** | Se lanza sola el día 3 de cada mes: elimina las cuentas con dos años sin uso, borra lo que quede de cuentas ya eliminadas y las contraseñas temporales caducadas. A mano sale en `simulacro`, que solo cuenta lo que borraría. |
