# Contrato — Pantallas y flujos de compra

**Feature**: `004-revenuecat-payments`

Qué ve y qué puede hacer la persona usuaria. Los textos son los que los tests de aceptación
buscan por rol y por texto accesible, nunca por estado interno.

---

## 1. Alcance del cambio en la UI

| Pantalla | Estado |
|----------|--------|
| `app/paywall.tsx` | **Modificada**: compra real, precio de tienda, aviso de plataforma, restaurar |
| `app/(tabs)/profile.tsx` | **Modificada**: "Restaurar compra" pasa de fila informativa a control |
| `app/_layout.tsx` | **Modificada**: compone la fuente real y engancha el ciclo de vida |
| `src/ui/providers/EntitlementProvider.tsx` | **Modificada**: acciones asíncronas con desenlace |
| Resto de pantallas (mapa, ficha, guardados, consejos, paneles) | **Sin cambios** |

Que el mapa, las fichas y los paneles bloqueados no se toquen es deliberado: consumen
`useEntitlement()` y `viewLocation`, y ninguno de los dos cambia de forma.

---

## 2. `EntitlementProvider` — contrato de hooks

```ts
useEntitlement(): Entitlement;                       // SIN CAMBIOS
usePurchase(): () => Promise<PurchaseOutcome>;       // pasa a asíncrono, devuelve desenlace
useRestore(): () => Promise<RestoreOutcome>;         // NUEVO
useStorePrice(): { formatted: string } | null;       // NUEVO: null mientras carga o si falla
```

**Ruptura deliberada**: `usePurchase()` devolvía `() => void` y ahora devuelve una promesa
con el desenlace. Es el cambio que obliga al paywall a dejar de asumir que comprar siempre
funciona. Solo hay un consumidor (`app/paywall.tsx`), así que la ruptura está acotada.

El proveedor **serializa** las acciones: mientras haya una compra o una restauración en
curso, una segunda llamada devuelve el desenlace de la primera en lugar de abrir una segunda
hoja de compra (edge case "compra anterior en curso").

---

## 3. Paywall (`/paywall`)

### 3.1 Contenido

| Elemento | Regla |
|----------|-------|
| Título y beneficios | Sin cambios respecto de la feature 003 |
| **Precio** | `useStorePrice()`. Mientras es `null`: sin cifra, sin precio inventado (D-008) |
| "Pago único, sin suscripción" | Se mantiene |
| **Aviso de plataforma** | **Nuevo**, visible y *antes* del botón: el desbloqueo vale para la cuenta de tienda de esta plataforma; comprar en Android no desbloquea iOS ni al revés (FR-009, D-012) |
| Botón **Comprar** | Desactivado mientras no haya precio o haya una acción en curso |
| **Restaurar compra** | **Nuevo**: control secundario bajo el botón de compra (D-011) |
| Botón cerrar | Sin cambios |

### 3.2 Desenlaces de "Comprar"

| Desenlace | Qué ve la persona |
|-----------|-------------------|
| `purchased` | Vuelve al mapa con el panel de compra completada (comportamiento actual, R-5) |
| `already-owned` | **Igual que `purchased`**: se desbloquea y se le dice que ya era suya. Nunca un error (FR-006) |
| `cancelled` | Sigue en el paywall. **Ningún mensaje de error**: cancelar es una decisión, no un fallo |
| `unavailable: 'offline'` | Mensaje: no se pudo conectar con la tienda; puede reintentar. Sin cargo |
| `unavailable: 'store'` | Mensaje: la compra no está disponible ahora mismo |
| `unavailable: 'not-allowed'` | Mensaje: este dispositivo no permite compras (sin cuenta de tienda o restricciones) |

En los tres `unavailable` el paywall permanece abierto y el botón vuelve a estar disponible:
son situaciones reintentables.

### 3.3 Desenlaces de "Restaurar compra"

Idénticos en el paywall y en el perfil (§4.2).

---

## 4. Perfil (`/(tabs)/profile`)

### 4.1 Cambio

La fila "Restaurar compra" deja de ser informativa y pasa a ser un control pulsable con
`accessibilityRole="button"`. La fila "Descarga sin conexión" **sigue siendo informativa**:
no entra en esta feature.

