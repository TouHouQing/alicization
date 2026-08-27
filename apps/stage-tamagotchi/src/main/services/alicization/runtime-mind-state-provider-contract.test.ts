import { readFileSync } from 'node:fs'

import { requestBody } from '@xsai/shared'
import { describe, expect, it } from 'vitest'

import {
  alicizationSubjectiveInferenceResponseFormat,
} from './runtime-mind-state-provider-contract'

describe('runtime mind-state Provider contracts', () => {
  it('does not retain the removed dialogue-semantics Provider contract', () => {
    const source = readFileSync(new URL('./runtime-mind-state-provider-contract.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('alicizationDialogueTurnSemanticsJsonSchema')
    expect(source).not.toContain('alicizationDialogueTurnSemanticsResponseFormat')
  })

  it.each([
    {
      name: 'alicization_subjective_inference',
      responseFormat: alicizationSubjectiveInferenceResponseFormat,
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

  it('strictly bounds subjective inference evidence candidates', () => {
    expect(alicizationSubjectiveInferenceResponseFormat.json_schema.schema).toMatchObject({
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
        hostIntentCandidates: {
          type: 'array',
          maxItems: 3,
          items: {
            additionalProperties: false,
            required: ['goal', 'confidence', 'why'],
          },
        },
        relationshipNeedCandidates: {
          type: 'array',
          maxItems: 3,
          items: {
            additionalProperties: false,
            required: ['need', 'confidence', 'why'],
          },
        },
        confidence: { minimum: 0, maximum: 1 },
        notes: { type: 'array', maxItems: 8 },
      },
    })
  })
})
