import { describe, expect, it } from 'vitest'

import { isLifeRecallOnlyTurn } from './life-recall-tool-scope'

describe('historical dialogue tool scope', () => {
  it.each([
    '重启之前你自己实际做过哪些小活动？哪些已经完成，哪些只是想法？说具体发生过的事。',
    '我先前对我们的聊天方式提过什么要求？记不清就直说。',
    'What did you do before the restart? Which activities actually happened?',
  ])('uses committed evidence for a pure retrospective question: %s', (text) => {
    expect(isLifeRecallOnlyTurn({ text, hasAttachments: false })).toBe(true)
  })
  it.each([
    '回顾之前的小故事，再写一段新的。',
    '之前读过哪个文件？现在重新读取它。',
    '你记得这件事吗？帮我删除这个文件。',
    '你之前做过哪些活动？伸展一下给我看。',
    'Remember what happened and send me the file.',
    '帮我写一个小故事。',
    '记住我喜欢雨声。',
    '回忆一下之前发生的事，继续。',
  ])('retains execution for a mixed, current or ambiguous request: %s', (text) => {
    expect(isLifeRecallOnlyTurn({ text, hasAttachments: false })).toBe(false)
  })
  it('retains tools for attachments rather than guessing whether their contents request work', () => {
    expect(isLifeRecallOnlyTurn({ text: '回顾之前发生的事。', hasAttachments: true })).toBe(false)
  })
})
