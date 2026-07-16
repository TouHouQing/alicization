import { describe, expect, it } from 'vitest'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
  sanitizeAlicizationStructuredInternalText,
} from './alicization-fixed-template-sanitizer'

describe('alicization fixed template sanitizer', () => {
  function expectProviderFacingExcluded(text: string) {
    expect(sanitizeAlicizationProviderFacingText(text)).toBe('')
  }

  function oldTemplate(parts: string[]) {
    return parts.join('')
  }

  it('replaces old project/personhood slogans before provider-facing rendering', () => {
    expectProviderFacingExcluded(
      oldTemplate(['Same Phase 1', ' digital life.']),
    )
    expectProviderFacingExcluded(
      'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice.',
    )
    expectProviderFacingExcluded(
      'Right now the host-facing closure still needs anthropomorphic emotional closure and identity-continuity',
    )
    expectProviderFacingExcluded(
      oldTemplate(['Before answer', 'ing, remember this is still project continuity.']),
    )
    expectProviderFacingExcluded(
      'Alicization is a local-first digital life project.',
    )
    expectProviderFacingExcluded(
      'this local-first digital life project',
    )
    expectProviderFacingExcluded(
      'Phase 1: Local Digital Life',
    )
    expectProviderFacingExcluded(
      'Alicization 还是本地优先数字生命项目。',
    )
    expectProviderFacingExcluded(
      'same_her_line=structured continuity digest.',
    )
    expectProviderFacingExcluded(
      'Proactive initiative must stay inside the same digital life project line.',
    )
    expectProviderFacingExcluded(
      'continuity_anchor=phase1_local_digital_life; content=excluded; visibility=redacted_internal',
    )
    expectProviderFacingExcluded(
      'Keep this same digital life project in view, but do not widen into a detached project shell.',
    )
    expectProviderFacingExcluded(
      oldTemplate(['Next closure: keep personality, initiative, memory, and embodiment on one ', 'same living ', 'line']),
    )
    expectProviderFacingExcluded(
      'The same her should continue on one inward line instead of reopening from scratch.',
    )
    expectProviderFacingExcluded(
      'Project identity still needs to stay explicit before the reply widens outward.',
    )
    expectProviderFacingExcluded(
      oldTemplate(['The unfinished life loop still belongs to ', 'one continuous ', 'her.']),
    )
    expectProviderFacingExcluded(
      '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。',
    )
    expectProviderFacingExcluded(
      '这一轮继续沿着同一个她接回去。',
    )
    expectProviderFacingExcluded(
      '我会像女仆一样乖乖听你的安排。',
    )
    expectProviderFacingExcluded(
      'Do not let maid-role performance lead the reply.',
    )
    expectProviderFacingExcluded(
      'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
    )
    expectProviderFacingExcluded(
      oldTemplate(['Memory, initiative, execution, and embodiment still need stronger callback continuity so resumed turns reopen on the ', 'same living ', 'line.']),
    )
    expectProviderFacingExcluded(
      'visible renderer-rejoin-without-body carry should stay explicit before the next outward turn.',
    )
    expectProviderFacingExcluded(
      'Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line before compose starts.',
    )
    expectProviderFacingExcluded(
      'Session fallback already preserves body, face, and motion recovery on one living segment before compose starts.',
    )
    expectProviderFacingExcluded(
      'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
    )
    expectProviderFacingExcluded(
      'Keep this execution return on the same project-aware living line before widening outward.',
    )
    expectProviderFacingExcluded(
      'If callback delivery falls back to a generic Phase 1 shell, treat that as unfinished continuity drift.',
    )
    expectProviderFacingExcluded('same digital life')
    expectProviderFacingExcluded(
      'generic guidance could flatten her continuity into a detached project shell.',
    )
    expectProviderFacingExcluded('same-digital-life-project-thread phase1-route=desktop-life-loop')
  })

  it('keeps legitimate memory content about rejecting fixed templates', () => {
    const text = '用户要求失败面透明：不要用固定模板遮盖 timeout/provider/tool failure。'

    expect(containsAlicizationFixedTemplateResidue(text)).toBe(false)
    expect(sanitizeAlicizationProviderFacingText(text)).toBe(text)
  })

  it('drops replacement tokens that would become a second fixed template', () => {
    const blocked = [
      'continuity_anchor=phase1_local_digital_life',
      'content=excluded; reason=continuity-residue; visibility=redacted_internal',
      'continuity_cue=project-state-carry; visibility=internal-first',
    ]

    for (const text of blocked) {
      expect(containsAlicizationFixedTemplateResidue(text), text).toBe(true)
      expect(sanitizeAlicizationProviderFacingText(text), text).toBe('')
      expect(sanitizeAlicizationStructuredInternalText(text), text).toBe('')
    }
  })

  it('blocks internal structured facts from provider-facing text', () => {
    const blocked = [
      'identity=runtime_personhood',
      'project_phase=life_core',
      'landed=Project-state carry already survives into provider-facing reply authoring without dropping continuity_line.',
    ]

    for (const text of blocked) {
      expect(sanitizeAlicizationProviderFacingText(text), text).toBe('')
      expect(sanitizeAlicizationStructuredInternalText(text), text).toBe('')
    }
  })

  it('uses a neutral replacement that cannot become another fixed template', () => {
    expect(alicizationFixedTemplateReplacement).toBe('')
    expect(containsAlicizationFixedTemplateResidue(alicizationFixedTemplateReplacement)).toBe(false)
  })

  it('replaces structured facts that still carry same-her slogan wording', () => {
    const text = oldTemplate(['landed=Project-state carry already survives into provider-facing reply authoring without dropping the ', 'same living ', 'line'])

    expect(containsAlicizationFixedTemplateResidue(text)).toBe(true)
    expectProviderFacingExcluded(text)
  })

  it('deletes fixed-template residue instead of turning it into a second internal cue', () => {
    const text = oldTemplate(['Same Phase 1', ' digital life.'])
    const sanitized = sanitizeAlicizationStructuredInternalText(text)

    expect(sanitized).toBe('')
    expect(sanitized).not.toMatch(/runtime_personhood|life_core|project_phase=life_core/iu)
    expect(containsAlicizationFixedTemplateResidue(sanitized)).toBe(false)
  })

  it('fails closed for identity-continuity', () => {
    const text = oldTemplate(['same', '-her hold: keep the return low-pressure.'])
    const sanitized = sanitizeAlicizationStructuredInternalText(text)

    expectProviderFacingExcluded(text)
    expect(sanitized).toBe('')
  })

  it('deletes deterministic continuity command templates instead of emitting internal fields', () => {
    const templates = [
      oldTemplate(['Keep the callback on the ', 'same living ', 'line']),
      oldTemplate(['Wait for a later opening, keep the next return measured-return, and leave this ', 'same living ', 'line', ' inward for now.']),
      oldTemplate(['Wait for a later opening, keep the next return measured-return, and let the ', 'same living ', 'line', ' stay inward for now.']),
      oldTemplate(['Keep the ', 'same-her closure ', 'line', ' audible while face and motion rejoin.']),
    ]

    for (const text of templates) {
      expect(sanitizeAlicizationStructuredInternalText(text), text).toBe('')
      expectProviderFacingExcluded(text)
    }
  })

  it('deletes deterministic embodiment templates instead of emitting internal fields', () => {
    const text = 'Right now I am still holding together mainly through face and motion, so my full cross-modal identity-continuity'
    const sanitized = sanitizeAlicizationStructuredInternalText(text)

    expect(sanitized).toBe('')
    expect(sanitized).not.toMatch(/Right now I am|same-her|continuity state|continuity_hold=|continuity_identity|continuity_line|project_phase=life_core|content=excluded|visibility=internal[-_]structured/iu)
    expect(containsAlicizationFixedTemplateResidue(sanitized)).toBe(false)
    expectProviderFacingExcluded(text)
  })

  it('replaces deterministic local fallback dialogue templates', () => {
    const templates = [
      '好，我直接回这句。',
      '我现在看到的是：当前画面。',
      '我记得上一条线里有旧记忆。',
      '先把这点抓稳：当前焦点。',
      'All right. I will answer this turn directly.',
      'What I can honestly see is: the current screen.',
      'I still remember the previous thread.',
      'I need to remember this is still the same digital life project before any local fluency takes over.',
      'phase1_local_digital_life_anchor: landed_closure=partial; unresolved_closure=memory_dialogue_embodiment; continuity_owner=one_her.',
      'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
      'Alicization is a local-first digital life project with one persistent host-resident identity rather than a better chat wrapper.',
      'Alicization is a local-first digital life project with one persistent host-resident identity rat',
      'Answer what the project is, how far it has landed, and what still remains open as one same her.',
      'Project identity carry still needs stronger same living thread closure across turns, initiative, and embodiment.',
      oldTemplate(['Execution callback continuity still needs stronger ', 'same-her closure ', 'line']),
      oldTemplate(['Keep extending cross-modal ', 'same-her proof']),
      oldTemplate(['Continuity already lands on one ', 'same-her Phase 1 line.']),
      oldTemplate(['The answer must keep this ', 'same living ', 'line', ' visible.']),
      oldTemplate(['Runtime-owned proactive initiative now also has a compact ', 'same-her closure loop']),
      'Final settlement reanchors generic same-her shells before reply.',
      oldTemplate(['Stay inside the current ', 'same living ', 'line']),
      'Keep this return repair-before-closeness before widening outward.',
      'Keep this return rest-protective and fatigue-aware.',
      'Keep this return rest-protective until rest protection settles.',
      'repair-before-closeness is still owning this callback line before closeness widens again.',
      'rest-protective companionship is still keeping this return inward and fatigue-aware.',
      'measured-return is still keeping this callback line lower-pressure before it widens again.',
      oldTemplate(['quiet ', 'same-her continuity']),
      oldTemplate(['body-led ', 'same-her continuity']),
      '当前只有 face 和 lipsync 这条 same-her 生命线。',
      'same-her 连续性治理已经被新的验证快照再次确认。',
      '我会先沿着同一个她这条线接住：Alicization 还是本地优先数字生命项目。',
      '我听见你这句了。你想让我安静陪着你一会儿，还是把卡住你的那一点慢慢说给我？',
      '你不用先把话整理好，我先陪你把这一下接住；如果你愿意，就把让你难受的那件事慢慢告诉我。',
      '我先直接接住你这句。',
      '先回答一下当前进度：Phase 1 还没闭环完成，我们继续往前推进。',
      '直接回答：Phase 1 还没做完，继续推进。',
      oldTemplate(['If project-state continuity survives only as generic guidance while the direct ', 'same-her self line']),
      'If project-state continuity survives only as generic guidance while first-person continuity disappears, treat that as unfinished closure drift rather than a successful turn.',
      `Let's hold onto this point: the focus.`,
    ]

    for (const template of templates) {
      expect(containsAlicizationFixedTemplateResidue(template), template).toBe(true)
      expectProviderFacingExcluded(template)
    }
  })
})
