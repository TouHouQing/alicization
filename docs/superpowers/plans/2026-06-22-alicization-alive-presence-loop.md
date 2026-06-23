# Alicization Alive Presence Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 Alive Presence Loop so startup restore and significant silent state changes can surface a runtime-authored near-body thought without becoming chat, debug UI, or template copy.

**Architecture:** Add a `presenceExpression` contract to visual presence state, build it in the main runtime from grounded internal state, persist it through existing visual presence emission, and render it in `Stage.vue` through a small near-body overlay. The renderer never writes presence text; it only displays runtime-authored text when the expression is valid, unexpired, and not overlapping dialogue.

**Tech Stack:** TypeScript, Electron main process, Eventa contracts, Vue 3 `<script setup>`, Pinia-facing stage-ui stores, Vitest, pnpm workspace filters.

---

## File Structure

Create:

- `apps/stage-tamagotchi/src/main/services/alicization/presence-expression.ts`
  - Owns grounded state extraction, prompt input shaping, quality guards, fingerprinting, and final `AlicizationPresenceExpressionSnapshot` creation.
- `apps/stage-tamagotchi/src/main/services/alicization/presence-expression.test.ts`
  - Unit tests for generation and withholding behavior.
- `packages/stage-ui/src/components/scenes/stage-presence-expression-overlay.vue`
  - Lightweight near-body visual projection.
- `packages/stage-ui/src/components/scenes/stage-presence-expression-overlay-state.ts`
  - Pure display decision and placement helper used by the Vue component.
- `packages/stage-ui/src/components/scenes/stage-presence-expression-overlay-state.test.ts`
  - Renderer-side tests without mounting Vue.

Modify:

- `apps/stage-tamagotchi/src/shared/eventa.ts`
  - Add `AlicizationPresenceExpressionSnapshot` and `presenceExpression?: ... | null` on `AlicizationVisualPresenceStateSnapshot`.
- `apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts`
  - Normalize, default, preserve, and update `presenceExpression`.
- `apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.test.ts`
  - Contract/normalization regression coverage.
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
  - Attach presence expression during presence-only hold state persistence.
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.test.ts`
  - Regression tests for measured-return, repair-first, rest-protective, and suppression cases.
- `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-soul-state.ts`
  - Add an optional startup-restore refresher before returning visual presence state.
- `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
  - Wire the presence expression builder into subconscious tick and startup restore handler options.
- `packages/stage-ui/src/components/scenes/Stage.vue`
  - Render the overlay with `visualPresenceState.presenceExpression` and the existing character frame.

---

### Task 1: Visual Presence Contract And Normalization

**Files:**
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.test.ts`

- [ ] **Step 1: Write failing normalization tests**

Append these tests to the visual episodic memory `describe` block:

```ts
it('normalizes a runtime-authored presence expression on visual presence state', () => {
  const state = normalizeVisualPresenceState({
    presenceExpression: {
      version: 'presence-expression-v1',
      id: 'presence-expression:restore:1',
      text: 'A short grounded line from runtime.',
      trigger: 'startup-restore',
      display: {
        mode: 'near-body-whisper',
        allowAutoShow: true,
        createdAt: 9_000,
        expiresAt: 15_000,
        intensity: 'soft',
      },
      grounding: {
        sourceRefs: ['privateThought', 'emotionalKernel'],
        reasonTags: ['recovering', 'protective-watch'],
        stateFingerprint: 'recovering:protective-watch:9000',
        confidence: 0.82,
      },
      audit: {
        generated: true,
        qualityFlags: [],
      },
    },
  }, 10_000)

  expect(state.presenceExpression).toEqual(expect.objectContaining({
    version: 'presence-expression-v1',
    id: 'presence-expression:restore:1',
    text: 'A short grounded line from runtime.',
    trigger: 'startup-restore',
  }))
  expect(state.presenceExpression?.display).toEqual(expect.objectContaining({
    mode: 'near-body-whisper',
    allowAutoShow: true,
    intensity: 'soft',
  }))
})

