import type { acceptedProcedureInvocations } from './procedure-invocation-acknowledgment'

import { describe, expect, it } from 'vitest'

import { groundedProcedureInvocation } from './procedure-invocation-acknowledgment'

function fixture() {
  const invocation: ReturnType<typeof acceptedProcedureInvocations>[number] = {
    binding: { kind: 'effect', id: 'accepted-current-invocation', version: '0' },
    responsibility: { kind: 'obligation', id: 'current-work', version: '1' },
    id: `skill.learned_${'a'.repeat(24)}`,
    version: 'b'.repeat(64),
    planId: 'current-plan',
    planRevision: 1,
    parametersHash: 'c'.repeat(64),
    executionAcknowledgment: null,
    values: ['C:/qa/output.txt', 'C:/qa/source.txt', '新的中文内容🙂'],
    paths: ['C:/qa/output.txt', 'C:/qa/source.txt'],
    contents: ['新的中文内容🙂'],
    fileOperations: { fileCount: 2, operations: ['写入', '读取'] },
    scope: 'accepted-method-invocation-only-no-step-or-goal-completion',
  }
  const question = `${invocation.id}@${invocation.version}: ${invocation.values.join(' ; ')}`
  const review = (quote: string, request = question) => groundedProcedureInvocation([invocation], { quote, question: request, binding: invocation.binding })
  return { invocation, question, review }
}

describe('accepted method argument summaries', () => {
  it.each([
    '已按对应字段提交两个测试文件的写入和读取操作，',
    '按要求提交了2个文件的读取和写入操作。',
    '我找到并调用了指定版本的已启用方法，按要求提交了两个测试文件的写入和读取操作。',
    '方法已受理；',
  ])('binds admission wording without teaching action completion: %s', (quote) => {
    expect(fixture().review(quote)?.scope).toBe('accepted-method-invocation-only-no-step-or-goal-completion')
  })

  it.each([
    '已按对应字段提交三个测试文件的写入和读取操作。',
    '已按对应字段提交两个测试文件的写入操作。',
    '已按对应字段提交两个测试文件的读取操作。',
    '已按对应字段提交两个测试文件的写入和上传操作。',
    '已按对应字段完成两个测试文件的写入和读取操作。',
    '已按对应字段提交两个测试文件的写入和读取操作，并上传了报告。',
    '两个测试文件都已写入和读取。',
    '他按要求提交了两个测试文件的写入和读取操作。',
  ])('retains changed scope, extra actions, completion and speaker claims: %s', (quote) => {
    expect(fixture().review(quote)).toBeNull()
  })

  it('requires all actual path/content arguments in the current request and one precise binding', () => {
    const f = fixture()
    const quote = '已按对应字段提交两个测试文件的写入和读取操作。'
    expect(f.review(quote, f.question.replace(f.invocation.contents[0], '不同内容'))).toBeNull()
    expect(f.review(quote, f.question.replace(f.invocation.paths[1], 'C:/qa/another.txt'))).toBeNull()
    expect(f.review(quote, f.question.replace(f.invocation.version, 'd'.repeat(64)))).toBeNull()
    expect(groundedProcedureInvocation([f.invocation], { quote, question: f.question, binding: { ...f.invocation.binding, id: 'another-invocation' } })).toBeNull()
    expect(groundedProcedureInvocation([f.invocation, f.invocation], { quote, question: f.question, binding: null })).toBeNull()
    f.invocation.fileOperations = null
    expect(f.review(quote)).toBeNull()
  })
})
