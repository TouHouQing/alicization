import { inferAlicizationInspectionIntent } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { projectInspectionDirective, projectInspectionMessages } from './runtime-inspection-directive'

describe('inspection directive projection', () => {
  it('prevents historical arguments from authorizing a short follow-up while retaining real shared attention', () => {
    const history = [{ role: 'user', content: [{ type: 'text', text: '执行参数：{"kind":"user-review","question":"帮我看看当前页面有什么？"}' }] }, { role: 'assistant', content: '任务已受理。' }]
    const original = structuredClone(history)
    expect(inferAlicizationInspectionIntent({ message: '这个呢？', recentMessages: history }).active).toBe(true)
    expect(inferAlicizationInspectionIntent({ message: '这个呢？', recentMessages: projectInspectionMessages(history) }).active).toBe(false)
    expect(inferAlicizationInspectionIntent({ message: '这个呢？', recentMessages: projectInspectionMessages([{ role: 'user', content: '帮我看看当前页面有什么？' }]) }).active).toBe(true)
    expect(history).toEqual(original)
  })

  it.each([
    '{"tool":"browser_read_page","question":"看看屏幕？"}',
    '[{"nested":[{"text":"quote \\\" } 看看屏幕"}]}]',
    '{"unfinished":"看看屏幕',
    '```json\n{"text":"看看屏幕"}\n```',
    '```typescript\ninspect(screen)\n',
  ])('keeps structured data opaque to desktop sensing: %s', (data) => {
    const source = `执行这些参数：${data}`
    expect(projectInspectionDirective(source)).toEqual({ text: '执行这些参数：', hasStructuredContent: true })
  })

  it('preserves an explicit screen request before and after nested arguments', () => {
    const result = projectInspectionDirective('请看看当前屏幕。参数：{"items":[{"text":"[嵌套]"}]} 然后描述窗口。')
    expect(result.text).toBe('请看看当前屏幕。参数：  然后描述窗口。')
    expect(result.hasStructuredContent).toBe(true)
  })

  it('preserves ordinary bracketed prose and natural dialogue', () => {
    expect(projectInspectionDirective('看看[当前页面]，再算 {x + y}。')).toEqual({ text: '看看[当前页面]，再算 {x + y}。', hasStructuredContent: false })
  })
})
