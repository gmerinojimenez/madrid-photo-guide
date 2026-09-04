# Phase 1 — Data Model: Esqueleto de aplicación multiplataforma

**Feature**: `001-app-skeleton-ci` | **Date**: 2026-09-01

## Entidades de dominio

**Ninguna.**

Esta feature no introduce entidades, ni persistencia, ni esquema de datos. La spec lo
declara explícitamente en su sección Key Entities, y FR-014 excluye el contenido de la guía
de esta entrega. La app arranca hasta una pantalla vacía y no lee ni escribe nada.

Documentar esto de forma expresa —en lugar de omitir el artefacto— evita que una fase
posterior interprete su ausencia como un olvido.

## Estado en tiempo de ejecución

El único estado que existe es el que el sistema operativo ya gestiona: el ciclo de vida del
host (`Activity` en Android, `UIViewController` en iOS) y la apariencia clara u oscura del
sistema, que la pantalla observa para elegir el color de fondo. No hay estado propio de la
aplicación, ni state holder, ni ViewModel.

Esto es deliberado: introducir un ViewModel vacío "para tenerlo" fijaría hoy una decisión de
arquitectura de presentación sin ningún caso de uso que la valide.

## Configuración (no es dominio, pero se versiona)

Los siguientes valores son configuración de build, viven en el version catalog o en los
ficheros de build, y ninguna otra parte del proyecto debe redefinirlos:

| Valor | Dónde vive | Contenido |
|---|---|---|
| Application ID / Bundle ID | `composeApp/build.gradle.kts` e `Info.plist` | `com.gmj.madridphotoguide` |
| Nombre visible | recursos Android e `Info.plist` | `Madrid Photo Guide` |
| Versiones del toolchain | `gradle/libs.versions.toml` | ver [research.md](./research.md) D-002 |
| Nombre base del framework iOS | `composeApp/build.gradle.kts` | ver [contracts/build-interface.md](./contracts/build-interface.md) |

## Evolución prevista

La primera entidad real (la localización fotográfica de la guía, con su marca de acceso
gratuito o premium) llegará con la feature de contenido. Cuando llegue, la constitución
exige que su esquema se versione y que el cliente degrade con elegancia ante campos
desconocidos, tratando como premium cualquier pieza sin marca de acceso legible.
