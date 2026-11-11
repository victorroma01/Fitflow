<div align="center">

<img src="static/icon-192.png" width="96" height="96" alt="Icono de StrataFit">

# StrataFit

**Entrenamiento y nutrición en una sola app, que se instala desde el navegador del móvil y funciona sin conexión.**

[![Pruebas](https://github.com/victorroma01/Fitflow/actions/workflows/pruebas.yml/badge.svg)](https://github.com/victorroma01/Fitflow/actions/workflows/pruebas.yml)
![Plataforma](https://img.shields.io/badge/plataforma-iPhone%20%C2%B7%20Android%20%C2%B7%20web%20instalable-111111)
![Sin conexión](https://img.shields.io/badge/funciona-sin%20conexi%C3%B3n-14804a)
![Licencia](https://img.shields.io/badge/licencia-uso%20personal-7a45ee)

[Abrir la app](https://victorroma01.github.io/Fitflow/) · [Novedades](CHANGELOG.md) · [Documentación funcional](docs/funcional/README.md) · [Documentación técnica](docs/tecnica/README.md) · [Licencia](LICENSE)

</div>

<p align="center">
  <img src="docs/img/workout.jpg" width="160" alt="Pestaña Workout">
  <img src="docs/img/sesion.jpg" width="160" alt="Entreno en curso">
  <img src="docs/img/ficha.jpg" width="160" alt="Ficha de ejercicio con foto">
  <img src="docs/img/nutricion.jpg" width="160" alt="Nutrición">
  <img src="docs/img/dashboard.jpg" width="160" alt="Dashboard">
</p>

---

## Estado

La versión publicada es la **1.24.0**, la última de la serie de prueba. La **V1.0.0** está en desarrollo en la rama
`desarrollo-1.0.0`, por milestones que se siguen en GitHub:

| Milestone | Contenido |
| --- | --- |
| M0 · Análisis y validación | Dudas, diseño del servidor y simulaciones. Hecho. |
| M1 · Base técnica | Limpieza del código, versión 1.0.0 y documentación. Hecho. |
| M2 · Cuentas y Firebase | Usuario y contraseña, roles, datos en la nube y seguridad. Hecho en la rama. |
| M3 · Programas | Técnicas de intensidad, programas nuevos y por género, rotación, semana de descarga y consejo y ejecución de cada ejercicio. Hecho en la rama. |
| M4 · Pantalla de entrenamiento | Iconos, desplegables cortos, peso sugerido, ventana de cada técnica, superseries encadenadas, barra inferior y reloj del WOD. Hecho en la rama. |
| M5 · Perfil y seguimiento | Recordatorio de pesaje, análisis mensual en PDF, fallos y sugerencias con respuesta, nota de actualización y copia de seguridad única en la nube. Hecho en la rama. |
| M6 · Experiencia y plataformas | Más colores y uno propio, recorrido de la primera vez, deslizar para volver, arrastrar la burbuja de las pestañas, «atrás» de Android, accesos directos y globo en el icono, con pruebas en Android e iPhone. Hecho en la rama. |
| M7 · Imágenes | Pospuesto por decisión del propietario, como el fondo del login (F-33, T-18). |
| M8 · Cierre | Revisión final del código, pruebas, [informe de issues](docs/tecnica/issues.md) y documentación. Hecho en la rama; la publicación, a la espera de confirmación. |

## Qué hace

| Área | Funciones |
| --- | --- |
| **Workout** | Programas listos en tres niveles (entre ellos Push Pull Leg y Full Body en ciclo y Glúteo y pierna), recomendados según el sexo; programas propios (guiados o con tus workouts) y compartidos por código; 10 técnicas de intensidad; entreno guiado serie a serie con descansos, tempo, calentamiento, progresión sugerida y discos; semana de descarga y rotación de ejercicios; librería de más de 550 ejercicios, cada uno con su consejo y su ejecución; WOD y cardio. |
| **Nutrición** | Comidas del día con macros, día de entreno o de descanso según tu rutina, «Mi nutrición» (objetivos según tu gasto o a mano), agua, plantillas, 495 alimentos por grupos, búsqueda en Open Food Facts y escáner de códigos de barras. |
| **Dashboard** | Entrenos, volumen, rachas, récords, progreso por ejercicio, calendario y peso corporal. |
| **Perfil** | Plan, medidas, logros con medallas, exportación a CSV, datos biométricos y Ajustes (cuenta, apariencia con color propio, unidades, sonido, copia de seguridad, actualizaciones, diagnóstico e informe de fallos). |
| **En el móvil** | Recorrido de la primera vez, deslizar para volver, arrastrar la burbuja de las pestañas, «atrás» de Android y accesos directos del icono. |
| **Cuenta** | Usuario y contraseña, sin datos personales; datos en la nube (Firebase) para usar varios móviles, también sin conexión; roles de administrador y usuario. |

Todo, pantalla a pantalla, en la [documentación funcional](docs/funcional/README.md).

## Instalarla

- **iPhone**: abre [la app](https://victorroma01.github.io/Fitflow/) en Safari → **Compartir** → **Añadir a pantalla de inicio**.
- **Android**: ábrela en Chrome → **Instalar app**.

Desde el icono se abre a pantalla completa y funciona sin conexión. Se actualiza sola: cuando hay versión nueva, aparece un aviso con sus
novedades.

## Documentación

| Documentación funcional | Documentación técnica |
| --- | --- |
| [Entrenamiento](docs/funcional/entrenamiento.md) | [Arquitectura y convenciones](docs/tecnica/README.md) |
| [Nutrición](docs/funcional/nutricion.md) | [Mapa de módulos](docs/tecnica/modulos.md) |
| [Dashboard](docs/funcional/dashboard.md) | [Estado y datos](docs/tecnica/estado.md) |
| [Perfil y Ajustes](docs/funcional/perfil-y-ajustes.md) | [Servidor: Firebase](docs/tecnica/backend.md) |
| [Cuenta](docs/funcional/cuenta.md) | [Desarrollo](docs/tecnica/desarrollo.md) |
| [En el móvil](docs/funcional/experiencia.md) | [Pruebas](docs/tecnica/pruebas.md) |
| [Datos y privacidad](docs/funcional/datos-y-privacidad.md) | |

## Desarrollo

StrataFit es una aplicación web instalable (PWA) en JavaScript, sin frameworks ni dependencias en tiempo de ejecución: módulos ES en
`src/` que `build.py` compila con esbuild. Las cuentas y los datos en la nube van con Firebase (Authentication y Firestore), por su
API REST.

```bash
npm install && pip install -r tests/requirements.txt && python -m playwright install chromium webkit
python3 build.py          # compila dist/app/ (se publica) y dist/stratafit.html (archivo único)
npm run format            # formato, cabeceras de los módulos y mapa de módulos
bash tests/run.sh         # reglas (también código muerto) y todas las pruebas, en Chrome; SF_BROWSER=webkit para Safari
```

Cómo añadir una función, las reglas de calidad y cómo se publica una versión, en [Desarrollo](docs/tecnica/desarrollo.md).

## Licencia

© 2026 V. M. Rodriguez Mazuelas. Todos los derechos reservados.

Uso personal y gratuito durante la fase de pruebas, tal como se ofrece en su dirección oficial. Durante la fase de pruebas existe
el riesgo de pérdida total o parcial de datos. No se permite copiar, modificar, redistribuir ni explotar comercialmente el código,
los textos, los diseños ni las imágenes sin autorización. Condiciones completas en [`LICENSE`](LICENSE).

Los consejos de entrenamiento y nutrición son orientativos y no sustituyen el consejo de un profesional sanitario.
