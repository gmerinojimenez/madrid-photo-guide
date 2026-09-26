# Phase 0 — Decisiones técnicas: compra única con RevenueCat

**Feature**: `004-revenuecat-payments` | **Fecha**: 2026-09-22

Cada decisión registra qué se elige, por qué, y qué se descarta. Las versiones y las
capacidades del SDK están **verificadas contra el paquete publicado**, no supuestas: el
método de comprobación se indica en cada punto.

---

## D-001 — Dependencia: `react-native-purchases@10.10.1`, y nada más

**Decisión**: añadir una única dependencia nueva, `react-native-purchases@10.10.1`,
instalada con `npx expo install react-native-purchases`.

**Verificado** (`npm view` + inspección del tarball publicado, 2026-09-22):

| Dato | Valor |
|------|-------|
| Última versión | `10.10.1`, publicada el 2026-09-21 |
| `peerDependencies` | `react >= 16.6.3`, `react-native >= 0.73.0`, `react-native-web` (marcada `optional`) |
| Dependencias propias | `@revenuecat/purchases-typescript-internal@19.2.0`, `@revenuecat/purchases-js-hybrid-mappings@19.2.0` |
| Cadencia de publicación | semanal y sostenida (10.5.0 → 10.10.1 entre julio y septiembre de 2026) |

El proyecto va en React Native `0.86.3`, muy por encima del mínimo `0.73.0`. El peer
`react-native-web` está declarado `optional`, así que no arrastra nada: el proyecto no
soporta web y no necesita instalarlo.

**Rationale**: es el SDK oficial y es el que la constitución nombra explícitamente. Está
mantenido de forma activa —no es una librería a la deriva—, lo cual satisface la exigencia
de "una dependencia mantenida antes que una abandonada".

**Alternativas descartadas**:

- **`react-native-purchases-ui`** (el paywall prefabricado de RevenueCat): se descarta. La
  app ya tiene su propio paywall diseñado y construido (`app/paywall.tsx`, feature 003) y
  encaja con el tema oscuro del producto. Añadirlo significaría una segunda dependencia
  nativa, una segunda fuente de verdad para el diseño del paywall, y renunciar al control
  del texto obligatorio de alcance de plataforma (FR-009). El SDK base ya abre la hoja de
  compra nativa de la tienda en `purchasePackage`, que es lo único que la constitución
  exige delegar.
- **`expo-in-app-purchases`**: descontinuada por Expo; no es una opción.
- **`react-native-iap`** (facturación directa sin intermediario): obligaría a validar el
  recibo en el cliente o a montar un servidor propio de validación. Lo primero lo prohíbe
  la constitución ("validación fuera del cliente"); lo segundo lo prohíbe el principio II.

---

## D-002 — No hay config plugin: se integra por autolinking. La constitución dice otra cosa

**Decisión**: integrar la librería mediante **autolinking de React Native**, sin añadir
ninguna entrada al array `plugins` de `app.json`.

**Hallazgo**: la constitución afirma, en *Restricciones Tecnológicas*, que RevenueCat se
integra «con su config plugin». **Eso no es cierto a día de hoy.** El tarball publicado de
`react-native-purchases@10.10.1` **no contiene ningún `app.plugin.js`** (comprobado
extrayendo el paquete: cero coincidencias), y la guía oficial de instalación en Expo no
menciona ninguna entrada de plugin: prescribe `npx expo install react-native-purchases` y
una development build.

**Consecuencia práctica**: ninguna. La librería es un módulo nativo autoenlazado; no
necesita modificar el `Info.plist` ni el manifiesto de Android desde la configuración de la
app, porque el permiso `com.android.vending.BILLING` lo declara el manifiesto del propio
SDK de Android de RevenueCat y llega al binario por fusión de manifiestos. No se edita
`ios/` ni `android/` a mano, así que la restricción real de la constitución —trabajar con
generación nativa continua y sin tocar los directorios nativos— se cumple igual.

**Acción — ya aplicada**: la constitución se ha enmendado a **v1.0.1** (PATCH: corrección de
un dato de hecho, sin cambio semántico). Su restricción de Facturación ya no habla de config
plugin, sino de autolinking, y añade que si una versión futura llegara a exigir
configuración nativa, esta se expresará mediante config plugin y nunca editando `ios/` ni
`android/` a mano. El Sync Impact Report de la cabecera recoge el motivo y el origen.

