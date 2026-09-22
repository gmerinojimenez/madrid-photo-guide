# Phase 1 — Modelo de datos: titularidad de compra

**Feature**: `004-revenuecat-payments` | **Fecha**: 2026-09-22

Esta feature añade muy pocos datos y ninguna tabla. Lo que añade es sobre todo **estados y
transiciones**, que es donde vive el riesgo.

---

## 1. Lo que NO cambia

Conviene empezar por aquí, porque es la mitad del diseño:

| Artefacto | Estado |
|-----------|--------|
| `Entitlement = { owned: boolean }` (`src/core/content/access.ts`) | **Sin cambios** (D-006) |
| `viewLocation`, `LocationPreview`, `isFullLocation`, `accessOf` | **Sin cambios** |
| Esquema del catálogo de contenido y su marca `access: 'free' \| 'premium'` | **Sin cambios** |
| `PRAGMA user_version` de SQLite | Se queda en **1**: no hay migración nueva (D-005) |
| Tablas `saved_locations` y `preferences` | **Sin cambios** de esquema |

La decisión de acceso sigue concentrada donde ya estaba. Esta feature no toca el módulo que
decide qué se ve; solo cambia **de dónde sale el booleano** que ese módulo consume.

---

## 2. Entidades del núcleo

### 2.1 `Entitlement` (existente, reutilizado)

```ts
type Entitlement = { owned: boolean };
```

Único dato que la UI conoce sobre la compra. Sin fechas, sin identificadores de transacción,
sin recibos: nada de eso hace falta para responder "¿puede verse esto?", y no guardarlo es
lo que mantiene a la app fuera del tratamiento de datos personales y de pago (FR-010,
FR-012).

### 2.2 `OwnershipQuery` (nueva, interna al núcleo)

El resultado de preguntarle a la tienda. Existe **solo** dentro del módulo de titularidad y
nunca llega a la UI (D-006).

```ts
type OwnershipQuery =
  | { status: 'known'; owned: boolean }        // la tienda respondió
  | { status: 'unavailable'; failure: StoreFailure };  // no respondió
```

La distinción entre `{ status: 'known', owned: false }` y `{ status: 'unavailable' }` es la
más importante del modelo: la primera **revoca**, la segunda **no toca nada**. Colapsarlas
en un booleano sería el bug que deja sin contenido a quien pagó.

### 2.3 `StoreFailure` (nueva)

```ts
type StoreFailure = 'offline' | 'store' | 'not-allowed';
```

Vocabulario cerrado del dominio, traducido desde los códigos de RevenueCat según la tabla
de D-004. Sirve para elegir el mensaje que ve el usuario, no para decidir el acceso: los
tres degradan igual.

### 2.4 `PurchaseOutcome` y `RestoreOutcome` (nuevas)

Desenlaces de las dos acciones del usuario. Son **resultados de una acción**, no estados
persistentes: se consumen una vez, para decidir qué mensaje mostrar.

```ts
type PurchaseOutcome =
  | { status: 'purchased' }                    // compra completada
  | { status: 'already-owned' }                // ya era suya: éxito, no error (D-004)
  | { status: 'cancelled' }                    // cerró la hoja: no es un fallo
  | { status: 'unavailable'; failure: StoreFailure };

type RestoreOutcome =
  | { status: 'restored' }                     // había compra y se recuperó
  | { status: 'nothing-to-restore' }           // la tienda respondió: no hay nada (FR-005)
  | { status: 'unavailable'; failure: StoreFailure };
```

`nothing-to-restore` y `unavailable` se separan por la misma razón de siempre: "no compraste
nunca" y "no he podido preguntar" merecen mensajes distintos, y solo el primero es una
respuesta.

### 2.5 `CachedEntitlement` (nueva, persistida)

```text
clave:  'entitlement.owned'        (tabla preferences, existente)
valor:  '1' | '0'
ausente: nunca se ha sabido        → se interpreta como owned: false
```

Tres estados legibles, no dos: presente-verdadero, presente-falso y **ausente**. El tercero
importa porque distingue "sé que no ha comprado" de "no sé nada todavía", aunque ambos
resuelvan hoy a `owned: false`.

**Valores ilegibles**: cualquier cosa que no sea `'1'` se lee como `'0'`. El esquema de
contenido ya sigue esta regla (lo no legible se trata como premium) y aquí aplica igual: un
valor corrupto no concede acceso.

---

## 3. Máquina de estados de la titularidad

Un único estado vivo —`owned: boolean`— con cuatro entradas que pueden modificarlo.

```text
                    ┌──────────────────────────────────────────┐
   arranque ───────▶│  hidratar desde caché                     │
                    │  '1'→true   '0'→false   ausente→false     │
                    └────────────────────┬─────────────────────┘
                                         ▼
                              ┌─────────────────────┐
             ┌───────────────▶│   owned: false      │◀──────────────┐
             │                └──────────┬──────────┘               │
             │                           │                          │
             │           comprar OK / ya era suya / restaurar OK    │
             │           tienda responde "sí"                       │
             │                           ▼                          │
             │                ┌─────────────────────┐               │
             └────────────────┤   owned: true       │               │
               tienda responde└─────────────────────┘               │
               "no" (reembolso, FR-011)                             │
                                                                    │
   tienda NO responde (offline / fallo) ────────────────────────────┘
   → no hay transición: se conserva el estado actual (FR-007)
```

