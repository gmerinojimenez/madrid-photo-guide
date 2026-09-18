# Quickstart: verificar el catálogo de contenido

**Feature**: 002-content-data-schema

Cómo comprobar, extremo a extremo, que la feature hace lo que promete. Los detalles de
implementación están en [contracts/](./contracts/) y en tasks.md.

## Prerrequisitos

- Node 22.13 o superior (`.nvmrc` ya lo fija).
- Dependencias instaladas: `npm ci`.
- No hace falta simulador, ni dispositivo, ni red: todo lo que se verifica aquí es núcleo
  TypeScript puro y ficheros del repositorio.

## Verificación completa

```bash
npm run verify
```

Este comando encadena lo que CI ejecuta en cada PR: comprobación de tipos, lint y formato,
validación del catálogo y suite de tests. Si pasa en local, pasa en CI.

## Verificación por partes

### 1. El catálogo es válido y publicable

```bash
npm run validate:catalog
```

Comprueba las reglas de [contracts/catalog-schema.md](./contracts/catalog-schema.md):
identificadores duplicados, campos obligatorios, referencias entre entidades, coordenadas,
imágenes declaradas que no existen y ficheros huérfanos.

**Esperado**: `Catálogo válido: 5 localizaciones, 5 consejos, 0 avisos` y código de salida 0.

Para ver que el validador realmente detecta problemas, rompe algo a propósito:

```bash
# Duplica un id y comprueba que falla
node -e "const c=require('./src/content/catalog.json'); c.locations.push(c.locations[0]); require('fs').writeFileSync('/tmp/bad.json', JSON.stringify(c))"
npm run validate:catalog -- /tmp/bad.json
```

**Esperado**: error indicando el identificador duplicado, y código de salida distinto de cero.

### 2. Los tests pasan

```bash
npm test
```

Cubren, como mínimo:

| Comportamiento | Qué demuestra |
|----------------|---------------|
| Campos desconocidos en el JSON | El catálogo carga igualmente (FR-034) |
| Una localización inválida entre otras válidas | Solo se descarta ella, y queda registrada (FR-035) |
| `schemaVersion` futura | No se interpreta; se devuelve `unsupported-version` (FR-036) |
| Localización sin `access` o con valor no reconocido | Se clasifica como de pago (FR-030) |
| Localización de pago sin compra | Se obtiene la vista previa y ningún campo reservado (SC-008) |
| Localización de pago con compra | Se obtiene la ficha completa |
| Localización gratuita sin compra | Se obtiene la ficha completa |
| `access.premiumFields` vs. proyección del núcleo | Coinciden exactamente (D-006) |
| Filtrado por etiqueta | Una foto con `["callejera","nocturna"]` aparece en ambos filtros (FR-010b) |
| Texto sin traducción al idioma pedido | Cae al español, nunca a vacío (FR-038) |
| Imagen declarada que no está en el registro | Devuelve `null`, no lanza |

### 3. Añadir una localización sin tocar código (SC-001)

Es la prueba de que la feature cumple su propósito. A mano, en menos de diez minutos:

1. Añade una entrada nueva al array `locations` de `src/content/catalog.json`, copiando la
   forma de una existente y cambiando `id`, textos y coordenadas.
2. Deja los dos JPG en `assets/content/photos/<id-nuevo>/thumb.jpg` y `detail.jpg`.
3. Añade las dos líneas correspondientes al registro de
   `src/platform/images/registry.ts` (es la única lista de rutas literales que existe; ver
   [contracts/image-store.md](./contracts/image-store.md)).
4. `npm run validate:catalog && npm test`

**Esperado**: ambas cosas pasan, la localización nueva aparece en las consultas y ningún
fichero de lógica se ha tocado.

Si al terminar has tenido que editar algo dentro de `src/core/`, la feature no cumple SC-001
y eso es un fallo que corregir, no una molestia que aceptar.

### 4. El núcleo no depende de React Native

```bash
grep -rE "from '(react|react-native|expo)" src/core/ && echo "VIOLACIÓN" || echo "OK"
```

**Esperado**: `OK`. El principio I del proyecto exige que el dominio corra en Node sin
simulador; los tests del núcleo son la prueba viva de ello.

## Regenerar las imágenes de marcador

Solo si hace falta rehacerlas (normalmente no: están versionadas).

```bash
python3 scripts/generate-placeholder-photos.py
```

Escribe los PNG y los convierte a JPEG con `sips`, incluido en macOS. No añade ninguna
dependencia al proyecto y CI no lo ejecuta nunca (D-009).

## Qué NO verifica este quickstart

- **Pantallas**: esta feature no entrega ninguna. Cuando exista la UI del mapa y de la ficha,
  sus tests de aceptación con React Native Testing Library verificarán el consumo real.
- **Titularidad**: aquí la compra es un dato de entrada (`{ owned: boolean }`). La compra de
  verdad, su restauración y la degradación segura pertenecen a la feature de facturación.
- **Origen remoto**: el contenido se sirve desde el bundle. La migración a Firebase es una
  feature posterior; lo que sí se verifica es que no obligará a cambiar el catálogo (SC-007).
