import type { Tool } from '@xsai/shared-chat'

import Ajv from 'ajv'

import { tool } from '@xsai/tool'
import { describe, expect, it, vi } from 'vitest'

import { createWorkPlanToolSpec } from './execution/work-plan-tool'
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
            default: 'https://example.com',
            examples: ['https://example.com'],
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
  it('converts an exact literal criterion through the actual SDK without requiring a guessed hash', async () => {
    const execute = vi.fn(async () => null)
    const source = await tool(createWorkPlanToolSpec(execute))
    const converted = adaptAlicizationProviderTools({ providerId: 'openai-compatible', tools: [source] })![0]
    const input = { goal: 'Write exact text', criteria: [{ id: 'exact', required: true, proofScope: 'bytes', predicate: { kind: 'file-content', path: 'C:/owned/note.txt', content: '中文🙂\r\n' } }], steps: [{ id: 'write', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path: 'C:/owned/note.txt', content: '中文🙂\r\n' } }] }
    const validate = new Ajv({ strict: false }).compile(converted.function.parameters)
    expect(validate(input), JSON.stringify(validate.errors)).toBe(true)
    await converted.execute(input, { messages: [], toolCallId: 'qa-literal-content' })
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ criteria: [{ id: 'exact', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: 'C:/owned/note.txt', sha256: 'cab52b6386da7c47837bcfb0db1c829b68cf2506765d3eedcb9e6a582c0a9eb7' } }] }), expect.any(Object))
  })

  it('admits omitted step evidence associations through the real converted schema and callback', async () => {
    const execute = vi.fn(async () => null)
    const source = await tool(createWorkPlanToolSpec(execute))
    const converted = adaptAlicizationProviderTools({ providerId: 'openai-compatible', tools: [source] })![0]
    const validate = new Ajv({ strict: false }).compile(converted.function.parameters)
    const input = { goal: 'Read the owned note', criteria: [{ id: 'review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: 'Is this useful?', artifactIds: [] } }], steps: [{ id: 'read', dependsOn: [], capabilityId: 'tool.filesystem_read_file', input: { path: 'C:/owned/note.txt' } }] }
    expect(validate(input), JSON.stringify(validate.errors)).toBe(true)
    const options = { messages: [], toolCallId: 'qa-work-association' }
    await converted.execute(input, options)
    expect(execute).toHaveBeenCalledWith({ ...input, steps: [{ ...input.steps[0], acceptanceCriterionIds: [] }] }, options)
  })

  it('preserves the actual nested browser plan parameters through xsAI conversion and Provider adaptation', async () => {
    const source = await tool(createWorkPlanToolSpec(async () => null))
    const converted = adaptAlicizationProviderTools({ providerId: 'openai-compatible', tools: [source] })![0]
    const validate = new Ajv({ strict: false }).compile(converted.function.parameters)
    const proposal = { goal: 'Observe and wait on the chosen page', criteria: [{ id: 'receipt', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: 'C:/owned/receipt.txt', includes: ['saved'] } }], steps: [
      { id: 'read', dependsOn: [], capabilityId: 'tool.browser_read_page', input: { format: 'interactables', maxChars: 12000 }, acceptanceCriterionIds: [] },
      { id: 'wait', dependsOn: ['read'], capabilityId: 'tool.browser_wait', input: { text: 'saved', state: 'complete', timeoutMs: 15000 }, acceptanceCriterionIds: ['receipt'] },
    ] }
    expect(validate(proposal), JSON.stringify(validate.errors)).toBe(true)
    const extra = structuredClone(proposal)
    Object.assign(extra.steps[0].input, { allowAllOrigins: true })
    expect(validate(extra)).toBe(false)
    expect(validate.errors?.some(error => error.keyword === 'additionalProperties')).toBe(true)
    expect(source.function.parameters).toHaveProperty('properties.steps.items.properties.input.properties.format')
  })

  it('preserves keyword-named properties, definitions and object literals without altering source owners', () => {
    const source = createStrictTool()
    const parameters = JSON.parse('{"type":"object","properties":{"format":{"type":"string","format":"uri"},"default":{"$ref":"#/$defs/format"},"__proto__":{"type":"string"},"literal":{"const":{"format":"text","default":"kept","properties":{"format":"literal"}}}},"$defs":{"format":{"type":"string","format":"uri"}},"required":["format","default","__proto__","literal"],"additionalProperties":false}')
    source.function.parameters = parameters
    const result = adaptAlicizationProviderTools({ providerId: 'openai-compatible', tools: [source] })![0].function.parameters as Record<string, any>
    expect(result.properties.format).toEqual({ type: 'string' })
    expect(result.$defs.format).toEqual({ type: 'string' })
    expect(result.properties.default).toEqual({ $ref: '#/$defs/format' })
    expect(Object.hasOwn(result.properties, '__proto__')).toBe(true)
    expect(Object.getPrototypeOf(result.properties)).toBe(Object.prototype)
    expect(result.properties.literal.const).toEqual(parameters.properties.literal.const)
    expect(result.properties.literal.const).not.toBe(parameters.properties.literal.const)
    expect(parameters.properties.format.format).toBe('uri')
  })
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

  it('preserves a complete Provider-safe tool list without applying surface policy', () => {
    const names = [
      'browser_click_element',
      'desktop_type_text',
      'codex',
      'filesystem_read_file',
      'cli',
      'claude_code',
      'local_visual',
      'openclaw',
      'executor_capability_snapshot',
      'sensory_capture_state',
      'set_reminder',
      'filesystem_list_directory',
      'filesystem_search_files',
      'filesystem_write_file',
      'filesystem_edit_file',
      'filesystem_patch_file',
      'browser_open_url',
      'browser_search_web',
      'browser_read_page',
      'desktop_inspect_scene',
      'browser_scroll',
      'desktop_press_keys',
      'desktop_open_application',
    ]
    const tools = names.map((name): Tool => ({
      type: 'function',
      execute: vi.fn(),
      function: {
        name,
        description: name,
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
    }))

    const result = adaptAlicizationProviderTools({
      providerId: 'openai-compatible',
      tools,
    })
    const resultNames = result?.map(tool => tool.function.name) ?? []

    expect(resultNames).toEqual(names)
    expect(resultNames).toContain('codex')
    expect(resultNames).toContain('filesystem_patch_file')
    expect(resultNames).toContain('browser_click_element')
    expect(resultNames).toContain('desktop_type_text')
    expect(resultNames).not.toContain('mcp_call_tool')
    expect(resultNames).not.toContain('mcp_list_tools')
  })
})
