import { describe, expect, it } from 'vitest'

import { shouldAttachAlicizationProjectStateContext } from './alicization-project-state-injection-policy'

describe('alicization project-state injection policy', () => {
  it('keeps ordinary user dialogue outside project-state context', () => {
    for (const latestUserText of [
      '你好',
      '你是谁',
      '今天好累',
      '随便聊聊',
      '你还记得我昨天说的事吗',
      'lipsync 是什么？',
      'same-her 这个词怪怪的',
      '我们沿着同一条线聊聊别的',
      'WorkingMemory 是什么？',
      'LongTermMemory 这个名字听起来有点硬',
    ]) {
      expect(shouldAttachAlicizationProjectStateContext({ latestUserText, origin: 'ui-user' })).toBe(false)
    }
  })

  it('includes project-state context for memory/personhood/productization questions', () => {
    for (const latestUserText of [
      '现在 Alicization 的记忆闭环做到哪一步了',
      'Phase 1 项目状态如何',
      '现在记忆闭环做到哪一步了',
      '长期记忆和人格还有什么没闭环',
      'memory workbench 的分页做好了吗',
      '继续开发人格与自我核心统一',
      '继续把短期记忆和长期记忆接起来',
      'WorkingMemory 和 LongTermMemory 的召回闭环还缺什么',
      'lipsync 和身体线闭环做到哪一步了',
    ]) {
      expect(shouldAttachAlicizationProjectStateContext({ latestUserText, origin: 'ui-user' })).toBe(true)
    }
  })

  it('treats template removal complaints as template-contamination repair rather than project-state context', () => {
    for (const latestUserText of [
      '别再用 same-her、same living line、Phase 1: Local Digital Life 这些固定模板了。',
      '不要再把同一个她、数字生命主线这些固定话术塞进回复。',
      '去掉 local-first digital life project 这种套话，按记忆和当前对话说。',
      'stop using same-her and one continuous her as canned slogans',
    ]) {
      expect(shouldAttachAlicizationProjectStateContext({ latestUserText, origin: 'ui-user' })).toBe(false)
    }
  })

  it('does not use fixed-template continuity slogans as positive project-state intent', () => {
    for (const latestUserText of [
      '继续沿着这条数字生命主线',
      '继续顺着这条已恢复的数字生命回线往下走',
      'same-her 这条线继续',
      'keep the same living line going',
      'Alicization is a local-first digital life project',
      '沿着同一个她继续聊',
      'same-her 相关固定模板清理完成了吗',
      '数字生命闭环继续推进',
      '本地数字生命人格闭环继续',
      '同一个她的项目线继续收住',
    ]) {
      expect(shouldAttachAlicizationProjectStateContext({ latestUserText, origin: 'ui-user' })).toBe(false)
    }
  })

  it('keeps ordinary execution/tool/task-status context outside project-state context', () => {
    for (const latestUserText of [
      '帮我执行命令 pnpm test',
      '工具结果显示通过了',
      '任务状态现在怎么样',
      '这个任务做到哪一步了',
      '这个命令还差什么',
      '刚才那个命令执行完了吗',
      '在 Alicization 仓库里帮我执行命令',
      'execution reply is required',
      'routing this command to the executor',
      'is this an execution capability question?',
    ]) {
      expect(shouldAttachAlicizationProjectStateContext({ latestUserText, origin: 'ui-user' })).toBe(false)
    }

    expect(shouldAttachAlicizationProjectStateContext({
      latestUserText: '普通工具结果',
      origin: 'tool-output',
    })).toBe(false)
    expect(shouldAttachAlicizationProjectStateContext({
      latestUserText: '你好',
      executionReplyRequired: true,
      origin: 'ui-user',
    })).toBe(false)
    expect(shouldAttachAlicizationProjectStateContext({
      latestUserText: '帮我执行这个命令',
      executionRoutingRequired: true,
      origin: 'ui-user',
    })).toBe(false)
    expect(shouldAttachAlicizationProjectStateContext({
      latestUserText: '这个工具能不能做？',
      executionCapabilityQuestion: true,
      origin: 'ui-user',
    })).toBe(false)
    expect(shouldAttachAlicizationProjectStateContext({
      latestUserText: '继续执行任务',
      actionKind: 'continue-task',
      origin: 'ui-user',
    })).toBe(false)
  })

  it('keeps explicit project-state answer subjects gated in', () => {
    expect(shouldAttachAlicizationProjectStateContext({
      latestUserText: '普通文本',
      answerSubject: 'project-state',
      origin: 'tool-output',
    })).toBe(true)
  })
})
