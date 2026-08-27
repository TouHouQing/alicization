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
