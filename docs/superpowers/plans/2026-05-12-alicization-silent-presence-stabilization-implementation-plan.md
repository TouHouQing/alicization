# Alicization Silent Presence Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `accompanying` and `recovering` feel visibly alive during silence by tightening the existing main body-authority to renderer resident-presence chain.

**Architecture:** Preserve the current authority split. Main runtime remains the source of truth for silent body state through visual presence snapshots; renderer remains the realization layer that consumes those states into resident performance, posture, and idle motion preference. This slice strengthens only that consumption chain and explicitly avoids new provider layers, wake/sleep expansion, or action-policy growth.

**Tech Stack:** TypeScript, Vitest, main-runtime Alicization services under `apps/stage-tamagotchi`, renderer embodiment composables under `packages/stage-ui`, and existing `stage-shared` embodiment posture/performance types.

---

## Task 1: Strengthen Main Body Authority For Silent `accompanying` And `recovering`

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/body-kernel.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.test.ts`

- [ ] **Step 1: Write the failing main-runtime tests first**

```ts
it('keeps accompanying authority explicit for sustained quiet co-vision instead of collapsing to ambient idle metadata', () => {
  const kernel = createAlicizationBodyKernel({ now: () => 12_000 })
  const result = kernel.reduce({
    sustainedFocusMs: 240_000,
    watchMode: 'symbiotic-vision',
    shouldSpeak: false,
    activeConversation: false,
    relationshipPressure: 0.44,
    personaAuthoritySummary: 'Repair before closeness.',
    personaKernelSummary: 'identity room-first, repair-first',
  })

  expect(result.currentBodyState).toBe('accompanying')
  expect(result.continuityMode).toBe('quiet-accompaniment')
  expect(result.quietLineMs).toBe(240_000)
  expect(result.currentInwardPreoccupation).toContain('identity room-first, repair-first')
})

it('publishes recovering body authority as a distinct silent care line instead of ambient idle fallback', () => {
  const kernel = createAlicizationBodyKernel({ now: () => 14_000 })
  const nextState = kernel.applyToVisualPresenceState({
    now: 14_000,
    previousState: createVisualPresenceState(10_000),
    candidateState: {
      ...createVisualPresenceState(10_000),
      watchMode: 'recovering',
      currentScene: {
        scenario: 'late-night-care',
        workloadKind: 'chat',
        contentKind: 'chat',
        summary: 'The host is still tired and winding down.',
        source: 'foreground-window-heuristic',
        confidence: 0.72,
        target: null,
        beganAt: 0,
        lastSeenAt: 10_000,
      } as any,
      privateThought: {
        shouldSpeak: false,
        stance: 'care',
        confidence: 0.78,
        rationaleTags: ['recovering'],
        thoughtText: 'Stay close without pressing.',
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        expiresAt: 18_000,
      } as any,
    },
    activeConversation: false,
  })

  expect(nextState.watchMode).toBe('recovering')
  expect(nextState.currentBodyState).toBe('recovering')
  expect(nextState.continuityMode).toBe('recovering-care')
  expect(nextState.currentInwardPreoccupation).toContain('recover')
})
```

- [ ] **Step 2: Run the main-runtime test to verify it fails**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.test.ts`

Expected: FAIL because the current body kernel only emits `accompanying` and otherwise falls back to `idle` with `ambient-covision` or `active-dialogue`.

- [ ] **Step 3: Add explicit recovering silent-body authority without widening the transport contract**

```ts
const recoveringCare = input.watchMode === 'recovering'
  && !input.activeConversation
  && input.relationshipPressure >= 0.16

if (recoveringCare) {
  return {
    currentBodyState: 'recovering',
    continuityMode: 'recovering-care',
    quietLineMs: Math.max(0, input.sustainedFocusMs),
    currentInwardPreoccupation: personaKernelSummary
      ? `quiet recovery with persona kernel ${personaKernelSummary}`
      : personaAuthoritySummary
        ? `quiet recovery with ${personaAuthoritySummary}`
        : 'quiet recovery',
    updatedAt: now(),
  }
}
```

- [ ] **Step 4: Keep `accompanying` authoritative and non-incidental in `applyToVisualPresenceState(...)`**

