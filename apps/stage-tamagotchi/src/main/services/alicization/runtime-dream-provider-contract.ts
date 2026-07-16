const activeThoughtSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: {
    text: {
      type: 'string',
      minLength: 1,
      maxLength: 120,
    },
  },
} as const

const sedimentFragmentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: {
    text: {
      type: 'string',
      minLength: 1,
      maxLength: 160,
    },
  },
} as const

export const alicizationDreamMetabolismJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'host_attitude',
    'soul_shift',
    'next_active_thoughts',
    'explicit_demoted_thoughts',
    'new_sediment_fragments',
    'shattering_event',
  ],
  properties: {
    host_attitude: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
    soul_shift: {
      type: 'object',
      additionalProperties: false,
      required: [
        'obedience_delta',
        'liveliness_delta',
        'sensibility_delta',
      ],
      properties: {
        obedience_delta: {
          type: 'number',
          minimum: -0.08,
          maximum: 0.08,
        },
        liveliness_delta: {
          type: 'number',
          minimum: -0.08,
          maximum: 0.08,
        },
        sensibility_delta: {
          type: 'number',
          minimum: -0.08,
          maximum: 0.08,
        },
      },
    },
    next_active_thoughts: {
      type: 'array',
      maxItems: 5,
      items: activeThoughtSchema,
    },
    explicit_demoted_thoughts: {
      type: 'array',
      maxItems: 8,
      items: activeThoughtSchema,
    },
    new_sediment_fragments: {
      type: 'array',
      maxItems: 8,
      items: sedimentFragmentSchema,
    },
    shattering_event: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['text'],
      properties: {
        text: {
          type: 'string',
          minLength: 1,
          maxLength: 280,
        },
      },
    },
  },
} as const

export const alicizationDreamMetabolismResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_dream_metabolism',
    strict: true,
    schema: alicizationDreamMetabolismJsonSchema,
  },
} as const

export const alicizationCoreIncarnationReforgeJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['core_incarnation'],
  properties: {
    core_incarnation: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
    },
  },
} as const

export const alicizationCoreIncarnationReforgeResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_core_incarnation_reforge',
    strict: true,
    schema: alicizationCoreIncarnationReforgeJsonSchema,
  },
} as const

const memoryConsolidationCueSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 120,
} as const

const memoryConsolidationLessonSchema = {
  type: ['string', 'null'],
  maxLength: 220,
} as const

const memoryConsolidationConfidenceSchema = {
  type: 'number',
  minimum: 0,
  maximum: 1,
} as const

export const alicizationMemoryConsolidationRefinementJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['consolidations'],
  properties: {
    consolidations: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'summary', 'lesson', 'cues', 'confidence'],
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            maxLength: 120,
          },
          summary: {
            type: 'string',
            minLength: 1,
            maxLength: 320,
          },
          lesson: memoryConsolidationLessonSchema,
          cues: {
            type: 'array',
            maxItems: 5,
            items: memoryConsolidationCueSchema,
          },
          confidence: memoryConsolidationConfidenceSchema,
        },
      },
    },
  },
} as const

export const alicizationMemoryConsolidationRefinementResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_memory_consolidation_refinement',
    strict: true,
    schema: alicizationMemoryConsolidationRefinementJsonSchema,
  },
} as const

export const alicizationDreamAutobiographicalSummariesJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summaries'],
  properties: {
    summaries: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['periodKey', 'facet', 'summary', 'lesson', 'cues', 'confidence'],
        properties: {
          periodKey: {
            type: 'string',
            minLength: 1,
            maxLength: 96,
          },
          facet: {
            type: 'string',
            enum: ['phase', 'relationship-era', 'task-era', 'self-era'],
          },
          summary: {
            type: 'string',
            minLength: 1,
            maxLength: 320,
          },
          lesson: memoryConsolidationLessonSchema,
          cues: {
            type: 'array',
            maxItems: 5,
            items: memoryConsolidationCueSchema,
          },
          confidence: memoryConsolidationConfidenceSchema,
        },
      },
    },
  },
} as const

export const alicizationDreamAutobiographicalSummariesResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_dream_autobiographical_summaries',
    strict: true,
    schema: alicizationDreamAutobiographicalSummariesJsonSchema,
  },
} as const
