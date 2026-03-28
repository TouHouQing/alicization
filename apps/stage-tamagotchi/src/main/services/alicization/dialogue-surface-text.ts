import type { AlicizationDialogueAnswerSubject } from '../../../shared/eventa'

import { isWeakAlicizationScreenSurfaceCue } from '@proj-alicization/stage-shared'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

const internalDialogueSurfacePattern = /living seam|current knot|carried continuity|truth seam|epistemic|governing|foreground thread|residue|afterglow|crowding the host|stay near quietly|repair ahead of fluency|thread still being held|repair misread|there is a real care need under the current scene|is this a moment to stay near quietly|would speaking now feel like crowding the host|which belief is stale memory|still reflects the current world|where exactly is the real knot|the current condition is the most urgent thing in the turn|the current answer is dialogue-first|screen continuity may inform tone or caution|the host is reaching for|the host (?:has turned|is turning) the dialogue back toward alicization herself|the host is asking alicization to repair the previous answer(?: and speak more plainly)?|expects a plain direct answer|answer the host(?:'s)? question about alicization directly|answer from alicization(?:’s|'s)? own continuity|the live scene is still the narrowest truthful place to begin|宿主(?:正在审视|还在沿着|刚从|现在更像是在浏览|把当前注意力放在|在深夜里还没有从|停留在|像是在)|她(?:还没重新看见|还想再确认一次|把这一刻读成|更想先护住|像是在沿着|像是在衡量|停留在)|真正卡住的是哪一处|误把路过窗口当作问题核心|general unknown/iu
const internalDialoguePlanningPattern = /\b(?:the turn is|what matters first is|this turn is about|answer the relationship bid|open by|stay with the|pay off the|correct the|ask for the missing grounding|offer one concrete next step|keep the care|do not let|cannot be deferred|detached explanation|relational position|truth boundary|present-tense fact|shared thread|current seam|held memory|live scene|narrowest truthful reply|active knot|answer from the shared thread directly|keep the reply light enough|acknowledge the current condition,? but keep it attached to the actual issue|stay with the current dialogue seam|stay with the current living thread)\b/iu
const internalDialoguePlannerTitlePattern = /^(?:recheck scene|check recovery|follow thread|wait opening|verify care|localize problem|reground scene|repair misread)$/iu
const weakDialogueAnchorPattern = /^(?:unknown|general unknown|none|null|n\/a)$/iu
const weakTraceAnchorPattern = /(?:^|[\s(,.:;-])(?:general unknown|entire screen)(?:$|[\s),.:;-])|\s\|\s(?:general unknown|entire screen)/iu

export function isInternalDialogueSurfaceText(raw: unknown) {
  const normalized = sanitizeText(raw, 240)
  if (!normalized)
    return false
  return internalDialogueSurfacePattern.test(normalized)
    || internalDialoguePlanningPattern.test(normalized)
    || internalDialoguePlannerTitlePattern.test(normalized)
    || weakDialogueAnchorPattern.test(normalized)
    || weakTraceAnchorPattern.test(normalized)
    || isWeakAlicizationScreenSurfaceCue(normalized)
}

export function sanitizeDialogueSurfaceText(raw: unknown, maxChars = 220) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''
  if (isInternalDialogueSurfaceText(normalized))
    return ''
  return normalized
}

export function sanitizeDialogueAnchorText(raw: unknown, maxChars = 180) {
  return sanitizeDialogueSurfaceText(raw, maxChars)
}

export function pickDialogueSurfaceText(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueSurfaceText(value)
    if (normalized)
      return normalized
  }
  return ''
}

export function isDialogueFirstSubject(subject?: AlicizationDialogueAnswerSubject | null) {
  return subject === 'alicization-self'
    || subject === 'relationship'
    || subject === 'host-state'
    || subject === 'general'
}

export function isSceneThreadSubject(subject?: AlicizationDialogueAnswerSubject | null) {
  return subject === 'visible-scene' || subject === 'task-knot'
}