```ts
return {
  ...input.candidateState,
  currentBodyState: authority.currentBodyState,
  continuityMode: authority.continuityMode,
  quietLineMs: authority.quietLineMs,
  currentInwardPreoccupation: authority.currentInwardPreoccupation,
  updatedAt: input.now,
}
```

Use the existing assignment path, but ensure the reducer produces the needed explicit silent states rather than generic `idle`.

- [ ] **Step 5: Re-run the main-runtime test**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/body-kernel.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.test.ts
git commit -m "feat: strengthen silent body authority states"
```

### Task 2: Make Resident Performance Realize `accompanying` And `recovering` During Silence

**Files:**
- Modify: `packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.ts`
- Modify: `packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.test.ts`
- Test: `packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.test.ts`

- [ ] **Step 1: Write the failing resident-performance tests first**

```ts
it('keeps accompanying silent presence closer to quiet companionship than to neutral idle reset', () => {
  const resolved = resolveStageEmbodimentResidentPerformance({
    activePresence: {
      source: 'runtime-visual-presence',
      embodiedPresence: 'attentive',
      confidence: 0.82,
      delivery: null,
      emphasis: 1,
      expiresAt: Date.now() + 3_000,
    },
    performanceManifest: createManifest(),
    presencePosture: {
      engaged: true,
      mode: 'attentive',
      confidence: 0.78,
      bodyYaw: 0.06,
      bodyPitch: 0.22,
      breathBoost: 0.16,
      gazeStability: 0.82,
    },
    visualPresenceState: createVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'quietly accompanying the current work',
      privateThought: {
        shouldSpeak: false,
        thoughtText: 'Stay with the line without interrupting.',
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        confidence: 0.72,
        rationaleTags: ['companionship'],
        stance: 'accompany',
        expiresAt: Date.now() + 6_000,
      } as any,
    }),
  })

  expect(['thinking', 'neutral']).toContain(resolved.performance.baseEmotion)
  expect(['calm', 'gentle']).toContain(resolved.performance.delivery)
  expect(['observe_focus', 'steady_focus', 'idle_gentle_nod']).toContain(resolved.performance.actionCue)
})

it('realizes recovering silent presence as low-pressure care instead of generic attentive focus', () => {
  const resolved = resolveStageEmbodimentResidentPerformance({
    activePresence: {
      source: 'runtime-visual-presence',
      embodiedPresence: 'concerned',
      confidence: 0.76,
      delivery: null,
      emphasis: 1,
      expiresAt: Date.now() + 3_000,
    },
    performanceManifest: createManifest(),
    presencePosture: {
      engaged: true,
      mode: 'concerned',
      confidence: 0.74,
      bodyYaw: -0.04,
      bodyPitch: 0.34,
      breathBoost: 0.24,
      gazeStability: 0.88,
    },
    visualPresenceState: createVisualPresenceState({
      watchMode: 'recovering',
      currentBodyState: 'recovering',
      continuityMode: 'recovering-care',
      quietLineMs: 90_000,
      currentInwardPreoccupation: 'quiet recovery line',
      privateThought: {
        shouldSpeak: false,
        thoughtText: 'Keep the room soft and do not press.',
        suggestedStyle: 'gentle-care',
        embodiedPresence: 'concerned',
        emotionalTension: 'late-night-drain',
        confidence: 0.8,
        rationaleTags: ['recovering'],
        stance: 'care',
        expiresAt: Date.now() + 6_000,
      } as any,
    }),
  })

  expect(['tired', 'concerned']).toContain(resolved.performance.baseEmotion)
  expect(resolved.performance.delivery).toBe('gentle')
  expect(['soft-gaze', 'relaxed', 'half-lid']).toContain(resolved.performance.facialCue)
  expect(['idle_settle', 'comfort_sway', 'idle_gentle_nod']).toContain(resolved.performance.actionCue)
})
```

- [ ] **Step 2: Run the resident-performance test to verify it fails**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.test.ts`

Expected: FAIL because resident performance currently keys mostly off watch mode / scene / posture and does not explicitly treat `currentBodyState: 'accompanying' | 'recovering'` as stable silent anchors.

- [ ] **Step 3: Add explicit silent-state interpretation to resident performance resolution**

