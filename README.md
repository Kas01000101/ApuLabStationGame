<div align="center">

# ApuLab Station

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
  <img src="https://img.shields.io/badge/Open%20Source-Yes-22C55E?style=for-the-badge" alt="Open Source" />
  <img src="https://img.shields.io/badge/Code-MIT-22C55E?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/Content-CC%20BY%204.0-3B82F6?style=for-the-badge" alt="CC BY 4.0" />
</p>

**Production:** https://apulab-station-game.vercel.app/

</div>

---

## About ApuLab Station

**ApuLab Station** is an interactive 3D STEM learning experience built around exploration, experimentation, engineering decisions, and progressive technical challenges inside a research-station narrative.

The project combines a browser-based interface, Three.js scenes, mission logic, research telemetry, and a controlled study mode. The main runtime is built with **Three.js + TypeScript + Vite**, while **Supabase** provides the research backend used for study authentication, sessions, event ingestion, and participant-level analytics.

**Project status:** complete. **Mission 01 contains seven fully integrated levels** and is deployed in production for controlled study sessions.

## Learning Experience

ApuLab Station turns technical concepts into interactive tasks instead of presenting them only as theory. Across the mission, players observe systems, measure variables, compare evidence, build and revise command sequences, recognize patterns, use repetition, and complete a final scientific investigation.

### Mission 01: 7 Levels

| Level | Focus | Status |
| --- | --- | --- |
| **1 · Measure** | Use a multimeter correctly and obtain a valid voltage reading | Complete |
| **2 · Compare** | Measure multiple batteries and select the appropriate option from evidence | Complete |
| **3 · Move & Orient** | Build movement sequences with forward and turn commands | Complete |
| **4 · Plan & Correct** | Revise a program after obstacles and execution failures | Complete |
| **5 · Patterns & Repeat** | Recognize repeated structure and simplify a solution with `REPEAT` | Complete |
| **6 · Scientific Operations** | Scan, analyze, reach the communication point, and send data | Complete |
| **7 · Unknown Sample** | Investigate a sample, choose the relevant instrument, and finish the mission | Complete |

The active sequence contains **seven logical levels**. The former legacy Level 3 was removed from the canonical mission and the remaining sequence was renumbered accordingly.

## Technology Stack

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

The main runtime **does not depend on Phaser**.

## Architecture

```text
Browser UI / DOM
      |
      |-- MenuScreen / AccessModal / IntroOverlay
      |
      v
SessionService + GameState + TelemetryService
      |
      v
ResearchRepository
      |-- MockResearchRepository
      `-- SupabaseResearchRepository

Three.js Runtime
      |-- ThreeEngine
      |-- IntroController
      |-- ApuLabWorld / MarsWorld
      |-- AYNI / Yachay / Ruth
      `-- Visual and audio effects
```

The application uses a **1672 × 941 px logical stage** that scales responsively while preserving its internal coordinate system.

For a technical overview, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Research and Telemetry

Study mode uses anonymous participant identifiers and records behavioral telemetry required for analysis, including session and level lifecycle events, attempts, time-to-goal, measurement actions, battery comparison, programming actions, collisions, pattern recognition, `REPEAT` usage, scientific actions, final instrument selection, and derived participant-level metrics.

The research pipeline separates **DEMO**, **QA**, and official **STUDY** data and validates build version, commit SHA, schema version, protocol version, and study assignment before accepting official sessions.

## Security and Privacy

The research architecture is designed to avoid storing participant PII in gameplay telemetry.

Key controls include server-side credential verification, hashed participant identifiers and credentials, browser isolation from service-role secrets, payload validation, event allowlists, bounded synchronization, build/commit binding for official study sessions, direct-access restrictions on research tables, and explicit CORS origin allowlists.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the current security model.

## Local Development

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

## Repository Structure

```text
ApuLabStationGame/
|-- .github/workflows/   # CI, security, E2E, and research validation
|-- docs/                # Architecture, security, UI, and research documentation
|-- public/              # Public assets
|-- scripts/             # Mission generation, patching, audits, and build checks
|-- src/
|   |-- app/             # Application flow
|   |-- config/          # Shared runtime configuration
|   |-- missions/        # Canonical Mission 01 sources
|   |-- research/        # Research telemetry definitions
|   |-- story/           # Narrative and introduction
|   |-- styles/          # Visual system and UI styles
|   |-- systems/         # Session, synchronization, telemetry, repositories
|   |-- three/           # Three.js engine, characters, worlds, and effects
|   `-- ui/              # DOM UI components
|-- supabase/            # Edge Function, migrations, analytics, and SQL tests
|-- tests/               # Browser E2E and research contract tests
`-- vite.config.ts       # Production/runtime configuration
```

## Deployment

The production application is deployed on Vercel:

**https://apulab-station-game.vercel.app/**

Production builds use Supabase study mode and bind official research sessions to the deployed Git commit. Preview deployments are treated separately from official study data.

## Open Source

ApuLab Station is an **open-source and open-content project**.

- **Software source code:** MIT License. See [`LICENSE`](LICENSE).
- **Original non-code content and assets:** Creative Commons Attribution 4.0 International (**CC BY 4.0**). See [`CONTENT-LICENSE.md`](CONTENT-LICENSE.md).
- **Third-party materials:** retain their original licenses. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
- **Brand names and trademark rights:** remain separate from copyright licensing. See [`BRAND_POLICY.md`](BRAND_POLICY.md).

You may fork, modify, redistribute, and build on the project subject to the applicable license and attribution requirements.

For the repository-wide policy, see [`OPEN_SOURCE.md`](OPEN_SOURCE.md).

## Contributing

Contributions are welcome. Before submitting code, content, or assets, read [`CONTRIBUTING.md`](CONTRIBUTING.md).

Do not commit secrets, participant credentials, private datasets, personal information, or real `.env` files.

## Notices

See [`NOTICE.md`](NOTICE.md) for repository-wide licensing notices.

---

<div align="center">

**ApuLab Station · Explore · Learn · Build · Investigate**

</div>
