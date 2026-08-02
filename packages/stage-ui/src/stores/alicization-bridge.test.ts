import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { clampAlicizationPerformancePayloadToManifest } from './alicization-bridge'

describe('alicization performance manifest clamp', () => {
  it('keeps dialogue answer subjects bounded to self, relationship, host, task, scene, and general context', () => {
    const source = readFileSync(new URL('./alicization-bridge.ts', import.meta.url), 'utf8')

    expect(source).toContain('export type AlicizationDialogueAnswerSubject')
    expect(source).toContain(`| 'alicization-self'`)
    expect(source).toContain(`| 'relationship'`)
    expect(source).toContain(`| 'host-state'`)
    expect(source).toContain(`| 'task-knot'`)
    expect(source).toContain(`| 'visible-scene'`)
    expect(source).toContain(`| 'general'`)
  })

  it('keeps humanlike memory audit and correction on the shared bridge contract', () => {
    const source = readFileSync(new URL('./alicization-bridge.ts', import.meta.url), 'utf8')

    expect(source).toContain('export interface AlicizationListHumanlikeMemoryAuditPayload')
    expect(source).toContain('export interface AlicizationCorrectHumanlikeMemoryAuditPayload')
    expect(source).toContain('export type AlicizationHumanlikeMemoryAuditEntry')
    expect(source).toContain('export type AlicizationHumanlikeMemoryCorrectionRecord')
    expect(source).toContain('listHumanlikeMemoryAudit?: (payload: AlicizationListHumanlikeMemoryAuditPayload) => Promise<AlicizationHumanlikeMemoryAuditEntry[]>')
    expect(source).toContain('correctHumanlikeMemoryAudit?: (payload: AlicizationCorrectHumanlikeMemoryAuditPayload) => Promise<AlicizationHumanlikeMemoryCorrectionRecord>')
  })

  it('keeps the Electron renderer bridge wired to humanlike memory audit invoke channels', () => {
    const source = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/renderer/App.vue', import.meta.url), 'utf8')

    expect(source).toContain('electronAlicizationListHumanlikeMemoryAudit')
    expect(source).toContain('electronAlicizationCorrectHumanlikeMemoryAudit')
    expect(source).toContain('const alicizationListHumanlikeMemoryAudit = useElectronEventaInvoke(electronAlicizationListHumanlikeMemoryAudit)')
    expect(source).toContain('const alicizationCorrectHumanlikeMemoryAudit = useElectronEventaInvoke(electronAlicizationCorrectHumanlikeMemoryAudit)')
    expect(source).toContain('listHumanlikeMemoryAudit: async payload => await alicizationListHumanlikeMemoryAudit({ ...resolveAlicizationScope(), ...payload })')
    expect(source).toContain('correctHumanlikeMemoryAudit: async payload => await alicizationCorrectHumanlikeMemoryAudit({ ...resolveAlicizationScope(), ...payload })')
  })

  it('exposes memory workbench eventa invokes through the desktop bridge', () => {
    const source = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/renderer/App.vue', import.meta.url), 'utf8')

    expect(source).toContain('electronAlicizationMemoryWorkbenchGetSnapshot')
    expect(source).toContain('electronAlicizationMemoryWorkbenchListLongTerm')
    expect(source).toContain('electronAlicizationMemoryWorkbenchApplyReviewAction')
    expect(source).toContain('electronAlicizationMemoryWorkbenchRecallProbe')
    expect(source).toContain('electronAlicizationMemoryWorkbenchListPersonaCandidates')
    expect(source).toContain('electronAlicizationMemoryWorkbenchApplyPersonaCandidateAction')
    expect(source).toContain('electronAlicizationMemoryWorkbenchReindexEmbeddings')
    expect(source).toContain('electronAlicizationMemoryWorkbenchListEmbeddingModels')
    expect(source).toContain('electronAlicizationMemoryWorkbenchTestEmbeddingConnection')
    expect(source).toContain('memoryWorkbenchGetSnapshot')
    expect(source).toContain('memoryWorkbenchRecallProbe')
    expect(source).toContain('memoryWorkbenchListPersonaCandidates')
    expect(source).toContain('memoryWorkbenchApplyPersonaCandidateAction')
    expect(source).toContain('memoryWorkbenchReindexEmbeddings')
    expect(source).toContain('memoryWorkbenchListEmbeddingModels')
    expect(source).toContain('memoryWorkbenchTestEmbeddingConnection')
  })

  it('summarizes visible-reply critic and closure before the desktop renderer forwards finish events', () => {
    const source = readFileSync(new URL('../../../../apps/stage-tamagotchi/src/renderer/App.vue', import.meta.url), 'utf8')

    expect(source).toContain('summarizeAlicizationVisibleReplyCriticForRenderer')
    expect(source).toContain('summarizeAlicizationVisibleReplyClosureForRenderer')
    expect(source).toContain('pending.visibleReplyCritic = summarizeAlicizationVisibleReplyCriticForRenderer(payload.visibleReplyCritic)')
    expect(source).toContain('pending.visibleReplyClosure = summarizeAlicizationVisibleReplyClosureForRenderer(payload.visibleReplyClosure)')
    expect(source).not.toContain('pending.visibleReplyCritic = payload.visibleReplyCritic ?? null')
    expect(source).not.toContain('pending.visibleReplyClosure = payload.visibleReplyClosure ?? null')
  })

  it('drops unsupported cues and downgrades unsupported base emotions', () => {
    const result = clampAlicizationPerformancePayloadToManifest({
      baseEmotion: 'angry',
      emotion: 'angry',
      facialCue: 'unknown_face',
      actionCue: 'unknown_action',
      delivery: 'firm',
      emphasis: 2,
    }, {
      renderer: 'vrm',
      supportedBaseEmotions: ['neutral', 'happy'],
      supportedFacialCues: [{
        key: 'smile',
        label: 'Smile',
        description: 'A brighter smile layered over the current emotion.',
        source: 'preset',
        affectsMouth: true,
      }],
      supportedActions: [{
        key: 'wave',
        label: 'Wave',
        description: 'A friendly wave animation.',
        source: 'external-vrma',
      }],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: false,
    }, 'happy')

    expect(result.performance).toEqual(expect.objectContaining({
      baseEmotion: 'happy',
      emotion: 'happy',
      facialCue: null,
      actionCue: null,
    }))
    expect(result.downgradedBaseEmotion).toBe('angry')
    expect(result.droppedFacialCue).toBe('unknown_face')
    expect(result.droppedActionCue).toBe('unknown_action')
  })

  it('keeps supported cues intact', () => {
    const result = clampAlicizationPerformancePayloadToManifest({
      baseEmotion: 'happy',
      emotion: 'happy',
      facialCue: 'smile',
      actionCue: 'wave',
      delivery: 'energetic',
      emphasis: 1,
    }, {
      renderer: 'vrm',
      supportedBaseEmotions: ['neutral', 'happy'],
      supportedFacialCues: [{
        key: 'smile',
        label: 'Smile',
        description: 'A brighter smile layered over the current emotion.',
        source: 'preset',
        affectsMouth: true,
      }],
      supportedActions: [{
        key: 'wave',
        label: 'Wave',
        description: 'A friendly wave animation.',
        source: 'external-vrma',
      }],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: false,
    })

    expect(result.performance).toEqual(expect.objectContaining({
      baseEmotion: 'happy',
      emotion: 'happy',
      facialCue: 'smile',
      actionCue: 'wave',
    }))
    expect(result.downgradedBaseEmotion).toBeUndefined()
    expect(result.droppedFacialCue).toBeUndefined()
    expect(result.droppedActionCue).toBeUndefined()
  })
})
