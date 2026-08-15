import { requestBody } from '@xsai/shared'
import { describe, expect, it } from 'vitest'

import {
  alicizationMemoryDeliberationResponseFormat,
  alicizationMemoryRecollectionIntentResponseFormat,
  alicizationMemoryRecollectionPlanResponseFormat,
  alicizationMemoryRecollectionSpeechPlanResponseFormat,
} from './provider-contract'

describe('memory-os Provider contracts', () => {
  it.each([
    {
      name: 'alicization_memory_recollection_intent',
      responseFormat: alicizationMemoryRecollectionIntentResponseFormat,
    },
    {
      name: 'alicization_memory_recollection_plan',
      responseFormat: alicizationMemoryRecollectionPlanResponseFormat,
    },
    {
      name: 'alicization_memory_recollection_speech_plan',
      responseFormat: alicizationMemoryRecollectionSpeechPlanResponseFormat,
    },
    {
      name: 'alicization_memory_deliberation',
      responseFormat: alicizationMemoryDeliberationResponseFormat,
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
  })

  it('bounds recollection intent search expansion', () => {
    expect(alicizationMemoryRecollectionIntentResponseFormat.json_schema.schema).toMatchObject({
      required: [
        'mode',
        'temporalFocus',
        'searchEpisodes',
        'searchProceduralExperience',
        'queryHints',
        'rationale',
        'confidence',
        'recollectionAgenda',
      ],
      properties: {
        queryHints: { maxItems: 8 },
        recollectionAgenda: {
          additionalProperties: false,
          properties: {
            candidateTimeScopes: { maxItems: 4 },
            candidateEraFacets: { maxItems: 4 },
            candidateProcedureLines: { maxItems: 4 },
          },
        },
      },
    })
  })

  it('requires a three-hop recollection trace without reply drafts', () => {
    const schema = alicizationMemoryRecollectionPlanResponseFormat.json_schema.schema
    expect(schema).toMatchObject({
      properties: {
        selectedRelationshipLines: { maxItems: 3 },
        searchTrace: {
          additionalProperties: false,
          required: ['firstHop', 'secondHop', 'thirdHop'],
        },
      },
    })
    expect(schema.properties).not.toHaveProperty('opening')
  })

  it('keeps speech planning policy-only', () => {
    const schema = alicizationMemoryRecollectionSpeechPlanResponseFormat.json_schema.schema
    expect(schema).toMatchObject({
      required: ['shouldSurface', 'surfaceMode', 'placement', 'certainty', 'rationale', 'confidence'],
    })
    expect(schema.properties).not.toHaveProperty('reply')
    expect(schema.properties).not.toHaveProperty('opening')
  })

  it('bounds deliberation bundles and excludes authored lines', () => {
    const schema = alicizationMemoryDeliberationResponseFormat.json_schema.schema
    expect(schema).toMatchObject({
      properties: {
        selectedBundles: { maxItems: 4 },
        selectedChains: { maxItems: 4 },
        conflictVariants: { maxItems: 4 },
      },
    })
    expect(schema.properties).not.toHaveProperty('inwardLine')
    expect(schema.properties).not.toHaveProperty('visibleLine')
  })

  it('does not expose raw conversation transcript selection in any Provider contract', () => {
    const serializedContracts = JSON.stringify([
      alicizationMemoryRecollectionIntentResponseFormat,
      alicizationMemoryRecollectionPlanResponseFormat,
      alicizationMemoryRecollectionSpeechPlanResponseFormat,
      alicizationMemoryDeliberationResponseFormat,
    ])

    expect(serializedContracts).not.toContain('searchConversations')
    expect(serializedContracts).not.toContain('conversation-history')
    expect(serializedContracts).not.toContain('selectedConversationTurnIds')
    expect(serializedContracts).not.toContain('conversationTurnId')
    expect(serializedContracts).not.toContain('conversation-turn')
    expect(serializedContracts).not.toContain('expand-conversation')
    expect(serializedContracts).not.toContain('need-conversation-evidence')
  })
})
