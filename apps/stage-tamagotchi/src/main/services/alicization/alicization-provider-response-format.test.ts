import { readFileSync } from 'node:fs'

import { alicizationProviderResponseFormat } from '@proj-alicization/stage-shared'
import { requestBody } from '@xsai/shared'
import { describe, expect, it } from 'vitest'

describe('alicization provider response wire format', () => {
  it('serializes the shared JSON schema through xsAI response_format', () => {
    const messages = [
      {
        role: 'user',
        content: 'Say hello.',
      },
    ]
    const body = JSON.parse(requestBody({
      messages,
      model: 'test-model',
      responseFormat: alicizationProviderResponseFormat,
    })) as Record<string, unknown>

    expect(body).toHaveProperty('response_format')
    expect(body.response_format).toEqual(alicizationProviderResponseFormat)
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: {
        name: 'alicization_main_chat_turn',
        strict: true,
      },
    })
    expect(body).not.toHaveProperty('responseFormat')
    expect(body.response_format).not.toHaveProperty('jsonSchema')
    expect(body.messages).toEqual(messages)
    expect(JSON.stringify(body.messages)).not.toMatch(
      /Return ONLY one strict JSON|Output contract|must-follow|Response contract/iu,
    )
  })

  it('keeps native schema and emotional state out of provider-facing prose across dialogue entrypoints', () => {
    const productionSources = [
      new URL('./runtime-soul.ts', import.meta.url),
      new URL('./runtime-main-gateway-one-shot.ts', import.meta.url),
      new URL('./alicization-runtime-architecture.ts', import.meta.url),
      new URL('./main-chat-runtime-surface.ts', import.meta.url),
      new URL('../../../../../../packages/stage-ui/src/stores/alicization-epoch1.ts', import.meta.url),
    ].map(url => readFileSync(url, 'utf8')).join('\n')

    expect(productionSources).not.toMatch(
      /Output Contract|strict JSON output contract|ALICIZATION_EMOTIONAL_KERNEL|emotional_kernel_|structured output contract failed/iu,
    )
  })
})
