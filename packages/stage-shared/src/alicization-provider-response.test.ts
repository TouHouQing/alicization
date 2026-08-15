import type {
  AlicizationProviderResponsePayload,
  AlicizationVisibleArtifactOrigin,
} from './alicization-provider-response'

import { describe, expect, it } from 'vitest'

import {
  alicizationEmotionWhitelist,
  alicizationPerformanceDeliveryWhitelist,
} from './alicization-performance-contracts'
import {
  alicizationProviderResponseFormat,
  alicizationProviderResponseJsonSchema,
  createAlicizationProviderVisibleArtifact,
  isAlicizationProviderSchemaUnsupportedError,
} from './alicization-provider-response'

describe('alicization provider response contract', () => {
  const providerResponseFixture = {
    format: 'mind-turn-v1',
    thought: 'Use the retrieved evidence that directly answers this turn.',
    emotion: 'thinking',
    reply: '我找到了那条长期记忆。',
    performance: {
      baseEmotion: 'thinking',
      facialCue: null,
      actionCue: 'observe_focus',
      delivery: 'calm',
      emphasis: 0,
    },
    memoryUsage: {
      workingMemoryVersion: 'working-memory-owner-context-v1',
      longTermEvidenceIds: ['memory-1'],
    },
    memoryEvidence: null,
  } satisfies AlicizationProviderResponsePayload

  it('defines the strict native JSON schema response format', () => {
    expect(alicizationProviderResponseFormat).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'alicization_main_chat_turn',
        strict: true,
        schema: alicizationProviderResponseJsonSchema,
      },
    })

    expect(alicizationProviderResponseJsonSchema.required).toEqual([
      'format',
      'thought',
      'emotion',
      'reply',
      'performance',
      'memoryUsage',
      'memoryEvidence',
    ])
    expect(alicizationProviderResponseJsonSchema.additionalProperties).toBe(false)
    expect(alicizationProviderResponseJsonSchema.properties.format).toEqual({
      type: 'string',
      const: 'mind-turn-v1',
    })
    expect(alicizationProviderResponseJsonSchema.properties.thought).toEqual({
      type: 'string',
      maxLength: 2_000,
    })
    expect(alicizationProviderResponseJsonSchema.properties.emotion.enum).toEqual(alicizationEmotionWhitelist)
    expect(alicizationProviderResponseJsonSchema.properties.reply).toEqual({
      type: 'string',
      minLength: 1,
      maxLength: 12_000,
    })

    const performanceSchema = alicizationProviderResponseJsonSchema.properties.performance
    expect(performanceSchema.required).toEqual([
      'baseEmotion',
      'facialCue',
      'actionCue',
      'delivery',
      'emphasis',
    ])
    expect(performanceSchema.additionalProperties).toBe(false)
    expect(performanceSchema.properties.baseEmotion.enum).toEqual(alicizationEmotionWhitelist)
    expect(performanceSchema.properties.facialCue.type).toEqual(['string', 'null'])
    expect(performanceSchema.properties.facialCue.maxLength).toBe(80)
    expect(performanceSchema.properties.actionCue.type).toEqual(['string', 'null'])
    expect(performanceSchema.properties.actionCue.maxLength).toBe(80)
    expect(performanceSchema.properties.delivery.enum).toEqual([
      'calm',
      'gentle',
      'firm',
      'energetic',
      'hesitant',
      'teasing',
    ])
    expect(performanceSchema.properties.delivery.enum).toBe(alicizationPerformanceDeliveryWhitelist)
    expect(performanceSchema.properties.emphasis.enum).toEqual([0, 1, 2])

    const memoryUsageSchema = alicizationProviderResponseJsonSchema.properties.memoryUsage
    expect(memoryUsageSchema.required).toEqual([
      'workingMemoryVersion',
      'longTermEvidenceIds',
    ])
    expect(memoryUsageSchema.additionalProperties).toBe(false)
    expect(memoryUsageSchema.properties.longTermEvidenceIds).toEqual({
      type: 'array',
      maxItems: 16,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 160,
      },
    })
    expect(alicizationProviderResponseJsonSchema.properties.memoryEvidence).toMatchObject({
      type: ['object', 'null'],
      additionalProperties: false,
      required: [
        'version',
        'kind',
        'summary',
        'reason',
        'evidenceSnippets',
        'salience',
        'sensitivity',
        'confidence',
      ],
    })
    expect(providerResponseFixture.performance).toEqual({
      baseEmotion: 'thinking',
      facialCue: null,
      actionCue: 'observe_focus',
      delivery: 'calm',
      emphasis: 0,
    })
  })

  it('keeps natural-language reply policy out of the native schema', () => {
    expect(JSON.stringify(alicizationProviderResponseJsonSchema)).not.toMatch(
      /"(?:personality|persona|tone|opening|ending|same[- ]?her|phase\s*1|project[- ]state|continuity|人格|语气|开场|结尾)"\s*:/iu,
    )
  })

  it('recognizes native schema compatibility failures without matching unrelated HTTP 400 errors', () => {
    expect(isAlicizationProviderSchemaUnsupportedError(
      new Error('Remote sent 400 response: {"error":{"message":"response_format json_schema is an invalid parameter"}}'),
    )).toBe(true)
    expect(isAlicizationProviderSchemaUnsupportedError(
      new Error('Remote sent 400 response: {"error":{"message":"invalid tool_choice"}}'),
    )).toBe(false)
  })

  it('marks provider output as the learnable visible reply authority without training it', () => {
    const artifact = createAlicizationProviderVisibleArtifact({
      reply: '我找到了那条长期记忆。',
      memoryUsage: {
        workingMemoryVersion: 'working-memory-owner-context-v1',
        longTermEvidenceIds: ['memory-1'],
      },
    })
    const allowedOrigins: AlicizationVisibleArtifactOrigin[] = [
      'provider',
      'failure-surface',
      'authorization-surface',
    ]

    expect(allowedOrigins).toEqual([
      'provider',
      'failure-surface',
      'authorization-surface',
    ])
    expect(artifact).toEqual(expect.objectContaining({
      origin: 'provider',
      allowLongTermCondensation: true,
      allowPersonaLearning: true,
      allowTraining: false,
    }))
    expect(artifact.memoryUsage).toEqual({
      workingMemoryVersion: 'working-memory-owner-context-v1',
      longTermEvidenceIds: ['memory-1'],
    })
  })
})
