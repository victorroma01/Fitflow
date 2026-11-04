# Cuenta

Desde la V1.0.0, StrataFit se usa con una cuenta: un **nombre de usuario** y una **contraseña**. No se pide ni se guarda ningún dato
personal (ni nombre, ni correo, ni teléfono).

## Crear la cuenta y entrar

Al abrir la app sin cuenta solo se ve la pantalla de inicio, con dos pestañas:

- **Crear cuenta**: usuario, contraseña y repetirla. El usuario tiene de 3 a 20 caracteres (letras sin tilde, números, punto, guion
  y guion bajo) y es único: si ya existe, la app lo dice. La contraseña tiene 8 caracteres o más. Da igual escribir el usuario con
  mayúsculas o minúsculas: sale siempre como se registró.
- **Entrar**: usuario y contraseña. El ojo del campo enseña u oculta la contraseña.

Para crear la cuenta o entrar hace falta internet; después, la app funciona igual sin conexión. Si la contraseña falla cinco veces
seguidas, hay que esperar unos segundos antes de volver a probar (cada fallo más dobla la espera, hasta 5 minutos).

## Sin conexión y en varios móviles

Todo se guarda en el móvil y, cuando hay internet, también en la cuenta. Sin cobertura (en el gimnasio, por ejemplo) se sigue
usando todo; lo que hagas se sube solo al volver la red, aunque cierres la app entretanto.

Con la misma cuenta en varios móviles, cada uno recibe lo de los demás al abrir la app o al volver a ella. Si cambias lo mismo en dos
móviles sin conexión, al sincronizar se juntan: las comidas de un mismo día y los entrenos de los dos se conservan; en lo demás (un
programa, los objetivos…) se queda el cambio más reciente. Lo que borras en un móvil se borra también en los otros.

**Ajustes → Cuenta** enseña el usuario, el tipo de cuenta (Usuario o Administrador) y el estado de la sincronización («Al día», «Sin
conexión»…), con **Sincronizar ahora**.

## Contraseña

- **Cambiar contraseña** (Ajustes → Cuenta): la actual y la nueva dos veces. Al cambiarla se cierra la sesión en tus otros móviles.
- **Si la olvidas**, pídele al administrador una contraseña temporal. Al entrar con ella, la app pide elegir una nueva antes de nada.
- **Si la sesión caduca** (por ejemplo, porque se cambió la contraseña en otro móvil), la app lo avisa y deja **Volver a entrar** sin
  perder nada: lo hecho en el móvil se sube al entrar.

## Cerrar sesión

**Ajustes → Cerrar sesión**, en rojo, al final. Antes sube lo pendiente; si no puede (sin conexión), avisa de que esos cambios se
perderían y deja cancelar. Después borra del móvil los datos de la cuenta y vuelve a la pantalla de inicio. Los datos siguen en la
cuenta: al volver a entrar, en este móvil o en otro, vuelven.

## Administración (solo el administrador)

El administrador ve en Perfil la fila **Administración**:

- **Fallos y sugerencias**: los de todos los usuarios, lo más nuevo primero, con cuántos hay pendientes y filtros por estado
  (pendientes, vistas, arregladas o todas). Al abrir uno pendiente pasa a visto; se le cambia el estado y se contesta: la respuesta
  la ve quien lo envió en su Perfil ([Perfil y Ajustes](perfil-y-ajustes.md#fallos-y-sugerencias)).
- **Contraseñas temporales**: las que ha creado para quien olvidó la suya, durante 24 horas. Cada una sale oculta; **Ver** la enseña,
  **Copiar** la copia y **Entregada** la borra.
- **Cuentas**: el usuario, el sexo y la fecha de alta de cada cuenta. Nunca sus entrenos, comidas, medidas ni foto.

Las tareas de administración se hacen desde GitHub (Actions → el flujo → *Run workflow*):

| Flujo | Para qué |
| --- | --- |
| **Restablecer contraseña** | Se escribe el usuario. Crea su contraseña temporal, que aparece en Administración (nunca en GitHub). |
| **Asignar rol** | Hace a una cuenta administrador o usuario. Vale la próxima vez que esa persona abra la app. |
| **Comprobar Firebase** | Comprueba, sin cambiar nada, que la conexión con Firebase está bien configurada. |
