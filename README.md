<div align="center">

# 🚀 ApuLab Station

### Interactive 3D STEM Learning Experience

**Una experiencia educativa interactiva en 3D para aprender conceptos STEM mediante exploración, medición, diagnóstico y resolución de retos técnicos.**

<p>
  <img src="https://img.shields.io/badge/Three.js-0.180.0-111827?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js 0.180.0" />
  <img src="https://img.shields.io/badge/TypeScript-5.9.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.9.2" />
  <img src="https://img.shields.io/badge/Vite-7.3.6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 7.3.6" />
</p>

<p>
  <img src="https://img.shields.io/badge/Mission%2001-3%2F8-8E7DCE?style=for-the-badge" alt="Mission 01 - 3 of 8 levels" />
  <img src="https://img.shields.io/badge/Status-Active%20Development-F4C75E?style=for-the-badge" alt="Active development" />
  <img src="https://img.shields.io/badge/Code%20License-MIT-22C55E?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/Original%20Content-Rights%20Reserved-DC2626?style=for-the-badge" alt="Original content rights reserved" />
</p>

</div>

---

## 🌌 Sobre ApuLab Station

**ApuLab Station** es una experiencia educativa interactiva en 3D orientada al aprendizaje de conceptos STEM mediante narrativa, exploración, medición, diagnóstico y resolución de retos técnicos dentro de una estación de investigación.

El proyecto combina una interfaz web, escenas 3D y misiones progresivas. El runtime principal está construido con **Three.js + TypeScript + Vite**.

> **Estado del proyecto:** en desarrollo activo. La **Misión 01** está estructurada en 8 niveles; actualmente están integrados y verificados los niveles **1, 2 y 3**.

## 🎯 Objetivo del proyecto

ApuLab Station busca convertir conceptos técnicos en experiencias prácticas y comprensibles. En lugar de presentar únicamente teoría, cada misión propone que la persona participante pueda:

- observar el entorno;
- explorar sistemas y componentes;
- medir variables;
- comparar resultados;
- detectar fallas;
- tomar decisiones;
- resolver retos dentro de una narrativa interactiva.

## 🧰 Tecnologías utilizadas

| Tecnología | Uso actual |
| --- | --- |
| **Three.js 0.180.0** | Renderizado 3D, cámaras, iluminación, objetos y escenas |
| **TypeScript 5.9.2** | Lógica del juego y tipado del código |
| **Vite 7.3.6** | Desarrollo, empaquetado y build de producción |
| **HTML / DOM / CSS** | HUD, menús, diálogos, overlays y accesibilidad |
| **Node.js** | Scripts de build y verificación de integridad |
| **Supabase** | Infraestructura prevista para estudio, sesión y telemetría |
| **GitHub Actions** | Integración continua, seguridad y verificación de build |

> El runtime principal **no depende de Phaser**.

## 🏗️ Arquitectura

- **Three.js:** mundos, personajes, cámaras, efectos y elementos interactivos.
- **UI DOM/CSS:** menú, acceso, diálogos, HUD, overlays y controles.
- **Missions:** contenido jugable generado y validado durante el build.
- **Systems:** sesión, telemetría offline-first y sincronización.
- **Research repositories:** separación de flujos DEMO/STUDY y adaptadores de persistencia.

El stage lógico de la aplicación es **1672 × 941 px** y se escala de manera responsiva sin cambiar sus dimensiones internas.

Más detalles técnicos: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 🛰️ Estado de Misión 01

| Nivel | Estado |
| --- | --- |
| **Nivel 1** | ✅ Integrado y verificado |
| **Nivel 2** | ✅ Integrado y verificado |
| **Nivel 3** | ✅ Integrado y verificado |
| **Nivel 4** | ⏳ En desarrollo |
| **Nivel 5** | ⏳ En desarrollo |
| **Nivel 6** | ⏳ En desarrollo |
| **Nivel 7** | ⏳ En desarrollo |
| **Nivel 8** | ⏳ En desarrollo |

El build reconstruye los niveles disponibles y valida su integridad mediante **SHA-256** antes de generar la aplicación de producción.

## 🔐 Seguridad

El proyecto incluye controles para evitar secretos en el cliente, separar flujos **DEMO/STUDY** y manejar telemetría con una arquitectura **offline-first**.

Consulta la política técnica actual en [`docs/SECURITY.md`](docs/SECURITY.md).

## 💻 Desarrollo local

### Requisitos

```text
Node.js ^20.19.0 || >=22.12.0
```

### Instalación

```bash
npm install
```

### Ejecutar en desarrollo

```bash
npm run dev
```

### Build de producción

```bash
npm run build
```

### Vista previa del build

```bash
npm run preview
```

## 📂 Estructura general

```text
ApuLabStationGame/
├── public/          # Assets públicos
├── scripts/         # Scripts de generación y validación
├── src/
│   ├── app/         # Flujo principal de la aplicación
│   ├── config/      # Configuración compartida
│   ├── story/       # Narrativa e introducción
│   ├── styles/      # Sistema visual y UI
│   ├── systems/     # Sesión, sincronización y telemetría
│   ├── three/       # Motor y escenas Three.js
│   └── ui/          # Componentes de interfaz
└── docs/            # Arquitectura, seguridad y estándares
```

## 📜 Licencias y propiedad intelectual

Este repositorio utiliza un **esquema de licencias por tipo de material**:

1. **Código fuente del proyecto:** se distribuye bajo la **MIT License**. Consulta [`LICENSE`](LICENSE).
2. **Identidad visual, ilustraciones, personajes, narrativa, diálogos, contenido educativo, diseño de misiones, modelos, texturas, audio y otros assets originales:** **todos los derechos reservados**, salvo que un archivo indique expresamente otra licencia. Consulta [`CONTENT-LICENSE.md`](CONTENT-LICENSE.md).
3. **Nombre, logotipos y elementos distintivos de ApuLab / ApuLab Station:** la MIT License **no concede derechos de marca ni de identidad comercial**. Consulta [`BRAND_POLICY.md`](BRAND_POLICY.md).
4. **Dependencias de terceros:** mantienen sus respectivas licencias. Consulta [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

### Importante sobre MIT

La licencia MIT permite usar, copiar, modificar, distribuir, sublicenciar y vender copias del **código cubierto por MIT**, siempre que se conserve el aviso de copyright y la licencia correspondiente.

Los derechos reservados indicados en este repositorio se aplican a los materiales que **no** están cubiertos por MIT.

## 🤝 Contribuciones

Antes de enviar código, contenido o assets, revisa [`CONTRIBUTING.md`](CONTRIBUTING.md).

No se deben incorporar materiales de terceros sin autorización o sin una licencia compatible y documentada.

## 📌 Avisos

Consulta [`NOTICE.md`](NOTICE.md) para la delimitación de derechos y avisos generales del proyecto.

---

<div align="center">

**ApuLab Station · STEM learning through exploration and interactive 3D missions**

</div>
