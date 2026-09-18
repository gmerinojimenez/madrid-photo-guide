# Implementation Plan: Catálogo de contenido de la guía y almacén de imágenes

**Branch**: `002-content-data-schema` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-content-data-schema/spec.md`

## Summary

Definir el catálogo de contenido de la guía —localizaciones fotográficas, sus fichas, las
etiquetas, los barrios y los consejos generales— como un único JSON versionado, junto con la
convención de almacenamiento de los JPG y el código de núcleo que carga, valida y proyecta
ese contenido. La entrega incluye la semilla de 5 localizaciones gratuitas con contenido de
maqueta y sus imágenes de marcador.

El enfoque: un `catalog.json` en el repositorio, un esquema Zod en el núcleo del que se
derivan los tipos de TypeScript, y una capa de acceso que proyecta cada localización en dos
tipos distintos —`Location` y `LocationPreview`— de modo que el compilador impida exponer un
campo de pago a quien no ha comprado. Las imágenes se referencian por identificador de
localización y uso; un registro fuera del núcleo las resuelve con `require` estáticos, y la
misma convención de rutas servirá tal cual cuando el origen pase a Firebase Storage.

Esta feature **no entrega pantallas**. Entrega datos, esquema, carga, validación y la API del
núcleo que las pantallas consumirán después.

Las decisiones técnicas, con sus alternativas descartadas, están en [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript `~6.0.3` en modo `strict`, sobre Expo SDK 57 / React Native
0.86.3 (heredado de la feature 001)

**Primary Dependencies**: `zod@4.6.5` como única dependencia nueva (D-002). Sin módulos
nativos, sin SDKs.

**Storage**: JSON empaquetado con la app (`src/content/catalog.json`) y ficheros JPG en
`assets/content/photos/`. Sin base de datos. El origen remoto (Firebase) queda fuera de
alcance; la convención está diseñada para trasladarse sin cambios (FR-028).

**Testing**: Jest con preset `jest-expo` (ya configurado en 001). Tests unitarios del núcleo
en Node, sin simulador. Los tests de aceptación ejercitan la API pública del núcleo contra el
catálogo real en lugar de renderizar pantallas — ver D-010 y Complexity Tracking.

**Target Platform**: Android e iOS. El núcleo, al ser TypeScript puro, corre además en Node
para tests y para el validador de línea de comandos.

**Project Type**: aplicación móvil multiplataforma, código compartido al 100% en esta feature
(no hay ni una bifurcación de plataforma).

**Performance Goals**: carga y validación del catálogo completo (60 localizaciones) en menos
de 50 ms en un dispositivo de gama media, de forma que no retrase el arranque perceptiblemente.

**Constraints**: funcionamiento sin conectividad; degradación elegante ante campos
desconocidos, piezas inválidas y versión de esquema futura; ninguna imagen en detalle de pago
almacenada en el dispositivo de un usuario sin compra.

**Scale/Scope**: 60 localizaciones y ~20 consejos como objetivo del producto; 5
localizaciones y 5 consejos en la semilla de esta entrega. ~10 entidades de datos.

## Constitution Check

*GATE: comprobado antes de Phase 0 y de nuevo tras el diseño de Phase 1.*

| Principio | Cómo lo cumple este plan | Estado |
|-----------|--------------------------|--------|
| **I. Núcleo compartido en TypeScript puro** | Todo el dominio (esquema, carga, acceso, búsqueda, localización de textos) vive en `src/core/content/` y no importa `react`, `react-native` ni `expo-*`. El acceso a imágenes, que sí necesita `require` de Metro, queda fuera del núcleo tras la interfaz `ImageResolver`. Un test comprueba que el núcleo se importa y se ejercita en Node. | ✅ |
| **II. Serverless y cliente-primero** | Cero servidores y cero servicios nuevos. El contenido se empaqueta con la app, así que la función principal funciona sin red por construcción. | ✅ |
| **III. Testing por feature** | Tests unitarios del esquema, la degradación, la proyección de acceso, el filtrado por etiquetas y la localización de textos; tests de aceptación sobre la API pública con el catálogo y las imágenes reales; validador ejecutable en CI. Las cuatro situaciones de acceso exigidas por el principio III se cubren en la medida en que aplican a esta feature (sin compra / con compra); las de restauración y estado indeterminable pertenecen a la feature de titularidad. | ✅ con nota |
| **IV. Firebase como plano de observabilidad** | No se añade telemetría en esta feature. Tampoco se añade ningún SDK alternativo. Las piezas descartadas por inválidas se registran tras una interfaz de log del núcleo, lista para conectarse a Crashlytics después. | ✅ |
| **V. Paridad funcional** | Un único catálogo y un único núcleo para ambas plataformas; ninguna bifurcación `Platform.select` ni sufijo `.ios`/`.android`. | ✅ |
| **VI. Freemium de compra única** | La marca de acceso vive en datos (FR-029). La decisión "¿puede verse esto?" se concentra en `src/core/content/access.ts` y se materializa en tipos distintos, de modo que ninguna pantalla pueda replicarla. Toda pieza sin marca legible se trata como de pago. El almacén local no guarda imágenes en detalle de pago (D-003). | ✅ |
| **Restricciones tecnológicas** | Una dependencia nueva, justificada en D-002. `strict` activado, sin `any` ni `@ts-ignore`. Esquema de contenido versionado con degradación elegante ante campos desconocidos o ausentes, y trato de "premium" ante marca ilegible. | ✅ |
| **Flujo y puertas de calidad** | Spec → plan → tasks antes de implementar. La validación del catálogo se añade como paso de CI junto a tipos, lint y tests. Commits `feat:`/`fix:`. | ✅ |

**Resultado del gate (pre-Phase 0)**: pasa, con una desviación registrada en Complexity
Tracking (forma de los tests de aceptación).

**Resultado del gate (post-Phase 1)**: pasa. El diseño de [data-model.md](./data-model.md) y
[contracts/](./contracts/) no introduce dependencias, servicios ni bifurcaciones de plataforma
adicionales, y concentra el acceso en un único módulo. La desviación sigue siendo la misma y
no ha crecido.

## Project Structure

### Documentation (this feature)

```text
specs/002-content-data-schema/
├── plan.md              # Este fichero
├── research.md          # Decisiones técnicas (D-001…D-010)
├── data-model.md        # Entidades, campos, reglas de validación
├── quickstart.md        # Cómo verificar la feature extremo a extremo
├── contracts/
│   ├── catalog-schema.md    # Contrato del JSON de contenido
│   ├── core-api.md          # API pública del núcleo de contenido
│   └── image-store.md       # Convención de almacenamiento de los JPG
├── checklists/
│   └── requirements.md
└── tasks.md             # Lo genera /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── core/                         # TypeScript puro. Sin React, sin React Native, sin SDKs.
│   └── content/
│       ├── schema.ts             # Esquemas Zod + tipos derivados
│       ├── catalog.ts            # Carga, validación y degradación elegante
│       ├── access.ts             # Marca de acceso y proyección de vista previa
│       ├── localize.ts           # Resolución de textos con fallback a español
│       ├── query.ts              # Búsqueda por texto y filtrado por etiqueta
│       ├── images.ts             # Interfaz ImageResolver y referencias de imagen
│       └── index.ts              # Superficie pública del módulo
├── content/
│   └── catalog.json              # El catálogo (semilla: 5 localizaciones, 5 consejos)
└── platform/
    └── images/
        └── registry.ts           # require() estáticos de Metro. Implementa ImageResolver.

