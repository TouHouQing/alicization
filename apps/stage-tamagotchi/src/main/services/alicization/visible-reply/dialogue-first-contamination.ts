import type { AlicizationMindTurnGovernance } from '../../../../shared/eventa'

import {
  extractTechnicalSpecificityClaims,
  normalizeTechnicalSpecificityCue,
} from '../claim-evidence-ledger'
import { measureDialogueFocusAlignment } from '../dialogue-focus-alignment'
import { sanitizeBriefText, uniqueCarryAnchors } from '../runtime-realtime'
import { deriveAlicizationTruthDiscipline } from '../truth-discipline'

export const dialogueFirstRoleplayPrefacePattern = /^(?:主人(?:[，。…!！\s]|$)|……欸～主人|欸～主人|宝贝|亲爱的)[，。…!！\s]*/u
export const dialogueFirstStaleCarryClausePattern = /(?:那个|刚才那个|上一个|之前那个|之前那条|上一条).{0,8}(?:枚举|页面|浏览器|模块|窗口|线程|diff|改动|case)|\b(?:that|the previous|the old|earlier)\s+(?:enum|page|browser|module|window|thread|diff|change)\b/iu
export const dialogueFirstProcessOnlyReplyPattern = /^(?:那?我[先就再会]?|先)[\p{Script=Han}\p{Letter}\p{Number}\s,，。.!！?？]{0,16}(?:[看听陪]|看看|留在|接住|回答|说清|说)[\p{Script=Han}\p{Letter}\p{Number}\s,，。.!！?？]{0,8}$/u

export function normalizeGovernedAnchorText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function replyIncludesAnchorCue(reply: string, cue: unknown) {
  const normalizedReply = normalizeGovernedAnchorText(reply)
  const normalizedCue = normalizeGovernedAnchorText(cue)
  if (!normalizedReply || !normalizedCue)
    return false
  return normalizedReply.includes(normalizedCue)
}

export function splitDialogueReplyClauses(reply: string) {
  const clauses = reply.match(/[^。！？!?；;\n]+[。！？!?；;]*/gu) ?? [reply]
  return clauses
    .map(clause => clause.trim())
    .filter(Boolean)
}

export function replyLooksProcessOnlyRepairShell(reply: string) {
  const normalized = sanitizeBriefText(reply, 120)
  if (!normalized)
    return false
  if (/[你妳累]|这句|现在|这个|这件事|问题|事情|情绪|难过|伤心/u.test(normalized))
    return false
  return dialogueFirstProcessOnlyReplyPattern.test(normalized)
}

export function clauseMentionsCue(clause: string, cues: string[]) {
  return cues.some(cue => replyIncludesAnchorCue(clause, cue))
}