Como exige el apartado de Enmiendas, el cambio **viaja en su propio commit**, separado de
todo cambio de producto.

**Verificación obligatoria en la implementación**: tras el primer `expo prebuild`,
comprobar en el `AndroidManifest.xml` generado que `com.android.vending.BILLING` aparece
efectivamente. Si no apareciera, la corrección es un config plugin propio mínimo que lo
añada — pero no se escribe por anticipado sobre una suposición.

---

## D-003 — Superficie del SDK que se usa, y la que no

**Decisión**: la integración usa exactamente siete llamadas. **Verificado** contra los
`.d.ts` publicados (`package/dist/purchases.d.ts`):

```text
Purchases.configure(configuration: PurchasesConfiguration): void     // síncrona
Purchases.isConfigured(): Promise<boolean>
Purchases.getCustomerInfo(): Promise<CustomerInfo>
Purchases.getOfferings(): Promise<PurchasesOfferings>
Purchases.purchasePackage(pkg): Promise<MakePurchaseResult>
Purchases.restorePurchases(): Promise<CustomerInfo>
Purchases.addCustomerInfoUpdateListener(l) / removeCustomerInfoUpdateListener(l): boolean
```

Dos detalles que condicionan el diseño:

1. **`configure` es síncrona y no devuelve promesa.** Se invoca una sola vez por proceso,
   antes que cualquier otra llamada. Un fallo de configuración no se manifiesta aquí sino
   en la primera llamada real, que rechaza con `CONFIGURATION_ERROR`.
2. **`addCustomerInfoUpdateListener` NO devuelve una función de baja** — devuelve `void`,
   y la baja se hace pasando *la misma referencia* a `removeCustomerInfoUpdateListener`.
   Esto importa porque el puerto `EntitlementSource` del núcleo sí promete
   `subscribe(): () => void`. El adaptador es quien cierra esa diferencia guardando la
   referencia del listener.

**La titularidad se lee de `customerInfo.entitlements.active[ID]`** (verificado en
`customerInfo.d.ts`: `entitlements.active` es un mapa de identificador → `EntitlementInfo`).
Se pregunta por la *presencia de la clave en `active`*, no por `allPurchasedProductIdentifiers`
ni por fechas de expiración: es RevenueCat quien decide qué está activo, y la app confía en
esa respuesta sin reinterpretarla, como exige la constitución.

**No se usa**: `logIn`/`logOut` (no hay cuentas, principio VI), `syncPurchases`,
suscripciones, ofertas promocionales, monedas virtuales, `WebPurchaseRedemption`, ni
`purchasesAreCompletedBy: MY_APP` (que obligaría a reconocer las compras a mano en Android).

---

## D-004 — Mapeo de errores del SDK a un vocabulario del dominio

**Decisión**: el adaptador traduce los códigos de error de RevenueCat a un tipo cerrado del
núcleo. El dominio nunca ve un `PURCHASES_ERROR_CODE`.

**Verificado** en `package/dist/generated/error-codes.d.ts`:

| Código del SDK | Valor | Se traduce a | Efecto en la app |
|----------------|-------|--------------|------------------|
| `PURCHASE_CANCELLED_ERROR` | `"1"` | `cancelled` | No es un error. Estado intacto, sin mensaje de fallo. |
| `PRODUCT_ALREADY_PURCHASED_ERROR` | `"6"` | `already-owned` | Éxito: se refresca la titularidad. Cubre FR-006. |
| `NETWORK_ERROR` | `"10"` | `unavailable: 'offline'` | Degradación segura (FR-007). |
| `OFFLINE_CONNECTION_ERROR` | `"35"` | `unavailable: 'offline'` | Igual. |
| `STORE_PROBLEM_ERROR` | `"2"` | `unavailable: 'store'` | Degradación segura. |
| `CONFIGURATION_ERROR` | `"23"` | `unavailable: 'store'` | Igual (clave ausente o mal configurada). |
| `PURCHASE_NOT_ALLOWED_ERROR` | `"3"` | `unavailable: 'not-allowed'` | Sin cuenta de tienda o compras restringidas. |
| cualquier otro | — | `unavailable: 'store'` | Cajón de sastre: nunca se propaga la excepción. |

