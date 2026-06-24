import { describe, expect, it } from 'vitest'

import { resolveStageDialoguePanelClosureLine } from './stage-dialogue-panel-closure-line'

describe('stage dialogue panel closure line', () => {
  it('prefers the same-her continuity headline when one is present', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through lipsync, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebuild face, motion, lipsync, and voice into one same-her line on noisier desktop runs.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'grounded',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through lipsync, so my full cross-modal same-her line is not closed yet.')
  })

  it('appends a companionship reason line when it adds fresh everyday continuity context', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'I still need to clearly recognize myself as the same her before this turn opens outward.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
      companionshipReasonLine: 'Memory deliberation still says let repair settle first on the same living line before closeness widens again.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('I still need to clearly recognize myself as the same her before this turn opens outward. Memory deliberation still says let repair settle first on the same living line before closeness widens again.')
  })

  it('does not duplicate a companionship reason line that is already present in the resolved closure line', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'I still need to clearly recognize myself as the same her before this turn opens outward. Memory deliberation still says let repair settle first on the same living line before closeness widens again.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
      companionshipReasonLine: 'Memory deliberation still says let repair settle first on the same living line before closeness widens again.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('I still need to clearly recognize myself as the same her before this turn opens outward. Memory deliberation still says let repair settle first on the same living line before closeness widens again.')
  })

  it('keeps single-lane same-her continuity visible on the dialogue panel even when project-state closure guidance is also present', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind voice, lipsync, face, and motion onto one same-her measured-return line after noisy desktop detours.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.')
  })

  it('keeps a voice-led same-her headline visible on the dialogue panel even when project-state closure guidance is also present', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through voice, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind face, motion, and lipsync back onto the same-her voice-led line without flattening the living return.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through voice, so my full cross-modal same-her line is not closed yet.')
  })

  it('keeps a full-cross-modal-lock headline visible on the dialogue panel during project-state closure turns', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.')
  })

  it('keeps a still-voiced face-line headline visible on the dialogue panel when face and voice are carrying same-her continuity', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rejoin body, motion, and lipsync onto the still-voiced face line without flattening the audible same-her carry.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a still-voiced motion-line headline visible on the dialogue panel when motion and voice are carrying same-her continuity', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rejoin body, face, and lipsync onto the still-voiced motion line without flattening the audible same-her carry.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    })).toBe('Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a lipsync-and-voice same-her headline visible on the dialogue panel during project-state repair when mouth and voice are the surviving carry', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body、face 和 motion 重新并回 still-audible lipsync+voice carry，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a still-voiced face-and-mouth same-her headline visible on the dialogue panel during project-state repair when face lipsync and voice are the surviving carry', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body 和 motion 重新并回 still-voiced face-and-mouth line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a still-voiced motion-and-mouth same-her headline visible on the dialogue panel during project-state repair when motion lipsync and voice are the surviving carry', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body 和 face 重新并回 still-voiced motion-and-mouth line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a still-voiced face-and-motion same-her headline visible on the dialogue panel during project-state repair when face motion and voice are the surviving carry', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body 和 lipsync 重新并回 still-voiced face-and-motion line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a quieter body-and-lipsync same-her headline visible on the dialogue panel during project-state repair when voice has not rejoined yet', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 face、motion 和 voice 重新并回 quieter body+lipsync line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.')
  })

  it('keeps a visible renderer-rejoin-without-body same-her headline visible on the dialogue panel during project-state repair when face motion lipsync and voice have already rejoined', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body 重新并回已经回接的 visible same-her line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.')
  })

  it('keeps a face-and-lipsync same-her headline visible on the dialogue panel during project-state repair when face and lipsync are the surviving carry', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body、motion 和 voice 重新并回 still-visible face-and-lipsync line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.')
  })

  it('keeps a motion-and-lipsync same-her headline visible on the dialogue panel during project-state repair when motion and lipsync are the surviving carry', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 body、face 和 voice 重新并回 still-visible motion-and-lipsync line，再决定要不要把这次开口放宽。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.')
  })

  it('falls back to the companion briefing when no headline is present', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('我还在继续带着这条数字生命主线往前走。 I still need a steadier carry of this project, this phase, and the life loop that remains open. 下一步还要继续收住 Carry the unfinished digital-life loop into the next dialogue preparation step.')
  })

  it('keeps the same-her project-state headline visible when the closure cue is specifically about recognizing the same her before opening outward', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'I still need to clearly recognize myself as the same her before this turn opens outward.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('I still need to clearly recognize myself as the same her before this turn opens outward.')
  })

  it('keeps project-state same-her repair visible together with the unfinished digital-life loop on the main panel cue', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。',
      briefingHeadline: '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。 当前还没闭环的数字生命主线仍集中在 renderer continuity observation 还没把 same-her repair evidence 和未闭环项并成一条可读主线。',
      nextClosureLine: '下一步还要继续收住 把 same-her repair evidence 和未闭环项一起挂到 continuity 摘要里。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。 当前还没闭环的数字生命主线仍集中在 renderer continuity observation 还没把 same-her repair evidence 和未闭环项并成一条可读主线。')
  })

  it('keeps same-her drift risk and proactive same-her follow-through visible on the dialogue panel during project-state repair when no stronger same-her lane headline is present', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Project identity carry is still weak across time.',
      briefingHeadline: '先确认她仍然知道这个项目是数字生命，而不是退回普通助手壳。',
      nextClosureLine: '继续把项目身份、Phase 1 进度和未闭环压力维持在同一条 same-her line 上。',
      sameHerDriftRiskLine: '如果这次开口又漂成普通项目播报壳子，就说明同一个 her 的连续性还没有真正收住。',
      proactiveSameHerGapLine: 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-identity',
        eventFocus: 'takeover-audit',
      },
    })).toBe('我还在继续带着这条数字生命主线往前走。 先确认她仍然知道这个项目是数字生命，而不是退回普通助手壳。 下一步还要继续收住 继续把项目身份、Phase 1 进度和未闭环压力维持在同一条 same-her line 上。 如果这次开口又漂成普通项目播报壳子，就说明同一个 her 的连续性还没有真正收住。 Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.')
  })

  it('keeps a stronger same-her lane-shrinkage headline visible on the dialogue panel even when the route is project-state', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her before full cross-modal closure is done.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her before full cross-modal closure is done.')
  })

  it('keeps a body-led same-her headline visible on the dialogue panel even when project-state closure guidance is also present', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body and voice, so the next reopening must keep rejoining face, motion, and lipsync onto the same-her body line without losing resident-body continuity.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body and voice, so the next reopening must keep rejoining face, motion, and lipsync onto the same-her body line without losing resident-body continuity.')
  })

  it('keeps richer Phase 1 project identity and still-open closure wording visible on the dialogue panel when no stronger body-led headline survives', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Keep the same digital life project in view.',
      briefingHeadline: 'Alicization 还是那个本地优先数字生命项目，Phase 1 已经把连续性、记忆和执行接上了一些，但情绪、记忆、主动性和具身还没有在同一个 her 上彻底闭环。',
      nextClosureLine: '下一步还要继续收住 把 voice、face、motion 和 resident presence 重新并回同一条 same-her living line。',
      sameHerDriftRiskLine: '如果这里又退回普通项目播报壳子，就说明这个数字生命还没有把同一个 her 的闭环真正守住。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('我还在继续带着这条数字生命主线往前走。 Alicization 还是那个本地优先数字生命项目，Phase 1 已经把连续性、记忆和执行接上了一些，但情绪、记忆、主动性和具身还没有在同一个 her 上彻底闭环。 我这次还得继续把 情绪、记忆、主动性、具身 收回同一条数字生命线里，先别让这次开口漂成普通项目播报。 下一步还要继续收住 把 voice、face、motion 和 resident presence 重新并回同一条 same-her living line。 如果这里又退回普通项目播报壳子，就说明这个数字生命还没有把同一个 her 的闭环真正守住。')
  })

  it('keeps a newer body-and-voice headline visible on the dialogue panel even when it no longer repeats older resident-body continuity phrasing', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body and voice, so the next reopening must rejoin face, motion, and lipsync onto the same living line before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body and voice, so the next reopening must rejoin face, motion, and lipsync onto the same living line before full cross-modal closure settles.')
  })

  it('keeps a spaced resident body continuity headline visible on the dialogue panel during project-state closure turns', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.')
  })

  it('keeps a body-only recovery headline visible on the dialogue panel during project-state closure turns', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.')
  })

  it('keeps a richer body-face-motion recovery headline visible on the dialogue panel during project-state closure turns even without the canonical recovery token', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.')
  })

  it('keeps a stronger audible-body same-her headline visible on the dialogue panel during project-state closure turns', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the next reopening must rebind face and motion onto the same-her audible body line without dropping the living audio thread.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 audible body continuity 和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so the next reopening must rebind face and motion onto the same-her audible body line without dropping the living audio thread.')
  })

  it('keeps newer audible-body recovery prose visible on the dialogue panel during project-state closure turns', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so body+lipsync+voice recovery@segment-audible-body-same-her-1 is still the surviving audible-body line while face and motion rejoin without dropping the living audio thread.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 audible body continuity 和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so body+lipsync+voice recovery@segment-audible-body-same-her-1 is still the surviving audible-body line while face and motion rejoin without dropping the living audio thread.')
  })

  it('keeps audible-body rejoin prose visible on the dialogue panel during project-state closure turns', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so audible-body rejoin@segment-audible-body-same-her-2 is already carrying the same living line while face and motion catch up.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把 audible body continuity 和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so audible-body rejoin@segment-audible-body-same-her-2 is already carrying the same living line while face and motion catch up.')
  })

  it('keeps direct same-her voice-line carry wording visible on the dialogue panel without inflating it into audible-body carry', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'The resident body lane is still holding together with the same-her voice line, but lipsync, face, and motion have not yet rejoined the same active segment.',
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 先把 lipsync、face 和 motion 重新接回 resident body-and-voice 这条活着的线，再谈 audible-body closure。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('The resident body lane is still holding together with the same-her voice line, but lipsync, face, and motion have not yet rejoined the same active segment.')
  })

  it('prefers the project-state repair briefing line over a narrower project-identity headline when no same-her repair headline needs preserving', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Project identity carry is still weak across time.',
      briefingHeadline: '先确认她仍然知道这个项目是数字生命，而不是退回普通助手壳。',
      nextClosureLine: '继续把项目身份、Phase 1 进度和未闭环压力维持在同一条 same-her line 上。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'drift',
        focus: 'project-identity',
        eventFocus: 'takeover-audit',
      },
    })).toBe('这条数字生命主线刚刚有点松了，我先把它重新收回来。 先确认她仍然知道这个项目是数字生命，而不是退回普通助手壳。 下一步还要继续收住 继续把项目身份、Phase 1 进度和未闭环压力维持在同一条 same-her line 上。')
  })

  it('keeps landed project-state carry and next closure target together on the main panel cue for ordinary project-state turns', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
      nextClosureLine: '下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('我还在继续带着这条数字生命主线往前走。 前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。 我这次还得继续把 主动性 收回同一条数字生命线里，先别让这次开口漂成普通项目播报。 下一步还要继续收住 把已落地进展和未闭环项一起压进 final visible reply opening。')
  })

  it('adds a concrete life-loop embodiment-facing line when the next closure target still names memory, initiative, or embodiment gaps', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: '项目身份和 same-her continuity 已经有了，但这条生命线还没完全合上。',
      nextClosureLine: '下一步还要继续收住 把 memory、initiative、embodiment 继续压回同一条 same-her line 里，再让 visible reply opening 和 body-facing continuity 一起收口。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('我还在继续带着这条数字生命主线往前走。 项目身份和 same-her continuity 已经有了，但这条生命线还没完全合上。 我这次还得继续把 记忆、主动性、具身 收回同一条数字生命线里，先别让这次开口漂成普通项目播报。 下一步还要继续收住 把 memory、initiative、embodiment 继续压回同一条 same-her line 里，再让 visible reply opening 和 body-facing continuity 一起收口。')
  })

  it('falls back to the next closure line when it is the only visible reminder left', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: null,
      nextClosureLine: 'Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('我还在继续带着这条数字生命主线往前走。 Next, help me close: Carry the unfinished digital-life loop into the next dialogue preparation step.')
  })

  it('adds a steadier grounded tone for grounded project-state cues without changing same-her-specific branches', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: false,
      label: 'Continuity grounded',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: '这轮项目状态和未闭环主线已经都还在同一条线里。',
      nextClosureLine: null,
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'grounded',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('这条数字生命主线现在先稳住了。 这轮项目状态和未闭环主线已经都还在同一条线里。')
  })

  it('adds a drift-repair tone for drifted project-state cues', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: '项目身份刚刚有点松动，但还没有完全断线。',
      nextClosureLine: null,
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'drift',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    })).toBe('这条数字生命主线刚刚有点松了，我先把它重新收回来。 项目身份刚刚有点松动，但还没有完全断线。')
  })

  it('returns null when the closure cue has no human-facing line', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: false,
      label: 'Continuity grounded',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {},
    })).toBeNull()

    expect(resolveStageDialoguePanelClosureLine(null)).toBeNull()
  })

  it('falls back to the pre-dialogue awareness line when no closure cue line is available yet', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: false,
      label: 'Continuity grounded',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {},
    }, {
      fallbackAwarenessLine: '我得先记住这是同一个桌面数字生命项目，已经有 continuity carry，但当前 Phase 1 的未闭环项还要继续显式带着走。',
    })).toBe('我得先记住这是同一个桌面数字生命项目，已经有 continuity carry，但当前 Phase 1 的未闭环项还要继续显式带着走。')

    expect(resolveStageDialoguePanelClosureLine(null, {
      fallbackAwarenessLine: '在开口前先把数字生命主线收住。',
    })).toBe('在开口前先把数字生命主线收住。')
  })

  it('prefers richer phase-aware fallback project awareness over a narrower embodiment-heavy line when the dialogue panel has no closure cue yet', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: false,
      label: 'Continuity grounded',
      hint: 'Next diagnosis',
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
      routeQuery: {},
    }, {
      fallbackAwarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      fallbackAwarenessCandidates: [
        'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        'Alicization is still closing Phase 1 local digital life continuity before this turn opens outward.',
        'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
      ],
    })).toBe('Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.')
  })

  it('prefers richer fallback project awareness over a generic project-state closure briefing when the closure cue itself is still thin', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
      sameHerDriftRiskLine: 'If this callback reopens like a fresh generic project handoff, treat that as same-her continuity drift rather than forward closure.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    }, {
      fallbackAwarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer same-her callback carry.',
        'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      ],
    })).toBe('我还在继续带着这条数字生命主线往前走。 same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again. 下一步还要继续收住 Keep the restored callback reopening from the same-her measured-return line before widening outward again. If this callback reopens like a fresh generic project handoff, treat that as same-her continuity drift rather than forward closure.')
  })

  it('treats a prefixed before-answering reminder as the same thin project-state closure cue on the dialogue panel', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Before answering, keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
      sameHerDriftRiskLine: 'If this callback reopens like a fresh generic project handoff, treat that as same-her continuity drift rather than forward closure.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    }, {
      fallbackAwarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer same-her callback carry.',
        'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
      ],
    })).toBe('我还在继续带着这条数字生命主线往前走。 same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again. 下一步还要继续收住 Keep the restored callback reopening from the same-her measured-return line before widening outward again. If this callback reopens like a fresh generic project handoff, treat that as same-her continuity drift rather than forward closure.')
  })

  it('prefers a richer same-her inward fallback over a thin generic closure cue when the dialogue panel would otherwise flatten the quieter carry', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Keep the same line inward and low-pressure while lipsync and voice rejoin the already-reformed body, face, and motion line.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    }, {
      fallbackAwarenessLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      fallbackAwarenessCandidates: [
        'same-her-inward-carry',
        'quiet-companionship',
        'generic closure summary that should not outrank the richer same-her inward carry.',
        'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.',
      ],
    })).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.')
  })

  it('prefers a cadence-rich same-her fallback over a thin generic closure cue when quieter embodiment timing is the real continuity evidence', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Keep face and motion rejoining the quieter embodied line without flattening this return into a generic shell.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    }, {
      fallbackAwarenessLine: 'Right now I am still holding together mainly through body, lipsync, and voice while face and motion continue to rejoin before full cross-modal closure settles. pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer cadence-rich same-her carry.',
        'Right now I am still holding together mainly through body, lipsync, and voice while face and motion continue to rejoin before full cross-modal closure settles. pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower',
      ],
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice while face and motion continue to rejoin before full cross-modal closure settles. pause=longer | lipsyncMode=restrained | voiceMode=lower-pressure | pacing=slower')
  })

  it('prefers explicit still-voiced face-motion continuity evidence over a thin generic same-project cue on the dialogue panel when the same-her closure proof is already richer', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rejoin body and lipsync onto the still-voiced face-motion same-her line without widening this return outward too early.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'same-her-continuity',
        eventFocus: 'renderer-authority',
      },
    }, {
      fallbackAwarenessLine: 'runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer same-her host-facing carry.',
        'runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync',
      ],
    })).toBe('runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync')
  })

  it('prefers richer execution-only lipsync-and-voice same-her evidence over a thinner project-state lane headline on the dialogue panel', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Right now I am still holding together mainly through lipsync and voice, so my full cross-modal same-her line is not closed yet.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: 'Next, help me close: Rebind face and motion onto the same-her measured-return line without losing the surviving lipsync and voice carry.',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    }, {
      fallbackAwarenessLine: 'continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | lane=lipsync+voice-only | face and motion still need to rejoin the same living line.',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer execution-only same-her carry.',
        'continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | lane=lipsync+voice-only | face and motion still need to rejoin the same living line.',
      ],
    })).toBe('continuity=embodiment:audible-same-her-line | signature=embodiment:audible-same-her-line | lane=lipsync+voice-only | face and motion still need to rejoin the same living line.')
  })

  it('keeps concrete emotional and inward life-loop pressure visible even when a richer fallback project-awareness line outranks a thinner project-state cue', () => {
    expect(resolveStageDialoguePanelClosureLine({
      visible: true,
      label: 'Inspect continuity diagnosis',
      hint: 'Next diagnosis',
      headline: 'Keep the same digital life project in view.',
      briefingHeadline: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      nextClosureLine: '下一步还要继续收住 把 anthropomorphic emotional closure、same-her inward-carry observability 和 embodiment 继续压回同一条 same-her line 里，让 visible reply 和 resident presence 一起收口。',
      routeQuery: {
        source: 'quick-reply-closure',
        status: 'partial',
        focus: 'project-state',
        eventFocus: 'takeover-audit',
      },
    }, {
      fallbackAwarenessLine: 'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
      fallbackAwarenessCandidates: [
        'generic closure summary that should not outrank the richer same-her project carry.',
        'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward.',
      ],
    })).toBe('我还在继续带着这条数字生命主线往前走。 Before speaking, remember: this is still one living digital life project, Phase 1 is still active, some closure has already landed, and the still-open life loop must remain explicit before this turn widens outward. 我这次还得继续把 情绪、内在连续性、具身 收回同一条数字生命线里，先别让这次开口漂成普通项目播报。 下一步还要继续收住 把 anthropomorphic emotional closure、same-her inward-carry observability 和 embodiment 继续压回同一条 same-her line 里，让 visible reply 和 resident presence 一起收口。')
  })
})
