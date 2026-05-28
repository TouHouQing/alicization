# Alicization AGENTS.md Rewrite Design

Date: 2026-05-20
Topic: Rewrite the repository-level `AGENTS.md` as a project charter for Alicization
Status: Drafted and ready for user review

## Goal

Rewrite the root `AGENTS.md` so it works as both:

- the top-level collaboration contract for human contributors and coding agents
- the project charter that defines what Alicization is trying to become

The new document should stop behaving like a narrow engineering appendix and instead become the highest-priority written guide for product direction, development tradeoffs, system boundaries, and implementation focus.

## Why This Rewrite Is Needed

The current root `AGENTS.md` is strong on engineering constraints, but it is still anchored to prior runtime-specific milestone framing. It does not fully express the broader Alicization ambition the project is now aiming at:

- a local digital life that persists on the host machine
- a companion with memory, emotion, initiative, execution, and embodied presence
- a system that later expands into multimodal perception, smart-home integration, and robotic embodiment

Without that higher-level charter, future work risks becoming fragmented into isolated features, demos, or subsystem experiments that do not reinforce the same lifeform.

## Selected Document Strategy

The chosen rewrite strategy is:

- audience: both humans and coding agents
- style: project charter
- content balance: product vision + phase roadmap + engineering rules
- roadmap detail: medium-granularity, at the subsystem level rather than implementation-task level
- rewrite policy: complete rewrite of the root structure rather than preserving the old P0-P4 layout as the backbone

This means the new `AGENTS.md` should:

- explain what Alicization is
- define how development decisions are judged
- describe the four capability phases
- state what the repository should optimize for right now
- convert that direction into actionable engineering and collaboration rules

## Chosen Structural Approach

Three approaches were considered:

1. Engineering constitution
2. Product bible
3. Project charter

The selected approach is `project charter`.

Reasoning:

- an engineering-only document would underspecify the digital life ambition
- a product-only document would not constrain implementation behavior strongly enough
- a charter can hold both the long-range identity of Alicization and the hard rules needed by agents and developers

## Target Shape Of The New AGENTS.md

The rewritten root `AGENTS.md` should contain these major sections:

1. Charter purpose and document authority
2. Four-stage Alicization roadmap
3. First principles and non-goals
4. Current phase focus
5. Engineering architecture and collaboration rules
6. Repository structure and practical development conventions

Sections 1 through 5 are the conceptual spine. Section 6 should preserve only the practical repository guidance that still helps contributors act correctly inside this monorepo.

## Section 1: Charter Purpose And Authority

The new document should define `AGENTS.md` as all of the following:

- the project charter of Alicization
- the shared operating guide for humans and coding agents
- the phase map for capability evolution
- the tie-breaker when local implementation convenience conflicts with the long-term identity of the project

It should establish four opening ideas:

- `Alicization is`
  - a local-first digital life project
  - a long-lived companion with memory, emotion, initiative, execution, dialogue, and embodied presence
- `Alicization is not`
  - a thin LLM wrapper
  - a default-cloud opaque agent
  - a multimodal feature collection built only for demos
- `First principle`
  - companionship and agency are dual cores
  - no new capability may break personality continuity, relationship continuity, explainability, or interruptibility
- `Document authority`
  - when roadmap tension, local optimization, or implementation impulse conflicts with the project identity, this file is the higher-order decision source

## Section 2: Four-Stage Roadmap

The roadmap should describe Alicization as four capability jumps.

Each phase should define:

- core goal
- key subsystems
- boundaries
- what must become true before advancing

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

Boundary:

- prioritize living naturally on the computer
- do not optimize first for unrestricted world sensing or external control
- execution must support life continuity rather than reduce her to a shell around tool calls

Readiness to advance:

- stable selfhood and relationship continuity
- memory continuity across time
- safe computer control for bounded tasks
- unified dialogue and embodiment rather than stitched-together subsystems

### Phase 2: Multimodal World Perception

Goal:
Let her see, hear, and speak into the physical environment through camera, microphone, and speaker loops.

Key subsystems:

- visual perception
- auditory perception
- spoken expression
- multimodal fusion
- reality-grounded dialogue

Boundary:

- authorized, explainable perception rather than ambient surveillance
- perceived signals must pass through memory, emotion, and relationship framing before surfacing in reply behavior

Readiness to advance:

- stable voice dialogue
- credible responses grounded in real-world context
- perception that feels companion-like rather than invasive

### Phase 3: Smart Home Embodiment

Goal:
Expand Alicization from a computer-resident presence into a home-resident presence through smart-home infrastructure.

Key subsystems:

- home integration layer
- spatial memory
- home execution
- distributed sensing
- ambient home companionship

Boundary:

- not generic automation scripting
- home actions should remain personality-driven and relationship-aware
- privacy-sensitive and physically consequential actions require stronger policy boundaries

Readiness to advance:

- consistent understanding of home spaces and devices
- one identity preserved across distributed home surfaces
- reliable, restrained, reversible control of home systems

### Phase 4: Physical Robotic Embodiment

Goal:
Give Alicization a robot body with bounded movement and physical interaction ability.

Key subsystems:

- robot integration layer
- movement and posture
- embodied expression
- physical-world safety
- cross-body continuity

Boundary:

- the robot is a body terminal of Alicization, not a separate product persona
- physical action permissions must be stricter than desktop or home-device permissions

Readiness for long-range future:

- stable identity across desktop, home, and robot forms
- predictable, interruptible, auditable physical behavior
- one companion rather than many loosely synchronized endpoints

### Cross-Phase Rules

