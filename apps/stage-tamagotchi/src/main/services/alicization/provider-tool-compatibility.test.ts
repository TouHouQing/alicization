import type { Tool } from '@xsai/shared-chat'

import { describe, expect, it, vi } from 'vitest'

import { adaptAlicizationProviderTools } from './provider-tool-compatibility'

function createStrictTool(): Tool {
  return {
    type: 'function',
    execute: vi.fn(),
    function: {
      name: 'sample_tool',
      description: 'Sample tool',
      strict: true,
      parameters: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          optionalUrl: {
            type: 'string',
            format: 'uri',
          },
          metadata: {
            type: 'object',
            propertyNames: {
              type: 'string',
            },
            additionalProperties: true,
          },
          choice: {
            anyOf: [
              {
                type: 'string',
                format: 'uri',
              },
              {
                type: 'number',
              },
            ],
          },
        },
        additionalProperties: false,
      },
    },
  }
}

describe('provider tool compatibility', () => {
  it('preserves strict mode for official OpenAI only when every property is required', () => {
    const execute = vi.fn()
    const tool: Tool = {
      type: 'function',
      execute,
      function: {
        name: 'strict_tool',
        strict: true,
        parameters: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            value: {
              type: 'string',
            },
          },
          required: ['value'],
          additionalProperties: false,
        },
      },
    }

    const result = adaptAlicizationProviderTools({
      providerId: 'openai',
      tools: [tool],
    })

    expect(result).toEqual([{
      ...tool,
      function: {
        ...tool.function,
        strict: true,
        parameters: {
          type: 'object',
          properties: {
            value: {
              type: 'string',
            },
          },
          required: ['value'],
          additionalProperties: false,
        },
      },
    }])
    expect(result?.[0]?.execute).toBe(execute)
    expect(result?.[0]).not.toBe(tool)
  })

  it('falls back to non-strict mode when an official OpenAI tool contains optional properties', () => {
    const tool = createStrictTool()

    const result = adaptAlicizationProviderTools({
      providerId: 'openai',
      tools: [tool],
    })

    expect(result?.[0]?.function.strict).toBe(false)
    expect(result?.[0]?.function.parameters).not.toHaveProperty('$schema')
    expect(tool.function.strict).toBe(true)
  })

  it('creates a portable non-strict schema for OpenAI-compatible gateways without mutating tool owners', () => {
    const tool = createStrictTool()

    const result = adaptAlicizationProviderTools({
      providerId: 'openai-compatible',
      tools: [tool],
    })

    expect(result).toHaveLength(1)
    expect(result?.[0]).not.toBe(tool)
    expect(result?.[0]?.execute).toBe(tool.execute)
    expect(result?.[0]?.function.strict).toBe(false)
    expect(result?.[0]?.function.parameters).toEqual({
      type: 'object',
      properties: {
        optionalUrl: {
          type: 'string',
        },
        metadata: {
          type: 'object',
          additionalProperties: true,
        },
        choice: {
          anyOf: [
            {
              type: 'string',
            },
            {
              type: 'number',
            },
          ],
        },
      },
      additionalProperties: false,
    })
    expect(tool.function.strict).toBe(true)
    expect(tool.function.parameters).toHaveProperty('$schema')
    expect(JSON.stringify(tool.function.parameters)).toContain('"format":"uri"')
    expect(JSON.stringify(tool.function.parameters)).toContain('"propertyNames"')
  })
})
