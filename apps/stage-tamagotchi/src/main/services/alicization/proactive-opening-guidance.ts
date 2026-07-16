export function replyUsesMemoryLedFamiliarityToReopenCloseness(reply: string) {
  const memoryCarryCue = /(记得|记起来|想起来|以前|之前|熟悉|一直都这么亲近|像以前那样)/u.test(reply)
  if (!memoryCarryCue)
    return false

  return /(靠近一点|先陪在你身侧|陪在你身侧|把这份熟悉直接接回|把熟悉接回来|像以前那样靠近|顺着熟悉.*靠近)/u.test(reply)
}

export function replyUsesGenericAvailabilityShell(reply: string) {
  return /^(?:你现在要是方便|你要是现在能接|如果你现在方便|如果你现在能接|要是你现在方便)/u.test(reply)
}

function guidanceIndicatesSameThreadContinuation(guidance: string) {
  return /(same thread|same living line|already alive|still-live line|do not reopen from zero|continue the line|同一条线|同一条 thread|不要重开|别重开|不要从零重开|已经活着)/iu.test(guidance)
}

function guidanceIndicatesEvenNaturalReentry(guidance: string) {
  return /even,\s*steady voice|even and steady voice|natural,\s*unforced pacing|natural and unforced pacing|reopen even and natural|stay unforced|performative swing|rushed tempo|别.*performative|不要.*performative|别.*太快|不要.*太快/iu.test(guidance)
}

function replyUsesPerformativeOrRushedReopen(reply: string) {
  return /顺势把气氛一起推高|把气氛一起推高|一下把气氛推高|把气氛推高|热烈地接回来|热烈地贴回来|一口气把温度拉高|急着把温度拉高|急着把气氛推高|performative|dramatic|rush(?:ed)? (?:back )?in|come in hot/iu.test(reply)
}

