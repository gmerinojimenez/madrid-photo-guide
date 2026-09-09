# Phase 1 — Data Model: Esqueleto de aplicación multiplataforma

**Feature**: `001-app-skeleton-ci` | **Date**: 2026-09-04

## Entidades de dominio

**Ninguna.**

Esta feature no introduce entidades, ni persistencia, ni esquema de datos. La spec lo
declara explícitamente en su sección Key Entities, y FR-014 excluye el contenido de la guía
de esta entrega. La app arranca hasta una pantalla vacía y no lee ni escribe nada.

Documentar esto de forma expresa —en lugar de omitir el artefacto— evita que una fase
posterior interprete su ausencia como un olvido.

## Estado en tiempo de ejecución

El único estado que existe es el que el propio sistema operativo y React Native ya
gestionan: el ciclo de vida de la app y la apariencia clara u oscura del sistema, leída con
`useColorScheme()` para elegir el color de fondo. No hay estado propio de aplicación, ni
store, ni contexto de React para dominio.

Esto es deliberado: introducir un store vacío "para tenerlo" fijaría hoy una decisión de
arquitectura de estado sin ningún caso de uso que la valide. Cuando el principio I exija un
núcleo de dominio en TypeScript puro, ese núcleo nacerá con la primera entidad real
(localización fotográfica), no antes.

## Configuración (no es dominio, pero se versiona)

Los siguientes valores son configuración de la app, viven en `app.json`/`package.json`, y
ninguna otra parte del proyecto debe redefinirlos:

| Valor | Dónde vive | Contenido |
|---|---|---|
| Nombre visible / slug | `app.json` (`expo.name`, `expo.slug`) | `Madrid Photo Guide` / `madrid-photo-guide` |
| Android `package` | `app.json` (`expo.android.package`) | `com.gmj.madridphotoguide` |
| iOS `bundleIdentifier` | `app.json` (`expo.ios.bundleIdentifier`) | `com.gmj.madridphotoguide` |
| Versiones del toolchain | `package.json` | ver [research.md](./research.md) D-002 |
| Reglas de ESLint/Prettier | `eslint.config.js`, `.prettierrc` | ver [research.md](./research.md) D-004 |

## Evolución prevista

La primera entidad real (la localización fotográfica de la guía, con su marca de acceso
gratuito o premium) llegará con la feature de contenido, y con ella el primer módulo del
núcleo de dominio en TypeScript puro que exige el principio I. Cuando llegue, la
constitución exige que su esquema se versione y que el cliente degrade con elegancia ante
campos desconocidos, tratando como premium cualquier pieza sin marca de acceso legible.
