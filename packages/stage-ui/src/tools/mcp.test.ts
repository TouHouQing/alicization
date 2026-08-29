import type { JsonSchema } from 'xsschema'

import { describe, expect, it } from 'vitest'

import { decodeMcpArgumentValue, mcp } from './mcp'

describe('tools mcp schema', () => {
  it('emits strict parameter objects', async () => {
    const tools = await mcp()
    const toolNames = [
      'mcp_list_tools',
      'mcp_call_tool',
    ]

    for (const name of toolNames) {
      const tool = tools.find(entry => entry.function.name === name)
      expect(tool, `missing tool: ${name}`).toBeDefined()
      expect(tool?.function.parameters.additionalProperties).toBe(false)
    }
  })

  it('keeps mcp_call_tool parameters items strict', async () => {
    const tools = await mcp()
    const callTool = tools.find(entry => entry.function.name === 'mcp_call_tool')

    expect(callTool).toBeDefined()
    const items = ((callTool!.function.parameters as JsonSchema).properties?.parameters as JsonSchema)?.items as JsonSchema
    expect(items).toBeDefined()
    expect(items.additionalProperties).toBe(false)
  })

  it('emits a typed schema for arbitrary MCP argument values', async () => {
    const tools = await mcp()
    const callTool = tools.find(entry => entry.function.name === 'mcp_call_tool')

    const items = ((callTool!.function.parameters as JsonSchema).properties?.parameters as JsonSchema)?.items as JsonSchema
    const value = items.properties?.value as JsonSchema

    expect(value).toMatchObject({
      type: 'string',
    })
  })

  it('decodes JSON-encoded MCP argument values at the execution boundary', () => {
    expect(decodeMcpArgumentValue('42')).toBe(42)
    expect(decodeMcpArgumentValue('true')).toBe(true)
    expect(decodeMcpArgumentValue('{"nested":["value"]}')).toEqual({ nested: ['value'] })
    expect(decodeMcpArgumentValue('plain text')).toBe('plain text')
    expect(decodeMcpArgumentValue(42)).toBe(42)
  })
})
