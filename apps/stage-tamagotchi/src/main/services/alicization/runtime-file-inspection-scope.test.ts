import { describe, expect, it } from 'vitest'

import { isFileActionWithoutVisualInspection } from './runtime-file-inspection-scope'

describe('explicit file scope and visual inspection', () => {
  it.each([
    '请写入 C:\\Users\\QA\\Desktop\\proof.txt。如果我在确认界面拒绝，就停止；如实告诉我结果。',
    'Read C:/Users/QA/Desktop/screen.txt and tell me the result.',
    '请保存到 C:/tmp/proof.txt，不要查看屏幕。',
    'Write /home/qa/Desktop/proof.txt; if I decline in the window, stop. Tell me the result.',
  ])('keeps the filesystem operation separate from screen permission: %s', (text) => {
    expect(isFileActionWithoutVisualInspection(text)).toBe(true)
  })
  it.each([
    '请查看当前屏幕，然后把结果写入 C:/tmp/proof.txt。',
    'Inspect the current screen, then save it to /tmp/proof.txt.',
    '如果方便，请看看当前窗口，然后保存到 C:/tmp/proof.txt。',
    '看看当前屏幕。',
  ])('preserves an actual visual request: %s', (text) => {
    expect(isFileActionWithoutVisualInspection(text)).toBe(false)
  })
})
