# Data Model: Visualización completa de fotos (sin recorte)

**Feature**: 005-uncropped-photo-display

Esta funcionalidad **no introduce entidades de datos nuevas ni cambia el esquema de contenido**
(`src/core/content/schema.ts`). Cambia cómo se presenta una fotografía ya existente
(`ImageRef`), no qué se almacena sobre ella. Lo que sigue son las formas de datos puramente de
presentación que aparecen al implementar la spec.

## Tipos existentes reutilizados

### `ImageRef` (sin cambios)

```ts
{
  locationId: ContentId;
  usage: 'thumb' | 'detail' | 'extra';
  index?: number;
  alt: LocalizedText;
  aspectRatio?: number;
  credit?: string;
}
```

Ya definido en `src/core/content/schema.ts`. Es la referencia que hoy resuelve `LocationImage` a
través de `ImageResolver`. El visor a pantalla completa necesita los mismos tres campos
identificadores (`locationId`, `usage`, `index`) para volver a resolver la misma imagen; `alt` se
puede volver a obtener localizando la localización por `locationId` en el catálogo ya cargado, no
hace falta transportarlo.

## Formas nuevas (presentación, no persistidas)

### `PhotoViewerRouteParams`

Parámetros de la ruta `/photo-viewer`, transportados como query params de `expo-router` (todos
serializables a texto):

| Campo | Tipo | Obligatorio | Notas |
|-------|------|-------------|-------|
| `locationId` | `string` (`ContentId`) | sí | mismo valor que `ImageRef.locationId` |
| `usage` | `'thumb' \| 'detail'` | sí | `'extra'` queda fuera de alcance de esta feature (no hay punto de la UI hoy que muestre `extra` fuera de listas ya cubiertas) |
| `index` | `string` (numérico) | solo si `usage` lo requiere | se parsea a `number` antes de reconstruir el `ImageRef` |

No se transporta el `alt`: la pantalla busca la localización por `locationId` en el catálogo
(`useCatalog()`) para su etiqueta accesible, igual que hace `app/location/[id].tsx` hoy.

**Regla de acceso**: no hay un campo de titularidad en estos parámetros y la pantalla no lo
resuelve por su cuenta (ver `research.md` §3). La ruta solo se alcanza, en la práctica, desde
llamadas que ya han decidido que el contenido es accesible; si `usage: 'detail'` apunta a una
localización de pago sin comprar, `ImageResolver.resolve` devuelve `null` (D-010: el detalle de
pago nunca se empaqueta) y la pantalla cae en el mismo marcador de "imagen no disponible" que
usa `LocationImage` en cualquier otro contexto — no en un error.

### `ImageRef.aspectRatio` (campo ya existente, no un tipo nuevo)

El esquema de `ImageRef` ya declara `aspectRatio: z.number().positive().optional()`
(`src/core/content/schema.ts`), y el catálogo actual lo rellena al 100% (57/57 localizaciones,
`thumbnail` y `detailImage`, todas en `1.3333`). Esta feature no añade el campo: lo **usa** como
fuente de la proporción real, en vez de leer la imagen en tiempo de ejecución. Solo hace falta
donde el **contenedor** debe adaptarse a la proporción de la foto (cabecera de ficha, visor a
pantalla completa) — `FittedPhoto` cae a una proporción de reserva 4:3 si algún `ImageRef` no la
declarara. La miniatura de `ListCard` y la vista previa de `LockedSheet` no la necesitan: viven en
cajas de tamaño fijo donde `resizeMode="contain"` ya resuelve el encaje de forma nativa (ver
research.md §5).

### `ContainedLayout`

Resultado puro de encajar un tamaño intrínseco dentro de un espacio disponible sin recortar:

```ts
{ width: number; height: number }
```

Calculado por `computeContainedLayout` (función pura de UI, sin estado ni I/O, en
`src/ui/components/imageLayout.ts`): dado `{ width, height }` intrínseco y un espacio disponible
(`{ maxWidth: number; maxHeight?: number }`), devuelve las dimensiones a las que debe renderizarse
la imagen para verse completa, preservando su proporción. Es la pieza que hace testeable en Jest
(sin renderizar RN) la regla "nunca recortar, nunca deformar" de FR-002 / FR-004 en los dos sitios
que la necesitan (cabecera de ficha, visor a pantalla completa).

### `FittedPhoto` (componente compartido, no una entidad de datos)

`src/ui/components/FittedPhoto.tsx`: agrupa "resolver el `ImageRef` → tomar su `aspectRatio` (o
la proporción de reserva 4:3) → calcular `ContainedLayout` contra un espacio disponible →
renderizar la imagen a ese tamaño con `resizeMode="contain"`, o `ImagePlaceholder` si no resuelve"
en un único sitio, para no duplicar esa secuencia entre la cabecera de ficha
(`app/location/[id].tsx`) y el visor a pantalla completa (`app/photo-viewer.tsx`), las dos únicas
pantallas que la necesitan.

## Sin cambios de esquema de contenido

- `imageRegistry` (`src/platform/images/registry.ts`) no cambia su forma; sigue devolviendo
  `ImageSource | null` por clave `<locationId>/<usage>[-<index>]`.
- `LocationPreview` y `Location` (`src/core/content/access.ts` / `schema.ts`) no cambian.
