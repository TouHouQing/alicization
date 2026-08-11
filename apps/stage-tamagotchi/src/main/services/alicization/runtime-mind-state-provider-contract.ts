const confidenceSchema = {
  type: 'number',
  minimum: 0,
  maximum: 1,
} as const

function nullableTextSchema(maxLength: number) {
  return {
    type: ['string', 'null'],
    maxLength,
  } as const
}

function shortLabelArraySchema(maxItems: number) {
  return {
    type: 'array',
    maxItems,
    items: {
      type: 'string',
      minLength: 1,
      maxLength: 48,
    },
  } as const
}

export const alicizationDialogueTurnSemanticsJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'act',
    'responseNeed',
    'truthExpectation',
    'affectiveTone',
    'subjectPreference',
    'taskAnchor',
    'sharedAttentionDemand',
    'personaSuppression',
    'confidence',
    'reasonTags',
    'codingAgentDelegation',
  ],
  properties: {
    act: {
      type: 'string',
      enum: [
        'ask-help',
        'ask-teach',
        'verify-grounding',
        'correct',
        'challenge',
        'share-state',
        'seek-care',
        'social-bid',
        'continue-thread',
        'close-thread',
        'unknown',
      ],
    },
    responseNeed: {
      type: 'string',
      enum: ['repair', 'guide', 'teach', 'answer', 'care', 'accompany', 'clarify'],
    },
    truthExpectation: {
      type: 'string',
      enum: ['strict', 'normal', 'light'],
    },
    affectiveTone: {
      type: 'string',
      enum: ['frustrated', 'tired', 'urgent', 'warm', 'neutral'],
    },
    subjectPreference: {
      type: ['string', 'null'],
      enum: ['alicization-self', 'relationship', 'host-state', 'task-knot', 'visible-scene', 'general', null],
    },
    taskAnchor: nullableTextSchema(160),
    sharedAttentionDemand: confidenceSchema,
    personaSuppression: confidenceSchema,
    confidence: confidenceSchema,
    reasonTags: shortLabelArraySchema(10),
    codingAgentDelegation: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['intentKind', 'requestedAgent', 'verdict', 'scope', 'confidence'],
      properties: {
        intentKind: {
          type: 'string',
          enum: ['capability-query', 'execute'],
        },
        requestedAgent: {
          type: ['string', 'null'],
          enum: ['auto', 'codex', 'claude-code', 'cli', null],
        },
        verdict: {
          type: 'string',
          enum: ['respond-directly', 'clarify', 'delegate-coding-agent'],
        },
        scope: {
          type: 'string',
          enum: ['none', 'investigation', 'edit', 'command'],
        },
        confidence: confidenceSchema,
      },
    },
  },
} as const

export const alicizationDialogueTurnSemanticsResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_dialogue_turn_semantics',
    strict: true,
    schema: alicizationDialogueTurnSemanticsJsonSchema,
  },
} as const

const hostIntentCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['goal', 'confidence', 'why'],
  properties: {
    goal: {
      type: 'string',
      enum: [
        'resolve-problem',
        'inspect-change',
        'consume-media',
        'rest',
        'chat',
        'browse',
        'unknown',
      ],
    },
    confidence: confidenceSchema,
    why: {
      type: 'string',
      minLength: 1,
      maxLength: 180,
    },
  },
} as const

const relationshipNeedCandidateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['need', 'confidence', 'why'],
  properties: {
    need: {
      type: 'string',
      enum: ['space', 'companionship', 'guidance', 'care', 'unclear'],
    },
    confidence: confidenceSchema,
    why: {
      type: 'string',
      minLength: 1,
      maxLength: 180,
    },
  },
} as const

export const alicizationSubjectiveInferenceJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dominantInterpretation',
    'situatedMeaning',
    'selfQuestion',
    'uncertainty',
    'hostIntentCandidates',
    'relationshipNeedCandidates',
    'confidence',
    'notes',
  ],
  properties: {
    dominantInterpretation: nullableTextSchema(220),
    situatedMeaning: nullableTextSchema(220),
    selfQuestion: nullableTextSchema(220),
    uncertainty: nullableTextSchema(220),
    hostIntentCandidates: {
      type: 'array',
      maxItems: 3,
      items: hostIntentCandidateSchema,
    },
    relationshipNeedCandidates: {
      type: 'array',
      maxItems: 3,
      items: relationshipNeedCandidateSchema,
    },
    confidence: confidenceSchema,
    notes: shortLabelArraySchema(8),
  },
} as const

export const alicizationSubjectiveInferenceResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_subjective_inference',
    strict: true,
    schema: alicizationSubjectiveInferenceJsonSchema,
  },
} as const