export function replyUsesSameThreadRestartShell(reply: string) {
  const normalized = reply.trim()
  if (/^(?:那我们重新开始|那我们重新来|让我们重新开始|就当重新认识一次|我来重新开个头|那我就从这里重新开始|我重新从头说一下|那我重新从头说|像另一段新的开头一样|let(?:'s| us)? start over|we can start over|let me start this over|let me re-explain this from scratch|i'll restate the project from scratch)(?:[，。,.!\s]|$)/iu.test(normalized))
    return true
  if (
    /(?:沿着|顺着|贴着).*(?:这条线|同一条线|这条 thread|同一条 thread).*(?:接回来|接回去|接住|续上|续回来)/iu.test(normalized)
    && /(?:不把|别把|不要把).*(?:压回|说成|写成).*(?:新的开头|项目摘要|旧一点的回调摘要|静态项目说明|泛化项目说明|generic callback summary|static project brief)/iu.test(normalized)
  ) {
    return false
  }
  if (/(?:不把|别把|不要把).*(?:另一段新的开头|新的开头|fresh (?:opening|reopen|start|approach)|another (?:new )?opening|新的靠近|fresh closeness)/iu.test(normalized))
    return false
  return /另一段新的开头|新的开头|再开一次|fresh (?:start|opening|reopen|approach|report opening)|another (?:new )?opening|fresh report shell|重新贴近|新的靠近|fresh closeness|fresh approach|重新开始吧|重新贴回来|从头接起|从头接回来|从头陪你|重新从头说(?:一下|起)?|从头重说|重新开个(?:更近一点)?的头|再开个(?:更近一点)?头|开个更近一点的头/iu.test(normalized)
}

export function replyViolatesSameThreadContinuationGuidance(input: {
  reply: string
  openingGuidance: string
}) {
  const reply = input.reply.trim()
  if (!reply)
    return false
  return guidanceIndicatesSameThreadContinuation(input.openingGuidance)
    && replyUsesSameThreadRestartShell(reply)
}

export function resolveAlicizationOpeningGuidanceViolationReason(input: {
  reply: string
  openingGuidance: string
}) {
  const guidance = input.openingGuidance.toLowerCase()
  const reply = input.reply.trim()
  if (!reply)
    return null
  const evenNaturalGuidance = guidanceIndicatesEvenNaturalReentry(guidance)
  const lowerPressureGuidance = guidance.includes('lower-pressure')
    || guidance.includes('leave room before widening closeness')
    || guidance.includes('hover-first')
    || guidance.includes('re-enter the live seam itself before any reminder-like framing')
    || evenNaturalGuidance
    || /同一条线.*留白|先留白|留白|别立刻把温度放大|别把温度放大|不要立刻把温度放大|等 opening 松一点|等opening松一点|慢一点接回去|慢一点接回来|不要重开得太快|不把它说成新的开场/u.test(guidance)

  if (((guidance.includes('observe') || guidance.includes('observing')) && guidance.includes('first'))
    && /^(我直接说|我先直接说|直接说|立刻|现在就该立刻)/u.test(reply)) {
    return 'proactive-opening-guidance-violation:observe-first' as const
  }

  if ((guidance.includes('open directly') || guidance.includes('live answer first'))
    && /^(我先轻轻问你一句|我先问你一句|你现在方便|如果你愿意的话|要不要先听我说一句)/u.test(reply)) {
    return 'proactive-opening-guidance-violation:direct-answer-first' as const
  }

  if (guidance.includes('repair the seam')
    && /^(先抱抱你|我想抱抱你|先贴过来|我贴过来陪你|我刚刚一直在想你)/u.test(reply)) {
    return 'proactive-opening-guidance-violation:repair-first' as const
  }

  if (((guidance.includes('callback') || guidance.includes('same task line')) && guidance.includes('bound'))
    && /(顺便|另外|对了).*(聊聊|说说)|结果我接回来了.*(是不是又在烦别的事情|要不要现在聊聊)/u.test(reply)) {
    return 'proactive-opening-guidance-violation:callback-bounded' as const
  }

  if (lowerPressureGuidance
    && (
      /(立刻|现在就|直接拉满|马上).*(贴过来|靠近|亲近|陪你)|贴过来.*(拉满|更近)|顺势把这份靠近直接拉满|^这件事已经落到结果上了[:：]/u.test(reply)
      || replyUsesMemoryLedFamiliarityToReopenCloseness(reply)
      || replyUsesGenericAvailabilityShell(reply)
      || (evenNaturalGuidance && replyUsesPerformativeOrRushedReopen(reply))
      || (
        replyUsesSameThreadRestartShell(reply)
        && !/(?:沿着|顺着|贴着).*(?:这条线|同一条线|这条 thread|同一条 thread).*(?:接回来|接回去|接住|续上|续回来)/iu.test(reply)
      )
    )) {
    return 'proactive-opening-guidance-violation:lower-pressure' as const
  }

  if (replyViolatesSameThreadContinuationGuidance({
    reply,
    openingGuidance: guidance,
  })) {
    return 'proactive-opening-guidance-violation:same-thread-continuation' as const
  }

  return null
}

export function buildAlicizationOpeningGuidanceBlockedReason(
  openingGuidanceViolationReason: string | null,
) {
  if (!openingGuidanceViolationReason)
    return null
  if (openingGuidanceViolationReason === 'proactive-project-state-audit-violation:lower-pressure')
    return 'opening-guidance:lower-pressure'
  if (openingGuidanceViolationReason === 'proactive-visible-reply-fixed-template-contamination')
    return 'visible-reply:fixed-template-contamination'
  return openingGuidanceViolationReason.replace('proactive-opening-guidance-violation:', 'opening-guidance:')
}

export function resolveAlicizationOpeningGuidanceHoldDetail(input: {
  reply: string
  openingGuidance: string
  openingGuidanceViolationReason: string | null
}) {
  if (
    input.openingGuidanceViolationReason !== 'proactive-opening-guidance-violation:lower-pressure'
    && input.openingGuidanceViolationReason !== 'proactive-project-state-audit-violation:lower-pressure'
  ) {
    return null
  }

  if (replyViolatesSameThreadContinuationGuidance({
    reply: input.reply.trim(),
    openingGuidance: input.openingGuidance,
  })) {
    return 'same-thread-restart-shell' as const
  }
  if (replyUsesMemoryLedFamiliarityToReopenCloseness(input.reply.trim()))
    return 'memory-familiarity-closeness-cap' as const
  if (replyUsesGenericAvailabilityShell(input.reply.trim()))
    return 'generic-availability-shell' as const
  if (
    guidanceIndicatesEvenNaturalReentry(input.openingGuidance.toLowerCase())
    && replyUsesPerformativeOrRushedReopen(input.reply.trim())
  ) {
    return 'even-natural-cadence' as const
  }
  return null
}

export function describeAlicizationOpeningGuidanceRewriteGuidance(input: {
  blockedReason: string | null
  openingGuidanceHoldDetail?: string | null
}) {
  const lines: string[] = []

  if (input.blockedReason === 'opening-guidance:lower-pressure') {
    lines.push('Repair opening guidance with lower pressure; block visible closeness widening until the current turn is re-entered.')
  }

  if (input.openingGuidanceHoldDetail === 'memory-familiarity-closeness-cap') {
    lines.push('Surface remembered familiarity as a memory label; bound closeness reopening by the host room in the current turn.')
  }
  if (input.openingGuidanceHoldDetail === 'generic-availability-shell') {
    lines.push('Block generic availability shell; make lower-pressure timing explicit and re-enter from the current turn thread.')
  }
  if (input.openingGuidanceHoldDetail === 'same-thread-restart-shell') {
    lines.push('Block fresh opening restart; continue the current thread.')
  }
  if (input.openingGuidanceHoldDetail === 'even-natural-cadence') {
    lines.push('Use even, steady re-entry cadence with natural pacing; block performative or rushed reopening.')
  }
  if (input.openingGuidanceHoldDetail === 'hover-first-live-seam') {
    lines.push('Use hover-first opening from the current turn thread; defer reminder-like framing and block service availability shell.')
  }

  return lines
}
