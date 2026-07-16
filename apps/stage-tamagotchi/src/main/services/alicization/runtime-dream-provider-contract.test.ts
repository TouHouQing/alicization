import { requestBody } from '@xsai/shared'
import { describe, expect, it } from 'vitest'

import {
  alicizationCoreIncarnationReforgeResponseFormat,
  alicizationDreamAutobiographicalSummariesResponseFormat,
  alicizationDreamMetabolismResponseFormat,
  alicizationMemoryConsolidationRefinementResponseFormat,
} from './runtime-dream-provider-contract'

describe('runtime dream Provider contracts', () => {
  it.each([
    {
      name: 'alicization_dream_metabolism',
      responseFormat: alicizationDreamMetabolismResponseFormat,
    },
    {
      name: 'alicization_core_incarnation_reforge',
      responseFormat: alicizationCoreIncarnationReforgeResponseFormat,
    },
    {
      name: 'alicization_memory_consolidation_refinement',
      responseFormat: alicizationMemoryConsolidationRefinementResponseFormat,
    },
    {
      name: 'alicization_dream_autobiographical_summaries',
      responseFormat: alicizationDreamAutobiographicalSummariesResponseFormat,
    },
  ])('serializes $name through native response_format', ({ name, responseFormat }) => {
    const body = JSON.parse(requestBody({
      messages: [{ role: 'user', content: '{}' }],
      model: 'test-model',
      responseFormat,
    })) as Record<string, any>

    expect(body.response_format).toEqual(responseFormat)
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: {
        name,
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
        },
      },
    })
    expect(body).not.toHaveProperty('responseFormat')
  })

  it('bounds consolidation refinement to existing record-shaped updates', () => {
    expect(alicizationMemoryConsolidationRefinementResponseFormat.json_schema.schema).toMatchObject({
      additionalProperties: false,
      required: ['consolidations'],
      properties: {
        consolidations: {
          type: 'array',
          maxItems: 8,
          items: {
            additionalProperties: false,
            required: ['id', 'summary', 'lesson', 'cues', 'confidence'],
          },
        },
      },
    })
  })

  it('requires bounded autobiographical periods and supported facets', () => {
    expect(alicizationDreamAutobiographicalSummariesResponseFormat.json_schema.schema).toMatchObject({
      additionalProperties: false,
      required: ['summaries'],
      properties: {
        summaries: {
          type: 'array',
          maxItems: 4,
          items: {
            additionalProperties: false,
            required: ['periodKey', 'facet', 'summary', 'lesson', 'cues', 'confidence'],
            properties: {
              facet: {
                enum: ['phase', 'relationship-era', 'task-era', 'self-era'],
              },
            },
          },
        },
      },
    })
  })
})
