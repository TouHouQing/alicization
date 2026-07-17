export const alicizationScreenSemanticJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workload', 'content', 'summary', 'confidence', 'matchedLabels'],
  properties: {
    workload: {
      type: 'string',
      enum: ['coding', 'media', 'browser', 'terminal', 'game', 'chat', 'document', 'unknown'],
    },
    content: {
      type: 'string',
      enum: ['error', 'diff', 'doc', 'video', 'music', 'chat', 'gameplay', 'unknown'],
    },
    summary: {
      type: 'string',
      maxLength: 120,
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    matchedLabels: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 48,
        pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
      },
    },
  },
} as const

export const alicizationScreenSemanticResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'alicization_screen_semantic_summary',
    strict: true,
    schema: alicizationScreenSemanticJsonSchema,
  },
} as const
