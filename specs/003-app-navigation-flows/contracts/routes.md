# Contract: árbol de rutas y navegación

**Feature**: 003-app-navigation-flows

Contrato de navegación de la app: qué rutas existen, qué parámetros aceptan, cómo se presentan
y a dónde vuelve cada una. Es el contrato que los tests de aceptación ejercitan con
`renderRouter`.

---

## Rutas

| Ruta | Fichero | Presentación | Parámetros | Requisito |
|------|---------|--------------|------------|-----------|
| `/onboarding` | `app/onboarding.tsx` | Pantalla completa, sin cabecera ni pestañas | — | FR-005 |
| `/` | `app/(tabs)/index.tsx` | Sección "Mapa" | — | FR-001 |
| `/tips` | `app/(tabs)/tips.tsx` | Sección "Consejos" | — | FR-001 |
| `/saved` | `app/(tabs)/saved.tsx` | Sección "Guardados" | — | FR-001 |
| `/profile` | `app/(tabs)/profile.tsx` | Sección "Perfil" | — | FR-001 |
| `/location/[id]` | `app/location/[id].tsx` | Apilada sobre la sección activa | `id`: identificador de localización | FR-002 |
| `/tip/[id]` | `app/tip/[id].tsx` | Apilada sobre la sección activa | `id`: identificador de consejo | FR-002 |
| `/paywall` | `app/paywall.tsx` | **Modal**, cubre la pantalla | — | FR-003 |

El grupo `(tabs)` no aparece en la ruta: la sección de mapa es `/`, no `/(tabs)/`.

### Parámetros desconocidos

`/location/[id]` y `/tip/[id]` con un identificador que no existe en el catálogo muestran un
estado de "contenido no disponible" con vuelta atrás. **No lanzan y no dejan la pantalla en
blanco**: el identificador puede llegar de un enlace profundo o de un guardado antiguo.

---

## Reglas de navegación

### R-1 · Arranque condicional (FR-005)

```text
arranque
  └─ leer preferences["onboarding.completed"]
       ├─ ausente  → redirigir a /onboarding
       └─ "1"      → permanecer en /
```

Mientras la lectura está en curso se mantiene visible la pantalla de arranque; el mapa no se
muestra ni por un fotograma antes de redirigir.

La redirección **sustituye** la entrada en el historial, no la apila: desde el primer paso de
la presentación el gesto de retroceso no puede llegar al mapa.

### R-2 · Salidas de la presentación (US3 §4 y §5)

| Acción | Destino | Marca `onboarding.completed` |
|--------|---------|------------------------------|
| Paso 0 o 1 → avanzar | siguiente paso (misma ruta) | no |
| Paso 0 o 1 → saltar | `/` | **sí** |
| Paso 2 → "Empezar gratis" | `/` | sí |
| Paso 2 → "Ver la guía completa" | `/paywall` | **sí** |

La marca se escribe **siempre que se abandona la presentación**, también al saltar al paywall
y también al saltar desde un paso intermedio. De lo contrario, cerrar el paywall devolvería a
la presentación y la app quedaría en bucle.

La navegación de salida sustituye la entrada de historial: no se vuelve a la presentación con
el gesto de retroceso.

### R-3 · Abrir una localización (FR-009, FR-010)

La decisión no la toma quien navega, sino la proyección del núcleo:

```text
tocar una localización
  └─ viewLocation(location, entitlement)
       ├─ devuelve Location        → navegar a /location/<id>
       └─ devuelve LocationPreview → NO navegar; abrir panel "contenido bloqueado"
```

Es la misma regla desde el mapa, desde la lista de guardados y desde las localizaciones
relacionadas de un consejo (US4 §4). Ninguna pantalla comprueba `access` por su cuenta.

### R-4 · Vuelta atrás (FR-002, US1 §3)

Cerrar una pantalla apilada devuelve a la pantalla desde la que se abrió, con su estado
intacto: la sección activa, el texto buscado y los filtros aplicados. Abrir una ficha desde el
detalle de un consejo y cerrarla devuelve **al consejo**, no al mapa.

Esto no exige código: es lo que hace el stack si el estado de exploración del mapa vive en la
pantalla de mapa y no se reinicia al perder el foco.

### R-5 · Cierre del paywall (US2 §6)

| Acción en `/paywall` | Efecto |
|----------------------|--------|
| Cerrar con la "X" o el gesto | Vuelve a la pantalla desde la que se abrió; la titularidad no cambia |
| "Comprar" | Activa la titularidad, navega a `/` y abre el panel de compra completada (FR-030) |

Tras comprar, la navegación a `/` **descarta** la entrada modal del historial: el gesto de
retroceso desde el mapa no puede devolver al paywall ya comprado.

### R-6 · Los paneles no son rutas (FR-004)

Los cuatro paneles superpuestos —contenido bloqueado, navegar, filtros y compra completada—
son estado de la pantalla activa, no destinos. No aparecen en la ruta, no se apilan en el
historial y el gesto de retroceso del sistema **los cierra**, en lugar de navegar.

---

## Proveedores del layout raíz

`app/_layout.tsx` envuelve todo el árbol, en este orden de fuera adentro:

```text
SafeAreaProvider
└─ SQLiteProvider            (abre la BD, aplica migraciones; D-005)
   └─ CatalogProvider        (carga y valida el catálogo una vez; feature 002)
      └─ EntitlementProvider (suscribe a EntitlementSource; FR-031)
         └─ StoresProvider   (SavedLocationsStore, PreferencesStore)
            └─ Stack         (las rutas)
```

El orden importa: los almacenes necesitan la base de datos abierta, y la titularidad se
consulta desde pantallas que ya necesitan el catálogo. Ningún proveedor bloquea el árbol
mientras carga: cada uno expone su estado de carga para que el layout decida cuándo retirar la
pantalla de arranque.

---

## Lo que este contrato garantiza a los tests

Un test de aceptación puede, sin conocer la implementación:

1. Montar el árbol en cualquier ruta y afirmar qué pantalla está visible.
2. Recorrer el flujo completo de la spec —presentación → mapa → contenido bloqueado → paywall
   → compra → ficha— tocando lo que toca la persona usuaria.
3. Afirmar que una ruta de ficha de pago **no es alcanzable** sin la compra, comprobando que
   tocar el marcador deja la ruta donde estaba y abre el panel.
4. Afirmar que cerrar una pantalla apilada restituye la anterior con sus filtros puestos.
