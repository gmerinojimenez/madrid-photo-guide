# Contrato: API pública del núcleo de contenido

**Módulo**: `src/core/content` · TypeScript puro, sin React, sin React Native, sin SDKs.

Esta es la superficie que consumirán las pantallas. Todo lo que no se exporte aquí es detalle
interno y puede cambiar sin previo aviso.

## Tipos

Los tipos de datos (`Catalog`, `Location`, `Tip`, `Tag`…) se derivan del esquema Zod con
`z.infer`, de modo que no existe una segunda definición que pueda desincronizarse. Su forma
es la de [data-model.md](../data-model.md).

Dos tipos merecen mención aparte:

```ts
/** Ficha completa. Solo se obtiene con la compra, o si la localización es gratuita. */
type Location = { /* campos públicos + campos de pago */ };

/** Lo que ve quien no ha comprado. NO contiene los campos de pago. */
type LocationPreview = {
  id: string;
  name: LocalizedText;
  neighbourhoodId: string;
  tagIds: string[];
  approximateArea: Area;
  access: 'free' | 'premium';
  thumbnail: ImageRef;
};
```

`LocationPreview` no es `Partial<Location>`: es un tipo con menos campos. Leer `coords` de una
vista previa **no compila**. Esa es la garantía principal de este contrato.

## Carga del catálogo

```ts
type LoadResult =
  | { status: 'ok';                  catalog: Catalog }
  | { status: 'partial';             catalog: Catalog; discarded: DiscardedPiece[] }
  | { status: 'unsupported-version'; found: number; supported: number }
  | { status: 'invalid';             reason: string };

/** Valida y normaliza un catálogo ya parseado. Nunca lanza. Nunca hace E/S. */
function loadCatalog(raw: unknown): LoadResult;
```

`loadCatalog` recibe el objeto ya parseado, no una ruta ni una cadena: de dónde salga el JSON
—bundle hoy, Firebase mañana— es una decisión de fuera del núcleo.

`DiscardedPiece` lleva la colección, el identificador (si era legible) y el motivo, para poder
registrarlo. El registro se hace tras una interfaz de log del núcleo, no con `console`.

## Acceso

Este es el único sitio del proyecto que decide si algo puede verse (principio VI).

```ts
type Entitlement = { owned: boolean };

/** Proyecta una localización según la titularidad. Función pura. */
function viewLocation(location: Location, entitlement: Entitlement): Location | LocationPreview;

/** Discriminador para las pantallas: evita comprobar campos a mano. */
function isFullLocation(view: Location | LocationPreview): view is Location;

/** Clasificación declarada. Marca ausente o no reconocida ⇒ 'premium'. */
function accessOf(location: Location): 'free' | 'premium';
```

Reglas que el contrato garantiza:

- Una localización `free` devuelve siempre la ficha completa, haya compra o no.
- Una localización `premium` devuelve la ficha completa **si y solo si** `owned` es `true`.
- La vista previa no contiene, en runtime, ninguna clave listada en `access.premiumFields`.
- La descripción del barrio se obtiene por una función aparte que exige un `Location`
  completo, de modo que no pueda alcanzarse desde una vista previa.

Los consejos no pasan por aquí: son siempre gratuitos (FR-020).

## Consulta

```ts
type LocationQuery = {
  text?: string;      // busca en nombre, barrio y etiquetas
  tagId?: string;     // coincide si CUALQUIERA de las etiquetas coincide (FR-010b)
};

/** Filtra sin ordenar por distancia: la distancia la calcula la capa que conoce al usuario. */
function queryLocations(catalog: Catalog, query: LocationQuery): Location[];

/** Consejos agrupados por categoría, en el orden del catálogo. */
function tipsByCategory(catalog: Catalog): { category: TipCategory; tips: Tip[] }[];
```

La búsqueda por texto ignora mayúsculas y acentos ("arguelles" encuentra "Argüelles").

Una etiqueta desconocida en una localización no la excluye del resto de filtros; simplemente
no coincide con ningún `tagId` del vocabulario.

## Textos

```ts
/** Devuelve el idioma pedido, o el español si falta. Nunca devuelve vacío. */
function localize(text: LocalizedText, locale: string): string;
```

## Imágenes

```ts
/** Lo que el núcleo necesita de la plataforma para mostrar una imagen. */
interface ImageResolver {
  /** Devuelve la fuente de imagen, o null si el fichero no está disponible. */
  resolve(ref: ImageRef): ImageSource | null;
}
```

`ImageSource` es opaco para el núcleo: la implementación de React Native devuelve lo que
espera su componente de imagen, y una futura implementación remota devolverá una URL. El
núcleo nunca construye rutas.

La implementación empaquetada vive en `src/platform/images/registry.ts` y sigue la convención
de [image-store.md](./image-store.md).

## Lo que este contrato NO ofrece

- **Cálculo de distancias y ordenación por cercanía**: necesita la posición del usuario, que
  es un permiso de plataforma. Va en la feature de mapa.
- **Desenfoque de miniaturas**: es presentación (D-004).
- **Estado del usuario** (guardados, idioma elegido, filtros activos): no es contenido.
- **Titularidad real**: aquí `Entitlement` es un dato de entrada. Quién lo calcula, y cómo se
  degrada si la tienda no responde, es la feature de compra.
