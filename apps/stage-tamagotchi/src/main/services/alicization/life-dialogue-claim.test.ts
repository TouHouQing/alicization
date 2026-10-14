import { describe, expect, it } from 'vitest'

import { hasExplicitActivityTimeQualifier, isCurrentHostPreferenceAcknowledgment, isPureNonCompletionStatement, isPureOwnCreativeWish, lifeIntervalActivityAbsenceQuotes } from './life-dialogue-claim'

describe('activity claim language boundaries', () => {
  it.each([
    ['欢迎回来。刚才这段时间我没有做新的事；更早些时候，我写了一个故事。', ['刚才这段时间我没有做新的事；']],
    ['刚才那段安静的时间里，我没有做什么新的事。更早些时候，我写了一个故事。', ['刚才那段安静的时间里，我没有做什么新的事。']],
    ['那段安静时间内，我没有进行任何新的活动。', ['那段安静时间内，我没有进行任何新的活动。']],
    ['这段时间，我什么也没做。', ['这段时间，我什么也没做。']],
    ['I did not do anything. I considered a story.', ['I did not do anything.']],
    ['我没有创建其他文件。', []],
    ['你说“刚才这段时间我没有做新的事”。', []],
    ['在这个故事里，我没有做新的事。', []],
    ['我想换一个题材，但还没写新故事。', []],
    ['如果什么也没做，我会直接说。', []],
  ])('isolates an actual general activity denial without broadening scoped or quoted text: %s', (text, expected) => {
    expect(lifeIntervalActivityAbsenceQuotes(text as string)).toEqual(expected)
  })
  it('keeps an own creative wish separate from an undertaking for the host', () => {
    expect(isPureOwnCreativeWish('此刻我想试试一个带点奇幻色彩的点子：雾夜里有盏旧灯，总悄悄替迷路的人照出回家的路。', true)).toBe(true)
    expect(isPureOwnCreativeWish('我想写一个小故事。我已经完成并保存了它。')).toBe(false)
    expect(isPureOwnCreativeWish('至于我嘛，我有点想试着写一段很短的小故事，最好带一点雨后的气息。')).toBe(true)
    for (const text of ['我想试着帮你写故事。', '我想试着写小故事，明天一定给你。', '我会试着写小故事。'])
      expect(isPureOwnCreativeWish(text)).toBe(false)
    const source = { summary: '用户喜欢雨停后听轻柔的钢琴曲。' }
    expect(isCurrentHostPreferenceAcknowledgment('好，我会记住你喜欢雨停后听轻柔的钢琴曲。至于我嘛，我有点想试着写一段很短的小故事，最好带一点雨后的气息。', source)).toBe(true)
    expect(isCurrentHostPreferenceAcknowledgment('我会记住你喜欢雨停后听轻柔的钢琴曲，并永久保存到长期记忆。', source)).toBe(false)
  })
  const evidence = { summary: '用户现在更喜欢晴天和风声。', supersedesText: ['阴天雨声', '雨声'] }
  it.each(['明白：你现在更喜欢晴天和风声，', '收到，我会以你现在更喜欢晴天和风声为准，把阴天雨声当作过去的偏好，不再混淆。'])('recognizes a source-backed current acknowledgment: %s', (text) => {
    expect(isCurrentHostPreferenceAcknowledgment(text, evidence)).toBe(true)
  })
  it.each(['已经把晴天和风声保存到长期记忆。', '明白：你现在更喜欢雪天和鸟声。', '你现在更喜欢晴天和风声，明天我提醒你。', '我会以你现在更喜欢晴天和风声为准并删除旧记忆。'])('keeps storage, unsupported facts and separate actions subject to proof: %s', (text) => {
    expect(isCurrentHostPreferenceAcknowledgment(text, evidence)).toBe(false)
  })
  it('cannot acknowledge a preference without its actual current input evidence', () => {
    expect(isCurrentHostPreferenceAcknowledgment('你现在更喜欢晴天和风声。', null)).toBe(false)
  })
  it.each(['我没有实际做别的事。', '这次还没有创作或保存作品。', '不能说完成了。', 'I did not finish the work.'])('recognizes the fully negated clause %s', (text) => {
    expect(isPureNonCompletionStatement(text)).toBe(true)
  })
  it.each(['我没有失败，作品完成了。', '我没有保存，但已经上传了。', 'I did not fail.', '我完成了作品。'])('keeps affirmative or mixed claims subject to proof: %s', (text) => {
    expect(isPureNonCompletionStatement(text)).toBe(false)
  })
  it('uses the same sentence time introduction without borrowing from another sentence or a file name', () => {
    expect(hasExplicitActivityTimeQualifier('在你安静之前，我完成了作品，也核对了文件。', '我完成了作品，', 'explicitly-before-interval')).toBe(true)
    expect(hasExplicitActivityTimeQualifier('我之前没完成。现在完成了作品。', '现在完成了作品。', 'explicitly-before-interval')).toBe(false)
    expect(hasExplicitActivityTimeQualifier('我完成了 before.txt。', '我完成了 before.txt。', 'explicitly-before-interval')).toBe(false)
    expect(hasExplicitActivityTimeQualifier('按你之前的要求，我完成了文件。', '我完成了文件。', 'explicitly-before-interval')).toBe(false)
  })
})
