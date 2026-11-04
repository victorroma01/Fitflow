# Datos y privacidad

## Qué se guarda y dónde

- **Tu cuenta es un usuario y una contraseña.** No se guarda ningún dato personal: ni nombre, ni correo, ni teléfono. Las fotos de
  progreso de la serie de prueba desaparecieron con la V1.0.0.
- **En el móvil y en tu cuenta.** Entrenos, comidas, medidas, programas y ajustes se guardan en el móvil (la app abre al instante y
  funciona sin conexión) y, cuando hay internet, en tu cuenta en la nube: Firebase, de Google. Los datos de la app están en sus
  servidores de Madrid; el usuario y la contraseña (cifrada) los guarda Firebase Authentication.
- **Solo tu cuenta los lee.** Las reglas del servidor no dejan que otra cuenta lea ni escriba los tuyos.
- **El administrador** ve de cada cuenta el usuario, el sexo, la fecha de alta y las preferencias (tema, color, unidades y sonido);
  nunca tus entrenos, tus comidas, tus medidas, tu foto ni tu copia de seguridad. Sí ve los fallos y sugerencias que le envías:
  tu usuario, el texto y, si los adjuntas, los datos técnicos.
- **La copia de seguridad en la nube** es una sola por cuenta (cada copia sustituye a la anterior) y, como el resto de tus datos,
  solo la lee tu cuenta.
- **La foto de perfil** solo se sube si das tu consentimiento, y solo la ves tú. «Quitar foto» la borra del móvil y de la cuenta.

## Lo que sale del móvil

Además de la sincronización con tu cuenta (y de su copia de seguridad semanal), y solo cuando tú lo haces:

- los archivos que guardas o compartes: la copia de seguridad (siempre con el mismo nombre), el análisis mensual en PDF (se hace en
  el móvil, sin conexión) y el evento del recordatorio de pesaje para tu calendario;
- el informe de Diagnóstico y los fallos o sugerencias que envías (al administrador, dentro de la app);
- el texto o el código de barras que buscas en Open Food Facts (la imagen de la cámara no sale del móvil).

Sin publicidad, sin cookies de seguimiento y sin analítica. GitHub Pages, que sirve la app, registra como cualquier servidor datos
técnicos de la conexión (por ejemplo, la dirección IP).

## Protección

- **Solo su propio código**: una política de seguridad impide que la página ejecute código que no sea el de la app y que se conecte a
  otro sitio que no sean ella misma, Firebase y Open Food Facts.
- **Contraseñas**: 8 caracteres o más; tras cinco fallos seguidos hay que esperar antes de volver a probar, y Firebase bloquea un rato
  los intentos repetidos. Una contraseña temporal (la que da el administrador si olvidas la tuya) hay que cambiarla al entrar.
- **Copias automáticas**: cada día se guarda una copia en el móvil (las 7 últimas), útil para deshacer un error propio.
- **Ante fallos**: si el móvil no tiene espacio para guardar, la app avisa; si los datos se dañan, se apartan antes de empezar de cero
  para poder recuperarlos desde Ajustes → Diagnóstico.

## Borrar

- **Cerrar sesión** borra los datos de la cuenta de este móvil; siguen en tu cuenta.
- **Borrar todos los datos** (Ajustes) los borra del móvil y de tu cuenta, también la copia de seguridad de la nube; tu usuario se
  queda. Los fallos y sugerencias enviados se quedan con el administrador.

El detalle técnico está en [Servidor: Firebase](../tecnica/backend.md).
