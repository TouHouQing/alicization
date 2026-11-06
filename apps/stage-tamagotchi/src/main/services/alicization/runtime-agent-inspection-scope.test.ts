import { expect, it } from 'vitest'

import { isAgentReadWithoutVisualSource } from './runtime-agent-inspection-scope'

it.each([
  '请用 life_search_sessions 查找我之前发出的只读测试请求，告诉我当时授权的操作是什么。',
  '请用 life_search_sessions 查找我以前说过“查看当前屏幕”的发言。',
  '使用 life_programmatic_read 合并文件数据，代码：{"text":"请查看当前屏幕"}',
  '请用 life_language_query 检查 TypeScript 文件。',
  '发现并调用 ext_code_review 工具，参数只有两个数字。',
  '请调用 life_list_automations，不要查看当前屏幕。',
])('keeps a local agent request out of stale screen attention: %s', (text) => {
  expect(isAgentReadWithoutVisualSource(text)).toBe(true)
})

it.each([
  '用 life_search_sessions 查找旧记录，然后查看当前屏幕。',
  'Use life_language_query, then inspect the current screen.',
  '请看看当前屏幕。',
  '用 life_list_automations 列出工作，再看看屏幕。',
])('preserves an independently explicit current visual request: %s', (text) => {
  expect(isAgentReadWithoutVisualSource(text)).toBe(false)
})