export function technicalSpecificityCueMatches(left: string, right: string) {
  const normalizedLeft = normalizeTechnicalSpecificityCue(left)
  const normalizedRight = normalizeTechnicalSpecificityCue(right)
  if (!normalizedLeft || !normalizedRight)
    return false
  if (normalizedLeft === normalizedRight)
    return true
  const shorterLength = Math.max(1, Math.min(normalizedLeft.length, normalizedRight.length))
  return (
    (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    && shorterLength / Math.max(normalizedLeft.length, normalizedRight.length) >= 0.68
  )
}

export function uniqueTechnicalSpecificityCues(values: Array<string | null | undefined>, maxItems = 12) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeBriefText(value ?? '', 120)
    const normalizedCue = normalizeTechnicalSpecificityCue(normalized)
    if (!normalized || !normalizedCue)
      continue
    if (items.some(item => technicalSpecificityCueMatches(item, normalized)))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

export function collectAllowedTechnicalSpecificityCues(input: {
  governance: AlicizationMindTurnGovernance
  userText?: string
}) {
  return uniqueTechnicalSpecificityCues([
    ...(input.governance.claimEvidence?.allowedSpecificCues ?? []),
    ...extractTechnicalSpecificityClaims(input.userText, 8),
    ...extractTechnicalSpecificityClaims(input.governance.focusAnchor, 8),
    ...extractTechnicalSpecificityClaims(input.governance.answerIntent, 8),
    ...extractTechnicalSpecificityClaims(input.governance.liveSurface, 8),
    ...extractTechnicalSpecificityClaims(input.governance.mindTurnFrame?.focusAnchor, 8),
    ...extractTechnicalSpecificityClaims(input.governance.mindTurnFrame?.relation.hostMove, 8),
    ...extractTechnicalSpecificityClaims(input.governance.mindTurnFrame?.obligation.answerIntent, 8),
    ...extractTechnicalSpecificityClaims(input.governance.dialogueActKernel?.openingClaim, 8),
    ...extractTechnicalSpecificityClaims(input.governance.dialogueActKernel?.selectedEvidence[0]?.summary, 8),
  ], 12)
}

export function analyzeUnsupportedTechnicalSpecificity(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
}) {
  const replyCues = uniqueTechnicalSpecificityCues(
    extractTechnicalSpecificityClaims(input.reply, 12),
    12,
  )
  if (replyCues.length === 0) {
    return {
      replyCues: [] as string[],
      allowedCues: [] as string[],
      unsupportedCues: [] as string[],
      shouldOverride: false,
    }
  }

  const allowedCues = collectAllowedTechnicalSpecificityCues({
    governance: input.governance,
    userText: input.userText,
  })
  const unsupportedCues = replyCues.filter(cue => !allowedCues.some(allowed => technicalSpecificityCueMatches(allowed, cue)))
  const screenCentricTurn = input.governance.screenReferenceMode !== 'avoid'
    && (
      input.governance.answerSubject === 'task-knot'
      || input.governance.answerSubject === 'visible-scene'
      || input.governance.turnMode === 'guide-current-knot'
      || input.governance.turnMode === 'grounded-inspection'
      || input.governance.turnMode === 'screen-repair'
    )
  const truthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject: input.governance.answerSubject ?? input.governance.mindTurnFrame?.relation.subject ?? null,
    screenReferenceMode: input.governance.screenReferenceMode ?? null,
    truthState: input.governance.truthState,
    turnMode: input.governance.turnMode,
    repairState: input.governance.repairState,
    evidenceMode: input.governance.evidenceMode ?? input.governance.claimEvidence?.evidenceMode ?? null,
    labelCarryAsMemory: input.governance.labelCarryAsMemory,
    suppressAssociativeRecall: input.governance.suppressAssociativeRecall,
    claimEvidenceLedger: input.governance.claimEvidence ?? null,
    currentConsciousFrame: null,
  })

  return {
    replyCues,
    allowedCues,
    unsupportedCues,
    truthDisciplineMode: truthDiscipline.mode,
    shouldOverride: unsupportedCues.length > 0
      && (
        truthDiscipline.forbidUnsupportedSpecificity
        || screenCentricTurn
      ),
  }
}

export function extractForeignTechnicalReplyCues(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
}) {
  const replyCues = extractTechnicalSpecificityClaims(input.reply, 12)
  if (replyCues.length === 0)
    return []

  const allowedAnchors = collectAllowedTechnicalSpecificityCues({
    governance: input.governance,
    userText: input.userText,
  })

  return replyCues.filter((cue) => {
    const normalizedCue = normalizeTechnicalSpecificityCue(cue)
    if (!normalizedCue)
      return false
    return !allowedAnchors.some(anchor => technicalSpecificityCueMatches(anchor, cue))
  })
}

