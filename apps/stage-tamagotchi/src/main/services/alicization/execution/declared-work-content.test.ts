import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { restoreDeclaredWorkContent } from './declared-work-content'

function fixture() {
  const path = join(tmpdir(), 'literal-content-only.txt')
  return { goal: '保存原始内容', criteria: [{ id: 'file', required: true, proofScope: 'structure' as const, predicate: { kind: 'text-content' as const, path, includes: ['中文🙂\n原始 $() `text`'] } }], steps: [{ id: 'write', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path, content: '中文🙂\n原始 $() `text`' }, acceptanceCriterionIds: ['file'] }] }
}

it('copies only current source literal contents, preserving exact escaped bytes and proposed inputs', () => {
  const source = fixture()
  const candidate = structuredClone(source)
  candidate.steps[0].input.content = '模型转写错了字节'
  const before = structuredClone(candidate)
  const restored = restoreDeclaredWorkContent(candidate, `只按参数执行：${JSON.stringify(source)}`)
  expect(restored.input).toEqual(source)
  expect(restored.projection).toMatchObject({ version: 'declared-work-literal-content-v1', fields: ['steps.0.input.content'], actionAdmitted: false })
  expect(JSON.stringify(restored.projection)).not.toContain(source.steps[0].input.content)
  expect(candidate).toEqual(before)
  expect(restoreDeclaredWorkContent(source, JSON.stringify(source)).projection).toBeNull()
})

it.each(['goal', 'criteria', 'path', 'step', 'extra-action', 'missing-content', 'bound-content', 'invalid-schema'])('does not reconstruct a different or ambiguous proposal: %s', (change) => {
  const source = fixture()
  const candidate: any = structuredClone(source)
  candidate.steps[0].input.content = 'typo'
  if (change === 'goal')
    candidate.goal = '另一个目标'
  if (change === 'criteria')
    candidate.criteria[0].predicate.includes = ['weaker requirement']
  if (change === 'path')
    candidate.steps[0].input.path = join(tmpdir(), 'another-target.txt')
  if (change === 'step')
    candidate.steps[0].id = 'other-step'
  if (change === 'extra-action')
    candidate.steps.push({ ...candidate.steps[0], id: 'extra' })
  if (change === 'missing-content')
    delete candidate.steps[0].input.content
  if (change === 'bound-content') {
    source.steps[0] = { ...source.steps[0], inputBindings: [{ parameter: 'content', stepId: 'source', path: ['text'] }] } as any
    candidate.steps[0].inputBindings = structuredClone((source.steps[0] as any).inputBindings)
  }
  if (change === 'invalid-schema')
    candidate.undeclared = true
  const actual = restoreDeclaredWorkContent(candidate, JSON.stringify(source))
  expect(actual.projection).toBeNull()
  expect(actual.input).toBe(candidate)
})

it('does not infer missing source bytes, resolve competing source plans or rewrite contradictory source requirements', () => {
  const source = fixture()
  const candidate = structuredClone(source)
  candidate.steps[0].input.content = 'typo'
  expect(restoreDeclaredWorkContent(candidate, '普通对话，没有结构化任务参数').projection).toBeNull()
  const different = { ...source, goal: '另一个计划' }
  expect(() => restoreDeclaredWorkContent(candidate, `${JSON.stringify(source)}\n${JSON.stringify(different)}`)).toThrow('different work plans')
  source.criteria[0].predicate.includes = ['源参数自身也无法满足的条件']
  expect(restoreDeclaredWorkContent(candidate, JSON.stringify(source)).projection).toBeNull()
})
