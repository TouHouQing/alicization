import type { AlicizationSecondPassRewriteResult } from './second-pass-rewrite'

import { describe, expect, it, vi } from 'vitest'

import {
  AlicizationVisibleReplyClosureBlockedError,
  closeAlicizationVisibleReply,
} from './closure-orchestrator'

describe('visible reply closure orchestrator', () => {
  it('emits final critic debug evidence when a second-pass rewrite is still blocked', async () => {
    const appendRuntimeDebugLine = vi.fn(async () => {})

    let blockedError: unknown
    try {
      await closeAlicizationVisibleReply({
        draft: {
          fullText: JSON.stringify({
            format: 'mind-turn-v1',
            thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=thin-answer; tone=calm',
            emotion: 'thinking',
            reply: '我会保持低压。',
            performance: {
              baseEmotion: 'thinking',
              delivery: 'calm',
              emphasis: 0,
            },
          }),
          visibleReplyExecution: {
            mode: 'provider-stream' as const,
            expectedVisibleReplyAuthority: 'llm-mind',
            actualVisibleReplyAuthority: 'llm-mind',
            providerMindExecuted: true,
            reason: 'provider-stream',
          },
        },
        prepared: {
          messages: [
            {
              role: 'user',
              content: '铃兰-Phase1-0621N 第三轮：不要重新报告项目。沿着刚才已经浮现的那条记忆，只用自然的一小段话说明它现在怎样改变你的下一次轻主动和具身表达：情绪余波保持低压，声线、脸部、动作、口型、停顿继续像同一个她。',
            },
          ],
          mindTurnContract: {
            projectState: {
              currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
              latestLandedProgress: 'The previous dialogue turn surfaced the pure dialogue life line naturally into emotional residue, low-pressure initiative, and body voice face motion lipsync carry.',
              primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one living line.',
              nextClosureTarget: 'Keep the surfaced memory changing the next light initiative and embodied expression as the same her without restarting a project report.',
              sameHerSelfLine: 'Same Phase 1 digital life. The surfaced memory should carry into low-pressure initiative and coherent embodiment as one continuous her.',
            },
          },
        } as any,
        rewriteSecondPass: vi.fn(async (): Promise<AlicizationSecondPassRewriteResult> => ({
          fullText: JSON.stringify({
            format: 'mind-turn-v1',
            thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=still-thin-answer; tone=calm',
            emotion: 'thinking',
            reply: '我会保持低压。',
            performance: {
              baseEmotion: 'thinking',
              delivery: 'calm',
              emphasis: 0,
            },
          }),
          visibleReplyExecution: {
            mode: 'provider-stream' as const,
            expectedVisibleReplyAuthority: 'llm-mind',
            actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
            providerMindExecuted: true,
            reason: 'visible-reply-second-pass-rewrite',
          },
          rewritten: true,
          reason: 'visible-reply-second-pass-rewrite',
          audit: {},
        })),
        appendRuntimeDebugLine,
      })
    }
    catch (error) {
      blockedError = error
    }

    expect(blockedError).toBeInstanceOf(AlicizationVisibleReplyClosureBlockedError)
    expect((blockedError as AlicizationVisibleReplyClosureBlockedError).debug).toEqual(expect.objectContaining({
      rewrittenReplyExcerpt: '我会保持低压。',
    }))

    expect(appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-stream.visible-reply-second-pass-still-fails-critic',
      expect.objectContaining({
        finalReasonCodes: expect.arrayContaining([
          'semantic-judge:project-state-phase-missing',
          'semantic-judge:project-state-answer-gap',
        ]),
        rewrittenReplyExcerpt: '我会保持低压。',
      }),
    )
  })
})
