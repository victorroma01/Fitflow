# Datos y privacidad

## Hoy (hasta la V1.0.0)

- **Todo se queda en tu móvil.** No hay cuentas ni servidor: perfil, entrenos, comidas, medidas y fotos se guardan en el propio
  dispositivo. Nadie más los ve.
- **Copia de seguridad en archivo** (Ajustes → Copia de seguridad): guárdala de vez en cuando; es lo único que te protege si cambias de
  móvil o borras los datos del navegador.
- **Copias automáticas**: cada día se guarda una copia en el móvil (las 7 últimas), útil para deshacer un error propio.
- **Protección ante fallos**: si el móvil no tiene espacio para guardar, la app avisa; si los datos se dañan, se apartan antes de empezar
  de cero para poder recuperarlos desde Ajustes → Diagnóstico.
- **Lo que sale del móvil**, y solo cuando tú lo haces: la copia de seguridad que guardas, el informe de Diagnóstico o de un fallo que
  envías, y el texto o el código de barras que buscas en Open Food Facts (la imagen de la cámara no sale del móvil).
- **Sin publicidad, sin cookies de seguimiento y sin analítica.** GitHub Pages, que sirve la app, registra como cualquier servidor datos
  técnicos de la conexión (por ejemplo, la dirección IP).
- **Solo su propio código**: una política de seguridad impide que la página ejecute código que no sea el de la app y que se conecte a
  otro sitio que no sea el suyo y Open Food Facts.
- **Borrar todos los datos** (Ajustes) elimina todo lo guardado en el móvil.

## Con la V1.0.0

- Cada persona entra con su **nombre de usuario y contraseña**. No se guarda ningún dato personal: ni nombre, ni correo, ni teléfono.
- Los datos se guardan también en la nube (Firebase), para no perderlos y usarlos en varios móviles. La app sigue funcionando sin
  conexión y sincroniza al volver la red.
- Cada cuenta solo ve sus propios datos. El administrador ve la ficha básica de cada cuenta (usuario, sexo y preferencias) y los
  informes de fallos; nunca los entrenos, las comidas, las medidas ni la foto.
- Las fotos de progreso desaparecen. La foto de perfil se puede subir solo si das tu consentimiento.

El detalle técnico está en [Servidor: Firebase](../tecnica/backend.md).
