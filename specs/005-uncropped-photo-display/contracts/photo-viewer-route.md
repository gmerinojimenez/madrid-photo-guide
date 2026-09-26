# Contract: ruta del visor a pantalla completa

**Feature**: 005-uncropped-photo-display

Extiende el contrato de navegación existente en
`specs/003-app-navigation-flows/contracts/routes.md` con una fila nueva. Esta tabla se debe
reflejar en ese fichero al implementar (misma fuente de verdad para el árbol de rutas, no un
contrato paralelo).

## Ruta nueva

| Ruta | Fichero | Presentación | Parámetros | Requisito |
|------|---------|--------------|------------|-----------|
| `/photo-viewer` | `app/photo-viewer.tsx` | **Modal transparente**, cubre la pantalla, fondo negro | `locationId`, `usage` (`thumb`\|`detail`), `index?` | FR-001, FR-002, FR-003 |

## Quién puede navegar a `/photo-viewer`

Esta ruta **no decide por sí sola** si el contenido es accesible (principio VI de la
constitución: la decisión de acceso vive en un único módulo, `viewLocation`). En su lugar, solo
los puntos de la UI que ya saben que están mostrando contenido desbloqueado exponen el gesto que
navega hasta aquí:

| Origen | Condición para ofrecer el gesto |
|--------|----------------------------------|
| Cabecera de `app/location/[id].tsx` | Siempre: esa pantalla solo se alcanza cuando `viewLocation(...)` ya devolvió una `Location` completa (contrato R-3) |
| Miniatura de `ListCard` en `app/(tabs)/saved.tsx` | Siempre: la lista de guardados solo existe con `entitlement.owned` |
| Miniatura de `ListCard` en `app/tip/[id].tsx` | Solo cuando el `viewLocation(...)` ya calculado para esa fila devuelve una `Location` completa, no una `LocationPreview` |
| Miniatura de `LockedSheet` | Nunca (confirmado en la clarificación de la spec, FR-009) |

## Comportamiento de la pantalla

```text
abrir /photo-viewer?locationId=X&usage=thumb|detail&index?=N
  ├─ resolver ImageRef { locationId: X, usage, index } vía el mismo ImageResolver de siempre
  │    ├─ imagen encontrada        → mostrarla completa, sin recortar (FR-002)
  │    └─ imagen no encontrada     → mismo marcador de "imagen no disponible" que en cualquier
  │                                   otro punto de la app (nunca una pantalla en blanco o un
  │                                   error, FR-008; incluye el caso de un `detail` de pago que
  │                                   no está empaquetado, D-010)
  └─ cerrar (toque / control de cierre) → router.back(), vuelve a la pantalla y estado de origen
                                            (FR-003)
```

### Parámetros desconocidos o inválidos

Si `usage` no es `thumb` ni `detail`, o `locationId` no existe en el catálogo, la pantalla se
comporta igual que `/location/[id]` con un identificador inexistente (contrato 003, sección
"Parámetros desconocidos"): un estado de "contenido no disponible" con vuelta atrás, nunca un
crash ni una pantalla en blanco.

## Rotación de pantalla

Girar el dispositivo mientras `/photo-viewer` está abierta recalcula el encaje (la función pura
de `data-model.md` / `ContainedLayout`) contra las nuevas dimensiones disponibles; la foto sigue
completa y sin recortar en la nueva orientación (edge case de la spec).
