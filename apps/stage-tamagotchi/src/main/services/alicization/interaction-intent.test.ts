import type { AlicizationInteractionIntent } from '@proj-alicization/stage-shared'

import { normalizeAlicizationEmbodimentScript, normalizeAlicizationInteractionIntent } from '@proj-alicization/stage-shared'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAlicizationPresenceDispatcherStore } from '../../../../../../packages/stage-ui/src/stores/alicization-presence-dispatcher'
import { projectInteractionPerformance } from './embodiment/interaction-performance'
import { coordinateAlicizationRuntimeEmbodiment } from './embodiment/runtime-embodiment-coordinator'
import { buildAlicizationRuntimeEmbodimentSeed } from './embodiment/runtime-embodiment-seed'
import { buildAlicizationInteractionIntent, buildAlicizationInteractionIntentFact, refineCommittedInteractionIntent } from './interaction-intent'
import { filterAlicizationProviderSystemMessages } from './main-chat-runtime-surface'
import { buildAlicizationChatStreamEmbodimentMeta, normalizeDialogueRespondedPayload } from './runtime-governance'

const now = 100_000
function surface(act = 'guide') {
  return { dialogue: { currentConsciousFrame: { updatedAt: now, subject: 'task-knot', focusAnchor: '一起处理眼前的文件', speakingIntention: '只解释已经核实的下一步', confidence: 0.8 }, answerPlanner: { act, updatedAt: now } } } as any
}
function intent(purpose: AlicizationInteractionIntent['purpose'] = 'guide') {
  return { version: 'interaction-intent-v1', cardId: 'alice', turnId: 'turn-1', purpose, attention: 'shared-task', focus: '一起处理眼前的文件', reason: '只解释已经核实的下一步', sourceRefs: [`current-conscious-frame:${now}`], confidence: 0.8, createdAt: now, expiresAt: now + 120_000 } as AlicizationInteractionIntent
}
const manifest = { renderer: 'vrm', supportsLookAt: true, supportsVisemeLipSync: true, supportsMicroDynamics: true, supportedBaseEmotions: ['neutral', 'thinking', 'concerned'], supportedFacialCues: [{ key: 'soft-gaze', label: 'soft-gaze' }], supportedActions: ['open_palm', 'reassuring_nod', 'thoughtful_pause', 'gentle_boundary', 'nod', 'idle_settle'].map(key => ({ key, label: key })) } as any
function coordinate(value = intent(), overrides: Record<string, unknown> = {}, capabilities = manifest) {
  const performance = { baseEmotion: 'neutral', emotion: 'neutral', delivery: 'gentle', emphasis: 0.3, actionCue: null, facialCue: 'soft-gaze' }
  return coordinateAlicizationRuntimeEmbodiment({ seed: buildAlicizationRuntimeEmbodimentSeed({ turnId: 'turn-1', reply: '我会先说明这一步。我们再一起检查。', performance, embodiment: { emotion: 'neutral', performance, variationToken: 'turn-1', postureHint: 'attentive', speechStyle: { rateMultiplier: 1, pitchDelta: 0, volumeDelta: 0 }, rendererHints: null }, interactionIntent: value, ...overrides } as any), manifest: capabilities, residentPerformance: null })
}
afterEach(() => vi.useRealTimers())

