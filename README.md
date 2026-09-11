<div align="center">

# 🚀 ApuLab Station

### Interactive 3D STEM Learning Experience

**A complete web-based 3D learning game for exploring electronics, measurement, computational thinking, robotics, and scientific problem solving through hands-on missions.**

<p>
  <img src="https://img.shields.io/badge/Three.js-0.180.0-111827?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js 0.180.0" />
  <img src="https://img.shields.io/badge/TypeScript-5.9.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.9.2" />
  <img src="https://img.shields.io/badge/Vite-7.3.6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 7.3.6" />
  <img src="https://img.shields.io/badge/Supabase-Research%20Backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase research backend" />
</p>

<p>
  <img src="https://img.shields.io/badge/Mission%2001-7%2F7-49C9D7?style=for-the-badge" alt="Mission 01 - 7 of 7 levels" />
  <img src="https://img.shields.io/badge/Status-Complete-22C55E?style=for-the-badge" alt="Complete" />
  <img src="https://img.shields.io/badge/Code%20License-MIT-22C55E?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/Original%20Content-Rights%20Reserved-DC2626?style=for-the-badge" alt="Original content rights reserved" />
</p>

**Production:** https://apulab-station-game.vercel.app/

</div>

---

## 🌌 About ApuLab Station

**ApuLab Station** is an interactive 3D STEM learning experience built around exploration, experimentation, engineering decisions, and progressive technical challenges inside a research-station narrative.

The project combines a browser-based interface, Three.js scenes, mission logic, research telemetry, and a controlled study mode. The main runtime is built with **Three.js + TypeScript + Vite**, while **Supabase** provides the research backend used for study authentication, sessions, event ingestion, and participant-level analytics.

> **Project status:** complete. **Mission 01 contains seven fully integrated levels** and is deployed in production for controlled study sessions.

## 🎯 Learning Experience

ApuLab Station turns technical concepts into interactive tasks instead of presenting them only as theory. Across the mission, players observe systems, measure variables, compare evidence, build and revise command sequences, recognize patterns, use repetition, and complete a final scientific investigation.

### Mission 01 · 7 Levels

| Level | Focus | Status |
| --- | --- | --- |
| **1 · Measure** | Use a multimeter correctly and obtain a valid voltage reading | ✅ Complete |
| **2 · Compare** | Measure multiple batteries and select the appropriate option from evidence | ✅ Complete |
| **3 · Move & Orient** | Build movement sequences with forward and turn commands | ✅ Complete |
| **4 · Plan & Correct** | Revise a program after obstacles and execution failures | ✅ Complete |
| **5 · Patterns & Repeat** | Recognize repeated structure and simplify a solution with `REPEAT` | ✅ Complete |
| **6 · Scientific Operations** | Scan, analyze, reach the communication point, and send data | ✅ Complete |
| **7 · Unknown Sample** | Investigate a sample, choose the relevant instrument, and finish the mission | ✅ Complete |

The active sequence contains **seven logical levels**. The former legacy Level 3 was removed from the canonical mission and the remaining sequence was renumbered accordingly.

## 🧰 Technology Stack

| Technology | Purpose |
| --- | --- |
| **Three.js 0.180.0** | 3D rendering, cameras, worlds, characters, lighting, and effects |
| **TypeScript 5.9.2** | Game logic, state, telemetry, and typed application code |
| **Vite 7.3.6** | Development server, bundling, and production builds |
| **HTML / DOM / CSS** | HUD, menus, dialogs, overlays, forms, and accessibility |
| **Supabase** | Study authentication, sessions, telemetry ingestion, PostgreSQL storage, and analytics |
| **Vercel** | Production deployment |
| **GitHub Actions** | CI, build verification, security checks, research validation, and browser E2E |
| **Node.js** | Mission generation, patching, validation, and build tooling |

> The main runtime **does not depend on Phaser**.

## 🏗️ Architecture

```text
Browser UI / DOM
      │
      ├── MenuScreen / AccessModal / IntroOverlay
      │
      ▼
SessionService + GameState + TelemetryService
      │
      ▼
ResearchRepository
      ├── MockResearchRepository
      └── SupabaseResearchRepository

Three.js Runtime
      ├── ThreeEngine
      ├── IntroController
      ├── ApuLabWorld / MarsWorld
      ├── AYNI / Yachay / Ruth
      └── Visual and audio effects
```

