# Contract: cambios en pantallas y paneles

**Feature**: 004-user-geolocation

Solo lo que cambia respecto al [contrato de pantallas de la feature 003](../../003-app-navigation-flows/contracts/screens.md).
Todo lo demás sigue igual. Describe comportamiento observable, no estructura de componentes.

**Reglas transversales**:

- **R-G1 (una sola fuente)**: toda distancia que se muestra sale de
  `visibleDistance(location, entitlement, snapshot, now)` y se pinta con
  `formatVisibleDistance`. Ninguna pantalla calcula distancias ni lee coordenadas para ello
  (FR-022).
- **R-G2 (nada sin acción explícita)**: ninguna pantalla llama al diálogo del sistema. Solo
  `ensureLocation(origin, onGranted)` del proveedor, y solo desde el manejador de un toque
  (FR-003, SC-004). Ningún efecto, foco ni arranque lo invoca.
- **R-G3 (sin ubicación, como antes)**: con el permiso sin conceder, cada pantalla se ve y
  se comporta como en la feature 003, con la distancia "no disponible" (SC-003).

El snapshot y las acciones llegan por `useUserLocation()`:

```ts
type UserLocationContext = {
  snapshot: LocationSnapshot;
  now: number;                          // reloj que el proveedor refresca (research.md D-006)
  ensureLocation(origin: PermissionOrigin, onGranted?: () => void): void;   // research.md D-010
  openSettings(): void;
};
```

---

## Presentación inicial · `/onboarding`, paso "Activar ubicación"

| Acción | Antes (003) | Ahora |
|---|---|---|
| "Activar ubicación" | avanza sin pedir nada | lanza `request('onboarding')` y, al resolverse con **cualquier** respuesta, avanza al paso siguiente (US1 §1, FR-004) |
| "Ahora no" | avanza | avanza, sin diálogo (US1 §2) |

**Contrato**: mientras el diálogo está abierto, los botones no responden a un segundo toque.
Si la persona ya había concedido el permiso (reinstalación en iOS que conserva permisos), el
botón avanza sin diálogo. El copy actual del paso se mantiene.

---

## Mapa · `/`

**Datos**: los de 003 más `radius` en el estado de exploración ([data-model.md §3](../data-model.md#3-estado-de-exploración-del-mapa-ampliación)).

**Contrato**:

- Con el permiso `granted` o `approximate`, el mapa muestra el punto de posición nativo
  (`showsUserLocation`, US3 §1). Sin permiso, no.
- Botón **"Centrar en mí"** (nombre accesible "Centrar en mi posición"), siempre visible
  sobre el mapa. Al tocarlo: `ensureLocation('contextual', centrar)`. Con el permiso
  concedido y una posición, centra el mapa en ella (US3 §2). Con permiso pero sin posición
  todavía, no mueve el mapa y lo indica ("Buscando tu posición…").
- Los marcadores filtrados por radio usan el radio efectivo; con el radio activo, el
  contador de "Ver N localizaciones" del panel de filtros lo refleja.
- Si el permiso deja de estar concedido, `radius` vuelve a `'all'`.
- Con el filtro activo y la exploración no disponible por lejanía, se muestra un aviso sobre
  el mapa: "Estás lejos de Madrid: el filtro de distancia está en pausa".

---

## Panel de filtros

La fila de distancia deja de ser siempre inactiva:

| Situación | Fila "Distancia" |
|---|---|
| Permiso sin conceder | chips "< 1 km", "< 3 km", "Todo Madrid" con "Todo Madrid" marcado; tocar "< 1 km" o "< 3 km" llama a `ensureLocation('contextual', aplicar radio)` (US3 §5) |
| Concedido y disponible | chips operativos, el elegido marcado (FR-017) |
| Concedido pero no disponible | chips inactivos, con el motivo: "Estás lejos de Madrid", "Buscando tu posición…" o "Ubicación desactivada en el sistema" (FR-015, FR-019) |

**Contrato**: el texto "Distancia no disponible" de 003 desaparece de este panel; en su
lugar, sin permiso, los chips invitan a activarla. Un chip inactivo lleva
`accessibilityState={{ disabled: true }}`.

> US3 §6 pide que sin permiso "el filtro de distancia aparezca inactivo con su motivo". Se
> interpreta así: sin permiso, los chips de radio no filtran —el efectivo es "Todo
> Madrid"— y el motivo se muestra como texto ("Activa la ubicación para filtrar por
> distancia"). Siguen siendo tocables para que sirvan de punto contextual (US3 §5).

---

## Ficha de localización · `/location/[id]`

- La fila "Distancia" muestra `formatVisibleDistance(…)`: el valor y, debajo, el `detail` si
  lo hay (US1 §3–§4). Con permiso concedido, se actualiza sin salir de la ficha (US1 §5).
- Con el permiso sin conceder, la fila es tocable ("Distancia no disponible · Activar
  ubicación") y llama a `ensureLocation('contextual')` (US1 §6).
- Con la compra, una localización de pago muestra la distancia exacta (US4 §4).

---

## Panel de contenido bloqueado

- La fila "Distancia" muestra `formatVisibleDistance` de una distancia `rounded`: "< 1 km" o
  "~2,5 km" (US4 §1). No es tocable: el panel no es un punto contextual.
- Sin permiso sigue diciendo "Distancia no disponible", como en 003.

---

## Perfil · `/profile`

Nueva fila **"Ubicación"**, con el estado como valor ("Sin pedir", "Concedida",
"Aproximada", "Denegada", ver [data-model.md](../data-model.md#permissionstate)).

| Estado | Al tocar |
|---|---|
| `undetermined`, `denied` | `request('profile')` directamente: la fila ya es la acción explícita, no hace falta el panel intermedio |
| `granted`, `approximate`, `blocked` | `openSettings()` |

**Contrato**: el valor cambia al volver de Ajustes sin salir de la pantalla (FR-007).

---

## Panel de ubicación (nuevo) · `LocationSheet`

Panel superpuesto más, sobre el `SheetHost` existente. Lo abre `ensureLocation` en los
estados `denied`, `blocked` o con servicios apagados (research.md D-010). Excluyente con los
demás paneles.

| Caso | Texto | Acción principal | Secundaria |
|---|---|---|---|
| `denied` | Para qué se usa la ubicación | "Permitir ubicación" → diálogo del sistema; si se concede, cierra y ejecuta la acción pendiente | "Ahora no" → cierra |
| `blocked` | Lo mismo + "El permiso está denegado en los ajustes del teléfono" | "Abrir Ajustes" → `openSettings()` y cierra | "Ahora no" |
| servicios apagados | "La ubicación está desactivada en el teléfono" | "Abrir Ajustes" | "Ahora no" |

**Contrato**: el panel nunca se abre solo, únicamente como respuesta a un toque en un punto
contextual (R-G2). Tras "Abrir Ajustes" y vuelta con el permiso concedido, la acción pendiente
**no** se ejecuta: la persona puede haber cambiado de pantalla; basta con que la app refleje
el nuevo estado (FR-007).

---

## Nombres accesibles nuevos (para los tests)

| Elemento | Nombre accesible |
|---|---|
| Botón de centrar | "Centrar en mi posición" |
| Chips de radio | "< 1 km", "< 3 km", "Todo Madrid" |
| Fila del perfil | "Ubicación" |
| Acciones del panel | "Permitir ubicación", "Abrir Ajustes", "Ahora no" |
