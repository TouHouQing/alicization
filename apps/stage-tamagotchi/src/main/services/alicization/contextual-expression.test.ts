import { describe, expect, it } from 'vitest'

import { contextualExpression } from './contextual-expression'
import { buildAlicizationChatStreamEmbodimentMeta } from './runtime-governance'

describe('context distinguishes the same happy emotion', () => {
  it('greets with a wave and reserves the celebration for accomplishment', () => {
    const performance = { emotion: 'happy' as const, baseEmotion: 'happy' as const, actionCue: 'comfort_sway', facialCue: 'smile', delivery: 'gentle' as const, emphasis: 1 as const }
    const intent = { version: 'interaction-intent-v1' as const, cardId: 'alice', turnId: 'turn', attention: 'host' as const, purpose: 'greet' as const, focus: '', reason: 'welcome', sourceRefs: ['current-turn'], confidence: 0.8, createdAt: 1, expiresAt: 1000 }
    expect(contextualExpression(performance, intent)).toMatchObject({ baseEmotion: 'happy', actionCue: 'gentle_wave', emphasis: 0 })
    expect(contextualExpression(performance, { ...intent, purpose: 'celebrate' })).toMatchObject({ baseEmotion: 'happy', actionCue: 'celebrate_small' })
    expect(contextualExpression({ ...performance, baseEmotion: 'sad' }, intent)).toMatchObject({ baseEmotion: 'sad', actionCue: 'comfort_sway' })
  })
  it('keeps the contextual gesture through the complete speech and body coordinator', () => {
    const governance = { turnMode: 'answer', answerAct: 'guide', relationshipPosture: 'warm', repairState: 'none', decisionTraceId: 'trace-1', truthState: 'dialogue-grounded', personaKernelMode: 'full', openingStyle: 'direct-answer' }
    const performanceManifest = { renderer: 'vrm' as const, supportsLookAt: true, supportsVisemeLipSync: true, supportsMicroDynamics: true, supportedBaseEmotions: ['neutral', 'happy'] as const, supportedFacialCues: [{ key: 'smile', label: 'Smile' }], supportedActions: ['gentle_wave', 'celebrate_small', 'nod', 'settle_idle'].map(key => ({ key, label: key })) }
    const interactionIntent = { version: 'interaction-intent-v1' as const, cardId: 'alice', turnId: 'turn-1', attention: 'host' as const, purpose: 'greet' as const, focus: '', reason: 'welcome', sourceRefs: ['current-turn'], confidence: 0.8, createdAt: Date.now(), expiresAt: Date.now() + 60000 }
    const meta = buildAlicizationChatStreamEmbodimentMeta({ governance, turnId: 'turn-1', reply: '嗨，欢迎回来。', interactionIntent, explicitPerformance: { emotion: 'happy', baseEmotion: 'happy', actionCue: 'celebrate_small', facialCue: 'smile', delivery: 'gentle', emphasis: 1 }, performanceManifest: performanceManifest as unknown as Parameters<typeof buildAlicizationChatStreamEmbodimentMeta>[0]['performanceManifest'] })
    expect(meta.embodiment?.performance.actionCue).toBe('gentle_wave')
    expect(JSON.stringify(meta.embodimentScript)).toContain('gentle_wave')
    expect(JSON.stringify(meta.embodimentScript)).not.toContain('celebrate_small')
  })
})