**Rationale**: tres razones. Primera, la distinción entre "cancelado" y "falló" es de
producto, no técnica: cancelar no debe enseñar un mensaje de error. Segunda,
`already-owned` **es un éxito** —es exactamente lo que ocurre cuando alguien reinstala y
pulsa comprar en vez de restaurar—, y tratarlo como error sería el peor bug posible en esta
feature. Tercera, un tipo cerrado permite que el `switch` del núcleo sea exhaustivo y que
TypeScript avise si mañana se añade un caso.

**Alternativa descartada**: dejar que las pantallas capturen el error del SDK y decidan.
Esparciría la política de degradación por la UI, que es justo lo que el principio VI
prohíbe al exigir un único punto de decisión.

---

## D-005 — El estado de titularidad se guarda en `preferences`, sin migración nueva

**Decisión**: la caché local de titularidad es **una clave de la tabla `preferences` ya
existente**: `entitlement.owned` con valor `'1'` o `'0'`. No se crea tabla nueva y
`PRAGMA user_version` se queda en `1`.

**Rationale**: la tabla `preferences` ya existe (feature 003, migración 0 → 1), ya está tras
un puerto del núcleo (`PreferencesStore`), y ese puerto **ya degrada como esta feature
necesita**: una lectura fallida devuelve `null` y una escritura fallida se registra y se
descarta, sin rechazar nunca la promesa. Reutilizarla da la degradación de FR-007 gratis y
sin escribir un tramo de migración cuyo único contenido sería un booleano.

El dato guardado es un booleano y nada más: ni recibos, ni identificadores de transacción,
ni fechas de compra. La autoridad es la tienda (FR-008); esto es una caché de conveniencia,
exactamente como la constitución la describe. Nada de lo que se guarda tiene valor si se
manipula: quien edite la base de datos local para poner `'1'` se desbloquea el contenido
hasta la siguiente reconciliación, que lo revertirá. Defender ese caso exigiría validación
en cliente, que es precisamente lo que la constitución prohíbe.

**Alternativas descartadas**:

- **Tabla `entitlement` dedicada** (migración 1 → 2): más ceremonia para un booleano, y
  obligaría a ampliar el doble de `expo-sqlite` de `jest.setup.ts`. Se reconsiderará si
  algún día hay que guardar más de un dato.
- **Confiar solo en la caché del SDK de RevenueCat**: existe, pero es opaca, no está tras un
  puerto del núcleo y ataría el arranque a un detalle de implementación del proveedor. El
  principio de "sustituir el proveedor sin tocar reglas de negocio" exige que la caché de
  arranque sea nuestra.

---

## D-006 — `Entitlement = { owned: boolean }` **no cambia**. La incertidumbre vive dentro

**Decisión**: el tipo que consume la UI y `viewLocation` se queda exactamente como está. No
se añade un tercer estado "desconocido" al tipo público.

**Rationale**: esta es la decisión de diseño central de la feature, y merece el argumento
completo.

La tentación es modelar `Entitlement = { owned: boolean } | { unknown: true }`, porque la
spec habla de un estado indeterminable. Pero la regla de negocio de FR-007 dice que ante
la duda **se conserva el último estado conocido** — es decir, el producto *nunca actúa*
sobre "no lo sé": lo resuelve inmediatamente a un booleano. Exponer "desconocido" en el tipo
público obligaría a cada pantalla a decidir qué hace con él, que es la definición exacta de
duplicar la decisión de acceso fuera de su único módulo, prohibido por el principio VI.

Así que la incertidumbre es un asunto **interno** del módulo de titularidad: la consulta a la
tienda sí distingue "me respondió" de "no me respondió" (`OwnershipQuery`), pero esa
distinción se consume en la reconciliación y jamás sale hacia la UI.

**Beneficio colateral, y no menor**: `src/core/content/access.ts`, sus tests, `viewLocation`
y las nueve pantallas que lo consumen **no se tocan**. Una feature de pagos que no necesita
modificar el módulo de control de acceso es la señal de que la frontera de la feature 003
estaba bien puesta.

---

## D-007 — Reconciliación: la tienda manda cuando responde; el silencio no revoca

**Decisión**: una única función pura decide el estado, y se ejerce en tres momentos:
arranque, vuelta a primer plano, y notificación empujada por la tienda.

