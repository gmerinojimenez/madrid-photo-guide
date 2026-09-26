# Quickstart — Validar la compra única

**Feature**: `004-revenuecat-payments`

Cómo comprobar que la feature funciona, en tres niveles: lo que se valida sin salir de Node,
lo que se valida en una development build, y lo que solo se puede validar contra las tiendas
de verdad.

---

## 0. Prerrequisitos

| Requisito | Por qué |
|-----------|---------|
| Node ≥ 22.13.0 | `engines` del proyecto |
| Development build (no Expo Go) | `react-native-purchases` es módulo nativo, igual que `expo-maps` y `expo-sqlite` |
| Cuenta de RevenueCat con la app configurada | Fuente de la titularidad |
| Producto no consumible creado y **aprobado** en Google Play Console y App Store Connect | Sin producto aprobado, la tienda no devuelve ofertas |
| Claves públicas en `app.json` → `expo.extra.revenuecat` | D-009 |

Sin lo último, la app **arranca igual**: el contenido gratuito funciona y la compra se
presenta como no disponible. Eso es comportamiento correcto, no un fallo de configuración
(D-009), y conviene comprobarlo a propósito al menos una vez.

---

## 1. Validación sin dispositivo (la mayor parte)

```bash
npm run verify
```

Ejecuta tipos, lint, validación del catálogo y toda la suite de tests. Es la puerta de CI y
debe estar verde antes de cualquier merge.

Para iterar solo sobre esta feature:

```bash
npx jest __tests__/core/entitlement __tests__/screens/purchase __tests__/screens/restore
```

**Qué cubre cada nivel**

| Suite | Qué prueba | Dónde |
|-------|-----------|-------|
| Unitarios de núcleo | Toda la máquina de estados de [data-model.md §3](./data-model.md): hidratar, reconciliar, comprar, restaurar, revocar, degradar | Node, sin dobles nativos, contra un `StoreGateway` falso |
| Aceptación de pantallas | Los once escenarios de [contracts/screens.md §6](./contracts/screens.md#6-escenarios-de-aceptación--test) | `renderRouter` + tienda falsa de `jest.setup.ts` |
| Pureza de capas | Que nadie fuera de `src/platform/purchases/` importa `react-native-purchases` | `__tests__/core/purity.test.ts` |

Las **cuatro situaciones de acceso** que el principio III declara obligatorias se validan
aquí, todas: sin compra, con compra, restauración en instalación limpia, y estado
indeterminable por fallo de red o de tienda.

---

## 2. Validación en development build

```bash
npx expo install react-native-purchases   # solo la primera vez
npx expo prebuild --clean
npm run ios      # o: npm run android
```

> **Importante**: tras instalar el SDK hay que hacer una build completa. Recargar en caliente
> sobre una build anterior da errores — lo advierte la propia guía de RevenueCat.

### 2.1 Comprobación obligatoria del manifiesto (D-002)

Una sola vez, tras el primer prebuild:

```bash
grep -r "com.android.vending.BILLING" android/app/build/intermediates/merged_manifests/ android/app/src/main/AndroidManifest.xml
```

Debe aparecer, puesto ahí por la fusión del manifiesto del SDK de Android. Si **no** aparece,
la feature no está terminada: hace falta un config plugin propio mínimo que lo añada. No se
escribe por adelantado — se escribe si esta comprobación falla.

### 2.2 Recorrido manual

Con sandbox de la tienda configurado:

1. **Sin compra** → el mapa muestra la barra de modo prueba y las localizaciones premium
   aparecen bloqueadas.
2. **Paywall** → muestra el precio **que viene de la tienda** (no `9,99 €` escrito a mano) y
   el aviso de alcance por plataforma sobre el botón de compra.
3. **Comprar** → se abre la hoja **nativa** de la tienda. Completar ⇒ vuelta al mapa,
   desbloqueo inmediato, sin reiniciar.
4. **Cancelar** (segunda pasada, con otra cuenta sandbox) → todo sigue bloqueado y **no**
   aparece ningún mensaje de error.
5. **Modo avión + reiniciar** → el contenido premium sigue accesible (FR-007). Este es el
   escenario que más importa: es la app en la calle.
6. **Desinstalar, reinstalar, Restaurar compra** → el acceso vuelve sin tocar soporte.
7. **Restaurar con una cuenta que no compró** → mensaje claro de que no hay nada que
   restaurar, y nada se desbloquea.

---

## 3. Lo que solo se valida contra las tiendas reales

Obligatorio antes de publicar, según el apartado de Publicación de la constitución. No es
automatizable y no se finge que lo sea:

- [ ] Compra real en **Google Play** (pista interna) de principio a fin.
- [ ] Compra real en **App Store** (TestFlight, sandbox) de principio a fin.
- [ ] Restauración en **instalación limpia** en ambas plataformas.
- [ ] Acceso al contenido premium **sin conectividad** tras haber comprado, en ambas.
- [ ] Reembolso desde la consola ⇒ el acceso se revoca en la siguiente reconciliación
      (FR-011). Es el único camino para probar la revocación de verdad.
- [ ] Precio mostrado coincide con el de la ficha de la tienda, en al menos dos monedas.

---

## 4. Configuración de consolas (una vez)

Orden que evita idas y venidas:

1. **App Store Connect** / **Google Play Console**: crear el producto **no consumible**
   (Play: "producto gestionado") con el mismo identificador en ambas. Enviarlo a revisión:
   hasta que no está aprobado, `getOfferings()` no devuelve nada.
2. **RevenueCat**: dar de alta las dos apps, pegar las credenciales de tienda, importar los
   productos.
3. **RevenueCat → Entitlements**: crear el entitlement (por ejemplo `full_guide`) y
   **asociarle los dos productos**. Este identificador es el que va en `app.json`.
4. **RevenueCat → Offerings**: crear la oferta actual con un paquete que contenga el producto.
   Es de donde sale el precio del paywall.
5. **`app.json`**: pegar las dos claves **públicas** del SDK y el `entitlementId`.

**Errores habituales, y cómo se manifiestan**: entitlement mal escrito ⇒ la compra se
completa pero el contenido sigue bloqueado; producto sin aprobar ⇒ paywall sin precio y
compra desactivada; clave de plataforma cruzada ⇒ `unavailable: 'store'` en todo. Los tres
degradan sin romper, así que hay que ir a buscarlos: no se anuncian con un crash.

---

## 5. Diagnóstico

| Síntoma | Causa probable |
|---------|----------------|
| Paywall sin precio, compra desactivada | `getOfferings()` no responde: producto sin aprobar, sin red, o clave ausente |
| Compra correcta pero sigue bloqueado | El `entitlementId` de `app.json` no coincide con el de RevenueCat |
| Todo `unavailable` desde el arranque | Clave ausente, de marcador, o de la otra plataforma (D-009) |
| Funciona en iOS y no en Android | Producto no publicado en la pista de pruebas, o cuenta de prueba no dada de alta |
| El acceso se pierde al reiniciar sin red | Regresión de FR-007: la caché no se está escribiendo. Hay test unitario que lo cubre |

Para ver qué dice el SDK durante el desarrollo, subir su nivel de log
(`Purchases.setLogLevel`) **solo** en build de desarrollo. Nunca en producción: los logs del
SDK incluyen detalle de transacciones que no debe acabar en la telemetría del producto
(FR-012).
