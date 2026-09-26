# Contract: presentación de `LocationImage` en contexto

**Feature**: 005-uncropped-photo-display

Contrato de comportamiento observable para los tres lugares donde hoy se pinta una fotografía en
contexto (no a pantalla completa). No es una interfaz de código; es lo que un test de aceptación
o una revisión visual pueden comprobar.

## Regla general (FR-004, FR-005, FR-006)

Para cualquier `ImageRef` resuelto a una imagen real, en cualquiera de los tres contenedores de
abajo:

1. La imagen se ve completa: ningún borde de la fotografía original queda fuera del área visible.
2. La imagen no se deforma: su proporción de aspecto se conserva exactamente.
3. Si la proporción de la imagen no llena el contenedor, el espacio sobrante se rellena con un
   fondo neutro — nunca recortando ni estirando la imagen para que encaje.
4. Esto vale igual para una foto horizontal (caso mayoritario hoy) que para una vertical (caso
   futuro): ninguna de las dos reglas anteriores depende de la orientación.

## Por contenedor

| Contenedor | Fichero | Caja | Comportamiento al no encajar exactamente |
|------------|---------|------|-------------------------------------------|
| Miniatura de tarjeta de listado | `src/ui/components/ListCard.tsx` | fija (56×56, sin cambios) | relleno neutro dentro de la caja fija; el alto de la fila no cambia entre tarjetas |
| Cabecera de ficha de detalle | `app/location/[id].tsx` | ancho = pantalla; alto según proporción real de la foto | sin relleno esperado (la caja se ajusta a la foto); si la proporción es un caso extremo, relleno neutro dentro del alto máximo razonable de cabecera |
| Vista previa del sheet de bloqueo | `src/ui/sheets/LockedSheet.tsx` | fija (alto actual, sin cambios) | relleno neutro dentro de la caja fija, igual que la miniatura de listado |

## Fuera de alcance de este contrato

- El marcador `ImagePlaceholder` (cuando `ImageResolver.resolve` devuelve `null`) no cambia: sigue
  siendo el bloque de color existente, sin foto que encajar.
- El zoom o paneo manual dentro de cualquiera de estos tres contenedores no forma parte de esta
  feature (ver Assumptions de la spec); solo aplica el ajuste automático "verse completa".
