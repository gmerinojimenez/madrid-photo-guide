# Data Model: Real Location Photos

Esta feature no añade, modifica ni elimina ninguna entidad de dominio. Reutiliza en su
totalidad el modelo de contenido ya definido en la feature 002 (`src/core/content/schema.ts`)
y el resolutor de imágenes ya definido en la feature 003 (D-010).

## Entidades reutilizadas (sin cambios)

### `ImageRef`

Definida en `src/core/content/schema.ts`. Identifica una imagen concreta de una localización.

| Campo | Tipo | Notas |
|-------|------|-------|
| `locationId` | `string` | Id de la localización a la que pertenece la imagen. |
| `usage` | `'thumb' \| 'detail' \| 'extra'` | Qué papel cumple la imagen. Esta feature solo consume `thumb` y `detail`; `extra` no se pinta en ninguna de las tres pantallas alcanzadas. |
| `index` | `number` (opcional) | Solo relevante para `usage: 'extra'`. |
| `alt` | `LocalizedText` | Texto alternativo, no usado por esta feature. |

### `Location.thumbnail` / `Location.detailImage`

Ya existen en el esquema de localización (`src/core/content/schema.ts`): cada `Location`
completa lleva un `thumbnail: ImageRef` y un `detailImage: ImageRef`. `LocationPreview` (la
proyección para quien no tiene titularidad, `src/core/content/access.ts`) solo lleva
`thumbnail` — nunca `detailImage` —, lo que ya impide que el sheet de bloqueo pueda pedir la
imagen de detalle de una localización de pago (principio VI, D-006).

### `ImageResolver` / `imageRegistry`

`ImageResolver` (`src/core/content/images.ts`) es la interfaz de puerto: `resolve(ref:
ImageRef): ImageSource | null`. `imageRegistry` (`src/platform/images/registry.ts`) es su
única implementación, respaldada por `require()` de los ficheros en
`assets/content/photos/<locationId>/{thumb,detail}.jpg`.

## Componente nuevo (presentación, no dominio)

### `LocationImage`

No es una entidad de dominio — es un componente de UI puro. Se documenta aquí porque es la
única pieza nueva de esta feature y su contrato de props es, en efecto, su "modelo de datos".

| Prop | Tipo | Requerida | Notas |
|------|------|-----------|-------|
| `imageRef` | `ImageRef` | Sí | La imagen que se quiere mostrar. |
| `resolver` | `ImageResolver` | No (por defecto `imageRegistry`) | Ver research.md R-004a — permite inyectar un resolver falso en tests. |
| `style` | `StyleProp<ViewStyle>` | No | Se reenvía tanto al `Image` real como a `ImagePlaceholder`, igual que hace hoy `ImagePlaceholder` sola, para no romper la maquetación de las tres pantallas (FR-005). |

**Comportamiento**: llama a `resolver.resolve(ref)`. Si el resultado no es `null`, renderiza
`<Image source={resultado} style={style} />`. Si es `null`, renderiza `<ImagePlaceholder
style={style} />`. Sin estado, sin efectos, sin lógica adicional.

## Flujo de datos por pantalla

```text
app/location/[id].tsx
  full: Location (ya resuelta vía viewLocation + isFullLocation)
  → <LocationImage imageRef={full.detailImage} style={styles.image} />

src/ui/sheets/LockedSheet.tsx
  preview: LocationPreview
  → <LocationImage imageRef={preview.thumbnail} style={styles.image} />

app/(tabs)/saved.tsx
  item: Location (del catálogo, vía savedLocations.list())
  → <ListCard image={item.thumbnail} ... />
       → src/ui/components/ListCard.tsx
            → <LocationImage imageRef={image} style={styles.thumb} /> (si `image` está presente)
            → <ImagePlaceholder style={styles.thumb} /> (si `image` es undefined, comportamiento actual)

app/tip/[id].tsx
  location: Location (relacionada, del catálogo)
  → <ListCard image={location.thumbnail} ... />
       → (igual que arriba)
```

No hay transiciones de estado, ni persistencia, ni validación nueva: todo el dato ya fluye
desde el catálogo cargado por `CatalogProvider` (feature 002/003), sin cambios en esta
feature.
