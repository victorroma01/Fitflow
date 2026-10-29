# Servidor (backend): diseño previsto

Estado actual: **no hay servidor**. Los datos viven en el dispositivo (localStorage + IndexedDB para fotos) y todo funciona sin conexión.
Lo que sí está hecho es la preparación: **todo el acceso a datos pasa por `Store`** (`src/js/core/store.js`), así que un servidor se
añade en un único sitio sin tocar las pantallas.

## Qué sí y qué no tiene sentido mover al servidor

* **Sí**: guardar los datos (copia en la nube, varios dispositivos), sincronizarlos, y trabajos pesados que hoy no existen en la app
  (importar historiales grandes, estadísticas largas, generar informes, procesar fotos).
* **No**: pintar pantallas ni calcular lo que se ve. Hoy cada pantalla se pinta en 0,4–2 ms; mandarlo al servidor añadiría 100–500 ms por
  toque y dejaría la app inútil en un gimnasio sin cobertura. El diseño correcto es **offline-first**: el dispositivo manda y trabaja
  siempre en local; el servidor es la copia de referencia y el punto de encuentro entre dispositivos.

## Qué habría que sincronizar (`Store.K`)

| Clave | Contenido | Tamaño típico |
|---|---|---|
| `app` | estado completo `S` (perfil, programas, registros, comidas, medidas…) | cientos de KB |
| `wip` | entreno en curso | pocos KB |
| `pre`, `rs` | auxiliares de restauración (no se sincronizan) | — |
| IndexedDB `ffph` | fotos de progreso | MB (se subirían aparte, como archivos) |

## Gancho ya disponible

`Store.set` / `Store.del` avisan a `Store.remote.changed(clave, valor)` si existe un adaptador (los fallos del adaptador se ignoran para
no impedir nunca el guardado local). Un adaptador mínimo haría: cola de cambios en el dispositivo → `PUT` al servidor cuando hay red →
al abrir, `GET` del estado remoto y fusión.

## Esquema propuesto (cuando se decida)

```
POST /auth/…                         identidad (correo+código, o proveedor externo)
GET  /api/state            → { v, updated, state }          estado completo S
PUT  /api/state            ← { baseV, state }               409 si el servidor tiene algo más nuevo
GET  /api/state/changes?since=V                              cambios incrementales (opcional)
PUT  /api/wip              ← entreno en curso
POST /api/photos           ← archivo; GET /api/photos/:id
```

Fusión de conflictos: por colección (`logs`, `meals[día]`, `hist[ejercicio]`, `ms`…) con marca de tiempo por elemento; para el resto,
gana el cambio más reciente. Las copias de seguridad actuales (`system/backup`) ya definen qué es «todo lo que importa» y sirven de base.

## Decisiones pendientes (hay que elegirlas antes de implementar)

1. **Para qué**: ¿copia/sincronización entre dispositivos?, ¿compartir con un entrenador?, ¿cálculos pesados concretos?
2. **Dónde**: opciones sencillas y baratas: Supabase / Firebase (menos código), o un servidor propio pequeño (Node + SQLite en un VPS).
3. **Identidad**: cuenta con correo, o sin cuenta con un código/clave guardado en el dispositivo.
4. **Privacidad**: son datos de salud; hay que decidir cifrado, ubicación de los datos y política de borrado.
