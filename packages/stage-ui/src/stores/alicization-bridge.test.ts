import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { clampAlicizationPerformancePayloadToManifest } from './alicization-bridge'

describe('alicization performance manifest clamp', () => {
  it('keeps bridge project-state observation and continuity types explicitly legacy-aware for latestProgress-based continuity payloads', () => {
    const source = readFileSync(new URL('./alicization-bridge.ts', import.meta.url), 'utf8')

    expect(source).toContain('export interface AlicizationProjectStateObservation')
    expect(source).toContain('export interface AlicizationProjectStateContinuitySnapshot')
    expect(source).toContain('latestProgress?: string | null')
  })

  it('keeps project-state as a first-class answer subject so visual presence snapshots can carry Phase 1 self-awareness', () => {
    const source = readFileSync(new URL('./alicization-bridge.ts', import.meta.url), 'utf8')

    expect(source).toContain('export type AlicizationDialogueAnswerSubject')
    expect(source).toContain(`| 'project-state'`)
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
