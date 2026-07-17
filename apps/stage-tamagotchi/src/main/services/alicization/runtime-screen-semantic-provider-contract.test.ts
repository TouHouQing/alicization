import { requestBody } from '@xsai/shared'
import { describe, expect, it } from 'vitest'

import { alicizationScreenSemanticResponseFormat } from './runtime-screen-semantic-provider-contract'

describe('runtime screen-semantic Provider contract', () => {
  it('serializes the native strict response format', () => {
    const body = JSON.parse(requestBody({
      messages: [{ role: 'user', content: '{}' }],
      model: 'test-model',
      responseFormat: alicizationScreenSemanticResponseFormat,
    })) as Record<string, any>

    expect(body.response_format).toEqual(alicizationScreenSemanticResponseFormat)
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: {
        name: 'alicization_screen_semantic_summary',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
        },
      },
    })
  })

  it('bounds classification labels and confidence', () => {
    expect(alicizationScreenSemanticResponseFormat.json_schema.schema).toMatchObject({
      additionalProperties: false,
      required: ['workload', 'content', 'summary', 'confidence', 'matchedLabels'],
      properties: {
        workload: {
          enum: ['coding', 'media', 'browser', 'terminal', 'game', 'chat', 'document', 'unknown'],
        },
        content: {
          enum: ['error', 'diff', 'doc', 'video', 'music', 'chat', 'gameplay', 'unknown'],
        },
        summary: {
          type: 'string',
          maxLength: 120,
        },
        confidence: {
          minimum: 0,
          maximum: 1,
        },
        matchedLabels: {
          type: 'array',
          maxItems: 4,
        },
      },
    })
  })
})
