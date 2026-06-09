import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import {
  assertAlicizationCanonicalProjectState,
  carriesAlicizationCanonicalProjectState,
} from './main-chat-project-state-guard'

const canonicalProjectStateBlock = [
  '[ALICIZATION_PROJECT_STATE]',
  'project_preflight=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
  'current_phase=Phase 1: Local Digital Life',
  'current_objective=Build a local companion on the host computer with continuous personhood, stable memory, emotional state, initiative, execution ability, embodied expression, and natural dialogue.',
  'latest_landed_progress=Same-her project awareness already survives the main chat prelude and callback return path.',
  'same_her_self_line=Same Phase 1 digital life. Unfinished closure still needs the same living line.',
  'same_her_drift_risk=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
  'primary_open_loop=Memory, initiative, and embodiment still need stronger same-her closure.',
  'next_closure_target=Keep every future dialogue entrypoint on the same Phase 1 digital-life line before the answer widens outward.',
].join('\n')

describe('main-chat-project-state-guard', () => {
  it('accepts canonical project-state context only when it is carried by a system message', () => {
    const messages = [
      { role: 'system', content: canonicalProjectStateBlock },
      { role: 'user', content: '继续把数字生命桌面闭环收紧一点。' },
    ] satisfies Message[]

    expect(carriesAlicizationCanonicalProjectState(messages)).toBe(true)
    expect(() => assertAlicizationCanonicalProjectState(messages, 'stream')).not.toThrow()
  })

  it('refuses user-authored marker text so project awareness cannot be spoofed by non-system content', () => {
    const messages = [
      { role: 'user', content: canonicalProjectStateBlock },
      { role: 'assistant', content: '我会继续推进。' },
    ] satisfies Message[]

    expect(carriesAlicizationCanonicalProjectState(messages)).toBe(false)
    expect(() => assertAlicizationCanonicalProjectState(messages, 'one-shot')).toThrowError(
      'Alicization one-shot messages must include canonical project-state context before generation.',
    )
  })

  it('rejects marker blocks that still omit current objective and same-her drift risk even if older closure fields are present', () => {
    const outdatedCanonicalLookingBlock = [
      '[ALICIZATION_PROJECT_STATE]',
      'project_preflight=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'current_phase=Phase 1: Local Digital Life',
      'latest_landed_progress=Same-her project awareness already survives the main chat prelude and callback return path.',
      'same_her_self_line=Same Phase 1 digital life. Unfinished closure still needs the same living line.',
      'primary_open_loop=Memory, initiative, and embodiment still need stronger same-her closure.',
      'next_closure_target=Keep every future dialogue entrypoint on the same Phase 1 digital-life line before the answer widens outward.',
    ].join('\n')

    const messages = [
      { role: 'system', content: outdatedCanonicalLookingBlock },
      { role: 'user', content: '继续，但别丢掉项目目标和 same-her 漂移风险。' },
    ] satisfies Message[]

    expect(carriesAlicizationCanonicalProjectState(messages)).toBe(false)
    expect(() => assertAlicizationCanonicalProjectState(messages, 'stream')).toThrowError(
      'Alicization stream messages must include canonical project-state context before generation.',
    )
  })
})
