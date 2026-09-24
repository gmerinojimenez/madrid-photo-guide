# Contract: `LocationImage` y su interacción con `ListCard`

**Feature**: 004-real-location-photos

Un componente de UI nuevo (`src/ui/components/LocationImage.tsx`) y una extensión de props de
un componente existente (`src/ui/components/ListCard.tsx`). Ninguno de los dos vive en el
núcleo: ambos son presentación pura de React Native.

---

## `LocationImage`

```ts
import type { ImageResolver } from '../../core/content/images.ts';
import type { ImageRef } from '../../core/content/schema.ts';
import type { ImageStyle, StyleProp } from 'react-native';

type Props = {
  imageRef: ImageRef;
  resolver?: ImageResolver;
  style?: StyleProp<ImageStyle>;
};

export function LocationImage(props: Props): JSX.Element;
```

**Contrato**:

- `resolver` por defecto es `imageRegistry` (`src/platform/images/registry.ts`). Las tres
  pantallas de producción (ficha de localización, `LockedSheet`, `ListCard`) NUNCA pasan esta
  prop explícitamente; existe solo para inyección en tests (research.md R-004a).
- Si `resolver.resolve(ref)` devuelve un valor no nulo, `LocationImage` renderiza un `Image` de
  `react-native` con ese valor como `source` y `style` reenviado sin transformar.
- Si `resolver.resolve(ref)` devuelve `null`, `LocationImage` renderiza `ImagePlaceholder` con
  el mismo `style` reenviado sin transformar, y **sin lanzar** — igual que `ImageResolver` ya
  garantiza no lanzar en `__tests__/content/images.test.ts`.
- `LocationImage` no cachea, no reintenta, no gestiona estados de carga asíncrona: la
  resolución es síncrona (todas las fuentes son locales), así que no hay "cargando" que
  representar.
- `LocationImage` no decide qué `ImageRef` pedir ni si el llamador tiene derecho a pedirla —
  esa decisión ya la tomó la pantalla (vía `viewLocation`/`isFullLocation`) antes de construir
  la prop `imageRef`. `LocationImage` es agnóstico de titularidad.

**No-goals** (fuera de esta feature): crossfade entre placeholder e imagen real,
precarga/priorización de imágenes, soporte de fuentes remotas.

---

## `ListCard` (props añadidas)

```ts
type Props = {
  title: string;
  subtitle?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  trailing?: ReactNode;
  image?: ImageRef;   // NUEVO
};
```

**Contrato de la prop nueva**:

- `image` es opcional. Si se omite, `ListCard` mantiene su comportamiento actual exacto:
  renderiza `ImagePlaceholder` en la posición de la miniatura, sin pasar por
  `imageRegistry.resolve()` en absoluto. Esto preserva la compatibilidad hacia atrás de
  cualquier llamador que no tenga todavía una `ImageRef` que ofrecer.
- Si `image` está presente, `ListCard` renderiza `<LocationImage imageRef={image} style={...mismo
  estilo `thumb` de hoy...} />` en el mismo lugar donde antes iba `ImagePlaceholder`
  incondicional.
- `ListCard` no importa `imageRegistry` directamente ni construye la `ImageRef` por su cuenta a
  partir de un id: la referencia completa llega ya armada desde quien la llama (ver
  data-model.md → Flujo de datos por pantalla).

**Llamadores actualizados** (pasan `image={location.thumbnail}` o `image={item.thumbnail}`):

- `app/(tabs)/saved.tsx`
- `app/tip/[id].tsx`

---

## `LockedSheet` y ficha de localización (sin contrato de props nuevo)

Ninguno de los dos gana una prop nueva: ambos ya reciben la `ImageRef` que necesitan a través
de los datos que ya manejan (`preview.thumbnail`, `full.detailImage`) y simplemente sustituyen
su `<ImagePlaceholder style={styles.image} />` incondicional por
`<LocationImage imageRef={...} style={styles.image} />`.
