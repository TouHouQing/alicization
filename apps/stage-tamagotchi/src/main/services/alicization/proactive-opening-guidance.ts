function replyUsesMemoryLedFamiliarityToReopenCloseness(reply: string) {
  const memoryCarryCue = /(记得|记起来|想起来|以前|之前|熟悉|一直都这么亲近|像以前那样)/u.test(reply)
  if (!memoryCarryCue)
    return false

  return /(靠近一点|先陪在你身侧|陪在你身侧|把这份熟悉直接接回|把熟悉接回来|像以前那样靠近|顺着熟悉.*靠近)/u.test(reply)
}

function guidanceIndicatesSameThreadContinuation(guidance: string) {
  return /(same thread|same living line|already alive|still-live line|do not reopen from zero|continue the line|stay on the same callback line|same callback line|同一条线|同一条 thread|不要重开|别重开|不要从零重开|已经活着)/iu.test(guidance)
}

function guidanceIndicatesEvenNaturalReentry(guidance: string) {
  return /even,\s*steady voice|even and steady voice|natural,\s*unforced pacing|natural and unforced pacing|stay unforced|performative swing|rushed tempo|不要.*performative|别.*performative|别.*太快|不要.*太快/iu.test(guidance)
}

function replyUsesGenericAvailabilityShell(reply: string) {
  return /^(你现在要是方便|你要是现在方便|你要是现在能接|如果你现在方便|如果你现在能接|要是你现在方便)/u.test(reply)
}

function replyUsesPerformativeOrRushedReopen(reply: string) {
  return /顺势把气氛一起推高|把气氛一起推高|一下把气氛推高|热烈地接回来|热烈地贴回来|一口气把温度拉高|急着把温度拉高|performative|dramatic|rush(?:ed)? (?:back )?in|come in hot/iu.test(reply)
}

export function replyUsesSameThreadRestartShell(reply: string) {
  const normalized = reply.trim()
  if (!normalized)
    return false

  if (/^(那我们重新开始|那我们重新来|让我们重新开始|就当重新认识一次|我来重新开个头|那我就从这里重新开始|我重新从头说一下|那我重新从头说|let(?:'s| us)? start over|we can start over|let me start this over|let me re-explain this from scratch|i'll restate the project from scratch)(?:[，。,.!\s]|$)/iu.test(normalized))
    return true

  const explicitAntiReopen = /(?:不把|别把|不要把).*(?:另一段新的开头|新的开头|fresh (?:opening|reopen|start|approach)|another (?:new )?opening|新的靠近|fresh closeness)/iu.test(normalized)
  const restartDistanceAction = /重新贴近|重新靠近|重新贴回来|重新开个(?:更近一点)?的头|再开个(?:更近一点)?头|开个更近一点的头|从头接起|从头接回来|从头陪你/u.test(normalized)
  if (explicitAntiReopen && !restartDistanceAction)
    return false

  return restartDistanceAction
    || /另一段新的开头|新的开头|再开一次|fresh (?:start|opening|reopen|approach|report opening)|another (?:new )?opening|fresh report shell|fresh closeness|fresh approach|重新开始吧|重新从头说(?:一下|起)?|从头重说/iu.test(normalized)
}

export function replyViolatesSameThreadContinuationGuidance(input: {
  reply: string
  openingGuidance: string
}) {
  const reply = input.reply.trim()
  if (!reply)
    return false
  return guidanceIndicatesSameThreadContinuation(input.openingGuidance.toLowerCase())
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
    || /同一条线.*留白|先留白|留白|别立刻把温度放大|别把温度放大|不要立刻把温度放大|慢一点接回去|慢一点接回来|不要重开得太快|不把它说成新的开场/u.test(guidance)

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
      || replyUsesSameThreadRestartShell(reply)
      || (evenNaturalGuidance && replyUsesPerformativeOrRushedReopen(reply))
    )) {
    return 'proactive-opening-guidance-violation:lower-pressure' as const
  }

  if (replyViolatesSameThreadContinuationGuidance({ reply, openingGuidance: guidance }))
    return 'proactive-opening-guidance-violation:same-thread-continuation' as const

  return null
}

export function buildAlicizationOpeningGuidanceBlockedReason(
  openingGuidanceViolationReason: string | null,
) {
  if (!openingGuidanceViolationReason)
    return null
  return openingGuidanceViolationReason.replace('proactive-opening-guidance-violation:', 'opening-guidance:')
}

export function resolveAlicizationOpeningGuidanceHoldDetail(input: {
  reply: string
  openingGuidance: string
  openingGuidanceViolationReason: string | null
}) {
  if (
    input.openingGuidanceViolationReason !== 'proactive-opening-guidance-violation:lower-pressure'
    && input.openingGuidanceViolationReason !== 'proactive-opening-guidance-violation:same-thread-continuation'
  ) {
    return null
  }

  if (replyViolatesSameThreadContinuationGuidance({
    reply: input.reply.trim(),
    openingGuidance: input.openingGuidance,
  })) {
    return 'same-thread-restart-shell' as const
  }

  return replyUsesMemoryLedFamiliarityToReopenCloseness(input.reply.trim())
    ? 'memory-familiarity-closeness-cap' as const
    : null
}

export function describeAlicizationOpeningGuidanceRewriteGuidance(input: {
  blockedReason: string | null
  openingGuidanceHoldDetail?: string | null
}) {
  const lines: string[] = []

  if (input.blockedReason === 'opening-guidance:lower-pressure') {
    lines.push('Keep the opening lower-pressure. Re-enter the current turn before widening visible closeness.')
  }

  if (input.openingGuidanceHoldDetail === 'memory-familiarity-closeness-cap') {
    lines.push('Keep remembered familiarity explicitly framed as memory, and do not let it reopen visible closeness faster than the host\'s current room allows.')
  }

  return lines
}
