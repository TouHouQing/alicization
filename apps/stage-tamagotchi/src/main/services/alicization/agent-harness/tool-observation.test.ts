import type { Message } from '@xsai/shared-chat'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import { createAlicizationRuntimeEvent } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { boundLifeProviderRequest } from '../life-provider-budget'
import { readUtf8ToolPage, truncatePiToolText } from '../third-party/pi-tool-text'
import { projectToolObservation, readToolObservation } from './tool-observation'

const scope = { cardId: 'card-1', turnId: 'turn-1', conversationId: 'conversation-1', userId: 'user-1' }
const source = `HEADER\n${'真实日志🙂 中文内容\n'.repeat(900)}TAIL: failure evidence`
const hash = createHash('sha256').update(source).digest('hex')
const read = { ...scope, toolCallId: 'call-1', expectedHash: hash, offset: 0, maxBytes: 4096 }
const observation = { actionId: 'action-1', observationId: 'observation-1', toolCallId: 'call-1', terminal: true, outcome: 'success', output: source }
function events() {
  return [
    { ...createAlicizationRuntimeEvent({ ...scope, eventType: 'action.observation', source: 'tool', payload: observation }), sequence: 1 },
    { ...createAlicizationRuntimeEvent({ ...scope, eventType: 'action.settlement.completed', source: 'runtime', payload: { actionId: 'action-1', observationId: 'observation-1', settlementId: 'settlement-1' } }), sequence: 2 },
  ]
}
function messages(): Message[] {
  return [{ role: 'user', content: '检查原始日志' }, { role: 'assistant', content: '', tool_calls: [{ type: 'function', id: 'call-1', function: { name: 'read_log', arguments: '{}' } }] }, { role: 'tool', tool_call_id: 'call-1', content: source }]
}

describe('governed agent observation references', () => {
  it('keeps a small UTF-8 preview with both beginning and actual failure tail', () => {
    const preview = truncatePiToolText(source, 1024)
    expect(Buffer.byteLength(preview)).toBeLessThanOrEqual(1024)
    expect(preview).toMatch(/^HEADER/u)
    expect(preview).toMatch(/TAIL: failure evidence$/u)
    expect(preview).not.toContain('\uFFFD')
  })
  it('reconstructs the exact original Chinese and emoji receipt from bounded pages', () => {
    const records = events()
    let reconstructed = ''
    let offset = 0
    while (offset < Buffer.byteLength(source)) {
      const page = readToolObservation(records, { ...read, offset, maxBytes: 65 })
      expect(page.nextOffset).toBeGreaterThan(offset)
      expect(Buffer.byteLength(page.content)).toBeLessThanOrEqual(65)
      expect(page.content).not.toContain('\uFFFD')
      reconstructed += page.content
      offset = page.nextOffset
    }
    expect(reconstructed).toBe(source)
    expect(readToolObservation(records, { ...read, offset })).toMatchObject({ content: '', complete: true })
  })
  it.each(['cardId', 'turnId', 'conversationId', 'toolCallId'] as const)('refuses a foreign %s', (field) => {
    expect(() => readToolObservation(events(), { ...read, [field]: 'foreign' })).toThrow('unavailable')
  })
  it('refuses unavailable, uncommitted, ambiguous and content-changed observations', () => {
    expect(() => readToolObservation(events().slice(0, 1), read)).toThrow('settled')
    expect(() => readToolObservation([...events(), events()[0]!], read)).toThrow('ambiguous')
    expect(() => readToolObservation(events(), { ...read, expectedHash: '0'.repeat(64) })).toThrow('reference')
    const records = events()
    records[1]!.payload = { actionId: 'another-action', observationId: 'observation-1', settlementId: 'settlement-1' }
    expect(() => readToolObservation(records, read)).toThrow('settled')
  })
  it('checks cancellation, offsets, page sizes and malformed references before reading', () => {
    expect(() => readToolObservation(events(), { ...read, abortSignal: AbortSignal.abort() })).toThrow()
    expect(() => readToolObservation(events(), { ...read, expectedHash: 'invented' })).toThrow('hash')
    expect(() => readUtf8ToolPage('中文🙂', 1, 64)).toThrow('boundary')
    expect(() => readUtf8ToolPage(source, 0, 8193)).toThrow('8192')
    expect(() => readUtf8ToolPage(source, -1, 64)).toThrow('boundary')
  })
  it('does not rewrite original messages or fabricate a reference for orphan or old results', () => {
    const original = messages()
    const projection = projectToolObservation(original[2]!, 2, original)!
    const envelope = JSON.parse(String(projection.message.content))
    expect(envelope).toMatchObject({ sourceHash: hash, toolCallId: 'call-1', readWith: { expectedHash: hash, offset: 0 } })
    expect(original[2]!.content).toBe(source)
    expect(projectToolObservation(original[2]!, 0, [original[2]!])).toBeNull()
    expect(projectToolObservation(original[2]!, 2, [original[0]!, original[0]!, original[2]!])).toBeNull()
    expect(projectToolObservation(original[2]!, 2, [...original, { role: 'user', content: 'new request' }])).toBeNull()
  })
  it('fails honestly without an offered reader and preserves complete call/result pairing with it', () => {
    expect(() => boundLifeProviderRequest(messages(), [], { contextTokens: 8192, outputReserve: 1024 })).toThrow('PROVIDER_CONTEXT_BUDGET_EXCEEDED')
    const result = boundLifeProviderRequest(messages(), [{ function: { name: 'life_read_tool_observation' } }], { contextTokens: 8192, outputReserve: 1024 })
    expect(result.messages[1]).toEqual(messages()[1])
    expect(result.messages[2]).toMatchObject({ role: 'tool', tool_call_id: 'call-1' })
    const reference = JSON.parse(String(result.messages[2]!.content))
    expect(readToolObservation(events(), { ...read, ...reference.readWith }).sourceHash).toBe(reference.sourceHash)
  })
  it('thins an older reference without changing its source or recursively wrapping it', () => {
    const original = messages()
    const projected = projectToolObservation(original[2]!, 2, original)!
    const withReference = [...original.slice(0, 2), projected.message]
    const thinned = projectToolObservation(projected.message, 2, withReference, { compactReference: true })!
    const reference = JSON.parse(String(thinned.message.content))
    expect(reference).toMatchObject({ sourceHash: hash, sourceBytes: Buffer.byteLength(source), toolCallId: 'call-1' })
    expect(reference).not.toHaveProperty('excerpt')
    expect(thinned.receipt.savedBytes).toBeGreaterThan(0)
    expect(projectToolObservation(thinned.message, 2, [...original.slice(0, 2), thinned.message], { compactReference: true })).toBeNull()
  })
})
