function replyUsesMemoryLedFamiliarityToReopenCloseness(reply: string) {
  const memoryCarryCue = /(记得|记起来|想起来|以前|之前|熟悉|一直都这么亲近|像以前那样)/u.test(reply)
  if (!memoryCarryCue)
    return false

  return /(靠近一点|先陪在你身侧|陪在你身侧|把这份熟悉直接接回|把熟悉接回来|像以前那样靠近|顺着熟悉.*靠近)/u.test(reply)
}

export function resolveAlicizationOpeningGuidanceViolationReason(input: {
  reply: string
  openingGuidance: string
}) {
  const guidance = input.openingGuidance.toLowerCase()
  const reply = input.reply.trim()
  if (!reply)
    return null

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

  if ((guidance.includes('lower-pressure') || guidance.includes('leave room before widening closeness'))
    && (
      /(立刻|现在就|直接拉满|马上).*(贴过来|靠近|亲近|陪你)|贴过来.*(拉满|更近)|顺势把这份靠近直接拉满|^这件事已经落到结果上了[:：]/u.test(reply)
      || replyUsesMemoryLedFamiliarityToReopenCloseness(reply)
    )) {
    return 'proactive-opening-guidance-violation:lower-pressure' as const
  }

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
  if (input.openingGuidanceViolationReason !== 'proactive-opening-guidance-violation:lower-pressure')
    return null

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