```text
hidratar (arranque)   caché → '1' | '0' | null(nunca se supo) → owned
reconciliar           tienda responde  → manda la tienda, se persiste  (FR-008, FR-011)
                      tienda no responde → se conserva lo que había     (FR-007)
```

Lo importante es la asimetría: **una respuesta de la tienda puede tanto conceder como
revocar** (eso cubre el reembolso de FR-011), pero **la ausencia de respuesta nunca revoca**.
"Sin red" y "la tienda dice que no tienes nada" son sucesos distintos y el código los
distingue; confundirlos es el bug que dejaría sin acceso a alguien que pagó.

Al no haber nunca sabido nada (`null`), el valor por defecto es `owned: false`. Es seguro:
el contenido sin marca legible ya se trata como premium en el esquema de contenido, y un
usuario nuevo sin compra es el caso mayoritario. Quien sí compró y estrena dispositivo llega
por la restauración (US2), no por el arranque.

**Alternativa descartada**: reconciliar en segundo plano con una tarea periódica. Añadiría
un modo de ejecución nuevo, consumo de batería —contra la restricción de rendimiento en
campo— y no resuelve nada que el arranque y el primer plano no resuelvan ya.

---

## D-008 — El precio se lee de la tienda, no se escribe en el código

**Decisión**: el paywall muestra el precio localizado que devuelve
`offerings.current.availablePackages[...]` (`product.priceString`), no un literal.

**Estado actual**: `app/paywall.tsx` tiene hoy `9,99 €` escrito a mano y el comentario que lo
declara maqueta (D-011 de la feature 003). Esta feature lo sustituye.

**Rationale**: el precio real depende de la tienda, del país y de la moneda del usuario, y
Apple y Google exigen mostrar el precio que ellos determinan. Un literal sería incorrecto
para todo el que no esté en la eurozona, y quedaría desincronizado en cuanto se cambie el
precio en la consola — sin posibilidad de arreglarlo sin publicar una versión.

**Degradación**: si `getOfferings` no responde, el paywall **no inventa un precio**: presenta
el producto sin cifra y con el botón de compra desactivado, explicando que no puede
conectarse con la tienda. Enseñar un precio no confirmado sería peor que no enseñar ninguno.

---

## D-009 — Las claves públicas viven en `app.json`, con degradación si faltan

**Decisión**: las dos claves públicas de RevenueCat (una por plataforma) se declaran en
`expo.extra.revenuecat` de `app.json` y se leen con `expo-constants`, que ya es dependencia
del proyecto.

```jsonc
"extra": {
  "revenuecat": {
    "iosApiKey": "appl_...",
    "androidApiKey": "goog_...",
    "entitlementId": "full_guide"
  }
}
```

**Rationale**: la constitución lo autoriza sin ambigüedad — «la clave pública de RevenueCat
puede vivir en el bundle; ninguna clave secreta lo hace». Son claves *públicas* de SDK: no
firman nada, no autorizan escritura y son visibles en cualquier binario publicado. La clave
**secreta** de la API de RevenueCat no entra en el repositorio ni en el bundle, y no hace
falta para nada de esta feature. Este es además el mismo patrón que el proyecto ya usa para
la clave de Google Maps de Android.

**Degradación obligatoria**: si la clave falta o sigue siendo el marcador de sustitución, el
adaptador **no llama a `configure` y devuelve `unavailable: 'store'` en todo**. La app
arranca, el contenido gratuito funciona y el paywall explica que la compra no está
disponible. Ni se lanza una excepción ni se cae al arrancar: es el mismo criterio de
"degradar ante un almacén roto" que ya rige el arranque con SQLite.

**Alternativa descartada**: variables `EXPO_PUBLIC_*` inyectadas por perfil de EAS. Es
igual de válida y evita commitear las claves, pero exige convertir `app.json` en
`app.config.ts` y mover configuración a un sitio no versionado — más partes móviles para un
dato que la constitución ya declara publicable. Se deja anotada por si el proyecto adopta
`app.config.ts` por otros motivos.

---

## D-010 — Los tests falsean `react-native-purchases` en `jest.setup.ts`

**Decisión**: añadir a `jest.setup.ts` un doble de `react-native-purchases`, junto a los de
`expo-maps` y `expo-sqlite` que ya están ahí, con ayudantes de test para gobernar la tienda
simulada.

