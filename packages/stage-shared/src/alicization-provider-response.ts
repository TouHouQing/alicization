import type {
  AlicizationEmotion,
  AlicizationPerformanceDelivery,
} from './alicization-performance-contracts'

import {
  alicizationEmotionWhitelist,
  alicizationPerformanceDeliveryWhitelist,
} from './alicization-performance-contracts'

export type AlicizationVisibleArtifactOrigin
  = | 'provider'
    | 'failure-surface'
    | 'authorization-surface'

export interface AlicizationProviderMemoryUsage {
  workingMemoryVersion: string | null
  longTermEvidenceIds: string[]
}

export interface AlicizationProviderPerformancePayload {
  baseEmotion: AlicizationEmotion
  facialCue: string | null
  actionCue: string | null
  delivery: AlicizationPerformanceDelivery
  emphasis: 0 | 1 | 2
}

export interface AlicizationProviderResponsePayload {
  format: 'mind-turn-v1'
  thought: string
  emotion: AlicizationEmotion
  reply: string
  performance: AlicizationProviderPerformancePayload
  memoryUsage: AlicizationProviderMemoryUsage
}

export interface AlicizationVisibleArtifactLearningPolicy {
  allowLongTermCondensation: boolean
  allowPersonaLearning: boolean
  allowTraining: boolean
}

export interface AlicizationProviderVisibleArtifact extends AlicizationVisibleArtifactLearningPolicy {
  origin: 'provider'
  reply: string
  memoryUsage: AlicizationProviderMemoryUsage
  allowLongTermCondensation: true
  allowPersonaLearning: true
  allowTraining: false
}

export const alicizationProviderResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'format',
    'thought',
    'emotion',
    'reply',
    'performance',
    'memoryUsage',
  ],
  properties: {
    format: {
      type: 'string',
      const: 'mind-turn-v1',
    },
    thought: {
      type: 'string',
      maxLength: 2_000,
    },
    emotion: {
      type: 'string',
      enum: alicizationEmotionWhitelist,
    },
    reply: {
      type: 'string',
      minLength: 1,
      maxLength: 12_000,
    },
    performance: {
      type: 'object',
      additionalProperties: false,
      required: [
        'baseEmotion',
        'facialCue',
        'actionCue',
        'delivery',
        'emphasis',
      ],
      properties: {
        baseEmotion: {
          type: 'string',
          enum: alicizationEmotionWhitelist,
        },
        facialCue: {
          type: ['string', 'null'],
          maxLength: 80,
        },
        actionCue: {
          type: ['string', 'null'],
          maxLength: 80,
        },
        delivery: {
          type: 'string',
          enum: alicizationPerformanceDeliveryWhitelist,
        },
        emphasis: {
          type: 'integer',
          enum: [0, 1, 2],
        },
      },
    },
    memoryUsage: {
      type: 'object',
      additionalProperties: false,
      required: [
        'workingMemoryVersion',
        'longTermEvidenceIds',
      ],
      properties: {
        workingMemoryVersion: {
          type: ['string', 'null'],
          maxLength: 120,
        },
        longTermEvidenceIds: {
          type: 'array',
          maxItems: 16,
          items: {
            type: 'string',
            minLength: 1,
            maxLength: 160,
          },
        },
      },
    },
  },
} as const

export const alicizationProviderResponseSchema = alicizationProviderResponseJsonSchema

export const alicizationProviderResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_main_chat_turn',
    strict: true,
    schema: alicizationProviderResponseJsonSchema,
  },
} as const

export function isAlicizationProviderSchemaUnsupportedError(error: unknown) {
  const text = error instanceof Error
    ? `${error.name} ${error.message}`
    : String(error ?? '')

  return /response[_ -]?format|json[_ -]?schema|structured output/iu.test(text)
    && /unsupported|not supported|invalid parameter|unknown field|400/iu.test(text)
}

export function createAlicizationProviderVisibleArtifact(input: {
  reply: string
  memoryUsage: AlicizationProviderMemoryUsage
}): AlicizationProviderVisibleArtifact {
  return {
    origin: 'provider',
    reply: input.reply,
    memoryUsage: input.memoryUsage,
    allowLongTermCondensation: true,
    allowPersonaLearning: true,
    allowTraining: false,
  }
}
