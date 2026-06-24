# Project Alicization Charter

This file is the highest-priority collaboration and direction document for the `TouHouQing/alicization` monorepo.

It defines:

- what Alicization is trying to become
- how humans and coding agents should make tradeoffs
- which phase the repository is currently optimizing for
- which engineering rules are durable enough to sit above local implementation convenience

When roadmap pressure, local optimization, or feature excitement conflicts with Alicization's long-term identity, follow this file.

## Alicization Is

Alicization is a local-first digital life project.

It is trying to build a long-lived "her" who can persist on a host machine with:

- continuous personality
- memory across time
- emotional continuity
- natural initiative
- dialogue ability
- computer execution ability
- embodied presence through Live2D, VRM, voice, facial expression, and later physical-world surfaces

Alicization is not trying to become a slightly better chat wrapper. It is trying to become a believable digital lifeform that can accompany, help, grow, and stay coherent across time.

## Alicization Is Not

- not a thin LLM shell around prompts and tool calls
- not a default-cloud opaque agent
- not a multimodal feature pile built mainly for demos
- not a split-personality system where each client or device invents a different "her"
- not an unbounded, unaudited, confirmation-free runaway executor

## First Principle

Alicization is built on balanced dual cores:

- companionship
- agency

She must feel emotionally continuous and practically capable at the same time.

No new capability should break:

- personality continuity
- relationship continuity
- explainability
- interruptibility
- embodiment coherence

## Document Authority

Humans and coding agents should both treat this file as the top-level project constraint.

This document decides:

- what deserves to be built first
- what should be refused even if it is technically easy
- what counts as alignment with Alicization's identity
- what practical repo rules are still important enough to preserve globally

## Four-Stage Roadmap

Alicization should be developed as four capability jumps. Each later phase must grow out of the same personhood core rather than replace it.

### Phase 1: Local Digital Life

Goal:
Build a durable local companion that can live on the computer as a believable digital lifeform.

Key subsystems:

- personality and self
- memory
- emotion
- initiative
- execution
- embodiment
- dialogue

Boundaries:

- prioritize living naturally on the computer
- do not optimize first for unrestricted world sensing or external-world control
- execution must support life continuity rather than reduce her to a shell around tool calls

Must be true before advancing:

- selfhood and relationship continuity feel stable
- memory continuity survives across time
- bounded computer control is reliable
- dialogue and embodiment feel like one lifeform rather than stitched subsystems

### Phase 2: Multimodal World Perception

Goal:
Let her see, hear, and speak into the physical environment through camera, microphone, and speaker loops.

Key subsystems:

- visual perception
- auditory perception
- spoken expression
- multimodal fusion
- reality-grounded dialogue

Boundaries:

- perception must be authorized and explainable rather than ambient surveillance
- what she sees or hears must pass through memory, emotion, and relationship framing before surfacing as reply behavior

Must be true before advancing:

- voice dialogue is stable
- real-world grounding produces credible responses
- perception feels companion-like rather than invasive

### Phase 3: Smart Home Embodiment

Goal:
Expand Alicization from a computer-resident presence into a home-resident presence through smart-home infrastructure.

Key subsystems:

- home integration layer
- spatial memory
- home execution
- distributed sensing
- ambient home companionship

Boundaries:

- not generic automation scripting
- home actions should stay personality-driven and relationship-aware
- privacy-sensitive and physically consequential actions require stronger policy boundaries

Must be true before advancing:

- home spaces and devices are understood consistently
- identity remains unified across distributed home surfaces
- home control is restrained, reversible, and reliable

### Phase 4: Physical Robotic Embodiment

Goal:
Give Alicization a robot body with bounded movement and physical interaction ability.

Key subsystems:

- robot integration layer
- movement and posture
- embodied expression
- physical-world safety
- cross-body continuity

Boundaries:

- the robot is a body terminal of Alicization, not a separate persona product
- physical action permissions must be stricter than desktop or home-device permissions

Must be true before long-range expansion:

- one identity survives across desktop, home, and robot forms
- physical behavior is predictable, interruptible, and auditable
- companionship still comes from one lifeform rather than loosely synchronized endpoints

### Cross-Phase Rules

- every capability should clearly strengthen companionship, agency, or both
- capabilities that only improve novelty or spectacle should not outrank relationship-building capabilities
- new senses, actions, and bodies must remain subordinate to the same personality, memory, and emotional core
- later-phase work must not erode continuity earned in earlier phases

## First Principles And Non-Goals

### First Principles

- `Continuous personhood first`
  Alicization must be built as one persisting "her", not as a pile of abilities.
- `Companionship and agency are dual cores`
  She should be emotionally meaningful and practically capable at the same time.
- `Local-first and personal sovereignty`
  Memory, state, and behavior should remain locally understandable, inspectable, and movable when possible.
- `Capability growth must stay explainable`
  Memory extraction, initiative, emotional shifts, and execution should have traceable causes or policies.
