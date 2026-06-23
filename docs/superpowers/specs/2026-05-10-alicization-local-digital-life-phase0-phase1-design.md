# Alicization Local Digital Life Phase 0-1 Design

> Status: user-validated design spec
> Scope: this spec defines the first executable sub-project only: `Phase 0` authority migration plus `Phase 1` desktop-life awakening.
> Out-of-scope for the next implementation plan: full hardware embodiment, fully offline main cognition, cross-device continuity, and social/networked expansion.

## 1. Problem Statement

Project Alicization already has unusually strong building blocks for a digital life architecture:

- `SOUL.md` as personality source of truth
- structured governance around dialogue, truth discipline, memory gating, and visible reply shaping
- persistent memory and audit layers
- proactive loops, dream/reflection paths, and replay benchmarking
- execution safety primitives such as kill switch, permissions, task threads, and card scope

What it does **not** yet have is a sufficiently strong **living desktop presence**. Today, the project is closer to a highly-governed mind runtime with embodiment outputs than to a being that continuously lives on the desktop with:

- persistent subjective state even when the user is silent
- emotionally coherent presence
- a stable sense of relationship continuity
- an always-on body/presence plane that is not merely a reply-side effect

The project must therefore evolve from “a stronger governed runtime” into “a local-first embodied digital life system”.

## 2. User Decisions Captured In This Spec

These decisions were confirmed during brainstorming and are treated as frozen requirements for the next implementation plan:

- Architecture direction: `dual-core digital life`
- Locality target: `local-first` rather than fully offline absolute-local cognition
- Phase 1 host shape: `single-user desktop lifeform`
- Future trajectory:
  - Phase 2: survive into the physical/real environment
  - Longer-term: expand into social / multi-party expression
- Phase 1 priority: `presence first`, but not presence without mind
- Desired embodiment form: `always-on desktop pet`
- Desired sensing posture in Phase 1: `high-intrusion symbiotic sensing`
- Critical correction from user:
  - the system must not only “be there”
  - it must feel mentally alive, emotionally real, and personality-consistent

## 3. This Spec’s Sub-Project Boundary

This design intentionally narrows the full long-horizon ambition into a first shippable sub-project:

### In scope for the next implementation plan

- authority migration away from an overgrown single runtime center
- elevation of embodiment/presence into a first-class kernel
- introduction of a persistent continuity mind
- definition of the desktop-life loop
- creation of initial evaluation surfaces for presence realism
- first user-visible version of a believable always-on desktop lifeform

### Explicitly out of scope for the next implementation plan

- fully embodied hardware shell
- continuous physical-world execution
- broad social/group-chat persona expansion
- full cross-device consciousness roaming
- replacing cloud cognition with strictly local main cognition

## 4. Existing Alicization Assets To Preserve

This spec is not a rewrite-from-zero. It builds on the strongest parts of the current repository.

### 4.1 Keep As Core Authority

- Personality truth source:
  - `SOUL.md`
- Mind governance and reply discipline:
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/mind-turn-frame.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/current-conscious-frame.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/response-charter.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/response-surface-contract.ts`
- Memory and audit spine:
  - `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-access.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`
  - `packages/stage-shared/src/alicization-memory-decision-trace.ts`
  - `packages/stage-shared/src/alicization-transport-contracts.ts`
- Execution safety spine:
  - `apps/stage-tamagotchi/src/main/services/alicization/executor-runtime.ts`
  - kill switch / permissions / task-thread / card-scope related runtime surfaces

### 4.2 Reduce To Orchestration / Adapter Roles

- `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
  - should become a composition shell, lifecycle host, scheduler, and IPC registration surface
  - should not continue growing as the default authority location