describe('one prepared intent drives language and body without inventing an experience', () => {
  it('keeps a greeting through canonical digital-life frames instead of replaying an older happy gesture', () => {
    vi.useFakeTimers().setSystemTime(now)
    const greetingManifest = { ...manifest, supportedBaseEmotions: ['neutral', 'happy'], supportedActions: [...manifest.supportedActions, { key: 'gentle_wave', label: 'Wave' }, { key: 'celebrate_small', label: 'Celebrate' }] }
    const old = coordinate(intent('answer'), {}, greetingManifest)
    const current = coordinate(intent('greet'), { digitalLife: old.digitalLife, authoredActionCue: 'celebrate_small' }, greetingManifest)
    expect(current.digitalLife?.frames[0].action.actionCue).toBe('gentle_wave')
    expect(current.embodiment?.performance.actionCue).toBe('gentle_wave')
    expect(current.speechTimeline?.segments[0].actionCue).toBe('gentle_wave')
  })
  it('uses the accepted reply mind to refine bodily purpose without changing its words or borrowing another turn', () => {
    vi.useFakeTimers().setSystemTime(now)
    const base = intent('answer')
    const fullText = JSON.stringify({ format: 'mind-turn-v1', reply: '我在这里。', interaction: { purpose: 'care', attention: 'host', reason: '陪她安静待一会儿' } })
    const refined = refineCommittedInteractionIntent({ cardId: 'alice', turnId: 'turn-1', now, fullText, base })!
    expect(refined).toMatchObject({ cardId: 'alice', turnId: 'turn-1', purpose: 'care', reason: '陪她安静待一会儿' })
    expect(refined.sourceRefs.some(ref => ref.startsWith('provider-reply:'))).toBe(true)
    expect(coordinate(refined).embodimentScript?.state.interactionIntent?.purpose).toBe('care')
    expect(refineCommittedInteractionIntent({ cardId: 'other', turnId: 'other-turn', now, fullText: '普通正文', base })).toBeNull()
    expect(refineCommittedInteractionIntent({ cardId: 'alice', turnId: 'turn-1', now, fullText: JSON.stringify({ interaction: { purpose: 'repair', attention: 'host', reason: 'quoted example' } }), base })).toBe(base)
  })
  it('retains every main-planned action through the real sparse dispatcher across successive turns', async () => {
    vi.useFakeTimers().setSystemTime(now)
    setActivePinia(createPinia())
    const dispatcher = useAlicizationPresenceDispatcherStore()
    const observed: Array<string | null | undefined> = []
    dispatcher.onDialogueResponded(payload => observed.push(payload.structured.performance.actionCue))
    for (const purpose of ['guide', 'care', 'reflect', 'defer'] as const) {
      const turnId = `turn-${purpose}`
      const authority = coordinate({ ...intent(purpose), turnId }, { turnId, performance: { baseEmotion: 'neutral', emotion: 'neutral', facialCue: null, actionCue: null, delivery: 'gentle', emphasis: 1 }, embodiment: { emotion: 'neutral', performance: { baseEmotion: 'neutral', emotion: 'neutral', facialCue: null, actionCue: null, delivery: 'gentle', emphasis: 1 }, variationToken: turnId, postureHint: 'attentive', speechStyle: { rateMultiplier: 1, pitchDelta: 0, volumeDelta: 0 }, rendererHints: null } })
      await dispatcher.dispatchDialogueResponded({ cardId: 'alice', turnId, sessionId: 'session', createdAt: now, structured: { thought: '核实后再表达', emotion: 'neutral', reply: authority.embodimentScript!.replyText, performance: authority.embodiment!.performance, embodiment: authority.embodiment, speechTimeline: authority.speechTimeline, digitalLife: authority.digitalLife, embodimentScript: authority.embodimentScript } } as any)
    }
    expect(observed).toEqual(['open_palm', 'reassuring_nod', 'thoughtful_pause', 'gentle_boundary'])
  })
  it('derives one scoped intent with frame evidence and retains it through the provider fact boundary', () => {
    const prepared = buildAlicizationInteractionIntent({ cardId: 'alice', turnId: 'turn-1', now, surface: surface() })!
    expect(prepared).toMatchObject({ purpose: 'guide', attention: 'shared-task', turnId: 'turn-1', cardId: 'alice' })
    expect(prepared.sourceRefs).toContain(`answer-planner:${now}`)
    const fact = buildAlicizationInteractionIntentFact(prepared)
    expect(JSON.parse(fact).data.reason).toBe(prepared.reason)
    expect(filterAlicizationProviderSystemMessages([{ role: 'system', content: fact }])).toHaveLength(1)
  })

  it('cannot reuse a stale planner or fabricate intent when the current frame is absent', () => {
    const state = surface('care')
    state.dialogue.answerPlanner.updatedAt = now - 120_001
    expect(buildAlicizationInteractionIntent({ cardId: 'alice', turnId: 'turn-1', now, surface: state })?.purpose).toBe('answer')
    state.dialogue.currentConsciousFrame.updatedAt = now - 120_001
    expect(buildAlicizationInteractionIntent({ cardId: 'alice', turnId: 'turn-1', now, surface: state })).toBeNull()
    expect(buildAlicizationInteractionIntent({ cardId: 'alice', turnId: 'turn-1', now })).toBeNull()
  })

  it.each([{ confidence: Number.NaN }, { expiresAt: now + 120_001 }, { cardId: '' }, { sourceRefs: [] }, { turnId: 'x'.repeat(121) }, { purpose: 'invented' }])('rejects unbounded or untraceable intent %j', (overrides) => {
    expect(normalizeAlicizationInteractionIntent({ ...intent(), ...overrides })).toBeNull()
  })

  it.each([['guide', 'open_palm'], ['care', 'reassuring_nod'], ['reflect', 'thoughtful_pause'], ['repair', 'reassuring_nod'], ['defer', 'gentle_boundary']] as const)('coordinates %s across script, speech and body, preserving neutral emotion', (purpose, cue) => {
    vi.useFakeTimers().setSystemTime(now)
    const authority = coordinate(intent(purpose))
    expect(authority.embodiment?.performance).toMatchObject({ baseEmotion: 'neutral', actionCue: cue })
    expect(authority.embodimentScript?.state.interactionIntent).toEqual(intent(purpose))
    expect(authority.embodimentScript?.motionPlan.actionBursts[0].actionCue).toBe(cue)
    expect(authority.speechTimeline?.segments[0].actionCue).toBe(cue)
    expect(authority.speechTimeline?.segments[0].rendererHints?.preferredMotionAliases).toEqual([cue])
    expect(authority.embodimentScript?.speechPlan.segments[0].rendererHints?.preferredMotionAliases).toEqual([cue])
    expect(authority.embodiment?.rendererHints?.preferredMotionAliases).toEqual([cue])
    expect(authority.digitalLife?.performance.actionCue).toBe(cue)
    expect(authority.embodimentScript?.motionPlan.actionBursts.slice(1).every(burst => burst.actionCue === null)).toBe(true)
    expect(normalizeAlicizationEmbodimentScript(authority.embodimentScript)?.state.interactionIntent).toEqual(intent(purpose))
  })

  it('does not replace an explicitly authored action or invent a gesture for an unsupported body', () => {
    vi.useFakeTimers().setSystemTime(now)
    const explicit = coordinate(intent(), { authoredActionCue: 'nod', performance: { baseEmotion: 'neutral', actionCue: 'nod' }, embodiment: { emotion: 'neutral', performance: { baseEmotion: 'neutral', actionCue: 'nod' } } })
    expect(explicit.embodiment?.performance.actionCue).toBe('nod')
    const unsupported = coordinate(intent(), {}, { ...manifest, supportedActions: [] })
    expect(unsupported.embodiment?.performance.actionCue).toBeNull()
    expect(unsupported.embodimentScript?.state.interactionIntent).toEqual(intent())
  })
  it('a prepared care intention cannot override canonical rest or repair boundaries', () => {
    vi.useFakeTimers().setSystemTime(now)
    const authority = coordinate()
    const seed = buildAlicizationRuntimeEmbodimentSeed({ turnId: 'turn-1', reply: '我在这里。', performance: authority.embodiment!.performance, embodiment: authority.embodiment!, interactionIntent: intent('care') } as any)
    const reserved = { ...authority, embodimentScript: { ...authority.embodimentScript!, state: { ...authority.embodimentScript!.state, residentMode: 'repair-before-closeness' } } }
    expect(projectInteractionPerformance({ seed, authority: reserved as any, manifest, now })).toBe(reserved)
    const resting = { ...seed, residentPerformance: { reasonTags: ['rest-protective'] } as any }
    expect(projectInteractionPerformance({ seed: resting, authority, manifest, now })).toBe(authority)
  })

  it('rejects another turn and suppresses an expired plan', () => {
    vi.useFakeTimers().setSystemTime(now)
    expect(coordinate({ ...intent(), turnId: 'other' }).embodimentScript?.state.interactionIntent).toBeUndefined()
    vi.setSystemTime(now + 120_001)
    expect(coordinate().embodiment?.performance.actionCue).not.toBe('open_palm')
  })

  it('streaming and committed replies share prepared intent; a provider cannot replace its purpose', () => {
    vi.useFakeTimers().setSystemTime(now)
    const governance = { turnMode: 'answer', answerAct: 'guide', relationshipPosture: 'warm', repairState: 'none', decisionTraceId: 'trace-1', truthState: 'dialogue-grounded', personaKernelMode: 'full', openingStyle: 'direct-answer' }
    const stream = buildAlicizationChatStreamEmbodimentMeta({ governance, turnId: 'turn-1', reply: '先看这一步。', interactionIntent: intent(), performanceManifest: manifest })
    const final = normalizeDialogueRespondedPayload({ turnId: 'turn-1', sessionId: 'session-1', assistantText: '先看这一步。', structured: { reply: '先看这一步。', emotion: 'neutral', thought: '核实后再说', embodimentScript: { ...stream.embodimentScript, state: { ...stream.embodimentScript?.state, interactionIntent: intent('defer') } } }, governance } as any, manifest, { interactionIntent: intent() })
    expect(stream.embodimentScript?.state.interactionIntent).toEqual(intent())
    expect(final?.structured.embodimentScript?.state.interactionIntent).toEqual(intent())
    expect(final?.structured.embodiment?.performance.actionCue).toBe('open_palm')
    expect(final?.structured.embodiment?.variationToken).toBe(stream.embodiment?.variationToken)
  })
})
