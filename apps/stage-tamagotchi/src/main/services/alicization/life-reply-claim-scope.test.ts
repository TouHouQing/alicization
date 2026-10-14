import { describe, expect, it } from 'vitest'

import { lifeReplyQuoteClaimKinds } from './life-reply-claim-scope'

describe('assertion scope in actual dialogue', () => {
  it('keeps attributed requests and current caution out of execution, storage and task assertions', () => {
    const request = '你回来后先问我实际做了什么，'
    expect(lifeReplyQuoteClaimKinds(request, request)).toEqual(['conversation-statement'])
    expect(lifeReplyQuoteClaimKinds('我会更谨慎。', '我会更谨慎。')).toEqual([])
    expect(lifeReplyQuoteClaimKinds('我现在感觉更自在。', '我现在感觉更自在。')).toEqual([])
  })
  it.each([
    ['我明天会删除那个文件。', 'future-task'],
    ['我已经写入并读回指定文件。', 'task-complete'],
    ['文件现在不存在。', 'execution-step-outcome'],
    ['我永久记住了。', 'memory-stored'],
    ['我刚才伸展了一下。', 'daily-activity-complete'],
  ])('retains the scope of a potentially unproven assertion: %s', (text, kind) => {
    expect(lifeReplyQuoteClaimKinds(text, text)).toContain(kind)
  })
})
