import { requestBody } from '@xsai/shared'
import { describe, expect, it } from 'vitest'

import {
  alicizationCoreIncarnationReforgeResponseFormat,
  alicizationDreamMetabolismResponseFormat,
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
})