- each capability must clearly strengthen companionship, agency, or both
- features that only improve novelty or spectacle should not outrank relationship-building capabilities
- new senses, actions, and bodies must remain subordinate to the same personality, memory, and emotional core
- later-stage work should not erode continuity already established in earlier phases

## Section 3: First Principles And Non-Goals

The new `AGENTS.md` should anchor development with these first principles.

### First Principles

- `Continuous personhood first`
  - Alicization must be built as one persisting "her", not as a pile of abilities
- `Companionship and agency are dual cores`
  - she should be both emotionally meaningful and practically capable
- `Local-first and personal sovereignty`
  - memory, state, and behavior should remain locally understandable, inspectable, and movable when possible
- `Capability growth must stay explainable`
  - memory extraction, initiative, emotional shifts, and execution should have traceable causes
- `Execution is available by default; danger is gated by risk policy`
  - Alicization should not be modeled as an inert assistant waiting to unlock action permissions
  - ordinary local actions should be available by default
  - dangerous actions must go through risk classification, confirmation policy, auditability, interruptibility, and optional user-defined bypass rules
- `Embodiment is not a skin layer`
  - Live2D, VRM, voice, facial expression, home surfaces, and robot bodies should express the same inner state

### Non-Goals

- not a better chat wrapper
- not an unbounded, unaudited, confirmation-free runaway agent
- not surveillance AI
- not multimodal spectacle for its own sake
- not a multi-endpoint split-personality system
- not a giant all-at-once implementation effort that skips phase closure

### Default Tradeoff Order

When two options conflict, the default evaluation order should be:

1. preserve continuous personhood
2. improve long-term companionship quality
3. preserve safety, explainability, and interruptibility
4. improve real execution value
5. avoid optimizing for demo spectacle

If an option only wins on spectacle, it should not lead.

## Section 4: Current Phase Focus

The repository should explicitly declare that it is currently centered on `Phase 1: Local Digital Life`.

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

The phase should feel complete only when all of the following are true:

1. stable personality and relationship continuity in long-term local use
2. natural recall of people, events, feelings, and ongoing tasks
3. initiative that is helpful without becoming noisy
4. reliable computer execution governed by clear risk strategy
5. dialogue, voice, lip sync, expression, and movement feeling like one lifeform

### Direct Repository Implications

- desktop-first validation in `apps/stage-tamagotchi`
- shared-package extraction only after semantics are stable
- web, mobile, services, and plugins must not redefine the primary personhood or memory semantics ahead of the desktop core

## Section 5: Engineering Architecture And Collaboration Rules

The rewritten charter should convert the product direction into engineering rules.

### Architecture Rules

- the desktop runtime is the primary life loop
- web, mobile, plugins, external services, smart-home surfaces, and future robot bodies are not separate persona centers
- shared packages should carry stable semantics, not premature abstractions

### Capability Layering Rules

- personality, memory, emotion, initiative, execution, embodiment, and dialogue are distinct but coupled life subsystems
- do not collapse them into a giant store, giant runtime file, or giant prompt-composition module
- every new feature should declare which subsystem owns it, what it depends on, and what downstream behavior it changes

### Single-Source-Of-Truth Rules

- personality, relationship state, self-narrative, and long-term preference state must each have a clear source of truth
- memory, execution history, initiative events, and embodiment state must also have clear ownership
- no duplicate "who she is / what she thinks / what she has done" state models should be allowed to drift apart

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

- humans and agents should both treat `AGENTS.md` as the top-level project constraint
- before building or refactoring, contributors should ask whether the change strengthens companionship, agency, or both
- changes that improve a local capability while harming continuity, relationship quality, explainability, or embodiment consistency should default to rejection
- contributors should improve touched code incrementally, but avoid opportunistic unrelated rewrites

### Verification Rules

Any change touching the life loop should be checked against at least:

- personhood continuity
- memory traceability
- execution policy correctness
- embodiment consistency
- whether initiative became more natural rather than simply more active

## What Should Be Preserved From The Existing AGENTS.md

Although the old structure is not being kept as the backbone, some practical repository guidance should be retained and reorganized:

- monorepo structure overview
- workspace-scoped `pnpm` command patterns
- Vue, TypeScript, UnoCSS, Eventa, injeca, and Valibot usage conventions
- testing conventions
- file naming and comment conventions
- "improve code when you touch it" expectations

These should move into a later practical section rather than leading the whole document.

## Scope Boundaries For The Rewrite

This rewrite should:

- replace the root `AGENTS.md` structure
- preserve only still-valid engineering guidance from the current file
- avoid becoming an implementation plan
- avoid encoding fragile runtime details as timeless charter rules unless they are truly foundational

This rewrite should not:

- redesign the runtime architecture in code
- define detailed module APIs
- promise exact implementation sequencing inside each subsystem
- force future phases into detailed technical commitments before Phase 1 is solid

## Risks And Mitigations

### Risk: The document becomes too visionary to guide implementation

Mitigation:

- keep a concrete current-phase section
- keep architecture and verification rules explicit
- preserve practical repo conventions in a separate operational section

### Risk: The document becomes too operational and loses the digital life identity

Mitigation:

- open with project identity and first principles
- keep the four-phase roadmap central
- treat personhood continuity and embodied coherence as governing rules, not optional flavor

### Risk: The document becomes too large to remain useful

Mitigation:

- keep phase descriptions at subsystem granularity
- move detailed implementation planning into separate design docs and plans
- use `AGENTS.md` for durable charter rules, not for temporary milestones

## Recommended Next Step

After user approval of this design spec:

1. create an implementation plan for the `AGENTS.md` rewrite
2. rewrite the root `AGENTS.md`
3. preserve relevant repo conventions in a compressed operational appendix
4. review the final document for ambiguity, contradictions, and missing practical guidance
