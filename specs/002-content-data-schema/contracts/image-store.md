# Contrato: almacén de imágenes

Convención única de almacenamiento de los JPG de la guía (FR-022). Vale hoy para el
repositorio y, sin cambios en el contenido, mañana para Firebase Storage (FR-028).

## Ruta

```text
<raíz>/content/photos/<locationId>/<usage>[-<index>].jpg
```

| Parte | Valores | Ejemplo |
|-------|---------|---------|
| `<raíz>` | `assets/` en el repositorio · el bucket en remoto | `assets/` |
| `<locationId>` | el `id` de la localización | `debod` |
| `<usage>` | `thumb` · `detail` · `extra` | `detail` |
| `<index>` | solo para `extra`, desde 0 | `extra-0` |

Ejemplos:

```text
assets/content/photos/debod/thumb.jpg
assets/content/photos/debod/detail.jpg
assets/content/photos/mayor/extra-0.jpg
```

La ruta es **deducible** desde el `ImageRef`: nunca se escribe en el catálogo. Cambiar la
raíz es cambiar una implementación de `ImageResolver`, no el contenido.

## Usos y tamaños

| Uso | Tamaño objetivo | Peso orientativo | ¿Visible sin compra? |
|-----|-----------------|------------------|----------------------|
| `thumb` | lado largo 400 px | < 60 KB | **Sí**, siempre |
| `detail` | lado largo 1600 px | < 400 KB | Solo con compra, o si es gratuita |
| `extra` | lado largo 1600 px | < 400 KB | Igual que `detail` |

La miniatura es deliberadamente pobre: es lo que ve quien no ha comprado, y su baja
resolución es la protección real del contenido. El desenfoque del estado bloqueado lo aplica
la aplicación sobre esta misma miniatura; **no existe una variante desenfocada** (D-004).

## Qué puede estar en el dispositivo

Lo exige la constitución ("el contenido premium no descargado no se almacena en el
dispositivo"):

| Contenido | ¿Se empaqueta con la app? |
|-----------|---------------------------|
| `thumb` de cualquier localización | Sí. Es público. |
| `detail` / `extra` de una localización **gratuita** | Sí. |
| `detail` / `extra` de una localización **de pago** | **No.** Llegan del origen remoto cuando hay titularidad. |

En esta feature la semilla son 5 localizaciones gratuitas, así que el almacén local contiene
sus 10 ficheros y ninguno reservado. La validación comprueba la regla para que no se pueda
incumplir por descuido al añadir contenido de pago.

## Registro de imágenes empaquetadas

Metro resuelve `require` de forma estática: no existe `require(variable)`. Por eso la
traducción de `ImageRef` a módulo vive en un registro con entradas literales, fuera del
núcleo:

```ts
// src/platform/images/registry.ts
const BUNDLED = {
  'debod/thumb':  require('../../../assets/content/photos/debod/thumb.jpg'),
  'debod/detail': require('../../../assets/content/photos/debod/detail.jpg'),
  // …
} as const;
```

Reglas del registro:

- Es la **única** lista de rutas literales del proyecto.
- Una clave ausente devuelve `null`, no lanza: una imagen que falta degrada a un hueco, nunca
  a un crash (FR-035).
- La validación del catálogo comprueba que registro, catálogo y ficheros en disco coinciden:
  toda imagen declarada existe, y todo fichero presente está declarado.

## Formato

JPEG, sRGB, progresivo, sin metadatos EXIF. Los parámetros de captura viven en el catálogo
como datos editables, no incrustados en el fichero: así se pueden mostrar, traducir y
corregir sin tocar la imagen.

## Traslado a origen remoto

Cuando el contenido pase a Firebase Storage:

- La ruta dentro del bucket es `content/photos/<locationId>/<usage>.jpg` — idéntica salvo la
  raíz.
- Se añade una segunda implementación de `ImageResolver` que devuelve URL en lugar de módulos.
- **Ninguna referencia del catálogo cambia.** Eso es lo que verifica SC-007.
