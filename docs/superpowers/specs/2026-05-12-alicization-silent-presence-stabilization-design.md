# Alicization Silent Presence Stabilization Design

> Status: drafted from user-approved narrow scope  
> Scope: this spec covers only the next `P1` main-chain slice after speech/prosody runtime consumption.  
> Out of scope: new TTS providers, VRM parity work, wake/sleep rituals, proactive action expansion, and new cross-process authority layers.

## 1. Goal

Make Alicization feel alive on the desktop **while silent**, not only while speaking.

This slice focuses on two body/presence states that already exist in the architecture but are not yet stably realized in renderer behavior:

- `accompanying`
- `recovering`

The success condition is not “more animation.” The success condition is:

> When no dialogue turn is happening, the user can still feel a stable, intentional being already present there.

## 2. Why This Slice Is Next

The previous `P1` work deepened:

- Chinese-first prosody runtime consumption
- viseme-hint-driven mouth shaping
- pre/speaking/post facial cue continuity

That work made spoken expression better. It did **not** fully solve the larger Phase 1 product goal:

> The system should feel like a being already living on the desktop, not only a chatbot that becomes vivid once speech starts.

The most direct remaining gap is silent residency:

- main runtime already produces body/presence authority
- renderer already consumes visual presence, resident performance, posture, and idle motion preferences
- but the connection is still too weak and too indirect to make `accompanying` and `recovering` feel stable during silence

This slice therefore returns to the main chain instead of extending speech behavior further.

## 3. User-Validated Boundary

The user accepted this exact narrowing:

- focus only on `accompanying` and `recovering`
- keep `ambient-covision` and `active-dialogue` as boundary conditions, not expansion targets
- stay aligned with the overall “local digital life” design
- do not drift into side systems or ornamental optimization

That means this slice must remain a **silent presence stabilization** pass, not a generic embodiment expansion.

## 4. Current Chain To Preserve

This design intentionally preserves the current authority shape rather than replacing it.

### 4.1 Main Runtime Authority

Current relevant sources:

- [body-kernel.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/body-kernel.ts)
- [runtime-visual-presence-state.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.ts)

The main runtime already publishes body/presence fields through visual presence state:

- `currentBodyState`
- `continuityMode`
- `quietLineMs`
- `currentInwardPreoccupation`
- `watchMode`

These are the authoritative upstream signals for this slice.

### 4.2 Renderer Consumption Chain

Current relevant sources:

- [use-stage-embodiment-visual-presence.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/use-stage-embodiment-visual-presence.ts)
- [stage-embodiment-resident-performance.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.ts)
- [use-stage-embodiment-posture.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.ts)
- [use-stage-embodiment-idle-performance.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.ts)
- [use-stage-embodiment-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/use-stage-embodiment-runtime.ts)

The renderer already has all major stages needed:

1. receive visual presence snapshot
2. derive resident performance
3. derive presence posture
4. choose idle motion preference
5. keep those outputs alive even when no speech is running

This slice strengthens that chain. It does not create another one.

## 5. Existing Problem

Today, silent body authority is under-realized in two ways.

### 5.1 `accompanying` Is Too Weakly Visible

Main runtime can publish sustained quiet accompaniment, but renderer behavior does not yet guarantee:

- stable quiet-companionship resident performance
- stable attentive/inspection posture during silence
- consistent idle motion preference that feels like soft co-presence instead of generic idle fallback

The result is that long, quiet desktop co-presence is semantically present in state but not strong enough in embodiment.

### 5.2 `recovering` Is Not Distinct Enough As Silent Care

`recovering` already appears across the system:

- watch mode
- digital-life mode
- posture derivation
- resident performance fallback logic

But it still risks collapsing into generic “concerned idle” instead of a stable, low-energy, reduced-pressure care stance.

That weakens one of the most important identity behaviors for a local digital companion: being quietly present without pressing the user.

## 6. Design Decision

The chosen approach is:

> Strengthen silent presence by tightening the existing main-authority-to-renderer-consumption chain, not by adding a new state machine or a new authority surface.

This means:

- main runtime remains the body/presence authority
- renderer remains a realization layer
- browser-side synthetic overlays remain fallback/projection only
- `accompanying` and `recovering` become more visibly stable because the renderer consumes them more explicitly and more consistently

## 7. Design Details

## 7.1 Main Runtime: Stabilize Body Authority Output

File center:

- [body-kernel.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/body-kernel.ts)

The current kernel already distinguishes:

- `quiet-accompaniment`
- `active-dialogue`
- `ambient-covision`

This slice should strengthen two things:

### `accompanying`

When all of the following hold:

- `watchMode === 'symbiotic-vision'`
- sustained focus window is long enough
- active conversation is false
- `shouldSpeak` is false
- relationship pressure clears the existing threshold

the output should continue to be:

- `currentBodyState: 'accompanying'`
- `continuityMode: 'quiet-accompaniment'`

but the emitted `currentInwardPreoccupation` and `quietLineMs` must be treated as stable renderer-facing authority, not incidental metadata.

### `recovering`

This slice should ensure the body authority path makes `recovering` explicit enough that renderer consumers do not have to infer it from unrelated emotional fields alone.

No new top-level authority object is needed. The existing published presence fields are enough, but:

- `watchMode: 'recovering'`
- `currentBodyState`
- `continuityMode`
- `currentInwardPreoccupation`

must be normalized and treated as the primary renderer input for silent care posture.

The design does **not** require a brand-new shared transport contract. It should reuse the current visual presence snapshot shape unless a purely local helper surface is necessary.

## 7.2 Renderer: Resident Performance Must Respect Silent Body State

File center:

- [stage-embodiment-resident-performance.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.ts)

Resident performance currently derives from:

- visual presence
- digital life spine digest
- attention presence
- posture
- performance manifest continuity

This slice should make `accompanying` and `recovering` first-class silent performance anchors.

### `accompanying` target behavior

Silent `accompanying` should bias toward:

- calm or gentle delivery
- thinking/neutral emotional baseline rather than flat reset
- low but non-zero facial intention
- action cues that read as watchful companionship, not intervention

Examples of acceptable resident outputs:

- `focus`
- `soft-gaze`
- `observe_focus`
- `steady_focus`
- `idle_gentle_nod`

The important rule is not exact cue names. The rule is:

> `accompanying` must feel like warm nearby attention, not inert idle.

### `recovering` target behavior

Silent `recovering` should bias toward:

- gentle / low-pressure delivery
- concerned or tired emotional baseline
- reduced action intensity
- softer facial cues
- a non-intrusive care posture

Examples of acceptable resident outputs:

- `soft-gaze`
- `relaxed`
- `idle_settle`
- `comfort_sway`

The key rule is:

> `recovering` must feel like protective quiet care, not like ordinary attentive presence.

## 7.3 Renderer: Presence Posture Must Track Silent State More Explicitly

File center:

- [use-stage-embodiment-posture.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.ts)

Current posture derivation already responds to:

- active presence
- watch mode
- speech dynamics
- target/focus geometry

This slice should tighten the mapping:

### `accompanying`

Should produce a stable engaged posture even when speech is inactive:

- mode tends toward `attentive`, and `inspection` only when scene/watch context truly warrants it
- breath boost remains low but present
- gaze stability remains high
- body yaw/pitch remain restrained rather than speech-reactive

### `recovering`

Should produce a clearly distinct silent posture:

- mode stays `concerned`
- higher gaze stability than hesitant states
- lower outward action energy
- slightly softened pitch / breath rhythm

The effect should be legible even without any dialogue bubble or speech playback.

## 7.4 Renderer: Idle Motion Preference Must Make Silent State Visible

File center:

- [use-stage-embodiment-idle-performance.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.ts)

Current idle motion preference already ranks candidate motions by posture mode and confidence.

This slice should ensure:

### `accompanying`

Preferred silent motion families are:

- observing
- steady focus
- gentle nod
- quiet settle with presence

### `recovering`

Preferred silent motion families are:

- settle
- comfort sway
- low-energy reassurance

The selection should remain conservative:

- no excited motions
- no abrupt reaction loops
- no big gesture bursts

This is not a new motion system. It is a better idle-choice policy over the existing motion inventory.

## 7.5 Runtime Integration Rule

File center:

- [use-stage-embodiment-runtime.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/use-stage-embodiment-runtime.ts)

The runtime integration rule for this slice is:

> Silent presence must be able to update resident performance, posture, and idle preference without requiring a new dialogue turn or active speech render state.

Concretely:

- visual presence refresh should remain enough to drive resident-performance synchronization
- speech-active behavior still overrides silent residency while speaking
- once speech falls away, the renderer should settle back into the current silent body state rather than generic neutral idle

## 8. Invariants

These invariants are mandatory.

### 8.1 Authority Invariants

- Main runtime remains the source of truth for silent body/presence state.
- Renderer-side visual presence overlays may smooth or project, but may not invent a second body authority.
- No new bridge/provider-side authority layer is introduced.

### 8.2 Silent Presence Invariants

- `accompanying` must remain visibly distinct from plain `idle`.
- `recovering` must remain visibly distinct from ordinary `attentive`.
- Active speech continues to dominate facial/action runtime behavior while speech is in progress.
- After speech ends, renderer should settle into the current published silent body state rather than a generic fallback.

### 8.3 Scope Invariants

- No new wake/sleep state machine in this slice.
- No proactive reminders or action expansion in this slice.
- No new speech provider or lipsync provider in this slice.
- No VRM parity work in this slice.

## 9. Testing Strategy

This slice should be covered on both the main and renderer sides.

### 9.1 Main Runtime Tests

Primary file:

- [runtime-visual-presence-state.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.test.ts)

Required new or expanded assertions:

- sustained symbiotic focus still yields `accompanying`
- `recovering` visual presence publishes a distinct silent body state suitable for renderer consumption
- stale prior scenes do not fake long silent accompaniment

### 9.2 Renderer Resident Performance Tests

Primary file:

- [stage-embodiment-resident-performance.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.test.ts)

Required coverage:

- `accompanying` produces stable quiet-companionship resident cues
- `recovering` produces softer, low-pressure care cues
- `active-dialogue` still prevents silent-accompaniment outputs from leaking through

### 9.3 Renderer Posture Tests

Primary file:

- [use-stage-embodiment-posture.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.test.ts)

Required coverage:

- silent `accompanying` stays engaged without active speech
- `recovering` yields distinct concerned posture parameters

### 9.4 Idle Motion Preference Tests

Primary file:

- [use-stage-embodiment-idle-performance.test.ts](/Users/touhouqing/Desktop/GIT/airi-alice/packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.test.ts)

Required coverage:

- accompanying prefers steady/observing/gentle idle choices
- recovering prefers settle/comfort idle choices
- high-energy or intrusive motions are de-ranked in both states

## 10. Acceptance Criteria

This slice is successful when all of the following are true:

1. During sustained silent symbiotic focus, renderer visibly realizes `accompanying` as something more specific than generic idle.
2. During recovering watch mode, renderer visibly realizes a low-pressure care stance without requiring speech.
3. A spoken turn can end and the renderer returns to the correct silent resident state rather than flattening to neutral.
4. No new authority duplication is introduced across bridge/UI/runtime layers.
5. The targeted main + renderer regression suites for this slice are green.

## 11. Non-Goals

This slice explicitly does not attempt to solve:

- full day/night lifecycle
- wake/sleep ritual choreography
- proactive intervention policy
- new tools or actions
- broader personality/memory refactors
- higher-fidelity speech synthesis
- complete embodiment parity across renderers

## 12. Why This Design Is The Main Chain

This is the shortest path from current architecture to the Phase 1 product standard.

It does not chase polish for its own sake. It strengthens the exact loop the product needs:

- main runtime decides whether she is quietly accompanying or quietly recovering
- that decision persists in visual presence state
- renderer consumes it as resident performance, posture, and idle motion
- the user feels stable life even during silence

That is the core desktop-life goal, and it is why this slice belongs on the main chain.