export function analyzeDialogueFirstVisibleReply(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
}) {
  const truthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject: input.governance.answerSubject ?? input.governance.mindTurnFrame?.relation.subject ?? null,
    screenReferenceMode: input.governance.screenReferenceMode ?? null,
    truthState: input.governance.truthState,
    turnMode: input.governance.turnMode,
    repairState: input.governance.repairState,
    evidenceMode: input.governance.evidenceMode ?? input.governance.claimEvidence?.evidenceMode ?? null,
    labelCarryAsMemory: input.governance.labelCarryAsMemory,
    suppressAssociativeRecall: input.governance.suppressAssociativeRecall,
    claimEvidenceLedger: input.governance.claimEvidence ?? null,
    currentConsciousFrame: null,
  })
  if (!truthDiscipline.dialogueFirst) {
    return {
      overlapRatio: 1,
      roleplayPreface: false,
      staleCarryReference: false,
      sceneCueMentions: [] as string[],
      foreignTechnicalCues: [] as string[],
      truthDisciplineMode: truthDiscipline.mode,
      contaminated: false,
    }
  }

  const focusAnchors = uniqueCarryAnchors([
    input.userText,
    input.governance.focusAnchor,
    input.governance.answerIntent,
    input.governance.mindTurnFrame?.relation.hostMove,
    input.governance.mindTurnFrame?.obligation.answerIntent,
  ], 8)
  const overlapRatio = focusAnchors.length === 0
    ? 0
    : measureDialogueFocusAlignment({
      message: input.reply,
      contextPhrases: focusAnchors,
    }).overlapRatio
  const sceneEvidenceCues = (input.governance.dialogueActKernel?.selectedEvidence ?? [])
    .filter((item) => {
      if (!item?.summary)
        return false
      if (item.kind === 'scene')
        return item.source === 'current-scene' || item.source === 'world-model' || item.source === 'appraisal'
      if (item.kind === 'project')
        return item.source === 'current-scene' || item.source === 'world-model'
      return false
    })
    .map(item => item.summary)
  const sceneCueMentions = uniqueCarryAnchors([
    input.governance.liveSurface,
    input.governance.mindTurnFrame?.world.visibleSurface,
    ...sceneEvidenceCues,
  ], 6).filter((cue) => {
    if (!replyIncludesAnchorCue(input.reply, cue))
      return false
    return measureDialogueFocusAlignment({
      message: cue,
      contextPhrases: focusAnchors,
    }).overlapRatio < 0.34
  })
  const roleplayPreface = dialogueFirstRoleplayPrefacePattern.test(input.reply.trim())
  const staleCarryReference = dialogueFirstStaleCarryClausePattern.test(input.reply)
  const foreignTechnicalCues = extractForeignTechnicalReplyCues(input)

  return {
    overlapRatio,
    roleplayPreface,
    staleCarryReference,
    sceneCueMentions,
    foreignTechnicalCues,
    truthDisciplineMode: truthDiscipline.mode,
    contaminated: roleplayPreface
      || staleCarryReference
      || (sceneCueMentions.length > 0 && overlapRatio < 0.34)
      || foreignTechnicalCues.length > 0,
  }
}

export function repairDialogueFirstVisibleReply(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
  analysis: ReturnType<typeof analyzeDialogueFirstVisibleReply>
}) {
  if (!input.analysis.contaminated) {
    return {
      applied: false,
      reply: input.reply,
      analysis: input.analysis,
      reason: null as string | null,
      droppedClauses: [] as string[],
    }
  }

  const repairReasons: string[] = []
  const trimmedReply = input.reply.trim()
  const withoutPreface = trimmedReply.replace(dialogueFirstRoleplayPrefacePattern, '').trim()
  if (withoutPreface !== trimmedReply)
    repairReasons.push('removed-roleplay-preface')

  const contaminationCues = uniqueCarryAnchors([
    ...input.analysis.sceneCueMentions,
    ...input.analysis.foreignTechnicalCues,
  ], 10)
  const clauses = splitDialogueReplyClauses(withoutPreface || trimmedReply)
  const keptClauses: string[] = []
  const droppedClauses: string[] = []

  for (const clause of clauses) {
    if (!clause)
      continue
    const dropForStaleCarry = dialogueFirstStaleCarryClausePattern.test(clause)
    const dropForContaminationCue = contaminationCues.length > 0 && clauseMentionsCue(clause, contaminationCues)
    if (dropForStaleCarry || dropForContaminationCue) {
      droppedClauses.push(clause)
      if (dropForStaleCarry)
        repairReasons.push('pruned-stale-carry-clause')
      if (dropForContaminationCue)
        repairReasons.push('pruned-contaminated-anchor-clause')
      continue
    }
    keptClauses.push(clause)
  }

  const repairedReply = sanitizeBriefText(
    keptClauses.join(' ').replace(/\s+([。！？!?；;])/gu, '$1'),
    2_000,
  )
  if (!repairedReply || repairedReply === trimmedReply || replyLooksProcessOnlyRepairShell(repairedReply)) {
    return {
      applied: false,
      reply: input.reply,
      analysis: input.analysis,
      reason: repairReasons.length > 0 ? uniqueCarryAnchors(repairReasons, 4).join('|') : null,
      droppedClauses,
    }
  }

  const repairedAnalysis = analyzeDialogueFirstVisibleReply({
    reply: repairedReply,
    userText: input.userText,
    governance: input.governance,
  })
  if (repairedAnalysis.contaminated) {
    return {
      applied: false,
      reply: input.reply,
      analysis: input.analysis,
      reason: repairReasons.length > 0 ? uniqueCarryAnchors(repairReasons, 4).join('|') : null,
      droppedClauses,
    }
  }

  return {
    applied: true,
    reply: repairedReply,
    analysis: repairedAnalysis,
    reason: uniqueCarryAnchors(repairReasons, 4).join('|') || 'local-dialogue-first-repair',
    droppedClauses,
  }
}