assets/content/photos/
├── debod/{thumb,detail}.jpg
├── castilla/{thumb,detail}.jpg
├── torres/{thumb,detail}.jpg
├── sol/{thumb,detail}.jpg
└── mayor/{thumb,detail}.jpg

scripts/
├── validate-catalog.ts           # Validación publicable, ejecutable en CI
└── generate-placeholder-photos.py # Genera los JPG de marcador (uso local, una vez)

__tests__/
├── App.test.tsx                  # De la feature 001
└── content/
    ├── schema.test.ts            # Validación y degradación
    ├── access.test.ts            # Gratuito/pago y proyección de vista previa
    ├── query.test.ts             # Búsqueda y filtrado por etiquetas
    ├── localize.test.ts          # Fallback de idioma
    └── catalog.acceptance.test.ts # API pública contra el catálogo y las imágenes reales
```

**Structure Decision**: se introduce `src/` con la separación que exige el principio I:
`src/core/` es dominio puro y `src/platform/` es todo lo que toca Metro o React Native. El
`App.tsx` de la raíz se queda donde está (esta feature no lo toca). Las imágenes van bajo
`assets/`, junto a los iconos ya existentes, en un subdirectorio propio `content/` para que
nunca se confundan con los assets de marca de la app.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Tests de aceptación sobre la API pública del núcleo en lugar de renderizado con React Native Testing Library (principio III) | La feature no entrega ninguna pantalla: sus escenarios de usuario son de datos, y el "usuario" de la spec es el desarrollador que edita el catálogo. Los tests ejercitan el flujo completo real —JSON en disco, validación, proyección, resolución de imágenes— sin dobles. | Renderizar una pantalla de prueba desechable solo para cumplir la letra del principio produciría un test que no verifica ningún comportamiento de producto y código que habría que borrar en la feature siguiente. La primera feature de UI que consuma el catálogo traerá sus tests con RNTL. |