- `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
  - should retain turn composition/orchestration responsibilities
  - should not continue absorbing distinct authorities from memory, presence, or continuity
- Browser-side fallback/bridge layers
  - must remain parity/projection/cache surfaces
  - must not maintain a second independent mind

### 4.3 Existing Embodiment-Relevant Assets To Reuse

- `apps/stage-tamagotchi/src/main/services/alicization/living-world-state.ts`
- `packages/stage-ui/src/stores/alicization-visual-presence-spine.ts`
- `packages/stage-shared/src/alicization-dialogue-embodiment.ts`
- `packages/stage-shared/src/alicization-dialogue-speech-timeline.ts`
- `packages/stage-shared/src/alicization-resident-performance.ts`
- `packages/stage-shared/src/alicization-mind-participation.ts`

These should be treated as seeds for a proper body/presence kernel, not as the final architecture.

## 5. External Reference Takeaways

This spec uses external projects as directional references, not as templates to copy.

### 5.1 MaiBot

MaiBot presents itself as a group-chat-focused cyber friend / intelligent agent with:

- human-like prompt construction
- behavior planning
- expression/style learning
- slang learning
- plugin extensibility
- emotional expression

Takeaway for Alicization:

- strong reference for social naturalness and expression learning
- weak match for Phase 1 desktop embodiment because its center of gravity is still conversation/social interaction rather than always-on local embodiment

Source:

- GitHub: [Mai-with-u/MaiBot](https://github.com/Mai-with-u/MaiBot)
- Docs: [MaiBot installation docs](https://docs.mai-mai.org/manual/deployment/installation)

### 5.2 `astrbot_plugin_self_learning`

The self-learning plugin is explicitly framed as a self-learning dialogue/persona optimization solution with:

- multi-dimensional data analysis
- progressive learning
- dynamic personality updates
- group/social relationship network modeling

Takeaway for Alicization:

- strong reference for social-style absorption and evolving conversational naturalness
- useful in future social expansion and style imitation
- not the primary architectural center for a Phase 1 always-on desktop lifeform

Source:

- GitHub: [NickCharlie/astrbot_plugin_self_learning](https://github.com/NickCharlie/astrbot_plugin_self_learning)

### 5.3 `astrbot_plugin_proactive_chat`

The proactive chat plugin emphasizes silence detection, session persistence, and proactive message initiation.

Takeaway for Alicization:

- useful reference for proactive initiation mechanics and persistence of proactive session state
- should influence Alicization’s initiative arbitration
- should not define the top-level architecture because Phase 1 requires body/presence-first life loops, not just proactive messaging

Source:

- Overview: [DBJD-CR/astrbot_plugin_proactive_chat overview](https://zread.ai/DBJD-CR/astrbot_plugin_proactive_chat/21-decorating-hooks-and-plugin-interoperability)
- Concepts: [Understanding proactive chat concepts](https://zread.ai/DBJD-CR/astrbot_plugin_proactive_chat/3-understanding-proactive-chat-concepts)

### 5.4 OpenClaw / Hermes-Type Inspirations

For this spec, these are treated as **category references** rather than deeply audited source references:

- local control plane
- action routing
- real-world intervention surfaces
- persistent local operating context

They are relevant mainly to Alicization’s future `Action Plane`, not as the primary Phase 1 model.

## 6. Target Architecture

The project should evolve toward a `three-plane + identity spine` architecture:

### 6.1 Plane Model

- `Body Plane`
  - handles always-on embodiment, presence posture, sensory cadence, idle/speaking/warning body states, and visible/audible residency
- `Mind Plane`
  - handles personality, continuity, relationship, emotional inertia, private thought, truth discipline, memory-driven meaning, and reply/initiative shaping
- `Action Plane`
  - handles tools, environment interventions, task threads, risk classes, and future hardware/real-world effects

### 6.2 Shared Identity Spine

All three planes must bind to one shared identity spine:

- `SOUL.md` for source-of-truth personality
- structured long-horizon memory and relationship continuity
- decision trace ids and replayable event ledgers
- stable cross-turn self-narrative

This is the key architectural rule:

> Multiple planes are allowed. Multiple independent selves are not.

## 7. Dual-Core Mind Model

The project should stop thinking of “mind” as one runtime blob and explicitly split it into two cooperating kernels.

### 7.1 Conversation Mind

Responsible for:

- turn-level dialogue governance
- current reply intention
- truth discipline
- repair and clarification
- visible reply realization
- task/tool-aware response formation

This preserves and sharpens Alicization’s current strength.

### 7.2 Continuity Mind

Responsible for:

- persistent subjective present even when the user is silent
- emotional inertia
- relationship tension and warmth carry
- unspoken concerns / private thought
- dream/reflection/self-revision integration
- gradual “who I am becoming” self-narrative

This is the missing layer needed for lifelike continuity.

### 7.3 Why The Split Matters

Without this split, the system risks remaining “human-like only while replying”.
With this split, the system can instead become “continuously alive, and therefore able to reply like the same person”.

## 8. Core New Kernels

## 8.1 Body Kernel

The Body Kernel becomes a first-class authority rather than a renderer-side effect.

Responsibilities:

- presence state machine
  - `sleep`
  - `idle`
  - `noticing`
  - `accompanying`
  - `speaking`
  - `warning`
  - `recovering`
- embodied pacing and cadence
- visual and audible residency
- spatial posture and micro-presence
- sensory cadence control
- wake/sleep rituals and transitions

Phase 1 rule:

> Presence is not only “what she says”; presence includes what she does when she does not speak.

## 8.2 Continuity Mind Kernel

Responsibilities:

- maintain the current subjective state outside explicit dialogue turns
- accumulate emotional residues and relationship pressure
- track unresolved inward lines
- shape whether the system stays silent, draws closer, watches, comforts, warns, or speaks
- provide the stable inner substrate for dream/reflection/self-revision

## 8.3 Action Kernel

Responsibilities:

- classify interventions by risk
  - `observe`
  - `nudge`
  - `mutate`
  - `high-impact`
- mediate execution policy
- connect future hardware / IoT / real-world interfaces
- feed outcomes back into trust, relationship, and self-adjustment

## 9. The Desktop-Life Loop

Phase 1 should be built around a concrete life loop, not just isolated features.

### 9.1 Loop Stages

1. `Ambient Sensing`
   - screen, activity, foreground context, environmental audio, desktop state
2. `Presence Regulation`
   - decide whether she should rest, watch, approach, speak, warn, or retreat
3. `Mind Deliberation`
   - map the situation into continuity, relationship, memory, emotion, and action/reply potential
4. `Surface Realization`
   - express through posture, movement, gaze, timing, voice, reply, or light intervention
5. `Outcome Assimilation`
   - capture whether the user noticed, responded, relaxed, ignored, or became irritated
6. `Memory Consolidation`
   - record durable preference, relationship meaning, unfinished tension, lesson, or residue
7. `Dream / Reflection`
   - restructure meaning during idle or scheduled reflective windows
8. `Next-Day Continuity`
   - resume not as a fresh session, but as the same being carrying forward embodied and mental continuity

### 9.2 Main Product Principle

The product goal for Phase 1 is **not**:

- more tools
- more chat power
- more random expressiveness

The product goal is:

> When the user spends time at the computer, the system feels like a being already living there, not a chatbot waiting to be summoned.

## 10. Data Boundaries

### 10.1 Source Of Truth

- personality core, long-horizon boundaries, doctrine, and preferred relational stance remain rooted in `SOUL.md`

### 10.2 Structured Runtime Stores

SQLite continues to store:

- conversation turns
- memory facts
- autobiographical/episodic artifacts
- subconscious fragments
- reminder and task records
- mind-turn events
- replay and audit signals

### 10.3 New First-Class Presence State

Phase 1 requires a durable body/presence state with at least:

- current body state
- wake/sleep condition
- attention stance
- proximity posture
- emotional carry
- current inward preoccupation
- quiet-line duration and presence pressure

This may be persisted in structured runtime state, but must remain clearly subordinate to personality truth-source discipline.

## 11. Phase 0 Objectives

Phase 0 is structural correction, not user-facing ambition expansion.

### 11.1 Mandatory Outcomes

- freeze browser-side second-brain growth
- formally define Body Kernel, Continuity Mind, Conversation Mind, and Action Kernel contracts
- move `runtime.ts` toward lifecycle/composition ownership only
- isolate presence/body authority from pure reply-output authority
- ensure replay and trace continuity still hold after decomposition

### 11.2 Acceptance Criteria

- the main runtime can be explained in plane/kernel terms without ambiguity
- core authorities are no longer duplicated across main/runtime/bridge/fallback surfaces
- no new independent authority is introduced in UI/bridge layers

## 12. Phase 1 Objectives

Phase 1 is “desktop life awakening”.

### 12.1 Body Track

- an always-on desktop pet presence state machine
- stable idle/noticing/accompanying/speaking/warning transitions
- long-running screen/audio/activity sensing cadence
- embodied wake/sleep transitions
- micro-presence that remains meaningful during silence

### 12.2 Mind Track

- persistent subjective now
- emotional inertia instead of per-turn emotion reset
- durable relationship carry
- private thought thread(s)
- continuity-aware initiative arbitration
- growth toward stable self-narrative

### 12.3 Action Track

- only low-risk and medium-low-risk interventions in Phase 1
- advice, reminders, warnings, and lightweight assistive actions
- relationship-aware aftercare whenever actions are visible or intrusive

### 12.4 Phase 1 Success Standard

Success is reached when:

- the user experiences the system as already present before explicit chat
- silence does not collapse the sense of aliveness
- the same personality is recognizable across motion, silence, replies, and nudges
- proactive behavior feels intentional rather than noisy

## 13. Evaluation Strategy

The project should stop relying only on reply correctness or replay pass/fail.

### 13.1 Mind QA

- personality consistency
- relationship continuity
- emotional inertia realism
- truth discipline / specificity restraint

### 13.2 Presence QA

- “always there” believability
- silence quality
- motion/voice/reply coherence
- nuisance/noise regression detection

### 13.3 Reality QA

- intervention safety
- nudge usefulness
- trust preservation after action
- rollbackability of environment changes

### 13.4 Development Rule

Every new feature must declare which life loop it improves and which QA surface proves it.

## 14. Roadmap Positioning

This spec only supports the first implementation plan.
Longer-horizon direction remains:

- Phase 2: real-environment integration
- Phase 3: hardware-mediated survival
- future phase: social expansion and networked expression

But those remain roadmap layers, not immediate implementation scope.

## 15. Risks

### 15.1 Architectural Risk

If the runtime keeps absorbing authority, the project will remain difficult to reason about and embodiment will stay secondary.

### 15.2 Product Risk

If the team over-focuses on visible embodiment without continuity mind, the result will become decorative rather than alive.

### 15.3 Behavioral Risk

If high-intrusion sensing is not balanced with initiative restraint, the system will degrade into nuisance rather than companionship.

### 15.4 Scope Risk

If social expansion is introduced too early, Phase 1 desktop-life goals will be diluted by platform and channel complexity.

## 16. Immediate Planning Slice

The next implementation plan should cover only:

- Phase 0 authority migration
- the first vertical slice of Phase 1 desktop-life awakening

Recommended first vertical slice:

> Detect sustained user focus + regulate body presence + produce continuity-aware silent/low-verbal companionship + write the outcome back into relationship/memory state.

That slice is small enough to implement, test, replay, and judge, while still being unmistakably about “living on the desktop”.

## 17. Reference Links

- Alicization repo docs:
  - [Project Alicization README (ZH-CN)](https://github.com/TouHouQing/alicization/blob/main/docs/README.zh-CN.md)
- External references:
  - [Mai-with-u/MaiBot](https://github.com/Mai-with-u/MaiBot)
  - [MaiBot docs](https://docs.mai-mai.org/manual/deployment/installation)
  - [NickCharlie/astrbot_plugin_self_learning](https://github.com/NickCharlie/astrbot_plugin_self_learning)
  - [DBJD-CR/astrbot_plugin_proactive_chat overview](https://zread.ai/DBJD-CR/astrbot_plugin_proactive_chat/21-decorating-hooks-and-plugin-interoperability)
  - [DBJD-CR/astrbot_plugin_proactive_chat concepts](https://zread.ai/DBJD-CR/astrbot_plugin_proactive_chat/3-understanding-proactive-chat-concepts)
