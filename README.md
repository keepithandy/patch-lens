# PatchLens

**Test builds. Capture defects. Ship with confidence.**

PatchLens is a mobile-first quality-assurance companion for browser games and web applications. It turns informal testing notes into structured test sessions, reproducible defect reports, regression records, and developer-ready repair prompts.

The prototype is designed for testing projects such as **DungeonDex**, **Alchemy Game**, **Catalyst**, and future Keepithandy applications from desktop or mobile devices.

## Prototype status

**Current baseline:** `v0.1.0`

PatchLens is in active prototype development. The first release focuses on a dependable local QA workflow before adding repository integrations or collaborative services.

## Core workflow

1. Select or register a project.
2. Start a versioned test session.
3. Record the device, browser, objective, and build information.
4. Complete the release-readiness checklist.
5. Capture defects with evidence and reproduction steps.
6. Export a Markdown report or constrained Codex repair prompt.
7. Re-test the next build and track regressions.

## v0.1.0 capabilities

- Project registry with starter entries for DungeonDex, Alchemy Game, and Catalyst
- Versioned test sessions with device, browser, and objective metadata
- Mobile release-readiness checklist
- Pass, fail, and not-applicable checklist states
- Structured defect capture with:
  - severity
  - affected component
  - expected behavior
  - actual behavior
  - reproduction steps
  - optional screenshot evidence
- Regression tracking with open, fixed, and reopened states
- Markdown QA report generation
- Codex-ready repair prompt generation
- LocalStorage persistence
- JSON backup and restoration
- Dependency-free browser architecture
- Offline-capable progressive web app shell

## Why PatchLens exists

Mobile and browser testing often produces useful feedback in an unstructured form: screenshots, short observations, remembered reproduction steps, and disconnected messages. That makes defects harder to reproduce and creates ambiguity during repairs.

PatchLens standardizes that process while keeping the tester close to the actual build. Its reports are intended to answer four questions clearly:

- What build was tested?
- What environment reproduced the problem?
- What exactly happened?
- What is the safest repair scope?

## Technology

PatchLens v0.1.0 deliberately uses a minimal stack:

- HTML
- CSS
- Vanilla JavaScript
- LocalStorage
- Web app manifest and service worker support

There is no package manager, framework, build pipeline, backend, account system, telemetry service, or external API in the initial prototype.

## Running locally

PatchLens has no build step.

### PowerShell

```powershell
cd patch-lens
python -m http.server 8080
```

Open `http://localhost:8080` in a browser.

Opening `index.html` directly supports the core application, but offline caching and service-worker behavior require a local web server or deployed HTTPS environment.

## Data and privacy

Prototype data remains in the current browser under the LocalStorage key:

```text
patchlens.state.v1
```

Use the JSON export feature before clearing browser data, changing devices, or replacing a test installation.

PatchLens v0.1.0 does not transmit test records, screenshots, project names, or reports to an external service.

## Guardrails

- No automatic GitHub writes in v0.1.0
- No backend or authentication
- No telemetry or analytics
- No destructive changes to tested applications
- Screenshot attachments are size-limited to reduce LocalStorage exhaustion
- Generated repair prompts should preserve the tested project's own gameplay, save, economy, and compatibility guardrails
- PatchLens reports support release decisions but do not replace project-specific automated tests

## Roadmap

### v0.2 — Test workflow expansion

- Editable checklist templates
- Defect deduplication
- Regression linking across builds
- Screenshot annotation
- Improved report filters
- PWA icon and install-metadata polish

### v0.3 — Repository-aware reporting

- Explicit GitHub repository authorization
- Issue preview before submission
- Repository and release metadata import
- Commit and branch references
- Read-only validation status display

### v0.4 — Extended QA workspace

- Cross-device test matrices
- Saved project-specific QA profiles
- Release comparison reports
- Historical defect analytics
- Optional collaboration architecture review

## Development principles

PatchLens development should remain narrow, evidence-based, and testable:

- Preserve working local data between updates.
- Prefer additive schema changes with migration coverage.
- Keep mobile usability as a release requirement.
- Never submit external changes without explicit user review.
- Separate observations from verified defects.
- Generate repair prompts that state scope, evidence, guardrails, and validation requirements.

## Project identity

**Name:** PatchLens  
**Repository:** `keepithandy/patch-lens`  
**Tagline:** *Test builds. Capture defects. Ship with confidence.*
