# ApuLab Station

**ApuLab Station** es una experiencia educativa interactiva en 3D orientada al aprendizaje de conceptos STEM mediante narrativa, exploración, medición, diagnóstico y resolución de retos técnicos dentro de una estación de investigación.

El proyecto combina una interfaz web, escenas 3D y misiones progresivas. El runtime principal está construido con **Three.js + TypeScript + Vite**.

> Estado del proyecto: **en desarrollo activo**. La Misión 01 está estructurada en 8 niveles; actualmente están integrados y verificados los niveles 1, 2 y 3.

## Objetivo del proyecto

ApuLab Station busca convertir conceptos técnicos en experiencias prácticas y comprensibles. En lugar de presentar únicamente teoría, cada misión propone observar, medir, comparar, detectar fallas y tomar decisiones dentro de una narrativa interactiva.

## Tecnologías utilizadas

| Tecnología | Uso actual |
| --- | --- |
| **Three.js 0.180.0** | Renderizado 3D, cámaras, iluminación, objetos y escenas |
| **TypeScript 5.9.2** | Lógica del juego y tipado del código |
| **Vite 7.3.6** | Desarrollo, empaquetado y build de producción |
| **HTML / DOM / CSS** | HUD, menús, diálogos, overlays y accesibilidad |
| **Node.js** | Scripts de build y verificación de integridad |
| **Supabase** | Infraestructura prevista para estudio, sesión y telemetría |
| **GitHub Actions** | Integración continua, seguridad y verificación de build |

El runtime principal no depende de Phaser.

## Arquitectura

- **Three.js:** mundos, personajes, cámaras, efectos y elementos interactivos.
- **UI DOM/CSS:** menú, acceso, diálogos, HUD, overlays y controles.
- **Missions:** contenido jugable generado y validado durante el build.
- **Systems:** sesión, telemetría offline-first y sincronización.
- **Research repositories:** separación de flujos DEMO/STUDY y adaptadores de persistencia.

El stage lógico de la aplicación es **1672 × 941 px** y se escala de manera responsiva sin cambiar sus dimensiones internas.

Más detalles: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Estado de Misión 01

- ✅ Nivel 1 — `1 / 8`
- ✅ Nivel 2 — `2 / 8`
- ✅ Nivel 3 — `3 / 8`
- ⏳ Niveles 4–8 — todavía no publicados

El build reconstruye los niveles disponibles y valida su integridad mediante SHA-256 antes de generar la aplicación de producción.

## Seguridad

El proyecto incluye controles para evitar secretos en el cliente, separar DEMO/STUDY y manejar telemetría con una arquitectura offline-first.

Consulta la política técnica actual en [`docs/SECURITY.md`](docs/SECURITY.md).

## Desarrollo local

Requisitos de Node.js:

```text
^20.19.0 || >=22.12.0
```

Instalación y ejecución:

```bash
npm install
npm run dev
```

Build de producción:

```bash
npm run build
```

## Licencias y propiedad intelectual

Este repositorio utiliza un **esquema de licencias por tipo de material**:

1. **Código fuente del proyecto:** se distribuye bajo la **MIT License**. Consulta [`LICENSE`](LICENSE).
2. **Identidad visual, ilustraciones, personajes, narrativa, diálogos, contenido educativo, diseño de misiones, modelos, texturas, audio y otros assets originales:** **todos los derechos reservados**, salvo que un archivo indique expresamente otra licencia. Consulta [`CONTENT-LICENSE.md`](CONTENT-LICENSE.md).
3. **Nombre, logotipos y elementos distintivos de ApuLab / ApuLab Station:** la MIT License **no concede derechos de marca ni de identidad comercial**. Consulta [`BRAND_POLICY.md`](BRAND_POLICY.md).
4. **Dependencias de terceros:** mantienen sus respectivas licencias. Consulta [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

### Importante sobre MIT

La licencia MIT permite usar, copiar, modificar, distribuir, sublicenciar y vender copias del **código cubierto por MIT**, siempre que se conserve el aviso de copyright y la licencia correspondiente. Los derechos reservados indicados en este repositorio se aplican a los materiales que **no** están cubiertos por MIT.

## Contribuciones

Antes de enviar código, contenido o assets, revisa [`CONTRIBUTING.md`](CONTRIBUTING.md). No se deben incorporar materiales de terceros sin autorización o sin una licencia compatible y documentada.

## Avisos

Consulta [`NOTICE.md`](NOTICE.md) para la delimitación de derechos y avisos generales del proyecto.
