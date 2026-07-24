import { requestBody } from '@xsai/shared'
import { describe, expect, it } from 'vitest'

import {
  alicizationDialogueTurnSemanticsResponseFormat,
  alicizationSubjectiveInferenceResponseFormat,
} from './runtime-mind-state-provider-contract'

describe('runtime mind-state Provider contracts', () => {
  it.each([
    {
      name: 'alicization_dialogue_turn_semantics',
      responseFormat: alicizationDialogueTurnSemanticsResponseFormat,
    },
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

  it('strictly bounds dialogue semantics fields', () => {
    expect(alicizationDialogueTurnSemanticsResponseFormat.json_schema.schema).toMatchObject({
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
      ],
      properties: {
        act: { enum: expect.arrayContaining(['ask-help', 'challenge', 'unknown']) },
        subjectPreference: {
          enum: expect.arrayContaining(['alicization-self', 'relationship', 'visible-scene', null]),
        },
        sharedAttentionDemand: { minimum: 0, maximum: 1 },
        reasonTags: { type: 'array', maxItems: 10 },
      },
    })
    expect(alicizationDialogueTurnSemanticsResponseFormat.json_schema.schema.properties).not.toHaveProperty('summary')
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
