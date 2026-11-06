import type { Message } from '@xsai/shared-chat'

import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import { boundLifeProviderRequest } from '../life-provider-budget'
import { prepareAgentContinuation } from './progress-context'

function exchange(id: string, output: unknown, input = { path: 'current.txt' }): Message[] {
  return [{ role: 'assistant', content: '', tool_calls: [{ id, type: 'function', function: { name: 'read_file', arguments: JSON.stringify(input) } }] }, { role: 'tool', tool_call_id: id, content: JSON.stringify(output) }]
}
const current: Message = { role: 'user', content: '完成当前任务并核验结果。' }
describe('bounded goal continuation', () => {
  it('does not treat an unstarted batch tail as repeated failed execution', () => {
    const messages = [current, ...exchange('first', { ok: false, errorCode: 'LIFE_STATE_CONFLICT' }), ...Array.from({ length: 7 }, (_, index) => exchange(`skip-${index}`, { ok: false, status: 'blocked', errorCode: 'BATCH_REPLAN_REQUIRED', noSideEffects: true })).flat()]
    expect(prepareAgentContinuation(messages)).toMatchObject({ actionCount: 8, repeatedFailures: 1, replyOnly: false })
  })
  it('discloses action and batch budgets before the first tool proposal without demanding action', () => {
    const first = prepareAgentContinuation([current], { hasTools: true })
    expect(JSON.parse(String(first.messages.at(-1)!.content)).data).toMatchObject({ actionCount: 0, actionBudgetRemaining: 63, maxToolCallsPerStep: 8 })
    expect(String(first.messages.at(-1)!.content)).toContain('Ordinary companionship needs no action')
    expect(prepareAgentContinuation([current]).messages).toEqual([current])
  })
  it('caps derived progress context instead of competing with original evidence', () => {
    const messages = [current, ...Array.from({ length: 6 }, (_, index) => exchange(`call-${index}-${'x'.repeat(1024)}`, { ok: true, value: index })).flat()]
    const next = prepareAgentContinuation(messages)
    expect(Buffer.byteLength(String(next.messages.at(-1)!.content))).toBeLessThanOrEqual(1536)
    expect(next.messages.slice(0, -1)).toEqual(messages)
    expect(JSON.parse(String(next.messages.at(-1)!.content)).data.actionCount).toBe(6)
  })
  it('advises on repeated successful but unchanged calls while letting changing polling continue', () => {
    const repeated = prepareAgentContinuation([current, ...exchange('one', { ok: true, value: 'pending' }), ...exchange('two', { ok: true, value: 'pending' }), ...exchange('three', { ok: true, value: 'pending' })])
    expect(repeated.replyOnly).toBe(false)
    expect(JSON.parse(String(repeated.messages.at(-1)!.content)).data.repetition).toMatchObject({ toolName: 'read_file', consecutiveCalls: 3 })
    const changed = prepareAgentContinuation([...repeated.messages, ...exchange('four', { ok: true, value: 'ready' })])
    expect(JSON.parse(String(changed.messages.at(-1)!.content)).data.repetition).toBeNull()
  })
  it('keeps repeated-observation identity across exact receipt compaction', () => {
    const large = { ok: true, content: 'same observed content '.repeat(1000) }
    const messages = [current, ...exchange('one', large), ...exchange('two', large), ...exchange('three', large)]
    const before = prepareAgentContinuation(messages)
    const bounded = boundLifeProviderRequest(messages, [{ function: { name: 'life_read_tool_observation' } }], { contextTokens: 8192, outputReserve: 1024 })
    const after = prepareAgentContinuation(bounded.messages)
    expect(JSON.parse(String(before.messages.at(-1)!.content)).data.repetition).toEqual(JSON.parse(String(after.messages.at(-1)!.content)).data.repetition)
    expect(JSON.parse(String(after.messages.at(-1)!.content)).data.repetition).toMatchObject({ consecutiveCalls: 3 })
  })
  it('allows useful chains beyond the former sixteen-step ceiling and reserves a final reply', () => {
    const messages: Message[] = [current, ...Array.from({ length: 20 }, (_, index) => exchange(`call-${index}`, { ok: true }, { path: `${index}.txt` })).flat()]
    expect(prepareAgentContinuation(messages)).toMatchObject({ replyOnly: false, actionCount: 20, repeatedFailures: 0 })
    messages.push(...Array.from({ length: 43 }, (_, index) => exchange(`later-${index}`, { ok: true }, { path: `${index}.txt` })).flat())
    expect(prepareAgentContinuation(messages)).toMatchObject({ replyOnly: true, actionCount: 63 })
  })
  it('requests a changed plan after two identical failures and stops action proposals after three', () => {
    const failed = { ok: false, errorCode: 'FILE_NOT_FOUND', errorMessage: 'UNTRUSTED_TEXT must not become guidance' }
    const messages = [current, ...exchange('one', failed), ...exchange('two', failed)]
    const second = prepareAgentContinuation(messages)
    expect(second).toMatchObject({ replyOnly: false, repeatedFailures: 2 })
    expect(String(second.messages.at(-1)!.content)).toContain('change the plan')
    const third = prepareAgentContinuation([...second.messages, ...exchange('three', failed)])
    expect(third).toMatchObject({ replyOnly: true, repeatedFailures: 3 })
    expect(String(third.messages.at(-1)!.content)).not.toContain('UNTRUSTED_TEXT')
  })
  it('recognizes a fresh observed target or changed failure instead of counting it as the same proposal', () => {
    const initial = [current, ...exchange('one', { ok: false, errorCode: 'NOT_FOUND' }), ...exchange('two', { ok: false, errorCode: 'NOT_FOUND' })]
    expect(prepareAgentContinuation([...initial, ...exchange('three', { ok: false, errorCode: 'NOT_FOUND' }, { path: 'corrected.txt' })]).repeatedFailures).toBe(1)
    expect(prepareAgentContinuation([...initial, ...exchange('three', { ok: true })]).repeatedFailures).toBe(0)
    expect(prepareAgentContinuation([...initial, ...exchange('three', { ok: false, errorCode: 'ACCESS_DENIED' })]).repeatedFailures).toBe(1)
  })
  it('does not inherit the old turn failure streak or duplicate the derived progress block', () => {
    const prior = [...exchange('old', { ok: false }), current, ...exchange('new', { ok: false })]
    const first = prepareAgentContinuation(prior)
    const next = prepareAgentContinuation(first.messages)
    expect(next).toMatchObject({ actionCount: 1, repeatedFailures: 1 })
    expect(next.messages).toEqual(first.messages)
    expect(prior).toHaveLength(5)
  })
  it('retains the real failure streak when large error outputs become receipt references', () => {
    const failed = { ok: false, status: 'failed', errorCode: 'TARGET_MISSING', details: 'untrusted detailed diagnostic\n'.repeat(500) }
    const messages = [current, ...exchange('one', failed), ...exchange('two', failed), ...exchange('three', failed)]
    const bounded = boundLifeProviderRequest(messages, [{ function: { name: 'life_read_tool_observation' } }], { contextTokens: 8192, outputReserve: 1024 })
    expect(bounded.report.compactedToolObservations).toHaveLength(3)
    expect(prepareAgentContinuation(bounded.messages)).toMatchObject({ repeatedFailures: 3, replyOnly: true })
  })
})