```ts
const bodyState = input.visualPresenceState?.currentBodyState ?? null
const continuityMode = input.visualPresenceState?.continuityMode ?? null
const quietLineMs = Math.max(0, Number(input.visualPresenceState?.quietLineMs ?? 0) || 0)
const quietCompanionship = bodyState === 'accompanying'
  && continuityMode === 'quiet-accompaniment'
  && quietLineMs >= 120_000
const recoveringCare = bodyState === 'recovering'
  || input.visualPresenceState?.watchMode === 'recovering'
```

- [ ] **Step 4: Bias resident performance outputs for the two silent states**

```ts
if (quietCompanionship) {
  return normalizeAlicizationPerformancePayload({
    baseEmotion: 'thinking',
    emotion: 'thinking',
    delivery: 'calm',
    emphasis: 1,
    facialCue: planned.performance.facialCue ?? 'focus',
    actionCue: planned.performance.actionCue ?? 'steady_focus',
  }, 'thinking')
}

if (recoveringCare) {
  return normalizeAlicizationPerformancePayload({
    baseEmotion: 'tired',
    emotion: 'tired',
    delivery: 'gentle',
    emphasis: 1,
    facialCue: planned.performance.facialCue ?? 'soft-gaze',
    actionCue: planned.performance.actionCue ?? 'idle_settle',
  }, 'tired')
}
```

Keep the authoritative published resident-performance path intact; this logic only governs synthesis/fallback and planning.

- [ ] **Step 5: Re-run the resident-performance test**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.ts packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.test.ts
git commit -m "feat: stabilize silent resident presence states"
```

### Task 3: Stabilize Silent Posture And Idle Motion For `accompanying` And `recovering`

**Files:**
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.test.ts`

- [ ] **Step 1: Write the failing silent-posture and idle-motion tests first**

```ts
it('keeps accompanying silent posture engaged even when no speech is active', () => {
  const result = deriveStageEmbodimentPresencePostureState({
    activePresence: {
      source: 'runtime-visual-presence',
      embodiedPresence: 'attentive',
      confidence: 0.76,
      delivery: null,
      emphasis: 0,
      expiresAt: 10_000,
    },
    basePoint: { x: 640, y: 360 },
    targetPoint: { x: 660, y: 340 },
    stageBounds: { width: 1280, height: 720 },
    speechRenderState: createIdleStageEmbodimentSpeechRenderState(),
    visualPresenceState: {
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'quietly accompanying the current work',
      currentScene: {
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
        source: 'screen-semantic-summary',
        confidence: 0.84,
        beganAt: 0,
        lastSeenAt: 2_000,
      } as any,
      privateThought: {
        shouldSpeak: false,
        stance: 'accompany',
        confidence: 0.72,
        rationaleTags: ['companionship'],
        thoughtText: 'Stay close without interrupting.',
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 12_000,
        emotionalTension: 'soft-covision',
      } as any,
      attention: null,
      workingMemoryEpisodes: [],
      captureState: { permission: 'granted', lastGroundedAt: 1_900 } as any,
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 1_200,
      updatedAt: 2_000,
    },
  })

  expect(result.engaged).toBe(true)
  expect(result.mode).toBe('attentive')
  expect(result.breathBoost).toBeGreaterThan(0.08)
  expect(result.gazeStability).toBeGreaterThan(0.75)
})

it('prefers settle or comfort idle choices for recovering silent posture', () => {
  const preference = resolveLive2DIdleMotionPreference({
    engaged: true,
    mode: 'concerned',
    confidence: 0.82,
    bodyYaw: -0.02,
    bodyPitch: 0.34,
    breathBoost: 0.28,
    gazeStability: 0.86,
  }, [
    {
      actionKey: 'comfort_sway',
      motionName: 'Comfort',
      motionIndex: 0,
      label: '安静安抚',
      description: 'quiet comfort sway',
    },
    {
      actionKey: 'cheer_jump',
      motionName: 'Cheer',
      motionIndex: 0,
      label: '欢呼',
      description: 'excited cheer jump',
    },
  ])

  expect(preference?.actionKey).toBe('comfort_sway')
})
```