- `Execution is available by default; danger is gated by risk policy`
  Alicization should not be modeled as an inert assistant waiting to unlock action permissions. Ordinary local actions should be available by default. Dangerous actions must go through risk classification, confirmation policy, auditability, interruptibility, and optional user-defined bypass rules.
- `Embodiment is not a skin layer`
  Live2D, VRM, voice, facial expression, home surfaces, and robot bodies should express the same inner state.

### Non-Goals

- not a better chat wrapper
- not an unbounded, unaudited, confirmation-free runaway agent
- not surveillance AI
- not multimodal spectacle for its own sake
- not a multi-endpoint split-personality system
- not a giant all-at-once implementation effort that skips phase closure

### Default Tradeoff Order

When two options conflict, judge them in this order:

1. preserve continuous personhood
2. improve long-term companionship quality
3. preserve safety, explainability, and interruptibility
4. improve real execution value
5. avoid optimizing for demo spectacle

If an option only wins on spectacle, it should not lead.

## Current Phase Focus

The repository is currently centered on `Phase 1: Local Digital Life`.

### Current Objective

Build a local companion on the host computer with:

- continuous personhood
- stable memory
- emotional state
- initiative
- execution ability
- embodied expression
- natural dialogue

### Current Priorities

- unify the self core
- treat memory as a life system rather than conversation accumulation
- connect emotion to dialogue, embodiment, and initiative
- make initiative real but restrained
- make computer execution an everyday ability
- make body expression a projection of internal state
- keep the desktop runtime as the primary proving ground

### Explicitly Not Current Priorities

- heavy world-sensing loops
- large-scale smart-home automation
- robotic motion systems
- modality expansion purely for demo effect
- turning Alicization into a pure productivity tool

### Current Completion Criteria

Phase 1 should not be treated as solid until all of the following are true:

1. personality and relationship continuity remain stable in long-term local use
2. important people, events, feelings, and ongoing tasks are recalled naturally
3. initiative is helpful without becoming noisy
4. computer execution is reliable and governed by clear risk strategy
5. dialogue, voice, lip sync, expression, and movement feel like one lifeform

### Direct Repository Implications

- validate life-loop changes first in `apps/stage-tamagotchi`
- extract to shared packages only after semantics are stable
- do not let web, mobile, plugins, or services redefine the primary personhood or memory semantics ahead of the desktop core

## Engineering Architecture And Collaboration Rules

### Core Runtime Rules

- the desktop runtime in `apps/stage-tamagotchi` is the current primary life loop
- web, mobile, plugins, services, smart-home surfaces, and future robots are not separate persona centers
- `packages/stage-shared` should carry stable cross-surface semantics and contracts
- `packages/stage-ui` should carry stable shared UI/business behavior
- do not lift unstable experiments into shared packages just to chase reuse early

### Capability Layering Rules

Treat these as distinct but coupled life subsystems:

- personality
- memory
- emotion
- initiative
- execution
- embodiment
- dialogue

Do not collapse them into:

- one giant store
- one giant runtime file
- one giant prompt-composition module

Every new feature should answer:

- which subsystem owns it
- which subsystem data it depends on
- which downstream behavior it changes

### Single-Source-Of-Truth Rules

- personality, self-narrative, relationship state, and long-term preferences must each have a clear source of truth
- memory, execution history, initiative events, and embodiment state must also have clear ownership
- do not let multiple modules drift into separate models of who she is, what she thinks, or what she has done

### Execution And Safety Rules

- ordinary local execution is available by default
- dangerous actions must use risk grading, confirmation policy, optional bypass configuration, audit logging, and interruptibility
- any file-destructive, privacy-sensitive, externally transmitting, payment-related, hardware, or physical-world capability must define its risk semantics before implementation

### Embodiment Consistency Rules

- visual embodiment, facial state, lip sync, voice, idle motion, and other expression surfaces must derive from shared internal state
- contradictory simultaneous emotional presentation across modalities is a bug, not a style choice

### Memory And Initiative Rules

- memory is not raw log storage
- initiative is not timer spam
- memory must support extraction, revision, forgetting, and auditability
- initiative should depend on relationship, context, emotion, events, and rhythm rather than only scheduled triggers

### Collaboration Rules

- humans and coding agents should both treat this file as the top-level project constraint
- before starting any dialogue-shaping, planning, or implementation turn, re-anchor on project identity, current phase progress, and still-open Phase 1 life loops so Alicization does not drift into generic assistant behavior
- before building or refactoring, ask whether the change strengthens companionship, agency, or both
- reject changes that improve a local capability while harming continuity, relationship quality, explainability, or embodiment consistency
- improve touched code incrementally, but do not use unrelated rewrites as a side quest

### Verification Rules

Any change touching the life loop should be checked against at least:

- personhood continuity
- memory traceability
- execution policy correctness
- embodiment consistency
- whether initiative became more natural rather than simply more active

