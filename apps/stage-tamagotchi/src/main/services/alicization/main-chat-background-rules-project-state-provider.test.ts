import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMinimalContextRecoveryMessages } from './main-chat-background-rules'
import { recoverAlicizationMainChatFromTimeout } from './main-chat-one-shot'
import { buildAlicizationProjectStateExtraSystemBlocks } from './project-state-brief'

describe('main chat background rules project-state recovery carry', () => {
  it('keeps canonical project-state context intact through minimal recovery compaction and timeout one-shot recovery', async () => {
    const canonicalProjectStateBlock = buildAlicizationProjectStateExtraSystemBlocks()[0]!
    const messages: Message[] = [
      { role: 'system', content: 'core-1' },
      { role: 'system', content: 'core-2' },
      { role: 'system', content: 'core-3' },
      { role: 'system', content: canonicalProjectStateBlock },
      { role: 'system', content: '[ALICIZATION_MIND_TURN_CONTRACT]\nProject identity: Alicization is a local-first digital life project.\nProject same-her self line: Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\nProject same-her drift risk: If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.' },
      { role: 'system', content: '[ALICIZATION_LIVING_SELF]\nProject identity still shaping this turn: Alicization is a local-first digital life project.' },
      { role: 'system', content: '[ALICIZATION_EXECUTIVE_ANSWER_BRIEF]\nProject preflight self-awareness: Alicization is a local-first digital life project and this turn still belongs to the same unfinished Phase 1 digital life line.' },
      { role: 'user', content: 'older user turn' },
      { role: 'assistant', content: 'older assistant turn' },
      { role: 'user', content: '这个 goal 现在还差什么没闭环？' },
    ]

    const compactMessages = buildAlicizationMinimalContextRecoveryMessages(messages)
    const observedOneShotMessages: Message[][] = []

    const recoveredText = await recoverAlicizationMainChatFromTimeout({
      chatConfig: { model: 'gpt-test' } as any,
      messages: compactMessages,
      timeoutMs: 1_000,
      maxSteps: 1,
      generateTextImpl: async (input) => {
        observedOneShotMessages.push(((input as { messages?: Message[] }).messages ?? []).slice())
        return {
          finishReason: 'stop',
          text: 'recovery-ok',
        }
      },
    })

    expect(recoveredText).toBe('recovery-ok')
    expect(observedOneShotMessages).toHaveLength(1)

    const canonicalProjectStateSystemMessage = observedOneShotMessages[0].find(message =>
      message.role === 'system'
      && typeof message.content === 'string'
      && message.content.includes('[ALICIZATION_PROJECT_STATE]')
      && message.content.includes('current_phase=')
      && message.content.includes('current_objective=')
      && message.content.includes('project_preflight=')
      && message.content.includes('latest_landed_progress=')
      && message.content.includes('same_her_self_line=')
      && message.content.includes('same_her_drift_risk=')
      && message.content.includes('primary_open_loop=')
      && message.content.includes('next_closure_target='),
    )

    expect(canonicalProjectStateSystemMessage).toBeDefined()
    expect(canonicalProjectStateSystemMessage?.content).toBe(canonicalProjectStateBlock)
  })
})