La tarjeta de plan (Modo prueba / Guía completa) no cambia: ya reacciona a `useEntitlement()`
y se actualizará sola cuando la restauración conceda la titularidad.

### 4.2 Desenlaces de "Restaurar compra"

| Desenlace | Qué ve la persona |
|-----------|-------------------|
| `restored` | Confirmación de compra restaurada. La tarjeta de plan pasa a "Guía completa" en el acto |
| `nothing-to-restore` | Mensaje claro: no se ha encontrado ninguna compra en esta cuenta de tienda. **Nada se desbloquea** (FR-005) |
| `unavailable: *` | Mensaje: no se pudo contactar con la tienda. **El acceso vigente no se toca** (FR-007) |

El caso entre plataformas (US2 §3) llega aquí como `nothing-to-restore`, porque la tienda de
esa plataforma responde, con veracidad, que esa cuenta no tiene la compra. El mensaje menciona
que el desbloqueo pertenece a la plataforma donde se compró, de modo que el usuario entienda
la respuesta en lugar de creer que ha perdido su dinero.

---

## 5. Arranque y vuelta a primer plano (`app/_layout.tsx`)

```text
montar
  └─ hydrate()       lee la caché y publica            ← no bloquea la pantalla
  └─ reconcile()     pregunta a la tienda, en segundo plano
  └─ watch()         escucha notificaciones de la tienda
volver a primer plano
  └─ reconcile()
```

**Regla dura**: ni la hidratación ni la reconciliación retrasan la aparición de la interfaz.
La app arranca con el último estado conocido y se corrige sola si la tienda dice otra cosa.
Una pantalla de carga esperando a la tienda haría que un arranque sin cobertura —el caso de
uso central de esta app, la calle— fuera un arranque lento.

Las bajas de `watch()` y del ciclo de vida se ejecutan al desmontar.

---

## 6. Escenarios de aceptación → test

Cada fila es un test de `__tests__/screens/`, montando el árbol real con `renderRouter` y la
tienda falsa de `jest.setup.ts` (D-010).

| # | Escenario (spec) | Verifica |
|---|------------------|----------|
| 1 | US1 §1–2 — comprar desbloquea | Sin compra hay bloqueo; tras comprar, el contenido premium abre sin reiniciar |
| 2 | US1 §4 — no pagar dos veces | Con titularidad activa, el paywall no ofrece pagar otra vez |
| 3 | Edge — cancelar | Cerrar la hoja deja todo bloqueado y **no** muestra error |
| 4 | US2 §1 — restaurar en instalación limpia | Caché vacía + tienda con compra ⇒ restaurar desbloquea |
| 5 | US2 §2 — nada que restaurar | Tienda sin compra ⇒ mensaje claro, nada se desbloquea |
| 6 | US2 §3 — otra plataforma | Igual que 5, con mensaje que explica el alcance |
| 7 | US3 §1 — arranque sin red | Caché `'1'` + tienda muda ⇒ el contenido premium sigue accesible |
| 8 | US3 §2 — reconciliación fallida | Tienda que falla ⇒ el acceso **no** se revoca |
| 9 | Edge — reembolso | Tienda responde "ya no" ⇒ el contenido vuelve a bloquearse |
| 10 | FR-009 — aviso de plataforma | El paywall muestra el aviso antes del botón de compra |
| 11 | D-008 — sin precio | Sin respuesta de ofertas: sin cifra y con la compra desactivada |

Los escenarios 7, 8 y 9 son los que **cierran la deuda** que la feature 003 registró en su
Complexity Tracking: las cuatro situaciones de acceso que exige el principio III quedan
cubiertas por primera vez.

---

## 7. Accesibilidad

- Todo control nuevo lleva `accessibilityRole="button"` y una etiqueta que dice qué hace.
- Los mensajes de desenlace son texto en pantalla, alcanzable por lector de pantalla y por
  los tests: nada de estado comunicado solo por color o por icono.
- El estado "acción en curso" se refleja en el control (desactivado), no solo en una
  animación.
