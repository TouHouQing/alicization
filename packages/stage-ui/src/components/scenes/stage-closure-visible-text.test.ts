import { describe, expect, it } from 'vitest'

import { normalizeStageClosureVisibleText } from './stage-closure-visible-text'

describe('stage closure visible text', () => {
  it.each([
    '说明：private_key=value',
    '说明：私钥=value',
    'private_key=value,mode=internal',
    '说明：私钥=value；模式=internal',
    'private_key="value",mode="internal"',
    '说明：私钥="value"；模式="internal"',
    'note="a,b",mode="internal"',
    'active embodiment lanes: body',
    'memory recovery@segment-runtime-1',
    'body+voice recovery@turn-abc-segment-0',
    'body-only recovery@driver:reply',
    'audible-body rejoin@segment-runtime-1',
    '[fixed-template-excluded] internal response policy',
    '{"private_key":"value"}',
    '"internal text"',
    '123',
    'true',
    'null',
    '["private_key=value"] diagnostic payload',
    '[{"private_key":"value"}] renderer payload',
    '[true] status payload',
    '[[1] ] diagnostic payload',
    '[{"values":[1] }] renderer payload',
    '["a] b"] diagnostic payload',
    '[{"private_key":"value"},] renderer payload',
    '["private_key=value",] diagnostic payload',
    '[true,] status payload',
  ])('filters internal metadata: %s', (line) => {
    expect(normalizeStageClosureVisibleText(line)).toBeNull()
  })

  it('keeps ordinary natural language that uses structured', () => {
    expect(normalizeStageClosureVisibleText('We now have a structured plan for the memory migration.'))
      .toBe('We now have a structured plan for the memory migration.')
  })

  it.each([
    'Phase 1 migration completed successfully.',
    '用户要求把 temperature=0.7 写进 Provider 配置说明。',
    'Open https://example.test/?status=failed for details.',
    'Keep same-her explicit before replying.',
    '[Provider] request timed out; retry is available.',
    '[Phase 1] migration completed successfully.',
    '{draft} memory migration is ready for review.',
    '[docs](https://example.test) explains the recovery path.',
    '[1] Retry the provider request.',
    '[404] Provider request timed out.',
    '[2026] Phase 1 migration update.',
    '[HTTP/2] Provider request timed out.',
    '[ERR:42] Provider timeout.',
    '[C++] build failed.',
  ])('keeps natural language regardless of topic: %s', (line) => {
    expect(normalizeStageClosureVisibleText(line)).toBe(line)
  })

  it('keeps a natural email address containing recovery@', () => {
    expect(normalizeStageClosureVisibleText('请把恢复说明发送到 recovery@example.com。'))
      .toBe('请把恢复说明发送到 recovery@example.com。')
  })

  it('classifies metadata before truncating accepted text', () => {
    const internalObject = JSON.stringify({ private_key: 'x'.repeat(800) })
    const truncatedInternalObject = internalObject.slice(0, 420)
    const naturalLine = '自然文本 '.repeat(200)

    expect(normalizeStageClosureVisibleText(internalObject)).toBeNull()
    expect(normalizeStageClosureVisibleText(truncatedInternalObject)).toBeNull()
    expect(normalizeStageClosureVisibleText(naturalLine, 32)).toBe('自然文本 自然文本 自然文本 自然文本 自然文本 自然文本 自然')
  })
})