El doble expone la superficie de D-003 y unos pocos controles para los tests de aceptación:
sembrar "esta cuenta ya compró", forzar un fallo de red, forzar una cancelación, y empujar
una revocación. Es el mismo criterio que ya siguen los otros dobles del proyecto: un motor
mínimo que entiende exactamente lo que el adaptador emite, no una librería de mocks.

**Rationale**: el módulo es nativo y no existe bajo Node. Y lo más importante: el reparto de
responsabilidades hace que el doble apenas tenga que ser listo. Toda la lógica que importa
—la reconciliación de D-007— es TypeScript puro y se prueba **sin ningún doble**, en Node,
contra un `StoreGateway` falso de quince líneas. El doble de `jest.setup.ts` solo sirve para
los tests de aceptación que recorren pantallas.

**Lo que no se puede probar así**, y se reconoce: la hoja de compra nativa, el pago real, el
sandbox de cada tienda. Eso se cubre con la prueba manual de publicación que la constitución
ya exige, detallada como lista de comprobación en [quickstart.md](./quickstart.md).

---

## D-011 — Restaurar se ofrece en dos sitios, y dice siempre qué pasó

**Decisión**: "Restaurar compra" existe en el perfil (la fila que hoy es informativa) **y**
en el paywall.

**Rationale**: en el perfil porque es donde el usuario lo busca. En el paywall porque la
App Store lo exige en la pantalla donde se ofrece la compra, y porque es justo el momento en
que alguien que reinstaló descubre que su contenido está bloqueado. Al no existir cuentas,
la restauración es el único mecanismo de recuperación y la constitución la declara
funcionalidad crítica: dos puntos de entrada no es duplicidad, es cobertura.

Los tres desenlaces se comunican siempre y de forma distinguible: restaurada, no había nada
que restaurar (FR-005), o no se pudo contactar con la tienda. Un botón que no dice qué ha
pasado es peor que no tenerlo, porque deja al usuario sin saber si debe reintentar o
escribir a soporte — y aquí no hay soporte.

---

## D-012 — El aviso de alcance por plataforma se muestra antes de comprar

**Decisión**: el paywall incluye, de forma visible y **antes** del botón de compra, el aviso
de que el desbloqueo pertenece a la cuenta de tienda de esa plataforma y que comprar en
Android no desbloquea iOS ni al revés.

**Rationale**: lo exige FR-009 y lo exige la constitución («DEBE comunicarse con claridad al
usuario antes de comprar»). Es además la limitación más probable de generar una queja, y no
hay soporte al que reclamar. Va en el cuerpo del paywall, no escondido tras un enlace de
términos: un aviso que hay que ir a buscar no es un aviso.

---

## Resumen de dependencias nuevas

| Paquete | Versión | Justificación |
|---------|---------|---------------|
| `react-native-purchases` | `10.10.1` | Única vía a Google Play Billing y StoreKit con validación de recibo fuera del cliente, nombrada por la constitución. Sin ella habría que operar un servidor de validación, prohibido por el principio II. |

Ninguna otra. `expo-constants` (lectura de claves) y `react-native` (`AppState`, para la
vuelta a primer plano) ya están en el proyecto.

---

## Riesgos y cómo se acotan

| Riesgo | Acotación |
|--------|-----------|
| El permiso `BILLING` no llega al manifiesto por fusión | Se verifica sobre el `AndroidManifest.xml` generado tras el primer prebuild (D-002), antes de dar la feature por cerrada. |
| Cadencia semanal del SDK: la versión fijada envejece rápido | Se fija versión exacta en el lockfile. Las actualizaciones son un cambio deliberado con su PR, no un rango flotante. |
| Configurar productos y entitlement en tres consolas (RevenueCat, Play, App Store) es trabajo manual y propenso a error | El identificador de entitlement vive en un único sitio del código (`app.json`, D-009) y la lista de pasos de consola está en [quickstart.md](./quickstart.md). Un desajuste se manifiesta como `unavailable`, que degrada sin romper. |
| Probar compras reales exige productos aprobados y cuentas de sandbox | Es un requisito de las tiendas, no evitable. La lógica que lo rodea se prueba entera con fakes (D-010); solo la hoja de compra queda para la prueba manual. |