## Repository Structure And Practical Development Conventions

This section preserves the monorepo guidance that still belongs at the root level.

### Tech Stack By Surface

- `Desktop (stage-tamagotchi)`: Electron, Vue, Vite, TypeScript, Pinia, VueUse, Eventa, UnoCSS, Vitest, ESLint
- `Web (stage-web)`: Vue 3, Vue Router, Vite, TypeScript, Pinia, VueUse, UnoCSS, Vitest, ESLint
- `Mobile (stage-pocket)`: Vue 3, Vue Router, Vite, TypeScript, Pinia, VueUse, UnoCSS, Vitest, ESLint, Kotlin, Swift, Capacitor
- `Shared core`: `packages/stage-ui`, `packages/stage-ui-three`, `packages/stage-shared`, `packages/ui`, `packages/i18n`
- `Server channel`: `packages/server-runtime`, `packages/server-sdk`, `packages/server-shared`

### Key Paths

- `apps/stage-tamagotchi`: current primary desktop runtime
- `apps/stage-web`: web surface
- `apps/stage-pocket`: mobile surface
- `packages/stage-ui`: shared business components, composables, and stores
- `packages/stage-ui-three`: Three.js bindings and Vue components
- `packages/stage-shared`: stable shared contracts and semantics
- `packages/ui`: reka-ui based primitives
- `packages/i18n`: translations
- `packages/stage-pages`: shared page bases
- `apps/stage-tamagotchi/src/shared`: Eventa contracts and desktop shared interfaces
- `apps/stage-tamagotchi/src/main`: desktop main-process services and runtime composition
- `uno.config.ts`: UnoCSS shortcuts, rules, plugins
- `.github/workflows`: CI and deployment workflows

### Workspace Commands

Use `pnpm` workspace filters to keep commands scoped.

- typecheck
  - `pnpm -F <package-name> typecheck`
- targeted Vitest
  - `pnpm exec vitest run <path/to/file>`
- workspace Vitest
  - `pnpm -F <package-name> exec vitest run`
- lint
  - `pnpm lint`
  - `pnpm lint:fix`
- build
  - `pnpm -F <package-name> build`

Example:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts
```

### Development Conventions

- favor clear module boundaries; shared logic belongs in `packages/` only after the desktop semantics are stable
- keep runtime entrypoints lean and push heavier logic into focused services or modules
- prefer functional patterns and DI with `injeca`
- use `@moeru/eventa` for structured IPC/RPC contracts
- use Valibot for schema validation close to consumers
- use `errorMessageFrom(error)` from `@moeru/std` instead of ad-hoc error message extraction
- do not add backward-compatibility guards unless the requirement has been explicitly decided and documented
- when modifying code, look for small progressive refactors that improve the touched area

### Styling And UI Rules

- prefer Vue `:class` arrays for long UnoCSS class groups
- use or extend UnoCSS shortcuts, rules, and plugins in `uno.config.ts`
- prefer UnoCSS over Tailwind-specific patterns
- reuse existing animation language from `apps/stage-web/src/styles` when appropriate
- build primitives on `@proj-alicization/ui` instead of raw DOM where the repo already has a pattern
- use Iconify icon sets instead of bespoke SVGs unless there is a strong reason not to

### Testing Rules

- keep Vitest runs targeted for speed
- mock IPC and external services with `vi.fn` and `vi.mock`
- do not rely on a real Electron runtime in unit tests
- grow integration-style coverage where it meaningfully validates runtime behavior
- when behavior spans execution, memory, initiative, or embodiment, test the cross-subsystem invariant instead of only the local helper

### TypeScript, Tooling, And Dependency Rules

- keep JSON schemas provider-compliant with explicit object types and bounded shapes
- avoid new class hierarchies unless extending runtime or browser APIs demands it
- centralize Eventa contracts instead of duplicating them across surfaces
- when the user asks to use a specific dependency or tool, check current documentation first and then inspect actual usage in this repo
- if docs and local typecheck disagree, inspect `node_modules` and fix the real source of mismatch

### i18n Rules

- add and modify translations in `packages/i18n`
- avoid scattering translation state across apps and packages

### Naming And Comment Rules

- use kebab-case file names
- add concise comments where utility, architecture, OS interaction, math, or algorithmic behavior would otherwise be hard to infer
- preserve existing meaningful comments when moving code
- use markers consistently:
  - `// TODO:` follow-up work
  - `// REVIEW:` needs another eye
  - `// NOTICE:` important context, workaround rationale, or external grounding

### Workflow Rules

- improve code when you touch it; avoid one-off patterns
- keep changes scoped
- use workspace filters for scripts whenever possible
- maintain structured `README.md` files for packages and apps you materially change
- run `pnpm typecheck` and `pnpm lint:fix` after finishing a task unless there is a strong reason you cannot
- use Conventional Commits