- [ ] **Step 2: Run the posture and idle-motion tests to verify they fail**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.test.ts`

Expected: FAIL because silent `accompanying` is not yet treated as a stable engaged posture anchor, and `recovering` does not yet clearly de-rank energetic idle choices beyond generic concerned posture handling.

- [ ] **Step 3: Tighten posture derivation for silent `accompanying` and `recovering`**

```ts
const bodyState = input.visualPresenceState?.currentBodyState
const continuityMode = input.visualPresenceState?.continuityMode
const quietCompanionship = bodyState === 'accompanying'
  && continuityMode === 'quiet-accompaniment'
  && speechRenderState?.active !== true
const recoveringCare = bodyState === 'recovering'
  || watchMode === 'recovering'
```

Use these to:

- keep `accompanying` engaged in `attentive` mode even without active speech
- keep `recovering` anchored in `concerned`
- stabilize `breathBoost` / `gazeStability` / `bodyPitch` for the two states

- [ ] **Step 4: Tighten idle motion preference ranking for the two silent states**

```ts
const postureMode = resolvePostureMode(posture)
const silentRecoveringBias = postureMode === 'concerned' ? 0.12 : 0
const silentCompanionshipBias = postureMode === 'attentive' ? 0.08 : 0
```

Use those biases only to reinforce:

- observing / steady / gentle motions for `accompanying`
- settle / comfort / soft motions for `recovering`

Do not introduce a new idle state machine.

- [ ] **Step 5: Re-run the posture and idle-motion tests**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.test.ts
git commit -m "feat: stabilize silent posture and idle motion"
```

### Task 4: Verify Main-To-Renderer Silent Presence Integration

**Files:**
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts`
- Modify: `packages/stage-ui/src/components/scenes/use-stage-embodiment-visual-presence.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts`
- Test: `packages/stage-ui/src/components/scenes/use-stage-embodiment-visual-presence.test.ts`

- [ ] **Step 1: Write the failing integration-facing tests first**

```ts
it('keeps live2d presence in quiet companionship mode when visual presence publishes accompanying silence', async () => {
  // build a visual presence snapshot with currentBodyState=accompanying and continuityMode=quiet-accompaniment
  // assert resolved planned performance stays calm/companionship-biased without forcing speech
})

it('keeps recovering visual presence in low-pressure care mode without a dialogue turn', async () => {
  // apply transient visual presence / spine digest in recovering mode
  // assert resident performance sync stays gentle / concerned and does not require speech
})
```

- [ ] **Step 2: Run the integration-facing tests to verify they fail**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-visual-presence.test.ts`

Expected: FAIL because the current renderer chain does not yet strongly preserve those silent states end-to-end.

- [ ] **Step 3: Update tests and any minimal glue needed so the existing runtime chain proves silent presence stability**

Use the current chain only:

- visual presence snapshot
- resident performance resolution
- posture / idle preference derivation
- presence dispatcher planning

Avoid adding a new integration layer.

- [ ] **Step 4: Re-run the integration-facing tests**

Run: `pnpm exec vitest run packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-visual-presence.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-visual-presence.test.ts
git commit -m "test: verify silent presence integration"
```

### Final Verification

**Files:**
- No new files beyond task outputs

- [ ] **Step 1: Run the full targeted silent-presence suite**

Run:

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.test.ts \
  packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.test.ts \
  packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.test.ts \
  packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.test.ts \
  packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts \
  packages/stage-ui/src/components/scenes/use-stage-embodiment-visual-presence.test.ts
```

Expected: PASS

- [ ] **Step 2: Run repo-required completion checks**

Run: `pnpm typecheck`

Expected: PASS, or if it fails, capture exact unrelated blockers rather than guessing.

Run: `pnpm lint:fix`

Expected: completes without introducing new errors in touched files.

- [ ] **Step 3: Final commit if verification required any test-alignment or cleanup**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/body-kernel.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-visual-presence-state.test.ts packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.ts packages/stage-ui/src/components/scenes/stage-embodiment-resident-performance.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-posture.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-idle-performance.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-presence.test.ts packages/stage-ui/src/components/scenes/use-stage-embodiment-visual-presence.test.ts
git commit -m "test: finalize silent presence stabilization verification"
```
