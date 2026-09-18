# Contrato: el fichero de catálogo

**Fichero**: `src/content/catalog.json` · **Versión de esquema**: 1

El catálogo es la interfaz entre quien edita contenido y la aplicación. Este documento fija
su forma serializada; el significado de cada campo está en [data-model.md](../data-model.md).

## Forma

```jsonc
{
  "schemaVersion": 1,
  "updatedAt": "2026-09-18",
  "locales": ["es"],

  "access": {
    "premiumFields": [
      "coords",
      "bestTime",
      "shotDescription",
      "neighbourhoodDescription",
      "capture",
      "detailImage",
      "extraImages"
    ]
  },

  "tags": [
    { "id": "skyline",      "label": { "es": "Skyline" } },
    { "id": "callejera",    "label": { "es": "Callejera" } },
    { "id": "arquitectura", "label": { "es": "Arquitectura" } },
    { "id": "atardecer",    "label": { "es": "Atardecer" } },
    { "id": "nocturna",     "label": { "es": "Nocturna" } }
  ],

  "tipCategories": [
    { "id": "ver",        "label": { "es": "Ver" } },
    { "id": "comer",      "label": { "es": "Comer" } },
    { "id": "dormir",     "label": { "es": "Dormir" } },
    { "id": "transporte", "label": { "es": "Transporte" } }
  ],

  "neighbourhoods": [
    {
      "id": "arguelles",
      "name": { "es": "Argüelles" },
      "description": {
        "es": "Argüelles es tranquilo y muy andable. Al lado tienes el Parque del Oeste…"
      }
    }
  ],

  "locations": [
    {
      "id": "debod",
      "name": { "es": "Templo de Debod" },
      "neighbourhoodId": "arguelles",
      "tagIds": ["atardecer", "arquitectura"],
      "access": "free",

      "approximateArea": { "lat": 40.424, "lng": -3.7177, "radiusMeters": 400 },
      "thumbnail": {
        "locationId": "debod",
        "usage": "thumb",
        "alt": { "es": "El Templo de Debod reflejado en su estanque al atardecer" },
        "aspectRatio": 1.3333
      },

      "coords": { "lat": 40.424, "lng": -3.71766 },
      "bestTime": { "es": "45 min antes del atardecer" },
      "shotDescription": {
        "es": "El reflejo funciona desde el lado sur del estanque, agachado casi a ras de agua…"
      },
      "capture": {
        "camera": "Sony A7 IV",
        "focalLengthMm": 24,
        "aperture": "f/8",
        "shutterSpeed": "1/125 s",
        "iso": 100
      },
      "detailImage": {
        "locationId": "debod",
        "usage": "detail",
        "alt": { "es": "El Templo de Debod reflejado en su estanque al atardecer" },
        "aspectRatio": 1.3333
      }
    }
  ],

  "tips": [
    {
      "id": "faro",
      "categoryId": "ver",
      "title": { "es": "Sube al Faro de Moncloa al atardecer" },
      "context": { "es": "8 € · 92 m de altura · vistas de 360º" },
      "body": [
        { "es": "Es el mirador más rápido de Madrid: ascensor directo…" },
        { "es": "El cristal refleja: pega el parasol o la mano al cristal…" }
      ],
      "relatedLocationIds": ["debod"]
    }
  ]
}
```

## Garantías que el catálogo ofrece a la aplicación

1. **Los identificadores son estables.** Un `id` publicado no se reutiliza para otra pieza ni
   cambia de significado. Los guardados del usuario apuntan a ellos.
2. **El orden de los arrays es el orden de presentación.** `tags`, `tipCategories` y `tips`
   se muestran en el orden en que aparecen.
3. **Los campos de pago están declarados, no deducidos.** `access.premiumFields` es la única
   lista; nada fuera del catálogo decide qué se compra.
4. **El punto exacto y la zona aproximada son datos independientes.** La zona nunca se
   calcula a partir del punto.

## Garantías que la aplicación ofrece al catálogo

1. **Los campos desconocidos se ignoran**, en cualquier nivel, sin fallar (FR-034).
2. **Una pieza inválida no tumba el catálogo**: se descarta ella sola y se registra (FR-035).
3. **Una versión de esquema futura no se interpreta**: la app avisa y no carga (FR-036).
4. **Ausencia o ilegibilidad de `access` en una localización se trata como `premium`** (FR-030).

## Evolución del esquema

| Cambio | ¿Sube `schemaVersion`? |
|--------|------------------------|
| Añadir un campo opcional | No. Las apps antiguas lo ignoran. |
| Añadir una entidad nueva al catálogo | No, si las apps antiguas pueden ignorarla. |
| Añadir una etiqueta o categoría al vocabulario | No. |
| Renombrar o eliminar un campo existente | Sí. |
| Cambiar el significado o el tipo de un campo | Sí. |
| Cambiar la forma de `access.premiumFields` | Sí. |

Al subir la versión, la app antigua deja de cargar el catálogo y muestra el aviso de
actualización, que es exactamente el comportamiento deseado: mejor no mostrar nada que
mostrar un campo de pago por haberlo interpretado mal.

## Validación publicable

`npm run validate:catalog` comprueba, antes de publicar (FR-033):

| Comprobación | Severidad |
|--------------|-----------|
| Identificadores duplicados en cualquier colección | Error |
| Campo obligatorio ausente o con tipo incorrecto | Error |
| `neighbourhoodId` que no existe | Error |
| Campo en `premiumFields` que no es un campo de `Location` | Error |
| Falta un campo mínimo obligatorio en `premiumFields` (FR-032) | Error |
| Imagen declarada cuyo fichero no existe | Error |
| Coordenadas fuera de rango | Error |
| Fichero JPG presente que ningún `ImageRef` declara | Aviso |
| Localización de pago sin miniatura | Aviso |
| Localización sin ninguna etiqueta | Aviso |
| Etiqueta o categoría fuera del vocabulario | Aviso |
| `relatedLocationIds` que apunta a una localización inexistente | Aviso |

Los errores devuelven código de salida distinto de cero y bloquean el merge. Los avisos se
imprimen y no bloquean.
