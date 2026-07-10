import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import {
  assertAlicizationCanonicalProjectState,
  carriesAlicizationCanonicalProjectState,
} from './main-chat-project-state-guard'
import { buildAlicizationProviderFacingProjectStateSystemBlock } from './project-state-brief'

const canonicalProjectStateBlock = [
  '[ALICIZATION_PROJECT_STATE]',
  'context_role=memory_governance_status',
  'short_term_owner=WorkingMemory',
  'long_term_recall_owner=LongTermMemoryRecall',
  'template_policy=no_fixed_persona_templates',
  'failure_surface=transparent_errors_only',
  'latest_landed_progress=Memory Workbench policy, recall diagnostics, and provider failure transparency are visible.',
  'primary_open_loop=Memory, initiative, and embodiment still need stronger observed closure.',
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

  it('rejects provider-facing project-state context that still uses fixed identity templates', () => {
    const providerFacingProjectStateBlock = [
      '[ALICIZATION_PROJECT_STATE]',
      'identity=phase1_local_digital_life',
      'project_preflight=identity=phase1_local_digital_life | phase=phase1_local_digital_life | open=memory continuity | next=semantic recall productization',
      'current_phase=phase1_local_digital_life',
      'current_objective=Build a local companion on the host computer with continuous personhood, stable memory, emotional state, initiative, execution ability, embodied expression, and natural dialogue.',
      'latest_landed_progress=content=excluded; reason=continuity-residue; visibility=internal-structured',
      'continuity_anchor=phase1_local_digital_life; landed_closure=partial; unresolved_closure=memory_dialogue_embodiment; visibility=internal-structured.',
      'continuity_drift_risk=project-state continuity must stay diagnostic rather than replacing first-person memory continuity.',
      'primary_open_loop=Memory, initiative, and embodiment still need stronger closure.',
      'next_closure_target=content=excluded; reason=continuity-residue; visibility=internal-structured',
    ].join('\n')

    const messages = [
      { role: 'system', content: providerFacingProjectStateBlock },
      { role: 'user', content: '继续看项目状态。' },
    ] satisfies Message[]

    expect(carriesAlicizationCanonicalProjectState(messages)).toBe(false)
    expect(() => assertAlicizationCanonicalProjectState(messages, 'one-shot')).toThrowError(
      'Alicization one-shot messages must include canonical project-state context before generation.',
    )
  })

  it('accepts the current provider-facing memory-governance project-state block', () => {
    const block = buildAlicizationProviderFacingProjectStateSystemBlock()
    const messages = [
      { role: 'system', content: block },
      { role: 'user', content: '继续看项目状态。' },
    ] satisfies Message[]

    expect(block).toContain('context_role=memory_governance_status')
    expect(block).toContain('short_term_owner=WorkingMemory')
    expect(block).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(block).toContain('template_policy=no_fixed_persona_templates')
    expect(block).not.toContain('identity=')
    expect(block).not.toContain('current_phase=')
    expect(carriesAlicizationCanonicalProjectState(messages)).toBe(true)
    expect(() => assertAlicizationCanonicalProjectState(messages, 'one-shot')).not.toThrow()
  })

  it('rejects legacy canonical-looking blocks whose required fields are fixed-template residue', () => {
    const legacyTemplateProjectStateBlock = [
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

    const messages = [
      { role: 'system', content: legacyTemplateProjectStateBlock },
      { role: 'user', content: '继续看项目状态。' },
    ] satisfies Message[]

    expect(carriesAlicizationCanonicalProjectState(messages)).toBe(false)
    expect(() => assertAlicizationCanonicalProjectState(messages, 'stream')).toThrowError(
      'Alicization stream messages must include canonical project-state context before generation.',
    )
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

  it('rejects marker blocks whose required closure fields are filled with placeholder none values instead of real project-state knowledge', () => {
    const placeholderFilledBlock = [
      '[ALICIZATION_PROJECT_STATE]',
      'project_preflight=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'current_phase=Phase 1: Local Digital Life',
      'current_objective=Build a local companion on the host computer with continuous personhood, stable memory, emotional state, initiative, execution ability, embodied expression, and natural dialogue.',
      'latest_landed_progress=none',
      'same_her_self_line=Same Phase 1 digital life. Unfinished closure still needs the same living line.',
      'same_her_drift_risk=none',
      'primary_open_loop=none',
      'next_closure_target=none',
    ].join('\n')

    const messages = [
      { role: 'system', content: placeholderFilledBlock },
      { role: 'user', content: '继续，但别把项目状态伪装成 none 占位。' },
    ] satisfies Message[]

    expect(carriesAlicizationCanonicalProjectState(messages)).toBe(false)
    expect(() => assertAlicizationCanonicalProjectState(messages, 'one-shot')).toThrowError(
      'Alicization one-shot messages must include canonical project-state context before generation.',
    )
  })
})
