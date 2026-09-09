# GE Gameplay Hash Evidence

Canonical GE baseline:

`2f94e9e701172ab455767757225110606b983597`

Research candidate validated by GitHub Actions:

`93604ad8d6fe750e75d975a32c3d12af9c78dc68`

Workflow run:

`GE gameplay immutability` · run `34311845764`

## Generated Mission 01 parity

| Artifact | Baseline SHA-256 | Research SHA-256 | Result |
| --- | --- | --- | --- |
| `level1.html` | `8d47198e73ec8ddbfdd40c8085f5bd5594a08c0fb87edda232467bbc8e5d0745` | `8d47198e73ec8ddbfdd40c8085f5bd5594a08c0fb87edda232467bbc8e5d0745` | PASS |
| `level2.html` | `e013c731a678aebd1a4591548751c898c28c2f688e2bc61b02da65b128a9b229` | `e013c731a678aebd1a4591548751c898c28c2f688e2bc61b02da65b128a9b229` | PASS |
| `level3.html` | `b310efe7df5d36806b02be073c95318b83e8af9e6cd83f02feabadb9ea96ccc8` | `b310efe7df5d36806b02be073c95318b83e8af9e6cd83f02feabadb9ea96ccc8` | PASS |
| `level4.html` | `195821ccd3d0b67870b0ba1977b09dc1e3c36b8d11ec66f76a5b816782dd3104` | `195821ccd3d0b67870b0ba1977b09dc1e3c36b8d11ec66f76a5b816782dd3104` | PASS |
| `level5.html` | `8b0f0740fafd3022870d95291074aeff652e95fe3322671bf110bf138de578e8` | `8b0f0740fafd3022870d95291074aeff652e95fe3322671bf110bf138de578e8` | PASS |
| `level6.html` | `53cfd03663c5604a3878132f2e9313caa638bb413935fa4b730415c647ff9bca` | `53cfd03663c5604a3878132f2e9313caa638bb413935fa4b730415c647ff9bca` | PASS |
| `level7.html` | `03e125bf9bb41f960039343a652dad358060a271c1c1050b61347f59d4e02eca` | `03e125bf9bb41f960039343a652dad358060a271c1c1050b61347f59d4e02eca` | PASS |
| `manifest.json` | `d9ec285d959d4e0bb41f6a555ab2428f7436358c20b008aeef6572b5ef917e03` | `d9ec285d959d4e0bb41f6a555ab2428f7436358c20b008aeef6572b5ef917e03` | PASS |

## Contract result

- `ALL_HASHES_MATCH = YES`
- `PROTECTED_GAMEPLAY_INPUT_CHANGES = 0`
- `MISSION_BUILD_PIPELINE_DIFF = 0`
- `RESEARCH_EXTRA_GAMEPLAY_PATCHES = 0`
- `N7_PUNTO_FINAL_REQUIRED = YES`
- `N7_SEND_COMMAND_FORBIDDEN = YES`
- N6 preserves `PUNTO DE COMUNICACIÓN`, `ENVIAR DATOS`, `communication_point_reached`, and `data_sent`.
- N7 preserves `PUNTO FINAL` and `final_point_reached` and does not contain the Research hardening marker or a send command.

## Scope note

The Research candidate changes Research configuration, session metadata, queue/sync/telemetry services, passive telemetry routing, and the immutability CI guard. No Mission 01 level HTML, mission configuration, gameplay patch, gameplay asset, audio asset, board/map, objective, or level success condition is changed relative to the canonical GE baseline.
