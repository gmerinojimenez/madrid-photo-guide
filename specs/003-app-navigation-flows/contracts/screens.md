# Contract: pantallas y paneles

**Feature**: 003-app-navigation-flows

Qué muestra cada pantalla, de dónde sale cada dato y qué se puede afirmar sobre ella en un
test. Es el contrato de UI: describe comportamiento observable, no estructura de componentes.

Referencia visual: `design/Guía de fotografía Madrid/MPG App.dc.html`. Los tokens de color y
radio están en [research.md](../research.md), decisión D-008.

**Regla transversal**: ninguna pantalla decide por su cuenta si algo es accesible. Toda
localización se obtiene por `viewLocation(location, entitlement)` y se discrimina con
`isFullLocation`. Una pantalla que recibe una `LocationPreview` **no tiene** los campos de
pago: el tipo no los declara (FR-009, FR-010).

---

## Presentación inicial · `/onboarding`

Tres pasos en una ruta, con el paso en estado local.

| Paso | Contenido | Acción principal | Acción secundaria |
|------|-----------|------------------|-------------------|
| 0 | Qué es la app | "Cómo funciona" → paso 1 | "Saltar" → `/` |
| 1 | Activar ubicación | "Activar ubicación" → paso 2 | "Ahora no" → paso 2 |
| 2 | Empezar gratis | "Empezar gratis" → `/` | "Ver la guía completa" → `/paywall` |

**Contrato**:

- El indicador de progreso refleja el paso actual (US3 §2).
- El paso 1 **no solicita ningún permiso del sistema**: ambas acciones avanzan igual (US3 §3,
  D-012). El copy no promete que la ubicación se haya activado.
- El texto del paso 2 nombra las localizaciones gratuitas y su número tomándolos del catálogo,
  no de una lista escrita a mano (FR-012).
- Al abandonar la presentación por cualquier salida se marca como vista (R-2 de
  [routes.md](./routes.md)).

---

## Mapa · `/`

**Datos**: `queryLocations(catalog, { text, tagId })` intersecado con los guardados si
`onlySaved` está activo; `catalogCounts` para la barra de modo prueba.

**Contrato**:

- Un marcador por localización visible, en sus coordenadas (FR-013): las accesibles en
  `coords`, las bloqueadas en `approximateArea`. **Una localización bloqueada nunca se dibuja
  en su punto exacto**, o el mapa revelaría lo que la ficha oculta.
- Los marcadores accesibles y los bloqueados se distinguen visualmente (FR-014) y cada uno
  expone el nombre de su localización como etiqueta accesible: es lo que los tests tocan.
- El buscador filtra por nombre, barrio y etiqueta, ignorando mayúsculas y acentos (FR-015) —
  lo resuelve el núcleo, no la pantalla.
- Los chips de tipo ofrecen las etiquetas del catálogo más "Todo", que no filtra (FR-016).
- La barra de modo prueba solo aparece sin la compra, dice "{free} de {total} localizaciones"
  y lleva al paywall (FR-017).
- Búsqueda y filtros se componen (FR-019). Si el resultado es vacío, se dice que no hay
  resultados en lugar de dejar el mapa mudo (caso límite de la spec).
- El estado de exploración sobrevive a abrir y cerrar una ficha (US1 §3).

**Sin conectividad**: el mapa puede quedarse sin tesela; los marcadores y el resto de la
interfaz siguen respondiendo.

---

## Consejos · `/tips`

**Datos**: `tipsByCategory(catalog)`.

**Contrato**:

- Los consejos se listan agrupados por categoría, en el orden del catálogo (US4 §1).
- Los chips de categoría son los del catálogo más "Todo" (US4 §2).
- **Nunca se bloquean**, con o sin la compra (FR-011). En esta pantalla no hay candados.

## Detalle de consejo · `/tip/[id]`

**Contrato**:

- Muestra categoría, título, cuerpo completo y localizaciones relacionadas (US4 §3).
- Las relacionadas se resuelven por `relatedLocationIds`; **las que no existen en el catálogo
  se omiten** y el consejo se muestra igual (caso límite de la spec).
- Tocar una relacionada aplica R-3: ficha si es accesible, panel de bloqueo si no (US4 §4).
- Volver atrás desde una ficha abierta aquí devuelve a este consejo, no al mapa (R-4).

---

## Guardados · `/saved`

**Datos**: `SavedLocationsStore.list()` cruzado con el catálogo.

**Contrato**:

