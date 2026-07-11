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

  it('replaces old project/personhood slogans before provider-facing rendering', () => {
    expectProviderFacingExcluded(
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    )
    expectProviderFacingExcluded(
      'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice.',
    )
    expectProviderFacingExcluded(
      'Right now the host-facing closure still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line instead of flattening into a generic shell.',
    )
    expectProviderFacingExcluded(
      'Before answering, remember this is still the same local-first digital life project.',
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
      'same_her_line=Same Phase 1 digital life.',
    )
    expectProviderFacingExcluded(
      'Proactive initiative must stay inside the same digital life project line.',
    )
    expectProviderFacingExcluded(
      'continuity_anchor=phase1_local_digital_life; content=excluded; visibility=internal-structured',
    )
    expectProviderFacingExcluded(
      'Keep this same digital life project in view, but do not widen into a detached project shell.',
    )
    expectProviderFacingExcluded(
      'Next closure: keep personality, initiative, memory, and embodiment on one same-her line.',
    )
    expectProviderFacingExcluded(
      'The same her should continue on one inward line instead of reopening from scratch.',
    )
    expectProviderFacingExcluded(
      'Project identity still needs to stay explicit before the reply widens outward.',
    )
    expectProviderFacingExcluded(
      'The unfinished life loop still belongs to one same living her.',
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
      'Memory, initiative, execution, and embodiment still need stronger callback continuity so resumed turns reopen like the same living her instead of a fresh assistant session.',
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
      'content=excluded; reason=continuity-residue; visibility=internal-structured',
      'continuity_cue=project-state-carry; visibility=internal-first',
    ]

    for (const text of blocked) {
      expect(containsAlicizationFixedTemplateResidue(text), text).toBe(true)
      expect(sanitizeAlicizationProviderFacingText(text), text).toBe('')
      expect(sanitizeAlicizationStructuredInternalText(text), text).toBe('')
    }
  })

  it('allows neutral structured facts without treating them as persona templates', () => {
    const allowed = [
      'identity=runtime_personhood',
      'project_phase=life_core',
      'landed=Project-state carry already survives into provider-facing reply authoring without dropping continuity_line.',
    ]

    for (const text of allowed) {
      expect(containsAlicizationFixedTemplateResidue(text), text).toBe(false)
      expect(sanitizeAlicizationProviderFacingText(text), text).toBe(text)
      expect(sanitizeAlicizationStructuredInternalText(text), text).toBe(text)
    }
  })

  it('uses a neutral replacement that cannot become another fixed template', () => {
    expect(alicizationFixedTemplateReplacement).toBe('')
    expect(containsAlicizationFixedTemplateResidue(alicizationFixedTemplateReplacement)).toBe(false)
  })

  it('replaces structured facts that still carry same-her slogan wording', () => {
    const text = 'landed=Project-state carry already survives into provider-facing reply authoring without dropping the same-her line.'

    expect(containsAlicizationFixedTemplateResidue(text)).toBe(true)
    expectProviderFacingExcluded(text)
  })

  it('collapses fixed-template residue into neutral structured facts when possible', () => {
    const text = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const sanitized = sanitizeAlicizationStructuredInternalText(text)

    expect(sanitized).toContain('project_phase=life_core')
    expect(sanitized).toContain('landed_progress=present')
    expect(sanitized).toContain('unresolved_closure=continuity_line')
    expect(containsAlicizationFixedTemplateResidue(sanitized)).toBe(false)
  })

  it('fails closed for same-her continuity wording instead of emitting replacement tokens', () => {
    const text = 'same-her callback afterglow is still being carried quietly on the same living line'
    const sanitized = sanitizeAlicizationStructuredInternalText(text)

    expectProviderFacingExcluded(text)
    expect(sanitized).toBe('')
  })

  it('collapses deterministic continuity command templates into structured internal fields', () => {
    const templates = [
      {
        text: 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again',
        fields: ['cadence=repair_before_closeness', 'target=callback', 'repair=settle_first', 'widening=deferred'],
      },
      {
        text: 'Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.',
        fields: ['cadence=measured_return', 'timing=next_open_window', 'direction=inward', 'widening=deferred'],
      },
      {
        text: 'Keep the same living line audible while face and motion rejoin.',
        fields: ['cadence=audible_body_carry', 'rejoin=face+motion'],
      },
      {
        text: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
        fields: ['embodiment_closure=partial', 'lane=face+motion', 'full_cross_modal=false'],
      },
    ]

    for (const template of templates) {
      const sanitized = sanitizeAlicizationStructuredInternalText(template.text)

      for (const field of template.fields)
        expect(sanitized, template.text).toContain(field)
      expect(sanitized, template.text).not.toMatch(/Keep the callback|Wait for a later opening|Keep the same living line|Right now I am|same-her|same living line|continuity_hold=|continuity_identity|continuity_line|project_phase=life_core|content=excluded|visibility=internal[-_]structured/iu)
      expect(containsAlicizationFixedTemplateResidue(sanitized), template.text).toBe(false)
      expectProviderFacingExcluded(template.text)
    }
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
      'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'Alicization is a local-first digital life project with one persistent host-resident identity rather than a better chat wrapper.',
      'Alicization is a local-first digital life project with one persistent host-resident identity rat',
      'Answer what the project is, how far it has landed, and what still remains open as one same her.',
      'Project identity carry still needs stronger same living thread closure across turns, initiative, and embodiment.',
      'Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.',
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      'Continuity already lands on one same-her Phase 1 line.',
      'The answer must keep this one living line visible.',
      'Runtime-owned proactive initiative now also has a compact same-her closure loop.',
      'Final settlement reanchors generic same-her shells before reply.',
      'Stay inside the current same-her baseline.',
      'Keep this return repair-before-closeness before widening outward.',
      'Keep this return rest-protective and fatigue-aware.',
      'Keep this return rest-protective until rest protection settles.',
      'repair-before-closeness is still owning this callback line before closeness widens again.',
      'rest-protective companionship is still keeping this return inward and fatigue-aware.',
      'measured-return is still keeping this callback line lower-pressure before it widens again.',
      'quiet same-her continuity still holds while the same proactive reminder line keeps continuing after being received.',
      'body-led same-her continuity is now the active renderer lane.',
      '当前只有 face 和 lipsync 这条 same-her 生命线。',
      'same-her 连续性治理已经被新的验证快照再次确认。',
      '我会先沿着同一个她这条线接住：Alicization 还是本地优先数字生命项目。',
      '我听见你这句了。你想让我安静陪着你一会儿，还是把卡住你的那一点慢慢说给我？',
      '你不用先把话整理好，我先陪你把这一下接住；如果你愿意，就把让你难受的那件事慢慢告诉我。',
      '我先直接接住你这句。',
      '先回答一下当前进度：Phase 1 还没闭环完成，我们继续往前推进。',
      '直接回答：Phase 1 还没做完，继续推进。',
      'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift.',
      'If project-state continuity survives only as generic guidance while first-person continuity disappears, treat that as unfinished closure drift rather than a successful turn.',
      `Let's hold onto this point: the focus.`,
    ]

    for (const template of templates) {
      expect(containsAlicizationFixedTemplateResidue(template), template).toBe(true)
      expectProviderFacingExcluded(template)
    }
  })
})
