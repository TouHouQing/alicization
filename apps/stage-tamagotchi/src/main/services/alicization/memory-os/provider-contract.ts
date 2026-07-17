const confidenceSchema = {
  type: 'number',
  minimum: 0,
  maximum: 1,
} as const

function textSchema(maxLength: number) {
  return {
    type: 'string',
    minLength: 1,
    maxLength,
  } as const
}

function nullableTextSchema(maxLength: number) {
  return {
    type: ['string', 'null'],
    maxLength,
  } as const
}

function textArraySchema(maxItems: number, maxLength: number) {
  return {
    type: 'array',
    maxItems,
    items: textSchema(maxLength),
  } as const
}

const candidateTimeScopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['scope', 'weight', 'rationale'],
  properties: {
    scope: {
      type: 'string',
      enum: ['recent', 'recent-or-mid', 'cross-session', 'experience-matched', 'distant'],
    },
    weight: confidenceSchema,
    rationale: nullableTextSchema(180),
  },
} as const

const candidateEraFacetSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['facet', 'weight', 'rationale'],
  properties: {
    facet: {
      type: 'string',
      enum: ['phase', 'relationship-era', 'task-era', 'self-era', 'window'],
    },
    weight: confidenceSchema,
    rationale: nullableTextSchema(180),
  },
} as const

export const alicizationMemoryRecollectionIntentJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'mode',
    'temporalFocus',
    'searchEpisodes',
    'searchConversations',
    'searchProceduralExperience',
    'queryHints',
    'rationale',
    'confidence',
    'recollectionAgenda',
  ],
  properties: {
    mode: {
      type: 'string',
      enum: [
        'none',
        'conversation-history',
        'autobiographical-history',
        'relationship-history',
        'execution-procedure',
        'experience-pattern',
      ],
    },
    temporalFocus: {
      type: 'string',
      enum: ['recent', 'recent-or-mid', 'cross-session', 'experience-matched', 'distant'],
    },
    searchEpisodes: { type: 'boolean' },
    searchConversations: { type: 'boolean' },
    searchProceduralExperience: { type: 'boolean' },
    queryHints: textArraySchema(8, 120),
    rationale: textSchema(220),
    confidence: confidenceSchema,
    recollectionAgenda: {
      type: 'object',
      additionalProperties: false,
      required: [
        'whyRecallNow',
        'goalSimilarity',
        'relationshipNeed',
        'affectivePull',
        'sceneFamiliarity',
        'candidateTimeScopes',
        'candidateEraFacets',
        'candidateProcedureLines',
        'uncertaintyTolerance',
      ],
      properties: {
        whyRecallNow: textSchema(220),
        goalSimilarity: confidenceSchema,
        relationshipNeed: confidenceSchema,
        affectivePull: confidenceSchema,
        sceneFamiliarity: confidenceSchema,
        candidateTimeScopes: {
          type: 'array',
          maxItems: 4,
          items: candidateTimeScopeSchema,
        },
        candidateEraFacets: {
          type: 'array',
          maxItems: 4,
          items: candidateEraFacetSchema,
        },
        candidateProcedureLines: textArraySchema(4, 180),
        uncertaintyTolerance: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
        },
      },
    },
  },
} as const

export const alicizationMemoryRecollectionIntentResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_memory_recollection_intent',
    strict: true,
    schema: alicizationMemoryRecollectionIntentJsonSchema,
  },
} as const

const recollectionFirstHopSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['focus', 'summary', 'targetIds'],
  properties: {
    focus: {
      type: 'string',
      enum: ['era', 'procedure', 'relationship-line', 'conversation-turn', 'episode'],
    },
    summary: textSchema(220),
    targetIds: textArraySchema(6, 120),
  },
} as const

const recollectionSecondHopSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'evidenceGap', 'summary', 'targetIds'],
  properties: {
    action: {
      type: 'string',
      enum: [
        'hold',
        'expand-era',
        'expand-procedure',
        'expand-relationship-line',
        'expand-conversation',
        'narrow-to-stable-core',
      ],
    },
    evidenceGap: {
      type: 'string',
      enum: [
        'none',
        'need-period-anchor',
        'need-episode-detail',
        'need-procedure-detail',
        'need-relationship-meaning',
        'need-conversation-evidence',
        'need-disambiguation',
      ],
    },
    summary: textSchema(220),
    targetIds: textArraySchema(6, 120),
  },
} as const

const recollectionThirdHopSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ambiguityPosture', 'summary'],
  properties: {
    ambiguityPosture: {
      type: 'string',
      enum: ['settled', 'approximate', 'ambiguous'],
    },
    summary: textSchema(220),
  },
} as const

export const alicizationMemoryRecollectionPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'selectedConsolidationIds',
    'selectedWindowIds',
    'selectedProceduralIds',
    'selectedEpisodeIds',
    'selectedConversationTurnIds',
    'selectedRelationshipLines',
    'searchTrace',
    'certainty',
    'rationale',
    'confidence',
  ],
  properties: {
    selectedConsolidationIds: textArraySchema(8, 120),
    selectedWindowIds: textArraySchema(8, 120),
    selectedProceduralIds: textArraySchema(8, 120),
    selectedEpisodeIds: textArraySchema(8, 120),
    selectedConversationTurnIds: textArraySchema(8, 120),
    selectedRelationshipLines: textArraySchema(3, 220),
    searchTrace: {
      type: 'object',
      additionalProperties: false,
      required: ['firstHop', 'secondHop', 'thirdHop'],
      properties: {
        firstHop: recollectionFirstHopSchema,
        secondHop: recollectionSecondHopSchema,
        thirdHop: recollectionThirdHopSchema,
      },
    },
    certainty: {
      type: 'string',
      enum: ['firm', 'approximate', 'fragmentary'],
    },
    rationale: textSchema(220),
    confidence: confidenceSchema,
  },
} as const

export const alicizationMemoryRecollectionPlanResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_memory_recollection_plan',
    strict: true,
    schema: alicizationMemoryRecollectionPlanJsonSchema,
  },
} as const

export const alicizationMemoryRecollectionSpeechPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['shouldSurface', 'surfaceMode', 'placement', 'certainty', 'rationale', 'confidence'],
  properties: {
    shouldSurface: { type: 'boolean' },
    surfaceMode: {
      type: 'string',
      enum: ['internal-only', 'gist-first', 'answer-anchoring', 'procedural-carry', 'relationship-continuity'],
    },
    placement: {
      type: 'string',
      enum: ['before-payoff', 'inside-payoff', 'after-payoff', 'internal-only'],
    },
    certainty: {
      type: 'string',
      enum: ['firm', 'approximate', 'fragmentary'],
    },
    rationale: textSchema(220),
    confidence: confidenceSchema,
  },
} as const

export const alicizationMemoryRecollectionSpeechPlanResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_memory_recollection_speech_plan',
    strict: true,
    schema: alicizationMemoryRecollectionSpeechPlanJsonSchema,
  },
} as const

const conflictVariantSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'summary', 'provenance', 'reason'],
  properties: {
    id: textSchema(120),
    summary: textSchema(220),
    provenance: {
      type: 'string',
      enum: ['observed', 'remembered', 'dreamt', 'inferred', 'reconstructed'],
    },
    reason: nullableTextSchema(220),
  },
} as const

const selectedBundleSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'summary',
    'rationale',
    'confidence',
    'periodId',
    'episodeId',
    'procedureId',
    'conversationTurnId',
    'relationshipLine',
  ],
  properties: {
    id: textSchema(120),
    summary: textSchema(220),
    rationale: textSchema(220),
    confidence: confidenceSchema,
    periodId: nullableTextSchema(120),
    episodeId: nullableTextSchema(120),
    procedureId: nullableTextSchema(120),
    conversationTurnId: nullableTextSchema(120),
    relationshipLine: nullableTextSchema(220),
  },
} as const

const selectedChainSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'kind',
    'summary',
    'rationale',
    'confidence',
    'taskCue',
    'periodSummary',
    'eventSummary',
    'procedureSummary',
    'relationshipMeaning',
    'lesson',
    'currentStance',
    'answerPosture',
  ],
  properties: {
    id: textSchema(120),
    kind: {
      type: 'string',
      enum: ['task-procedure-relationship-stance', 'period-event-lesson-posture'],
    },
    summary: textSchema(220),
    rationale: textSchema(220),
    confidence: confidenceSchema,
    taskCue: nullableTextSchema(160),
    periodSummary: nullableTextSchema(180),
    eventSummary: nullableTextSchema(180),
    procedureSummary: nullableTextSchema(180),
    relationshipMeaning: nullableTextSchema(180),
    lesson: nullableTextSchema(180),
    currentStance: nullableTextSchema(180),
    answerPosture: nullableTextSchema(180),
  },
} as const

export const alicizationMemoryDeliberationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'shouldRecall',
    'selectedEraIds',
    'selectedConsolidationIds',
    'selectedWindowIds',
    'selectedProcedureIds',
    'selectedEpisodeIds',
    'selectedConversationTurnIds',
    'selectedRelationshipLines',
    'selectedBundles',
    'selectedChains',
    'conflictSeverity',
    'conflictVariants',
    'stableCore',
    'unsafeDetails',
    'surfacePolicy',
    'confidence',
    'whyNow',
  ],
  properties: {
    shouldRecall: { type: 'boolean' },
    selectedEraIds: textArraySchema(8, 120),
    selectedConsolidationIds: textArraySchema(8, 120),
    selectedWindowIds: textArraySchema(8, 120),
    selectedProcedureIds: textArraySchema(8, 120),
    selectedEpisodeIds: textArraySchema(8, 120),
    selectedConversationTurnIds: textArraySchema(8, 120),
    selectedRelationshipLines: textArraySchema(6, 220),
    selectedBundles: {
      type: 'array',
      maxItems: 4,
      items: selectedBundleSchema,
    },
    selectedChains: {
      type: 'array',
      maxItems: 4,
      items: selectedChainSchema,
    },
    conflictSeverity: {
      type: 'string',
      enum: ['none', 'low', 'medium', 'high'],
    },
    conflictVariants: {
      type: 'array',
      maxItems: 4,
      items: conflictVariantSchema,
    },
    stableCore: textArraySchema(6, 220),
    unsafeDetails: textArraySchema(6, 220),
    surfacePolicy: {
      type: 'string',
      enum: ['internal-only', 'gist-first', 'answer-anchoring', 'procedural-carry', 'relationship-continuity'],
    },
    confidence: confidenceSchema,
    whyNow: textSchema(220),
  },
} as const

export const alicizationMemoryDeliberationResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_memory_deliberation',
    strict: true,
    schema: alicizationMemoryDeliberationJsonSchema,
  },
} as const