The application uses a **1672 × 941 px logical stage** that scales responsively while preserving its internal coordinate system.

For a technical overview, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 📊 Research & Telemetry

Study mode uses anonymous participant identifiers and records behavioral telemetry required for analysis, including:

- session start and completion;
- level start and completion;
- attempts and time-to-goal;
- measurement actions;
- battery comparison and selection;
- programming edits and executions;
- collisions and explicit failures;
- pattern recognition and `REPEAT` usage;
- scientific scan/analyze/send actions;
- instrument selection in the final level;
- derived participant-level metrics for Levels 1–7.

The research pipeline separates **DEMO**, **QA**, and official **STUDY** data and validates build version, commit SHA, schema version, protocol version, and study assignment before accepting official sessions.

## 🔐 Security & Privacy

The research architecture is designed to avoid storing participant PII in gameplay telemetry.

Key controls include:

- credentials are verified server-side;
- participant codes and passwords are not stored as plaintext in research telemetry;
- passwords are stored as PBKDF2 hashes;
- participant codes are represented by server-side hashes;
- the Supabase service-role key never reaches the browser;
- telemetry payloads reject PII and credential fields;
- event types and payload sizes are allowlisted and validated server-side;
- official study sessions are bound to the expected production build and Git commit;
- research tables are protected from direct anonymous browser access;
- CORS uses an explicit origin allowlist;
- queued events are synchronized in bounded batches with idempotency protections.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the current security model.

## 💻 Local Development

### Requirements

```text
Node.js ^20.19.0 || >=22.12.0
```

### Install

```bash
npm install
```

### Development server

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

The build pipeline reconstructs the canonical Mission 01 assets, applies the approved gameplay patches, validates the seven-level contract, checks generated JavaScript syntax, and verifies mission integrity before Vite produces the final bundle.

## 📂 Repository Structure

```text
ApuLabStationGame/
├── .github/workflows/   # CI, security, E2E, and research validation
├── docs/                # Architecture, security, UI, and research documentation
├── public/              # Public assets
├── scripts/             # Mission generation, patching, audits, and build checks
├── src/
│   ├── app/             # Application flow
│   ├── config/          # Shared runtime configuration
│   ├── missions/        # Canonical Mission 01 sources
│   ├── research/        # Research telemetry definitions
│   ├── story/           # Narrative and introduction
│   ├── styles/          # Visual system and UI styles
│   ├── systems/         # Session, synchronization, telemetry, repositories
│   ├── three/           # Three.js engine, characters, worlds, and effects
│   └── ui/              # DOM UI components
├── supabase/            # Edge Function, migrations, analytics, and SQL tests
├── tests/               # Browser E2E and research contract tests
└── vite.config.ts       # Production/runtime configuration
```

## 🚀 Deployment

The production application is deployed on Vercel:

**https://apulab-station-game.vercel.app/**

Production builds use Supabase study mode and bind official research sessions to the deployed Git commit. Preview deployments are treated separately from official study data.

## 📜 Licensing & Intellectual Property

This repository uses different licensing rules depending on the type of material:

1. **Project source code:** distributed under the **MIT License**. See [`LICENSE`](LICENSE).
2. **Original visual identity, illustrations, characters, narrative, dialogs, educational content, mission design, models, textures, audio, and other original assets:** **all rights reserved**, unless a specific file states otherwise. See [`CONTENT-LICENSE.md`](CONTENT-LICENSE.md).
3. **ApuLab / ApuLab Station names, logos, and distinctive brand elements:** the MIT License **does not grant trademark or brand-identity rights**. See [`BRAND_POLICY.md`](BRAND_POLICY.md).
4. **Third-party dependencies and media:** remain under their respective licenses. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## 🤝 Contributing

Before submitting code, content, or assets, read [`CONTRIBUTING.md`](CONTRIBUTING.md).

Do not commit secrets, participant credentials, private datasets, personal information, or real `.env` files.

## 📌 Notices

See [`NOTICE.md`](NOTICE.md) for repository-wide licensing and rights notices.

---

<div align="center">

**ApuLab Station · Explore · Learn · Build · Investigate**

</div>