| Estado | Qué se muestra |
|--------|----------------|
| Con la compra, con guardados | Lista, del más reciente al más antiguo |
| Con la compra, sin guardados | Estado vacío que invita a guardar desde el mapa (US5 §4) |
| Sin la compra | Estado vacío que explica que guardar es de la guía completa, con acceso al paywall (US5 §5) |

- Los identificadores guardados que ya no existen en el catálogo se omiten sin fallar (caso
  límite de la spec).
- Sin la compra la lista se muestra vacía **aunque la tabla tenga filas** de una sesión
  anterior con titularidad concedida.

---

## Perfil · `/profile`

**Contrato**:

- La línea de plan es dinámica (US7 §1 y §2): sin la compra, modo prueba con "{free} de
  {total}"; con ella, guía completa con el total. Los números salen de `catalogCounts`.
- Sin la compra se ofrece desbloquear; con ella, no.
- Las cinco filas —descarga sin conexión, app de navegación, mi equipo, idioma, restaurar
  compra— se muestran **informativas y sin acción** (US7 §3, FR-034). No son controles
  deshabilitados por error: es el alcance de esta entrega.

---

## Ficha de localización · `/location/[id]`

Solo se alcanza para localizaciones accesibles (R-3), así que **siempre recibe una
`Location` completa**.

**Contrato**:

- Muestra nombre, barrio, tipo, mejor momento, parámetros de captura, descripción de la toma,
  descripción del barrio y coordenadas exactas (FR-020).
- Donde el prototipo pone una distancia, muestra **"Distancia no disponible"** (FR-021,
  D-012). No se oculta el hueco: se marca.
- La imagen es un bloque de color, sin fotografía (FR-022).
- "Navegar hasta la foto" abre el panel de navegación (FR-023).
- El control de guardar refleja el estado actual y solo opera con la compra; sin ella, ofrece
  desbloquear en lugar de guardar en silencio (FR-024, US5 §6).
- Un `id` inexistente muestra "contenido no disponible" con vuelta atrás, sin lanzar.

---

## Paywall · `/paywall`

**Contrato**:

- Precio fijo "9,99 €" y detalle de lo que incluye la guía completa (FR-032). **No se contacta
  con ninguna tienda.**
- El titular y el resumen usan el total real del catálogo, no la cifra del prototipo (FR-012,
  D-011).
- "Comprar" concede la titularidad simulada, navega al mapa y abre el panel de compra
  completada (FR-030).
- Cerrar sin comprar devuelve a la pantalla anterior con la titularidad intacta (US2 §6).

---

## Paneles superpuestos

Superpuestos sobre la pantalla activa, fuera del historial (FR-004, D-004). El gesto de
retroceso del sistema los cierra.

### Contenido bloqueado

Se abre al tocar una localización de pago sin la compra.

- Muestra **solo** lo que la vista previa contiene: nombre, barrio, etiquetas y zona
  aproximada (FR-010, US2 §1).
- Enumera lo que se desbloquea —coordenadas exactas, parámetros de cámara, fotografía en
  detalle— como filas con candado: son nombres de lo que falta, **nunca sus valores**.
- Donde el prototipo pone la distancia a la zona, dice que no está disponible (D-012).
- "Desbloquear" lleva al paywall; "Seguir en modo prueba" cierra sin cambiar nada (US2 §2 y §3).

### Navegar

- Muestra las coordenadas con `formatCoordinates` y tres opciones: Google Maps, Apple Maps y
  copiar coordenadas (FR-023, US6 §1).
- Las dos primeras entregan al sistema la URL construida en el núcleo; la tercera escribe en el
  portapapeles **el mismo texto que la ficha muestra** y lo confirma visualmente (US6 §2 y §3).
- Solo alcanzable desde una ficha, es decir, solo para localizaciones accesibles (US6 §4).

### Filtros

- Chips de tipo y conmutador "solo guardados" **operativos**; distancia **visible pero
  inactiva y marcada como no disponible** (FR-018).
- El botón de cierre resume cuántas localizaciones deja el filtro, usando el recuento real.

### Compra completada

- Se abre solo tras comprar (FR-030) y confirma que la guía está desbloqueada, con el total
  real del catálogo.
- Su única acción es volver al mapa.

---

## Presentación común

- **Tema oscuro único** con los tokens de D-008; ninguna pantalla consulta el tema del sistema
  (FR-033).
- **Todos los textos en español** (FR-034); los que vienen del catálogo pasan por `localize`.
- Las imágenes son bloques de color o gradiente, nunca fotografías (FR-022).
- Cada elemento pulsable expone un nombre accesible: es lo que hace que los tests interactúen
  por rol y texto, como exige el principio III, en lugar de inspeccionar estado interno.
