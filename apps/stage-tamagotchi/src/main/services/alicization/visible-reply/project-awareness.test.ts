import { describe, expect, it } from 'vitest'

import { scoreVisibleReplyProjectAwarenessLine } from './project-awareness'

describe('scoreVisibleReplyProjectAwarenessLine', () => {
  it('scores structured project facts above fixed Phase 1 same-her slogans', () => {
    const structuredAwareness = 'identity=local_desktop_life_loop | visibility=internal-structured | open=open_loop=semantic_recall+memory_review; status=unfinished | next=embedding_recall_reindex | continuity_anchor=local_desktop_life_loop'
    const fixedSlogan = 'Before answering, remember: Alicization is a local-first digital life project building one continuous her. Same Phase 1 digital life. Unfinished closure still needs the same living line.'

    expect(scoreVisibleReplyProjectAwarenessLine(structuredAwareness)).toBeGreaterThan(
      scoreVisibleReplyProjectAwarenessLine(fixedSlogan),
    )
  })

  it('does not reward fixed same-her slogans over concrete Chinese memory closure progress', () => {
    const concreteProgress = '记忆闭环已经接上短期 WorkingMemory、长期 LongTermMemoryRecall 和可见治理入口，下一步要验证语义召回质量、embedding 重建和分页搜索。'
    const fixedSlogan = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'

    expect(scoreVisibleReplyProjectAwarenessLine(concreteProgress)).toBeGreaterThan(
      scoreVisibleReplyProjectAwarenessLine(fixedSlogan),
    )
  })

  it('scores a richer Chinese project identity/progress/open-loop line above a thinner same-her reminder shell', () => {
    const richerChineseProjectLine = '这是一个本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const thinnerChineseReminder = '回答前先记住这是同一个她的项目，别把这条线忘了。'

    expect(scoreVisibleReplyProjectAwarenessLine(richerChineseProjectLine)).toBeGreaterThan(
      scoreVisibleReplyProjectAwarenessLine(thinnerChineseReminder),
    )
  })

  it('scores a richer Chinese project identity/progress/open-loop line above a thin first-stage reminder shell', () => {
    const richerChineseProjectLine = '这是一个本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const thinnerChineseReminder = '开口前先记住：这是同一个数字生命项目，她现在仍在第一阶段。'

    expect(scoreVisibleReplyProjectAwarenessLine(richerChineseProjectLine)).toBeGreaterThan(
      scoreVisibleReplyProjectAwarenessLine(thinnerChineseReminder),
    )
  })

  it('scores a richer Chinese project identity/progress/open-loop line above a thin still-in-first-stage reminder shell', () => {
    const richerChineseProjectLine = '这是一个本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const thinnerChineseReminder = '开口前先记住：这是同一个数字生命项目，她仍在第一阶段。'

    expect(scoreVisibleReplyProjectAwarenessLine(richerChineseProjectLine)).toBeGreaterThan(
      scoreVisibleReplyProjectAwarenessLine(thinnerChineseReminder),
    )
  })

  it('scores a richer Chinese project identity/progress/open-loop line above a thin still-in-phase-1 reminder shell', () => {
    const richerChineseProjectLine = '这是一个本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const thinnerChineseReminder = '开口前先记住：这是同一个数字生命项目，她仍在 Phase 1。'

    expect(scoreVisibleReplyProjectAwarenessLine(richerChineseProjectLine)).toBeGreaterThan(
      scoreVisibleReplyProjectAwarenessLine(thinnerChineseReminder),
    )
  })

  it('scores a richer Chinese project identity/progress/open-loop line above a thin still-on-phase-1 reminder shell', () => {
    const richerChineseProjectLine = '这是一个本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const thinnerChineseReminder = '开口前先记住：这是同一个数字生命项目，她还在 Phase 1。'

    expect(scoreVisibleReplyProjectAwarenessLine(richerChineseProjectLine)).toBeGreaterThan(
      scoreVisibleReplyProjectAwarenessLine(thinnerChineseReminder),
    )
  })

  it('scores a richer Chinese project identity/progress/open-loop line above a thin stage-one reminder shell', () => {
    const richerChineseProjectLine = '这是一个本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const thinnerChineseReminder = '开口前先记住：这是同一个数字生命项目，她还在阶段一。'

    expect(scoreVisibleReplyProjectAwarenessLine(richerChineseProjectLine)).toBeGreaterThan(
      scoreVisibleReplyProjectAwarenessLine(thinnerChineseReminder),
    )
  })

  it('scores a richer Chinese project identity/progress/open-loop line above a thin still-the-same-project reminder shell', () => {
    const richerChineseProjectLine = '这是一个本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const thinnerChineseReminder = '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。'

    expect(scoreVisibleReplyProjectAwarenessLine(richerChineseProjectLine)).toBeGreaterThan(
      scoreVisibleReplyProjectAwarenessLine(thinnerChineseReminder),
    )
  })

  it('scores a richer Chinese project identity/progress/open-loop line above a thin still-in-stage-one reminder shell', () => {
    const richerChineseProjectLine = '这是一个本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const thinnerChineseReminder = '开口前先记住：这是同一个数字生命项目，她仍在阶段一。'

    expect(scoreVisibleReplyProjectAwarenessLine(richerChineseProjectLine)).toBeGreaterThan(
      scoreVisibleReplyProjectAwarenessLine(thinnerChineseReminder),
    )
  })
})
