import type {
  AlicizationEmotion,
  AlicizationPerformanceDelivery,
} from './alicization-performance-contracts'

import { sanitizeAlicizationMemoryEvidenceText } from './alicization-fixed-template-sanitizer'
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

export type AlicizationProviderMemoryEvidenceKind
  = | 'episode'
    | 'preference'
    | 'relationship'
    | 'procedure'
    | 'correction'

export type AlicizationProviderMemoryEvidenceSensitivity
  = 'public'
    | 'personal'
    | 'private'
    | 'secret'

export interface AlicizationProviderMemoryEvidence {
  version: 'provider-memory-evidence-v1'
  kind: AlicizationProviderMemoryEvidenceKind
  summary: string
  reason: string
  evidenceSnippets: string[]
  salience: number
  sensitivity: AlicizationProviderMemoryEvidenceSensitivity
  confidence: number
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
  memoryEvidence: AlicizationProviderMemoryEvidence | null
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

const providerMemoryEvidenceFields = [
  'version',
  'kind',
  'summary',
  'reason',
  'evidenceSnippets',
  'salience',
  'sensitivity',
  'confidence',
] as const

function hasExactProviderMemoryEvidenceKeys(record: Record<string, unknown>) {
  const actual = Object.keys(record).sort()
  const expected = [...providerMemoryEvidenceFields].sort()
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index])
}

export function normalizeAlicizationProviderMemoryEvidence(
  raw: unknown,
): AlicizationProviderMemoryEvidence | null {
  if (raw === undefined || raw === null)
    return null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const record = raw as Record<string, unknown>
  if (!hasExactProviderMemoryEvidenceKeys(record))
    return null
  if (
    record.version !== 'provider-memory-evidence-v1'
    || record.kind !== 'episode'
    && record.kind !== 'preference'
    && record.kind !== 'relationship'
    && record.kind !== 'procedure'
    && record.kind !== 'correction'
    || typeof record.summary !== 'string'
    || typeof record.reason !== 'string'
      || !Array.isArray(record.evidenceSnippets)
    || record.sensitivity !== 'public'
    && record.sensitivity !== 'personal'
      && record.sensitivity !== 'private'
    && record.sensitivity !== 'secret'
      || typeof record.salience !== 'number'
    || !Number.isFinite(record.salience)
      || record.salience < 0
    || record.salience > 1
      || typeof record.confidence !== 'number'
    || !Number.isFinite(record.confidence)
      || record.confidence < 0
    || record.confidence > 1
  ) {
    return null
  }

  const normalizeCleanText = (value: unknown, maxLength: number) => {
    if (typeof value !== 'string' || value.length > maxLength)
      return null
    const normalized = value.trim().replace(/\s+/gu, ' ')
    const cleaned = sanitizeAlicizationMemoryEvidenceText(
      value,
      maxLength,
      { provenance: 'internal-structured-fact' },
    )
    return cleaned && cleaned === normalized ? cleaned : null
  }

  const summary = normalizeCleanText(record.summary, 260)
  const reason = normalizeCleanText(record.reason, 260)
  const evidenceSnippets = record.evidenceSnippets.length <= 8
    ? record.evidenceSnippets.map(snippet => normalizeCleanText(snippet, 260))
    : []
  if (
    !summary
    || !reason
    || evidenceSnippets.length === 0
    || evidenceSnippets.some(snippet => !snippet)
  ) {
    return null
  }

  return {
    version: 'provider-memory-evidence-v1',
    kind: record.kind,
    summary,
    reason,
    evidenceSnippets: evidenceSnippets as string[],
    salience: record.salience,
    sensitivity: record.sensitivity,
    confidence: record.confidence,
  }
}

const providerMemoryEvidenceSchema = {
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
  properties: {
    version: {
      type: 'string',
      const: 'provider-memory-evidence-v1',
    },
    kind: {
      type: 'string',
      enum: ['episode', 'preference', 'relationship', 'procedure', 'correction'],
    },
    summary: {
      type: 'string',
      minLength: 1,
      maxLength: 260,
    },
    reason: {
      type: 'string',
      minLength: 1,
      maxLength: 260,
    },
    evidenceSnippets: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 260,
      },
    },
    salience: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    sensitivity: {
      type: 'string',
      enum: ['public', 'personal', 'private', 'secret'],
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
  },
} as const

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
    'memoryEvidence',
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
    memoryEvidence: providerMemoryEvidenceSchema,
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