it('drops malformed or expired presence expressions during visual presence normalization', () => {
  const malformed = normalizeVisualPresenceState({
    presenceExpression: {
      version: 'presence-expression-v1',
      id: '',
      text: '',
      trigger: 'startup-restore',
      display: {
        mode: 'near-body-whisper',
        allowAutoShow: true,
        createdAt: 9_000,
        expiresAt: 15_000,
        intensity: 'soft',
      },
      grounding: {
        sourceRefs: [],
        reasonTags: [],
        stateFingerprint: '',
        confidence: 0,
      },
      audit: {
        generated: true,
        qualityFlags: [],
      },
    },
  }, 10_000)
  const expired = normalizeVisualPresenceState({
    presenceExpression: {
      version: 'presence-expression-v1',
      id: 'presence-expression:expired',
      text: 'already gone',
      trigger: 'state-shift',
      display: {
        mode: 'near-body-whisper',
        allowAutoShow: true,
        createdAt: 1_000,
        expiresAt: 2_000,
        intensity: 'barely-there',
      },
      grounding: {
        sourceRefs: ['privateThought'],
        reasonTags: ['stale'],
        stateFingerprint: 'old',
        confidence: 0.8,
      },
      audit: {
        generated: true,
        qualityFlags: [],
      },
    },
  }, 10_000)

  expect(malformed.presenceExpression).toBeNull()
  expect(expired.presenceExpression).toBeNull()
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.test.ts
```

Expected: FAIL because `presenceExpression` is not part of the visual presence contract or normalization path.

- [ ] **Step 3: Add the shared Eventa contract**

In `apps/stage-tamagotchi/src/shared/eventa.ts`, add this interface near visual presence types:

```ts
export interface AlicizationPresenceExpressionSnapshot {
  version: 'presence-expression-v1'
  id: string
  text: string
  trigger:
    | 'startup-restore'
    | 'state-shift'
    | 'presence-only-hold'
    | 'memory-carry-return'
  display: {
    mode: 'near-body-whisper'
    allowAutoShow: boolean
    createdAt: number
    expiresAt: number
    intensity: 'barely-there' | 'soft'
  }
  grounding: {
    sourceRefs: string[]
    reasonTags: string[]
    stateFingerprint: string
    confidence: number
  }
  audit: {
    generated: boolean
    withheldReason?: string | null
    qualityFlags: string[]
  }
}
```

Then add this field to `AlicizationVisualPresenceStateSnapshot`:

```text
presenceExpression?: AlicizationPresenceExpressionSnapshot | null
```

- [ ] **Step 4: Implement visual presence normalization**

In `visual-episodic-memory.ts`, add `AlicizationPresenceExpressionSnapshot` to the existing type import from `../../../shared/eventa`, then add helpers near the existing visual presence normalization helpers:

```ts
function normalizePresenceExpressionTrigger(
  raw: unknown,
): AlicizationPresenceExpressionSnapshot['trigger'] | null {
  return raw === 'startup-restore'
    || raw === 'state-shift'
    || raw === 'presence-only-hold'
    || raw === 'memory-carry-return'
    ? raw
    : null
}

function normalizePresenceExpression(raw: unknown, now: number): AlicizationPresenceExpressionSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, any>
  const trigger = normalizePresenceExpressionTrigger(candidate.trigger)
  const text = sanitizeText(candidate.text, 120)
  const id = sanitizeText(candidate.id, 160)
  const display = candidate.display && typeof candidate.display === 'object' && !Array.isArray(candidate.display)
    ? candidate.display as Record<string, unknown>
    : null
  const grounding = candidate.grounding && typeof candidate.grounding === 'object' && !Array.isArray(candidate.grounding)
    ? candidate.grounding as Record<string, unknown>
    : null
  const audit = candidate.audit && typeof candidate.audit === 'object' && !Array.isArray(candidate.audit)
    ? candidate.audit as Record<string, unknown>
    : null
  const createdAt = Math.max(0, Math.floor(Number(display?.createdAt)))
  const expiresAt = Math.max(0, Math.floor(Number(display?.expiresAt)))
  const confidence = clamp01(Number(grounding?.confidence))
  const sourceRefs = Array.isArray(grounding?.sourceRefs)
    ? grounding.sourceRefs.map(item => sanitizeText(item, 64)).filter(Boolean).slice(0, 12)
    : []
  const reasonTags = Array.isArray(grounding?.reasonTags)
    ? grounding.reasonTags.map(item => sanitizeText(item, 64)).filter(Boolean).slice(0, 12)
    : []
  const qualityFlags = Array.isArray(audit?.qualityFlags)
    ? audit.qualityFlags.map(item => sanitizeText(item, 64)).filter(Boolean).slice(0, 12)
    : []

  if (
    candidate.version !== 'presence-expression-v1'
    || !id
    || !text
    || !trigger
    || display?.mode !== 'near-body-whisper'
    || (display?.intensity !== 'barely-there' && display?.intensity !== 'soft')
    || !Number.isFinite(createdAt)
    || !Number.isFinite(expiresAt)
    || expiresAt <= now
    || expiresAt <= createdAt
    || sourceRefs.length === 0
    || !sanitizeText(grounding?.stateFingerprint, 180)
  ) {
    return null
  }

  return {
    version: 'presence-expression-v1',
    id,
    text,
    trigger,
    display: {
      mode: 'near-body-whisper',
      allowAutoShow: display.allowAutoShow === true,
      createdAt,
      expiresAt,
      intensity: display.intensity,
    },
    grounding: {
      sourceRefs,
      reasonTags,
      stateFingerprint: sanitizeText(grounding?.stateFingerprint, 180),
      confidence,
    },
    audit: {
      generated: audit?.generated === true,
      withheldReason: sanitizeText(audit?.withheldReason, 160) || null,
      qualityFlags,
    },
  }
}
```

Add `presenceExpression: null` to `createDefaultVisualPresenceState(...)`.

In `normalizeVisualPresenceState(...)`, assign:

```ts
base.presenceExpression = normalizePresenceExpression(candidate.presenceExpression, now)
```

In `updateVisualPresenceState(...)`, add input support:

```text
presenceExpression?: AlicizationVisualPresenceStateSnapshot['presenceExpression']
```

and carry it into the returned state:

```text
presenceExpression: input.presenceExpression === undefined
  ? previousState.presenceExpression ?? null
  : normalizePresenceExpression(input.presenceExpression, input.now),
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/stage-tamagotchi/src/shared/eventa.ts apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.ts apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.test.ts
git commit -m "feat(stage-tamagotchi): add presence expression contract"
```

---

### Task 2: Runtime Presence Expression Builder

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/presence-expression.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/presence-expression.test.ts`

- [ ] **Step 1: Write failing builder tests**

Create `presence-expression.test.ts`:

```ts
import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationPresenceExpression,
  guardAlicizationPresenceExpressionText,
} from './presence-expression'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function createGroundedState(now = 10_000): AlicizationVisualPresenceStateSnapshot {
  return {
    ...createDefaultVisualPresenceState(now),
    currentBodyState: 'recovering',
    continuityMode: 'protective-watch',
    quietLineMs: 180_000,
    currentInwardPreoccupation: 'repair-before-closeness carry is holding the return lower-pressure',
    watchMode: 'recovering',
    privateThought: {
      stance: 'care',
      confidence: 0.84,
      rationaleTags: ['repair-before-closeness', 'quiet-companionship'],
      thoughtText: 'The return should stay lower-pressure until repair settles.',
      shouldSpeak: false,
      suggestedStyle: 'gentle-care',
      embodiedPresence: 'concerned',
      expiresAt: now + 5_000,
      emotionalTension: 'soft-covision',
    },
    emotionalKernel: {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'repair-tension',
      initiativeMode: 'repair',
      memoryRecallMode: 'repair-grounding',
      embodimentTone: 'repair-before-closeness',
      valence: -0.18,
      arousal: 0.35,
      guardedness: 0.72,
      closenessDrive: 0.24,
      repairNeed: 0.78,
      initiativePressure: 0.2,
      reasonTags: ['repair-before-closeness'],
      why: 'Repair should settle before closeness expands.',
    },
    initiative: {
      shouldSpeak: false,
      selectedAction: 'recheck',
      preferredStyle: 'silent-observe',
      preferredPresence: 'concerned',
      confidence: 0.81,
      why: 'Hold the opening inward because repair-before-closeness is still active.',
      reasonTags: ['presence-only-hold'],
      continuityRestraint: 'repair-before-closeness',
    } as any,
  }
}

describe('presence expression builder', () => {
  it('builds a grounded runtime-authored near-body expression', async () => {
    const now = 10_000
    const generate = vi.fn(async () => ({
      text: '嗯，先让这里慢下来一点。',
    }))

    const expression = await buildAlicizationPresenceExpression({
      now,
      trigger: 'presence-only-hold',
      previousState: createDefaultVisualPresenceState(now - 1_000),
      state: createGroundedState(now),
      generate,
    })

    expect(generate).toHaveBeenCalledOnce()
    expect(expression).toEqual(expect.objectContaining({
      version: 'presence-expression-v1',
      text: '嗯，先让这里慢下来一点。',
      trigger: 'presence-only-hold',
    }))
    expect(expression?.display).toEqual(expect.objectContaining({
      mode: 'near-body-whisper',
      allowAutoShow: true,
    }))
    expect(expression?.grounding.sourceRefs).toEqual(expect.arrayContaining([
      'privateThought',
      'emotionalKernel',
      'initiative',
    ]))
  })

  it('withholds when state is too thin or the generator returns template-like text', async () => {
    const now = 10_000
    const thin = await buildAlicizationPresenceExpression({
      now,
      trigger: 'startup-restore',
      previousState: null,
      state: createDefaultVisualPresenceState(now),
      generate: vi.fn(async () => ({ text: 'anything' })),
    })
    const templated = guardAlicizationPresenceExpressionText({
      text: '我在旁边，先不打扰你。',
      groundingText: 'repair-before-closeness carry',
    })

    expect(thin).toBeNull()
    expect(templated.accepted).toBe(false)
    expect(templated.qualityFlags).toContain('banned-template')
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/presence-expression.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the builder module**

Create `presence-expression.ts`:

```ts
import type {
  AlicizationPresenceExpressionSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'

interface PresenceExpressionGenerationResult {
  text?: string | null
}

interface BuildPresenceExpressionInput {
  now: number
  trigger: AlicizationPresenceExpressionSnapshot['trigger']
  previousState: AlicizationVisualPresenceStateSnapshot | null | undefined
  state: AlicizationVisualPresenceStateSnapshot
  generate?: (input: {
    prompt: string
    groundingText: string
    reasonTags: string[]
  }) => Promise<PresenceExpressionGenerationResult | string | null | undefined>
}

const bannedTemplatePatterns = [
  /我在旁边[，,]?\s*先不打扰你/u,
  /这条线我还记着/u,
  /\bphase\s*1\b/i,
  /项目|模块|debug|benchmark|runtime|visualPresenceState/i,
]

function sanitizeText(raw: unknown, maxChars = 120) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function unique(items: string[]) {
  return [...new Set(items.map(item => sanitizeText(item, 80)).filter(Boolean))]
}

export function guardAlicizationPresenceExpressionText(input: {
  text: string
  groundingText: string
}) {
  const text = sanitizeText(input.text, 120)
  const qualityFlags: string[] = []

  if (!text)
    qualityFlags.push('blank')
  if (text.length > 80)
    qualityFlags.push('too-long')
  if (bannedTemplatePatterns.some(pattern => pattern.test(text)))
    qualityFlags.push('banned-template')
  if (/请你|你需要|你应该|可以帮我/u.test(text))
    qualityFlags.push('asks-host-to-act')
  if (!input.groundingText || input.groundingText.length < 24)
    qualityFlags.push('thin-grounding')

  return {
    accepted: qualityFlags.length === 0,
    qualityFlags,
    text,
  }
}

function buildGrounding(input: BuildPresenceExpressionInput) {
  const state = input.state
  const reasonTags = unique([
    ...(state.privateThought?.rationaleTags ?? []),
    ...(state.emotionalKernel?.reasonTags ?? []),
    ...(state.initiative?.reasonTags ?? []),
    state.currentBodyState,
    state.continuityMode,
    state.initiative?.continuityRestraint ?? '',
  ])
  const sourcePairs = [
    ['privateThought', state.privateThought?.thoughtText],
    ['currentInwardPreoccupation', state.currentInwardPreoccupation],
    ['emotionalKernel', state.emotionalKernel?.why],
    ['initiative', state.initiative?.why],
    ['affectiveResidue', state.affectiveResidue?.summary],
    ['memoryCarry', state.runtimeDigest?.activeLoop?.summary],
  ] as const
  const groundedSources = sourcePairs
    .map(([source, text]) => ({ source, text: sanitizeText(text, 220) }))
    .filter(item => item.text)
  const groundingText = groundedSources.map(item => `${item.source}: ${item.text}`).join(' | ')
  const hasVisibleBodyState = state.currentBodyState === 'recovering'
    || state.currentBodyState === 'accompanying'
    || state.continuityMode === 'protective-watch'
    || state.continuityMode === 'quiet-accompaniment'
  const shouldSpeak = state.privateThought?.shouldSpeak === true || state.initiative?.shouldSpeak === true
  const confidence = clamp01(Math.max(
    Number(state.privateThought?.confidence ?? 0),
    Number(state.initiative?.confidence ?? 0),
    Number(state.emotionalKernel ? 0.72 : 0),
  ))

  if (!hasVisibleBodyState || shouldSpeak || groundedSources.length < 2 || confidence < 0.55)
    return null

  return {
    confidence,
    groundingText,
    reasonTags,
    sourceRefs: groundedSources.map(item => item.source),
    stateFingerprint: [
      input.trigger,
      state.currentBodyState,
      state.continuityMode,
      state.initiative?.continuityRestraint ?? '',
      reasonTags.join('+'),
    ].join('|'),
  }
}

function buildPrompt(groundingText: string) {
  return [
    'Write one very short near-body inner expression for Alicization.',
    'It should feel like a real person briefly surfacing her current inner state.',
    'Do not mention project status, modules, Phase 1, runtime, memory labels, or debug terms.',
    'Do not use canned reassurance templates.',
    'Do not ask the host to do anything.',
    `Grounding: ${groundingText}`,
  ].join('\n')
}

function readGeneratedText(raw: PresenceExpressionGenerationResult | string | null | undefined) {
  if (typeof raw === 'string')
    return raw
  return raw?.text ?? ''
}

export async function buildAlicizationPresenceExpression(
  input: BuildPresenceExpressionInput,
): Promise<AlicizationPresenceExpressionSnapshot | null> {
  const grounding = buildGrounding(input)
  if (!grounding || !input.generate)
    return null

  const generated = await input.generate({
    prompt: buildPrompt(grounding.groundingText),
    groundingText: grounding.groundingText,
    reasonTags: grounding.reasonTags,
  }).catch(() => null)
  const guarded = guardAlicizationPresenceExpressionText({
    text: readGeneratedText(generated),
    groundingText: grounding.groundingText,
  })
  if (!guarded.accepted)
    return null

  return {
    version: 'presence-expression-v1',
    id: `presence-expression:${input.trigger}:${input.now}:${Math.abs(grounding.stateFingerprint.length)}`,
    text: guarded.text,
    trigger: input.trigger,
    display: {
      mode: 'near-body-whisper',
      allowAutoShow: true,
      createdAt: input.now,
      expiresAt: input.now + 6_000,
      intensity: grounding.confidence >= 0.75 ? 'soft' : 'barely-there',
    },
    grounding: {
      sourceRefs: grounding.sourceRefs,
      reasonTags: grounding.reasonTags,
      stateFingerprint: grounding.stateFingerprint,
      confidence: grounding.confidence,
    },
    audit: {
      generated: true,
      withheldReason: null,
      qualityFlags: guarded.qualityFlags,
    },
  }
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/presence-expression.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/presence-expression.ts apps/stage-tamagotchi/src/main/services/alicization/presence-expression.test.ts
git commit -m "feat(stage-tamagotchi): build grounded presence expressions"
```

---

### Task 3: Runtime Integration For Presence-Only Hold And Startup Restore

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-soul-state.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`

- [ ] **Step 1: Write failing subconscious integration tests**

Extend `createPresenceOnlyPersistRuntimeHarness(...)` in `runtime-subconscious-tick.test.ts` so the returned `options` includes:

```ts
const buildPresenceExpression = vi.fn(async ({ state, trigger }: Record<string, any>) => ({
  version: 'presence-expression-v1',
  id: `presence-expression:${trigger}:test`,
  text: '嗯，先让这里慢下来一点。',
  trigger,
  display: {
    mode: 'near-body-whisper',
    allowAutoShow: true,
    createdAt: now,
    expiresAt: now + 6_000,
    intensity: 'soft',
  },
  grounding: {
    sourceRefs: ['privateThought', 'emotionalKernel', 'initiative'],
    reasonTags: state?.residentPerformance?.reasonTags ?? ['quiet-companionship'],
    stateFingerprint: `${state?.currentBodyState}:${state?.continuityMode}`,
    confidence: 0.82,
  },
  audit: {
    generated: true,
    qualityFlags: [],
  },
}))
```

Return it from the harness for assertions.

Add this test under `createAlicizationSubconsciousTickRuntime presence-only persist`:

```ts
it('persists a runtime-authored presence expression on presence-only measured-return hold', async () => {
  const { now, options, persistVisualPresenceState, buildPresenceExpression } = (createPresenceOnlyPersistRuntimeHarness as any)({
    profile: 'measured-return',
  })
  const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)

  try {
    const runtime = runtimeSubconsciousTickModule.createAlicizationSubconsciousTickRuntime(options)
    await runtime.runSubconsciousTickForCurrentCard('timer')

    const secondPersistedState = persistVisualPresenceState.mock.calls[1]?.[1]
    expect(buildPresenceExpression).toHaveBeenCalledWith(expect.objectContaining({
      trigger: 'presence-only-hold',
      state: expect.objectContaining({
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
      }),
    }))
    expect(secondPersistedState?.presenceExpression).toEqual(expect.objectContaining({
      version: 'presence-expression-v1',
      trigger: 'presence-only-hold',
      text: '嗯，先让这里慢下来一点。',
    }))
  }
  finally {
    dateNowSpy.mockRestore()
  }
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.test.ts -t "presence expression"
```

Expected: FAIL because subconscious tick does not call the builder.

- [ ] **Step 3: Attach expression before the second presence-only persist**

In `runtime-subconscious-tick.ts`, destructure the optional builder:

```text
buildPresenceExpression = async () => null,
```

near other option destructuring.

Immediately before the second `persistVisualPresenceState(activeCardId, nextPresenceStateWithBodyAuthority)` call in the presence-only persist path, insert:

```ts
const presenceExpression = await buildPresenceExpression({
  now: Date.now(),
  trigger: 'presence-only-hold',
  previousState: persistedPresenceState,
  state: nextPresenceStateWithBodyAuthority,
}).catch(() => null)

const nextPresenceStateWithExpression = presenceExpression
  ? updateVisualPresenceState({
      now: Date.now(),
      previousState: nextPresenceStateWithBodyAuthority,
      watchMode: nextPresenceStateWithBodyAuthority.watchMode,
      presenceExpression,
    } as any)
  : nextPresenceStateWithBodyAuthority

await persistVisualPresenceState(activeCardId, nextPresenceStateWithExpression)
```

Replace the original persist call with the final line above. Keep the first persist unchanged so existing two-write tests remain meaningful.

- [ ] **Step 4: Add startup-restore refresher hook**

In `runtime-invoke-handlers-soul-state.ts`, extend options:

```text
refreshVisualPresenceForStartupRestore?: (input: {
  cardId: string
  state: Record<string, unknown>
}) => Promise<Record<string, unknown> | null>
```

Destructure with default:

```text
refreshVisualPresenceForStartupRestore = async ({ state }) => state,
```

In the `electronAlicizationGetVisualPresenceState` handler, after `ensureVisualPresenceState` returns an object and before building `runtimeDigest`, add:

```ts
const refreshedState = await refreshVisualPresenceForStartupRestore({
  cardId: targetCardId,
  state,
}).catch(() => state)
const stateForDigest = refreshedState && typeof refreshedState === 'object'
  ? refreshedState
  : state
```

Then derive the runtime digest from `stateForDigest` and return:

```ts
return {
  ...stateForDigest,
  runtimeDigest,
}
```

- [ ] **Step 5: Wire the builder in runtime composition**

In `runtime.ts`, import:

```ts
import { buildAlicizationPresenceExpression } from './presence-expression'
```

Add a small local generator wrapper near other runtime helper closures:

```ts
async function generatePresenceExpressionText(input: {
  prompt: string
  groundingText: string
  reasonTags: string[]
}) {
  const structured = await generateProactiveStructuredWithGateway({
    prompt: input.prompt,
    reasonTags: input.reasonTags,
    fallbackText: '',
  } as any).catch(() => null)
  return {
    text: typeof structured?.reply === 'string'
      ? structured.reply
      : typeof structured?.text === 'string'
        ? structured.text
        : '',
  }
}

async function buildRuntimePresenceExpression(input: {
  now: number
  trigger: 'startup-restore' | 'state-shift' | 'presence-only-hold' | 'memory-carry-return'
  previousState: any
  state: any
}) {
  return await buildAlicizationPresenceExpression({
    ...input,
    generate: generatePresenceExpressionText,
  })
}
```

Pass `buildPresenceExpression: buildRuntimePresenceExpression` into `createAlicizationSubconsciousTickRuntime(...)`.

Pass `refreshVisualPresenceForStartupRestore` into `registerAlicizationSoulStateInvokeHandlers(...)`:

```text
refreshVisualPresenceForStartupRestore: async ({ cardId, state }) => {
  const currentTs = Date.now()
  if ((state as any).presenceExpression?.display?.expiresAt > currentTs)
    return state

  const expression = await buildRuntimePresenceExpression({
    now: currentTs,
    trigger: 'startup-restore',
    previousState: null,
    state,
  })
  if (!expression)
    return state

  const nextState = updateVisualPresenceState({
    now: currentTs,
    previousState: state as any,
    watchMode: (state as any).watchMode,
    presenceExpression: expression,
  } as any)
  await persistVisualPresenceState(cardId, nextState)
  return nextState as any
},
```

- [ ] **Step 6: Run focused runtime tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.test.ts -t "presence expression"
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-soul-state.test.ts 2>/dev/null || true
```

Expected: the new presence expression test passes. If the invoke handler test file does not exist, the second command exits without blocking.

- [ ] **Step 7: Commit**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-soul-state.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.ts
git commit -m "feat(stage-tamagotchi): persist presence expressions from runtime"
```

---

### Task 4: Renderer Overlay Display Logic

**Files:**
- Create: `packages/stage-ui/src/components/scenes/stage-presence-expression-overlay-state.ts`
- Create: `packages/stage-ui/src/components/scenes/stage-presence-expression-overlay-state.test.ts`
- Create: `packages/stage-ui/src/components/scenes/stage-presence-expression-overlay.vue`

- [ ] **Step 1: Write failing pure display tests**

Create `stage-presence-expression-overlay-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { resolveStagePresenceExpressionOverlayState } from './stage-presence-expression-overlay-state'

const expression = {
  version: 'presence-expression-v1' as const,
  id: 'presence-expression:test',
  text: '嗯，先让这里慢下来一点。',
  trigger: 'presence-only-hold' as const,
  display: {
    mode: 'near-body-whisper' as const,
    allowAutoShow: true,
    createdAt: 10_000,
    expiresAt: 16_000,
    intensity: 'soft' as const,
  },
  grounding: {
    sourceRefs: ['privateThought'],
    reasonTags: ['quiet-companionship'],
    stateFingerprint: 'fingerprint',
    confidence: 0.82,
  },
  audit: {
    generated: true,
    qualityFlags: [],
  },
}

describe('stage presence expression overlay state', () => {
  it('shows valid runtime-authored near-body expressions near the character frame', () => {
    const state = resolveStagePresenceExpressionOverlayState({
      now: 12_000,
      expression,
      characterFrame: { x: 300, y: 220, width: 120, height: 260 },
      hostSize: { width: 800, height: 600 },
      dialogueVisible: false,
      loading: false,
      streaming: false,
    })

    expect(state.visible).toBe(true)
    expect(state.text).toBe(expression.text)
    expect(state.style.left).toBeTruthy()
    expect(state.style.top).toBeTruthy()
  })

  it('suppresses expired expressions and dialogue overlap', () => {
    expect(resolveStagePresenceExpressionOverlayState({
      now: 20_000,
      expression,
      characterFrame: { x: 300, y: 220, width: 120, height: 260 },
      hostSize: { width: 800, height: 600 },
      dialogueVisible: false,
      loading: false,
      streaming: false,
    }).visible).toBe(false)

    expect(resolveStagePresenceExpressionOverlayState({
      now: 12_000,
      expression,
      characterFrame: { x: 300, y: 220, width: 120, height: 260 },
      hostSize: { width: 800, height: 600 },
      dialogueVisible: true,
      loading: false,
      streaming: false,
    }).visible).toBe(false)
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/components/scenes/stage-presence-expression-overlay-state.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the pure display helper**

Create `stage-presence-expression-overlay-state.ts`:

```ts
import type { AlicizationVisualPresenceStateSnapshot } from '../../stores/alicization-bridge'
import type { StageCharacterFrame } from '../../utils'

interface Size {
  width: number
  height: number
}

export function resolveStagePresenceExpressionOverlayState(input: {
  now: number
  expression: NonNullable<AlicizationVisualPresenceStateSnapshot['presenceExpression']> | null | undefined
  characterFrame: StageCharacterFrame | null | undefined
  hostSize: Size
  dialogueVisible: boolean
  loading: boolean
  streaming: boolean
}) {
  const expression = input.expression
  if (
    !expression
    || !expression.text.trim()
    || expression.display.mode !== 'near-body-whisper'
    || !expression.display.allowAutoShow
    || expression.display.expiresAt <= input.now
    || input.dialogueVisible
    || input.loading
    || input.streaming
    || !input.characterFrame
    || input.hostSize.width <= 0
    || input.hostSize.height <= 0
  ) {
    return {
      visible: false,
      text: '',
      intensity: 'barely-there' as const,
      style: {},
    }
  }

  const frame = input.characterFrame
  const left = Math.min(input.hostSize.width - 220, Math.max(12, frame.x + frame.width * 0.58))
  const top = Math.min(input.hostSize.height - 96, Math.max(12, frame.y + frame.height * 0.12))

  return {
    visible: true,
    text: expression.text.trim(),
    intensity: expression.display.intensity,
    style: {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
    },
  }
}
```

- [ ] **Step 4: Implement the Vue overlay**

Create `stage-presence-expression-overlay.vue`:

```vue
<script setup lang="ts">
import type { AlicizationVisualPresenceStateSnapshot } from '../../stores/alicization-bridge'
import type { StageCharacterFrame } from '../../utils'

import { useNow, useResizeObserver } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'

import { resolveStagePresenceExpressionOverlayState } from './stage-presence-expression-overlay-state'

const props = withDefaults(defineProps<{
  expression?: AlicizationVisualPresenceStateSnapshot['presenceExpression'] | null
  characterFrame?: StageCharacterFrame | null
  dialogueVisible?: boolean
  loading?: boolean
  streaming?: boolean
}>(), {
  expression: null,
  characterFrame: null,
  dialogueVisible: false,
  loading: false,
  streaming: false,
})

const hostRef = useTemplateRef<HTMLDivElement>('host')
const hostSize = ref({ width: 0, height: 0 })
const now = useNow({ interval: 500 })

useResizeObserver(hostRef, (entries) => {
  const entry = entries[0]
  if (!entry)
    return
  hostSize.value = {
    width: entry.contentRect.width,
    height: entry.contentRect.height,
  }
})

const overlay = computed(() => resolveStagePresenceExpressionOverlayState({
  now: now.value.getTime(),
  expression: props.expression,
  characterFrame: props.characterFrame,
  hostSize: hostSize.value,
  dialogueVisible: props.dialogueVisible,
  loading: props.loading,
  streaming: props.streaming,
}))
</script>

<template>
  <div ref="host" class="stage-presence-expression-host" aria-live="polite">
    <Transition name="stage-presence-expression">
      <div
        v-if="overlay.visible"
        class="stage-presence-expression"
        :class="`stage-presence-expression--${overlay.intensity}`"
        :style="overlay.style"
      >
        {{ overlay.text }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.stage-presence-expression-host {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.stage-presence-expression {
  position: absolute;
  max-width: min(220px, 46vw);
  padding: 0.55rem 0.72rem;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 1rem 1.15rem 0.95rem 1.25rem;
  background: rgb(28 30 36 / 68%);
  color: rgb(255 250 242 / 94%);
  box-shadow: 0 0.9rem 2rem rgb(0 0 0 / 18%);
  backdrop-filter: blur(16px) saturate(1.08);
  font-size: 0.78rem;
  line-height: 1.45;
}

.stage-presence-expression--barely-there {
  opacity: 0.78;
}

.stage-presence-expression-enter-active,
.stage-presence-expression-leave-active {
  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.stage-presence-expression-enter-from,
.stage-presence-expression-leave-to {
  opacity: 0;
  transform: translateY(0.3rem) scale(0.98);
}
</style>
```

- [ ] **Step 5: Run the focused renderer test**

Run:

```bash
pnpm exec vitest run packages/stage-ui/src/components/scenes/stage-presence-expression-overlay-state.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/stage-ui/src/components/scenes/stage-presence-expression-overlay-state.ts packages/stage-ui/src/components/scenes/stage-presence-expression-overlay-state.test.ts packages/stage-ui/src/components/scenes/stage-presence-expression-overlay.vue
git commit -m "feat(stage-ui): add presence expression overlay"
```

---

### Task 5: Stage Integration And End-To-End Verification

**Files:**
- Modify: `packages/stage-ui/src/components/scenes/Stage.vue`
- Modify or create: `packages/stage-ui/src/components/scenes/stage-presence-expression-overlay-state.test.ts`
- Run targeted tests from prior tasks.

- [ ] **Step 1: Import the overlay in Stage**

In `Stage.vue`, add:

```ts
import StagePresenceExpressionOverlay from './stage-presence-expression-overlay.vue'
```

- [ ] **Step 2: Reuse existing character frame and dialogue visibility**

`Stage.vue` already defines `stageCharacterFrame`, `bubbleLoading`, `bubbleStreaming`, and `shouldRenderDialogueOverlay`. Reuse those existing computed values for the presence expression overlay. No new character-frame computed is needed.

Use `shouldRenderDialogueOverlay` as the single dialogue-overlap source for this slice.

- [ ] **Step 3: Render the overlay in the stage template**

Place the overlay in the same absolute stage root that already contains dialogue UI, after model renderers and before diagnostics:

```vue
<StagePresenceExpressionOverlay
  :expression="visualPresenceState?.presenceExpression ?? null"
  :character-frame="stageCharacterFrame"
  :dialogue-visible="shouldRenderDialogueOverlay"
  :loading="componentState !== 'mounted'"
  :streaming="bubbleStreaming"
/>
```

- [ ] **Step 4: Add one pure integration assertion**

Extend `stage-presence-expression-overlay-state.test.ts` with:

```ts
it('keeps renderer from inventing text when runtime expression is absent', () => {
  const state = resolveStagePresenceExpressionOverlayState({
    now: 12_000,
    expression: null,
    characterFrame: { x: 300, y: 220, width: 120, height: 260 },
    hostSize: { width: 800, height: 600 },
    dialogueVisible: false,
    loading: false,
    streaming: false,
  })

  expect(state.visible).toBe(false)
  expect(state.text).toBe('')
})
```

- [ ] **Step 5: Run targeted tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/presence-expression.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/visual-episodic-memory.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-subconscious-tick.test.ts -t "presence expression"
pnpm exec vitest run packages/stage-ui/src/components/scenes/stage-presence-expression-overlay-state.test.ts
```

Expected: all pass.

- [ ] **Step 6: Run scoped typecheck and record results**

Run:

```bash
pnpm -F @proj-alicization/stage-tamagotchi typecheck
pnpm -F @proj-alicization/stage-ui typecheck
```

Expected: PASS. If a command reports an unrelated pre-existing failure, record the exact failing file and diagnostic in the execution summary, then continue only if the targeted tests above are green.

- [ ] **Step 7: Manual desktop smoke test**

Run:

```bash
APP_REMOTE_DEBUG=true APP_REMOTE_DEBUG_PORT=9222 pnpm -F @proj-alicization/stage-tamagotchi dev
```

Verify:

- app opens to `http://localhost:5173/#/`
- Live2D/VRM body renders
- `getVisualPresenceState()` can return `presenceExpression` only when runtime produced it
- normal dialogue bubble suppresses near-body whisper
- no expression appears for default `idle / ambient-covision`
- no expression text enters chat history

Stop the dev server before ending the execution session.

- [ ] **Step 8: Commit**

```bash
git add packages/stage-ui/src/components/scenes/Stage.vue packages/stage-ui/src/components/scenes/stage-presence-expression-overlay-state.test.ts
git commit -m "feat(stage-ui): project runtime presence expressions near body"
```

---

## Self-Review

Spec coverage:

- Runtime-authored wording: Task 2 and Task 3.
- No renderer-generated text: Task 4 and Task 5.
- Significant state changes and presence-only hold: Task 2 and Task 3.
- Startup restore: Task 3.
- Near-body whisper: Task 4 and Task 5.
- Normalization / bridge carry: Task 1.
- Tests and manual verification: all tasks include focused tests; Task 5 includes desktop smoke.

Completeness scan:

- No deferred implementation gaps are intentionally left open.
- No fixed user-facing fallback copy is required by the plan.
- The only concrete Chinese strings are test fixtures used to prove generated text passes or banned templates are rejected.

Type consistency:

- `AlicizationPresenceExpressionSnapshot` is introduced in Task 1 before all later tasks reference it.
- `presenceExpression` is added to `AlicizationVisualPresenceStateSnapshot` before renderer types reference it.
- `buildAlicizationPresenceExpression` is created in Task 2 before runtime integration uses it.
- `resolveStagePresenceExpressionOverlayState` is created in Task 4 before `Stage.vue` uses the overlay.