**Las cuatro entradas**

| Entrada | Cuándo | Efecto |
|---------|--------|--------|
| Hidratación | Una vez, al arrancar | Publica el valor de la caché. No consulta a la tienda. |
| Reconciliación | Al arrancar (tras hidratar) y al volver a primer plano | La tienda manda si responde; si no responde, no pasa nada (FR-008). |
| Acción del usuario | Comprar o restaurar | Un desenlace de éxito concede; cancelar o fallar no cambian el estado. |
| Notificación empujada | Cuando la tienda avisa por su cuenta | Igual que una reconciliación con respuesta. Cubre el reembolso. |

**Invariantes**, todas verificables con tests unitarios:

1. Ninguna entrada revoca el acceso sin una **respuesta afirmativa** de la tienda diciendo
   que ya no hay titularidad.
2. Cada cambio efectivo de `owned` escribe la caché y notifica a los suscriptores **una sola
   vez**. Un valor idéntico al vigente no notifica ni reescribe.
3. Ninguna operación lanza una excepción hacia la UI. Todo fallo se convierte en
   `unavailable` y se registra por `ContentLogger`.
4. La caché nunca es autoridad frente a una tienda que sí respondió.

---

## 4. Persistencia

**Sin migración.** La única escritura nueva es una clave en la tabla `preferences` creada en
la feature 003:

```sql
-- ya existe, no se modifica
CREATE TABLE IF NOT EXISTS preferences (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
```

| Clave | Valores | Escrita por | Leída por |
|-------|---------|-------------|-----------|
| `onboarding.completed` | `'1'` | Presentación inicial (003) | Layout raíz (003) |
| `entitlement.owned` | `'1'` \| `'0'` | Titularidad (**nueva**) | Titularidad al arrancar (**nueva**) |

**Degradación heredada y suficiente**: `createSqlitePreferencesStore` ya devuelve `null` ante
una lectura fallida y descarta las escrituras fallidas registrándolas, sin rechazar nunca la
promesa. Una base de datos rota, por tanto, produce exactamente el comportamiento correcto:
la app arranca sin titularidad conocida y la primera reconciliación con la tienda la
restablece.

**Lo que no se persiste jamás**: recibos, tokens de compra, identificadores de transacción,
precios pagados, fechas de compra, identificador de usuario de RevenueCat. Ni en SQLite ni
en ningún otro sitio de la app (FR-010).

---

## 5. Configuración (no es dato de usuario)

Declarada en `app.json` bajo `expo.extra.revenuecat` (D-009), leída con `expo-constants`:

| Campo | Ejemplo | Papel |
|-------|---------|-------|
| `iosApiKey` | `appl_…` | Clave **pública** del SDK en iOS |
| `androidApiKey` | `goog_…` | Clave **pública** del SDK en Android |
| `entitlementId` | `full_guide` | Clave que se busca en `entitlements.active` |

Con cualquiera de los tres ausente o con valor de marcador, el adaptador no configura el SDK
y responde `unavailable: 'store'` a todo, sin romper el arranque (D-009).

---

## 6. Datos de la tienda que la app consume en vivo

Se leen, se muestran y **no se guardan**:

| Dato | Origen | Uso |
|------|--------|-----|
| Precio localizado (`priceString`) | `getOfferings()` | Lo que muestra el paywall (D-008) |
| Paquete comprable | `offerings.current` | Argumento de `purchasePackage` |

Si `getOfferings()` no responde, el paywall se presenta sin precio y con la compra
desactivada. No hay precio de reserva escrito en el código: un precio inventado es peor que
ninguno.

---

## 7. Trazabilidad requisito → modelo

| Requisito | Dónde se materializa |
|-----------|----------------------|
| FR-001 producto único no consumible | Un solo `entitlementId`; sin paquetes múltiples |
| FR-002 punto único de decisión | `viewLocation` sobre `Entitlement`, intacto (§1) |
| FR-003 compra solo por hoja nativa | `purchasePackage`; la app no modela pagos |
| FR-004 restaurar accesible | `RestoreOutcome`, expuesto en perfil y paywall (D-011) |
| FR-005 "no hay nada que restaurar" | Estado `nothing-to-restore`, distinto de `unavailable` |
| FR-006 no pagar dos veces | `already-owned` tratado como éxito (§2.4) |
| FR-007 conservar último estado | Rama sin transición de §3 |
| FR-008 la tienda manda | `OwnershipQuery.known` pisa la caché (§3) |
| FR-009 alcance por plataforma | Texto del paywall (D-012); no genera dato |
| FR-010 sin datos de pago | §4, "lo que no se persiste jamás" |
| FR-011 reflejar revocación | Notificación empujada + reconciliación (§3) |
| FR-012 analítica sin datos de pago | Solo se registra `StoreFailure`, nunca el error crudo |
