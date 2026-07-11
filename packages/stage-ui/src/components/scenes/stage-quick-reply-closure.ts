import {
  containsAlicizationFixedTemplateResidue,
  describeAlicizationEmbodimentClosureHeadline,
  describeAlicizationProjectClosureBriefing,
  describeAlicizationProjectNextClosure,
  isAlicizationThinProjectAwarenessLine,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

const fixedTemplateQuickReplyClosureLine
  = ''
const legacyFixedTemplateQuickReplyClosureLine
  = ''

const internalQuickReplyClosureFieldPattern
  = /identity-continuity|phase1_local_digital_life|visibility=(?:internal-structured|renderer-internal)|content_withheld|owner=|source=|surface=structured|project_anchor=|continuity_anchor=|continuity=|embodiment_lanes=|missing_lanes=|signature=|lane=|focus=|pending(?:[_-]rejoin)?=|recovery@|^next=|^next,\s*help me close:|^下一步(?:还要继续收住|状态：|：)/iu

function isInternalFixedTemplateExclusionLine(line: string | null | undefined) {
  const normalized = line?.trim().replace(/\s+/g, ' ') ?? ''
  if (!normalized)
    return false
  return normalized === legacyFixedTemplateQuickReplyClosureLine
    || (
      normalized.includes('content_withheld')
      && normalized.includes('reason=continuity-residue')
    )
}

export interface StageQuickReplyPreDialogueClosureSnapshot {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  sameHerDriftRiskLine?: string | null
  briefingLines?: string[]
  reasons: string[]
}

export interface StageQuickReplyPreDialogueAwarenessSnapshot {
  status: 'grounded' | 'partial' | 'drift'
  summaryLine: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  companionNextClosureLine?: string | null
  awarenessLine?: string | null
  reasonPreview: string[]
}

export interface StageQuickReplyClosureDiagnosticEntry {
  visible: boolean
  label: string
  hint: string
  headline: string | null
  briefingHeadline: string | null
  nextClosureLine: string | null
  sameHerDriftRiskLine?: string | null
  proactiveSameHerGapLine?: string | null
  routeQuery: Record<string, string>
}

function normalizeProactiveSameHerGapLine(line: string | null | undefined) {
  const normalizedLine = typeof line === 'string' ? line.trim() : ''
  if (!normalizedLine)
    return null

  const reasonMatch = /^Proactive identity-continuity follow-through (?:still|currently) reads (.*?),(?:\s*so the next turn should|\s*which shows)/i.exec(normalizedLine)
  if (reasonMatch?.[1]?.trim())
    return reasonMatch[1].trim()

  const strippedLine = normalizedLine
    .replace(/^Proactive identity-continuity gap:\s*/i, '')
    .replace(/^Proactive identity-continuity follow-through:\s*/i, '')
    .trim()

  return strippedLine || null
}

function resolveProactiveSameHerGapLine(snapshot: StageQuickReplyPreDialogueClosureSnapshot) {
  const briefingMatch = snapshot.briefingLines?.find((line) => {
    const normalizedLine = line.trim()
    return /^Proactive identity-continuity gap:/i.test(normalizedLine)
      || /^Proactive identity-continuity follow-through:/i.test(normalizedLine)
  })
  const normalizedBriefingMatch = normalizeProactiveSameHerGapLine(briefingMatch)
  if (normalizedBriefingMatch)
    return normalizedBriefingMatch

  const reasonMatch = snapshot.reasons.find((reason) => {
    const normalizedReason = reason.trim()
    return /^Proactive identity-continuity follow-through (?:still|currently) reads /i.test(normalizedReason)
  })

  return normalizeProactiveSameHerGapLine(reasonMatch)
}

function resolveSameHerContinuityFocus(reason: string | null | undefined) {
  const laneText = reason
    ? resolveSameHerLaneContinuityReason(reason)?.laneText ?? null
    : null

  if (laneText?.includes('body'))
    return 'body-continuity'

  return 'renderer-authority'
}

function resolveSameHerClosureStage(reason: string | null | undefined) {
  const normalized = reason?.trim().toLowerCase() ?? ''
  if (!normalized)
    return null

  const topLevelSameHerContinuitySummary = resolveTopLevelSameHerContinuitySummaryReason(reason?.trim() ?? '')
  if (topLevelSameHerContinuitySummary?.closureStage)
    return topLevelSameHerContinuitySummary.closureStage

  if (
    /lane=lipsync\+voice-only/i.test(normalized)
    || /lane=voice\+lipsync-only/i.test(normalized)
  ) {
    return 'voice-lipsync-carry'
  }

  if (/focus=body\+lipsync\+voice(?:\s*\|\s*pending=face\+motion)?/i.test(normalized))
    return 'audible-body-carry'
  if (/focus=body\+face\+motion(?:\s*\|\s*pending=lipsync\+voice)?/i.test(normalized))
    return 'body-carried-to-renderer-rejoin'
  if (/focus=resident-body(?:\s*\|\s*pending=face\+motion\+lipsync\+voice)?/i.test(normalized))
    return 'body-only-hold'
  if (/focus=lipsync\+voice(?:\s*\|\s*pending=body\+face\+motion)?/i.test(normalized))
    return 'voice-lipsync-carry'
  if (/focus=voice(?:\s*\|\s*pending=body\+face\+motion\+lipsync)?/i.test(normalized))
    return 'voice-only-carry'
  if (/focus=body\+voice(?:\s*\|\s*pending=face\+motion\+lipsync)?/i.test(normalized))
    return 'body-carried-to-renderer-rejoin'
  if (/focus=face\+motion\+lipsync\+voice(?:\s*\|\s*pending=body)?/i.test(normalized))
    return 'renderer-rejoin-without-body'
  if (/focus=face\+motion\+voice(?:\s*\|\s*pending=body\+lipsync)?/i.test(normalized))
    return 'renderer-rejoin-without-body'
  if (/focus=face\+motion(?:\s*\|\s*pending=body\+lipsync\+voice)?/i.test(normalized))
    return 'renderer-rejoin-without-body'
  if (/focus=face\+lipsync\+voice(?:\s*\|\s*pending=body\+motion)?/i.test(normalized))
    return 'renderer-rejoin-without-body'
  if (/focus=face\+lipsync(?:\s*\|\s*pending=body\+motion\+voice)?/i.test(normalized))
    return 'renderer-rejoin-without-body'
  if (/focus=motion\+lipsync\+voice(?:\s*\|\s*pending=body\+face)?/i.test(normalized))
    return 'renderer-rejoin-without-body'
  if (/focus=motion\+lipsync(?:\s*\|\s*pending=body\+face\+voice)?/i.test(normalized))
    return 'renderer-rejoin-without-body'
  if (/focus=face\+voice(?:\s*\|\s*pending=body\+motion\+lipsync)?/i.test(normalized))
    return 'renderer-rejoin-without-body'
  if (/focus=motion\+voice(?:\s*\|\s*pending=body\+face\+lipsync)?/i.test(normalized))
    return 'renderer-rejoin-without-body'

  if (
    /bodycontinuityphase[:=]\s*full-cross-modal-lock/i.test(normalized)
    || /locked back onto the same living segment together/i.test(normalized)
    || /identity-continuity embodiment line instead of a temporary visual alignment/i.test(normalized)
    || /共同锁回同一段 living segment/i.test(normalized)
    || /跨模态重锁态/.test(normalized)
  ) {
    return 'full-cross-modal-lock'
  }

  if (
    /lane=face\+motion\+lipsync\+voice-only/i.test(normalized)
    || /face\+motion\+lipsync\+voice recovery@/i.test(normalized)
    || /renderer rejoin without body carry/i.test(normalized)
    || /visible recovery without body carry/i.test(normalized)
    || /focus=face\+motion\+lipsync\+voice(?:\s*\|\s*pending=body)?/i.test(normalized)
    || /partial=body(?:\s|\||$)/i.test(normalized)
  ) {
    return 'renderer-rejoin-without-body'
  }

  if (
    /lane=face\+motion\+voice-only/i.test(normalized)
    || /embodiment_status:still-voiced-face-motion-line(?:\s*\||$)/i.test(normalized)
    || /signature=embodiment:still-voiced-face-motion-line(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|still-voiced-face-motion-line(?:\s*\||$)/i.test(normalized)
    || /actual source is face, motion, and voice/i.test(normalized)
    || /face\+motion\+voice recovery@/i.test(normalized)
    || /still-voiced face-and-motion line/i.test(normalized)
    || /lane=face\+motion-only/i.test(normalized)
    || /actual source is face and motion/i.test(normalized)
    || /same-segment face\+motion recovery@/i.test(normalized)
    || /lane=face\+lipsync-only/i.test(normalized)
    || /actual source is face and lipsync/i.test(normalized)
    || /lane=motion\+lipsync-only/i.test(normalized)
    || /actual source is motion and lipsync/i.test(normalized)
    || /lane=face\+voice-only/i.test(normalized)
    || /embodiment_status:still-voiced-face-lipsync-line(?:\+embodiment:still-voiced-face-line)?(?:\s*\||$)/i.test(normalized)
    || /embodiment_status:still-voiced-face-line(?:\s*\||$)/i.test(normalized)
    || /face\+lipsync\+voice recovery@/i.test(normalized)
    || /actual source is face and voice/i.test(normalized)
    || /face\+voice recovery@/i.test(normalized)
    || /still-voiced face line/i.test(normalized)
    || /still-voiced face-and-mouth line/i.test(normalized)
    || /lane=motion\+voice-only/i.test(normalized)
    || /embodiment_status:still-voiced-motion-lipsync-line(?:\+embodiment:still-voiced-motion-line)?(?:\s*\||$)/i.test(normalized)
    || /embodiment_status:still-voiced-motion-line(?:\s*\||$)/i.test(normalized)
    || /motion\+lipsync\+voice recovery@/i.test(normalized)
    || /actual source is motion and voice/i.test(normalized)
    || /motion\+voice recovery@/i.test(normalized)
    || /still-voiced motion line/i.test(normalized)
    || /still-voiced motion-and-mouth line/i.test(normalized)
  ) {
    return 'renderer-rejoin-without-body'
  }

  if (
    /embodiment_status:body\+lipsync-only(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|body\+lipsync-only(?:\s*\||$)/i.test(normalized)
  ) {
    return 'body-carried-to-renderer-rejoin'
  }

  if (
    /embodiment_status:audible-identity-continuity-line\+embodiment:body\+voice-only(?:\s*\||$)/i.test(normalized)
    || /embodiment_status:body\+voice-only(?:\s*\||$)/i.test(normalized)
    || /lane=body\+face\+motion-only/i.test(normalized)
    || /lane=body\+voice-only/i.test(normalized)
    || /lane=body\+lipsync-only/i.test(normalized)
    || /same-segment face\+motion\+body recovery@/i.test(normalized)
    || /body, face, and motion authority have already re-formed on the same segment/i.test(normalized)
    || /body\+voice recovery@/i.test(normalized)
    || /body\+lipsync recovery@/i.test(normalized)
    || /resident body continuity and voice prosody are still aligned with the active identity-continuity segment/i.test(normalized)
    || /the resident body lane is still holding together with the identity-continuity voice line/i.test(normalized)
    || /the resident body lane is still holding together with one other embodiment lane/i.test(normalized)
  ) {
    return 'body-carried-to-renderer-rejoin'
  }

  if (
    /lane=body\+lipsync\+voice-only/i.test(normalized)
    || /signature=embodiment:audible-identity-continuity-line/i.test(normalized)
    || /embodiment_status:audible-identity-continuity-line(?:\+embodiment:body-lipsync-voice-rejoin)?(?:\s*\||$)/i.test(normalized)
    || /embodiment_status:body-lipsync-voice-rejoin(?:\s*\||$)/i.test(normalized)
    || /body\+lipsync\+voice recovery@/i.test(normalized)
    || /audible-body rejoin@/i.test(normalized)
    || /identity-continuity audible body line is still the surviving pre-dialogue carry/i.test(normalized)
    || /the resident body lane is still holding together with the audible identity-continuity line/i.test(normalized)
  ) {
    return 'audible-body-carry'
  }

  if (
    /lane=body-only/i.test(normalized)
    || /resident body continuity is still aligned with the active identity-continuity segment/i.test(normalized)
    || /only the resident body lane is still aligned with the active identity-continuity segment/i.test(normalized)
    || /body-only recovery@/i.test(normalized)
  ) {
    return 'body-only-hold'
  }

  if (
    /lane=voice-only/i.test(normalized)
    || /identity-continuity embodiment is now only being carried by voice/i.test(normalized)
  ) {
    return 'voice-only-carry'
  }

  if (
    /embodiment_status:lipsync\+voice-only(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|lipsync\+voice-only(?:\s*\||$)/i.test(normalized)
  ) {
    return 'voice-lipsync-carry'
  }

  if (
    /identity-continuity embodiment is now only being carried by face and lipsync/i.test(normalized)
    || /identity-continuity embodiment is now only being carried by motion and lipsync/i.test(normalized)
  ) {
    return 'renderer-rejoin-without-body'
  }

  if (
    /lane=lipsync\+voice-only/i.test(normalized)
    || /lane=voice\+lipsync-only/i.test(normalized)
    || /voice and lipsync still carry the same living segment/i.test(normalized)
  ) {
    return 'voice-lipsync-carry'
  }

  return null
}

function resolveLockedManifestationLabel(reason: string) {
  if (/\blive2d\b/i.test(reason))
    return 'Live2D manifestation'
  if (/\bvrm\b/i.test(reason))
    return 'VRM manifestation'
  return 'manifestation authority'
}

function resolveTopLevelSameHerContinuitySummaryReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return null

  if (!normalized.startsWith('当前 identity-continuity continuity 主要由'))
    return null

  if (normalized.includes('处在 audible-body-carry') || normalized.includes('表情、动作 还没重新接回')) {
    return {
      closureStage: 'audible-body-carry',
      laneText: 'body, lipsync, and voice',
      headline: rendererInternalLaneContinuityHeadlines.bodyLipsyncVoice,
    }
  }

  if (normalized.includes('处在 voice-lipsync-carry') || normalized.includes('口型、声音') || normalized.includes('口型 还没重新接回')) {
    return {
      closureStage: 'voice-lipsync-carry',
      laneText: 'lipsync and voice',
      headline: rendererInternalLaneContinuityHeadlines.lipsyncAndVoice,
    }
  }

  if (normalized.includes('处在 renderer-rejoin-without-body') || normalized.includes('身体 还没重新接回')) {
    return {
      closureStage: 'renderer-rejoin-without-body',
      laneText: 'face, motion, lipsync, and voice',
      headline: rendererInternalLaneContinuityHeadlines.faceMotionLipsyncVoice,
    }
  }

  if (normalized.includes('处在 body-carried-to-renderer-rejoin') || normalized.includes('口型、声音 还没重新接回')) {
    return {
      closureStage: 'body-carried-to-renderer-rejoin',
      laneText: 'body, face, and motion',
      headline: rendererInternalLaneContinuityHeadlines.bodyFaceMotion,
    }
  }

  return null
}

function resolveSameHerLaneContinuityReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return null

  const topLevelSameHerContinuitySummary = resolveTopLevelSameHerContinuitySummaryReason(normalized)
  if (topLevelSameHerContinuitySummary)
    return topLevelSameHerContinuitySummary

  const rendererLaneFocusMatch = /focus=([a-z+-]+)(?:\s*\|\s*pending=[a-z+-]+)?/i.exec(normalized)
  if (rendererLaneFocusMatch) {
    const normalizedFocusLane = (rendererLaneFocusMatch[1] ?? '').replace(/^resident-body$/i, 'body')
    const focusLaneText = formatLaneListForHeadline(normalizedFocusLane)
    if (!focusLaneText)
      return null

    if (focusLaneText === 'body, face, and motion') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.bodyFaceMotion,
      }
    }

    if (focusLaneText === 'body, lipsync, and voice') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.bodyLipsyncVoice,
      }
    }

    if (focusLaneText === 'body and lipsync') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.bodyAndLipsync,
      }
    }

    if (focusLaneText === 'body and voice') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.bodyAndVoice,
      }
    }

    if (focusLaneText === 'body') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.body,
      }
    }

    if (focusLaneText === 'face, motion, lipsync, and voice') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.faceMotionLipsyncVoice,
      }
    }

    if (focusLaneText === 'lipsync and voice') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.lipsyncAndVoice,
      }
    }

    if (focusLaneText === 'face and voice') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.faceAndVoice,
      }
    }

    if (focusLaneText === 'face, lipsync, and voice') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.faceLipsyncVoice,
      }
    }

    if (focusLaneText === 'face, motion, and voice') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.faceMotionVoice,
      }
    }

    if (focusLaneText === 'motion and voice') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.motionAndVoice,
      }
    }

    if (focusLaneText === 'motion, lipsync, and voice') {
      return {
        laneText: focusLaneText,
        headline: rendererInternalLaneContinuityHeadlines.motionLipsyncVoice,
      }
    }

    return {
      laneText: focusLaneText,
      headline: describeRendererInternalLaneContinuityHeadline(focusLaneText),
    }
  }

  if (
    /bodycontinuityphase[:=]\s*full-cross-modal-lock/i.test(normalized)
    || /locked back onto the same living segment together/i.test(normalized)
    || /identity-continuity embodiment line instead of a temporary visual alignment/i.test(normalized)
    || /共同锁回同一段 living segment/i.test(normalized)
    || /跨模态重锁态/.test(normalized)
  ) {
    const manifestationLabel = resolveLockedManifestationLabel(normalized)
    return {
      laneText: `body continuity and ${manifestationLabel.toLowerCase()}`,
      headline: describeRendererInternalFullCrossModalLockHeadline(manifestationLabel, normalized),
    }
  }

  const laneMatch = /lane=([a-z+]+)-only/i.exec(normalized)
  if (laneMatch) {
    const laneText = formatLaneListForHeadline(laneMatch[1] ?? '')
    if (!laneText)
      return null

    if (laneText === 'body, face, and motion') {
      return {
        laneText,
        headline: rendererInternalLaneContinuityHeadlines.bodyFaceMotion,
      }
    }

    if (laneText === 'body, lipsync, and voice') {
      return {
        laneText,
        headline: rendererInternalLaneContinuityHeadlines.bodyLipsyncVoice,
      }
    }

    if (laneText === 'body and lipsync') {
      return {
        laneText,
        headline: rendererInternalLaneContinuityHeadlines.bodyAndLipsync,
      }
    }

    if (laneText === 'body and voice') {
      return {
        laneText,
        headline: rendererInternalLaneContinuityHeadlines.bodyAndVoice,
      }
    }

    if (laneText === 'body') {
      return {
        laneText,
        headline: rendererInternalLaneContinuityHeadlines.body,
      }
    }

    if (laneText === 'face, motion, lipsync, and voice') {
      return {
        laneText,
        headline: rendererInternalLaneContinuityHeadlines.faceMotionLipsyncVoice,
      }
    }

    if (laneText === 'face and voice') {
      return {
        laneText,
        headline: rendererInternalLaneContinuityHeadlines.faceAndVoice,
      }
    }

    if (laneText === 'face, lipsync, and voice') {
      return {
        laneText,
        headline: rendererInternalLaneContinuityHeadlines.faceLipsyncVoice,
      }
    }

    if (laneText === 'face, motion, and voice') {
      return {
        laneText,
        headline: rendererInternalLaneContinuityHeadlines.faceMotionVoice,
      }
    }

    if (laneText === 'motion and voice') {
      return {
        laneText,
        headline: rendererInternalLaneContinuityHeadlines.motionAndVoice,
      }
    }

    if (laneText === 'motion, lipsync, and voice') {
      return {
        laneText,
        headline: rendererInternalLaneContinuityHeadlines.motionLipsyncVoice,
      }
    }

    return {
      laneText,
      headline: describeRendererInternalLaneContinuityHeadline(laneText),
    }
  }

  const stillVoicedFaceMouthContinuityMatch = /embodiment_status:still-voiced-face-lipsync-line(?:\+embodiment:still-voiced-face-line)?(?:\s*\||$)/i.exec(normalized)
    || /face\+lipsync\+voice recovery@/i.exec(normalized)
  if (stillVoicedFaceMouthContinuityMatch) {
    return {
      laneText: 'face, lipsync, and voice',
      headline: rendererInternalLaneContinuityHeadlines.faceLipsyncVoice,
    }
  }

  const stillVoicedFaceMotionContinuityMatch = /embodiment_status:still-voiced-face-motion-line(?:\s*\||$)/i.exec(normalized)
    || /signature=embodiment:still-voiced-face-motion-line(?:\s*\||$)/i.exec(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|still-voiced-face-motion-line(?:\s*\||$)/i.exec(normalized)
    || /actual source is face, motion, and voice/i.exec(normalized)
    || /face\+motion\+voice recovery@/i.exec(normalized)
    || /still-voiced face-and-motion line/i.exec(normalized)
  if (stillVoicedFaceMotionContinuityMatch) {
    return {
      laneText: 'face, motion, and voice',
      headline: rendererInternalLaneContinuityHeadlines.faceMotionVoice,
    }
  }

  const visibleRendererRejoinWithoutBodyMatch = /lane=face\+motion\+lipsync\+voice-only/i.exec(normalized)
    || /face\+motion\+lipsync\+voice recovery@/i.exec(normalized)
    || /focus=face\+motion\+lipsync\+voice(?:\s*\|\s*pending=body)?/i.exec(normalized)
    || /renderer rejoin without body carry/i.exec(normalized)
    || /visible recovery without body carry/i.exec(normalized)
  if (visibleRendererRejoinWithoutBodyMatch) {
    return {
      laneText: 'face, motion, lipsync, and voice',
      headline: rendererInternalLaneContinuityHeadlines.faceMotionLipsyncVoice,
    }
  }

  const stillVoicedFaceContinuityMatch = /embodiment_status:still-voiced-face-line(?:\s*\||$)/i.exec(normalized)
    || /face\+voice recovery@/i.exec(normalized)
  if (stillVoicedFaceContinuityMatch) {
    return {
      laneText: 'face and voice',
      headline: rendererInternalLaneContinuityHeadlines.faceAndVoice,
    }
  }

  const stillVoicedMotionMouthContinuityMatch = /embodiment_status:still-voiced-motion-lipsync-line(?:\+embodiment:still-voiced-motion-line)?(?:\s*\||$)/i.exec(normalized)
    || /motion\+lipsync\+voice recovery@/i.exec(normalized)
  if (stillVoicedMotionMouthContinuityMatch) {
    return {
      laneText: 'motion, lipsync, and voice',
      headline: rendererInternalLaneContinuityHeadlines.motionLipsyncVoice,
    }
  }

  const stillVoicedMotionContinuityMatch = /embodiment_status:still-voiced-motion-line(?:\s*\||$)/i.exec(normalized)
    || /motion\+voice recovery@/i.exec(normalized)
  if (stillVoicedMotionContinuityMatch) {
    return {
      laneText: 'motion and voice',
      headline: rendererInternalLaneContinuityHeadlines.motionAndVoice,
    }
  }

  const quieterVoiceLipsyncContinuityMatch = /embodiment_status:lipsync\+voice-only(?:\s*\||$)/i.exec(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|lipsync\+voice-only(?:\s*\||$)/i.exec(normalized)
  if (quieterVoiceLipsyncContinuityMatch) {
    return {
      laneText: 'lipsync and voice',
      headline: rendererInternalLaneContinuityHeadlines.lipsyncAndVoice,
    }
  }

  const carriedByMatch = /identity-continuity embodiment is now only being carried by (.*?), so the next turn should treat full cross-modal identity-continuity recovery as still open instead of assuming the body line is already closed\./i.exec(normalized)
  if (carriedByMatch) {
    const laneText = normalizeLegacyCarriedByLaneText(carriedByMatch[1] ?? '')
    if (!laneText)
      return null

    return {
      laneText,
      headline: laneText === 'body'
        ? rendererInternalLaneContinuityHeadlines.body
        : describeRendererInternalLaneContinuityHeadline(laneText),
    }
  }

  const residentBodyLaneMatch = /resident body continuity(?: and voice prosody)? (?:is|are) still aligned with the active identity-continuity segment/i.exec(normalized)
  const residentBodyLaneDiagnosticMatch = /only the resident body lane is still aligned with the active identity-continuity segment/i.exec(normalized)
    || /the resident body lane is still holding together with one other embodiment lane/i.exec(normalized)
    || /the resident body lane is still holding together with the audible identity-continuity line/i.exec(normalized)
  const audibleSameHerContinuitySignatureMatch = /signature=embodiment:audible-identity-continuity-line/i.exec(normalized)
  const bodyVoiceContinuitySourceMatch = /embodiment_status:audible-identity-continuity-line\+embodiment:body\+voice-only(?:\s*\||$)/i.exec(normalized)
  const bodyVoiceContinuityReasonTagMatch = /embodiment_status:body\+voice-only(?:\s*\||$)/i.exec(normalized)
  const quieterBodyLipsyncContinuitySourceMatch = /embodiment_status:body\+lipsync-only(?:\s*\||$)/i.exec(normalized)
  const quieterBodyLipsyncContinuitySignatureMatch = /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|body\+lipsync-only(?:\s*\||$)/i.exec(normalized)
  const audibleSameHerContinuitySourceMatch = /embodiment_status:audible-identity-continuity-line(?:\+embodiment:body-lipsync-voice-rejoin)?(?:\s*\||$)/i.exec(normalized)
  const audibleBodyContinuityReasonTagMatch = /embodiment_status:body-lipsync-voice-rejoin(?:\s*\||$)/i.exec(normalized)
  const bodyOnlyRecoveryMatch = /body-only recovery@/i.exec(normalized)
  const bodyVoiceRecoveryMatch = /body\+voice recovery@/i.exec(normalized)
  const bodyLipsyncVoiceRecoveryMatch = /body\+lipsync\+voice recovery@/i.exec(normalized)
  const bodyLipsyncRecoveryMatch = /body\+lipsync recovery@/i.exec(normalized)
  const audibleBodyRejoinMatch = /audible-body rejoin@/i.exec(normalized)
  const audibleBodyCarryMatch = /identity-continuity audible body line is still the surviving pre-dialogue carry/i.exec(normalized)
  const bodyLipsyncVoiceLaneMatch = /lane=body\+lipsync\+voice-only/i.exec(normalized)
  const bodyLipsyncLaneMatch = /lane=body\+lipsync-only/i.exec(normalized)
  const sameHerVoiceLineCarryMatch = /the resident body lane is still holding together with the identity-continuity voice line/i.exec(normalized)
  const bodyFaceMotionAuthorityRecoveryMatch = /body, face, and motion authority have already re-formed on the same segment/i.exec(normalized)
  const sameSegmentFaceMotionRecoveryMatch = /same-segment face\+motion recovery@/i.exec(normalized)
  const sameSegmentFaceMotionBodyRecoveryMatch = /same-segment face\+motion\+body recovery@/i.exec(normalized)
  const bodyLaneText = residentBodyLaneMatch
    ? normalized.includes('voice prosody')
      ? 'body and voice'
      : 'body'
    : sameHerVoiceLineCarryMatch
      ? 'body and voice'
      : residentBodyLaneDiagnosticMatch
        ? 'body'
        : bodyOnlyRecoveryMatch
          ? 'body'
          : (bodyVoiceContinuitySourceMatch || bodyVoiceContinuityReasonTagMatch)
              ? 'body and voice'
              : (quieterBodyLipsyncContinuitySourceMatch || quieterBodyLipsyncContinuitySignatureMatch)
                  ? 'body and lipsync'
                  : bodyVoiceRecoveryMatch
                    ? 'body and voice'
                    : bodyLipsyncVoiceRecoveryMatch
                      ? 'body, lipsync, and voice'
                      : bodyLipsyncRecoveryMatch
                        ? 'body and lipsync'
                        : (audibleSameHerContinuitySignatureMatch || audibleSameHerContinuitySourceMatch || audibleBodyContinuityReasonTagMatch)
                            ? 'body, lipsync, and voice'
                            : audibleBodyRejoinMatch
                              ? 'body, lipsync, and voice'
                              : audibleBodyCarryMatch
                                ? 'body, lipsync, and voice'
                                : bodyLipsyncVoiceLaneMatch
                                  ? 'body, lipsync, and voice'
                                  : bodyLipsyncLaneMatch
                                    ? 'body and lipsync'
                                    : bodyFaceMotionAuthorityRecoveryMatch
                                      ? 'body, face, and motion'
                                      : sameSegmentFaceMotionRecoveryMatch
                                        ? 'face and motion'
                                        : sameSegmentFaceMotionBodyRecoveryMatch
                                          ? 'body, face, and motion'
                                          : null
  const faceMotionLipsyncMatch = /face, motion, and lipsync continuity/i.exec(normalized)
  const laneText = bodyLaneText
    ?? (faceMotionLipsyncMatch ? 'face, motion, and lipsync' : null)
  if (!laneText)
    return null

  return {
    laneText,
    headline: laneText === 'body, face, and motion'
      ? rendererInternalLaneContinuityHeadlines.bodyFaceMotion
      : laneText === 'body and voice'
        ? rendererInternalLaneContinuityHeadlines.bodyAndVoice
        : laneText === 'body' && (residentBodyLaneMatch || residentBodyLaneDiagnosticMatch || bodyOnlyRecoveryMatch)
          ? rendererInternalLaneContinuityHeadlines.body
          : laneText === 'body'
            ? rendererInternalLaneContinuityHeadlines.body
            : laneText === 'body, lipsync, and voice'
              ? rendererInternalLaneContinuityHeadlines.bodyLipsyncVoice
              : laneText === 'body and lipsync'
                ? rendererInternalLaneContinuityHeadlines.bodyAndLipsync
                : describeRendererInternalLaneContinuityHeadline(laneText),
  }
}

function isSameHerLaneContinuityReason(reason: string) {
  return resolveSameHerLaneContinuityReason(reason) !== null
}

function resolveHumanReadableProjectStateRepair(reasons: string[]) {
  const normalizedReasons = reasons.map(reason => reason.trim()).filter(Boolean)
  const diagnostics: string[] = []

  if (normalizedReasons.some(reason => reason.includes('project-state-identity-continuity-continuity-required') || reason.includes('project-state-same-her-continuity-required')))
    diagnostics.push('项目状态待同步')

  if (normalizedReasons.some(reason => reason.includes('semantic-judge:project-state-identity-continuity-missing') || reason.includes('semantic-judge:project-state-same-her-missing')))
    diagnostics.push('记忆依据待补齐')

  return diagnostics.length > 0
    ? diagnostics.join('，')
    : null
}

function resolvePrimaryOpenLifeLoopLine(reasons: string[]) {
  const openLoopReason = reasons.find(reason => reason.includes('Primary open life loop still centers on '))
  if (!openLoopReason)
    return null

  return openLoopReason.replace(/^.*Primary open life loop still centers on /, '').replace(/, so the next turn should.*$/i, '').trim() || null
}

function resolveNextClosureReasonLine(reasons: string[]) {
  const nextClosureReason = reasons.find(reason => reason.includes('Next closure target is still '))
  if (!nextClosureReason)
    return null

  return nextClosureReason.replace(/^.*Next closure target is still /, '').replace(/, so the next turn should.*$/i, '').trim() || null
}

function resolveProjectStateFocus(reasons: string[]) {
  const normalizedReasons = reasons.map(reason => reason.toLowerCase())

  if (reasons.some(isSameHerLaneContinuityReason)) {
    return 'identity-continuity-continuity'
  }

  if (normalizedReasons.some(reason => reason.includes('project identity carry is still weak')))
    return 'project-identity'

  if (normalizedReasons.some(reason => reason.includes('phase carry is still weak')))
    return 'current-phase'

  if (normalizedReasons.some(reason => reason.includes('open-loop carry is still weak')))
    return 'unresolved-open-loop'

  return 'project-state'
}

const defaultHint = '可在开发诊断里查看回放基准与状态修正记录。'

function formatLaneListForHeadline(lanes: string) {
  const normalized = lanes.trim().toLowerCase()
  if (!normalized)
    return null

  const parts = normalized
    .split('+')
    .map(part => part.trim())
    .filter(Boolean)

  if (parts.length === 0)
    return null
  if (parts.length === 1)
    return parts[0] ?? null
  if (parts.length === 2)
    return parts.join(' and ')

  const lastPart = parts.pop()
  return `${parts.join(', ')}, and ${lastPart}`
}

function normalizeLegacyCarriedByLaneText(lanes: string) {
  const normalized = lanes.trim().toLowerCase()
  if (!normalized)
    return null

  const parts = normalized
    .split(',')
    .map(part => part.trim().replace(/^and\s+/, ''))
    .filter(Boolean)

  if (parts.length === 0)
    return null

  if (parts.length === 1)
    return parts[0] ?? null

  if (parts.length === 2)
    return parts.join(' and ')

  const lastPart = parts.pop()
  return `${parts.join(', ')}, and ${lastPart}`
}

function formatLaneSignatureForHeadline(laneText: string) {
  return laneText
    .trim()
    .toLowerCase()
    .replace(/, and /u, '+')
    .replace(/ and /u, '+')
    .replace(/,\s*/gu, '+')
    .replace(/\s+/gu, '')
}

function describeRendererInternalLaneContinuityHeadline(
  laneText: string,
  authoritySummary?: string | null,
) {
  const laneSignature = formatLaneSignatureForHeadline(laneText)
  const laneEvidence = laneSignature ? `lane=${laneSignature}-only` : ''
  const structuredHeadline = describeAlicizationEmbodimentClosureHeadline({
    authoritySummary: [authoritySummary?.trim() ?? '', laneEvidence].filter(Boolean).join(' | '),
    currentBodyState: laneEvidence,
  }).trim()
  if (
    structuredHeadline
    && !/^embodiment_lanes=/iu.test(structuredHeadline)
    && !containsAlicizationFixedTemplateResidue(structuredHeadline)
  ) {
    return structuredHeadline
  }

  return '具身通道待重连'
}

function describeRendererInternalFullCrossModalLockHeadline(
  manifestationLabel: string,
  authoritySummary?: string | null,
) {
  const structuredHeadline = describeAlicizationEmbodimentClosureHeadline({
    authoritySummary: [
      authoritySummary?.trim() ?? '',
      'bodycontinuityphase=full-cross-modal-lock',
      manifestationLabel,
    ].filter(Boolean).join(' | '),
    currentBodyState: 'bodycontinuityphase=full-cross-modal-lock',
  }).trim()
  if (
    structuredHeadline
    && !/^embodiment_lanes=/iu.test(structuredHeadline)
    && !containsAlicizationFixedTemplateResidue(structuredHeadline)
  ) {
    return structuredHeadline
  }

  return null
}

const rendererInternalLaneContinuityHeadlines = {
  body: describeRendererInternalLaneContinuityHeadline('body'),
  bodyAndLipsync: describeRendererInternalLaneContinuityHeadline('body and lipsync'),
  bodyAndVoice: describeRendererInternalLaneContinuityHeadline('body and voice'),
  bodyFaceMotion: describeRendererInternalLaneContinuityHeadline('body, face, and motion'),
  bodyLipsyncVoice: describeRendererInternalLaneContinuityHeadline('body, lipsync, and voice'),
  faceAndVoice: describeRendererInternalLaneContinuityHeadline('face and voice'),
  faceLipsyncVoice: describeRendererInternalLaneContinuityHeadline('face, lipsync, and voice'),
  faceMotionLipsyncVoice: describeRendererInternalLaneContinuityHeadline('face, motion, lipsync, and voice'),
  faceMotionVoice: describeRendererInternalLaneContinuityHeadline('face, motion, and voice'),
  lipsyncAndVoice: describeRendererInternalLaneContinuityHeadline('lipsync and voice'),
  motionAndVoice: describeRendererInternalLaneContinuityHeadline('motion and voice'),
  motionLipsyncVoice: describeRendererInternalLaneContinuityHeadline('motion, lipsync, and voice'),
} as const

function resolveLaneContinuityHeadline(reason: string) {
  const normalized = reason.trim()
  const structuredHeadline = describeAlicizationEmbodimentClosureHeadline({
    authoritySummary: normalized,
    currentBodyState: normalized,
  }).trim()
  if (structuredHeadline)
    return structuredHeadline

  if (
    /embodiment_status:audible-identity-continuity-line\s*\|.*lane=lipsync\+voice-only/i.test(normalized)
    || /embodiment_status:audible-identity-continuity-line\s*\|.*lane=voice\+lipsync-only/i.test(normalized)
  ) {
    return describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'embodiment_status:audible-identity-continuity-line | lane=lipsync+voice-only',
      currentBodyState: 'embodiment_status:audible-identity-continuity-line | lane=lipsync+voice-only',
    }).trim() || null
  }

  const laneReason = resolveSameHerLaneContinuityReason(reason)
  if (!laneReason)
    return null

  const laneSignature = formatLaneSignatureForHeadline(laneReason.laneText)
  return describeAlicizationEmbodimentClosureHeadline({
    authoritySummary: laneSignature ? `lane=${laneSignature}-only` : normalized,
    currentBodyState: laneSignature ? `lane=${laneSignature}-only` : normalized,
  }).trim() || null
}

function isAudibleSameHerContinuityReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return false

  const topLevelSameHerContinuitySummary = resolveTopLevelSameHerContinuitySummaryReason(normalized)
  if (topLevelSameHerContinuitySummary)
    return topLevelSameHerContinuitySummary.closureStage === 'audible-body-carry'

  if (
    /lane=lipsync\+voice-only/i.test(normalized)
    || /lane=voice\+lipsync-only/i.test(normalized)
  ) {
    return false
  }

  if (
    /embodiment_status:audible-identity-continuity-line\+embodiment:body\+voice-only(?:\s*\||$)/i.test(normalized)
    || /embodiment_status:body\+voice-only(?:\s*\||$)/i.test(normalized)
  ) {
    return false
  }

  if (
    isVoiceLipsyncSameHerContinuityReason(normalized)
    || isQuieterBodyLipsyncSameHerContinuityReason(normalized)
    || isStillVoicedFaceSameHerContinuityReason(normalized)
    || isStillVoicedFaceMotionSameHerContinuityReason(normalized)
    || isStillVoicedMotionSameHerContinuityReason(normalized)
    || isVisibleRendererRejoinWithoutBodySameHerContinuityReason(normalized)
  ) {
    return false
  }

  return /focus=body\+lipsync\+voice(?:\s*\|\s*pending=face\+motion)?/i.test(normalized)
    || /lane=body\+lipsync\+voice-only/i.test(normalized)
    || /signature=embodiment:audible-identity-continuity-line/i.test(normalized)
    || /embodiment_status:audible-identity-continuity-line(?:\+embodiment:body-lipsync-voice-rejoin)?(?:\s*\||$)/i.test(normalized)
    || /embodiment_status:body-lipsync-voice-rejoin(?:\s*\||$)/i.test(normalized)
    || /body\+lipsync\+voice recovery@/i.test(normalized)
    || /audible-body rejoin@/i.test(normalized)
    || /identity-continuity audible body line is still the surviving pre-dialogue carry/i.test(normalized)
    || /the resident body lane is still holding together with the audible identity-continuity line/i.test(normalized)
}

function isVoiceLipsyncSameHerContinuityReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return false

  const topLevelSameHerContinuitySummary = resolveTopLevelSameHerContinuitySummaryReason(normalized)
  if (topLevelSameHerContinuitySummary)
    return topLevelSameHerContinuitySummary.closureStage === 'voice-lipsync-carry'

  return /focus=lipsync\+voice(?:\s*\|\s*pending=body\+face\+motion)?/i.test(normalized)
    || /lane=lipsync\+voice-only/i.test(normalized)
    || /lane=voice\+lipsync-only/i.test(normalized)
    || /embodiment_status:audible-identity-continuity-line\s*\|.*lane=lipsync\+voice-only/i.test(normalized)
    || /embodiment_status:audible-identity-continuity-line\s*\|.*lane=voice\+lipsync-only/i.test(normalized)
    || /embodiment_status:lipsync\+voice-only(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|lipsync\+voice-only(?:\s*\||$)/i.test(normalized)
    || /voice and lipsync still carry the same living segment/i.test(normalized)
}

function isQuieterBodyLipsyncSameHerContinuityReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return false

  return /focus=body\+lipsync(?:\s*\|\s*pending=face\+motion\+voice)?(?=\s|$)/i.test(normalized)
    || /lane=body\+lipsync-only/i.test(normalized)
    || /embodiment_status:body\+lipsync-only(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|body\+lipsync-only(?:\s*\||$)/i.test(normalized)
    || /body\+lipsync recovery@/i.test(normalized)
}

function isStillVoicedFaceSameHerContinuityReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return false

  return /focus=face\+lipsync\+voice(?:\s*\|\s*pending=body\+motion)?/i.test(normalized)
    || /lane=face\+voice-only/i.test(normalized)
    || /embodiment_status:still-voiced-face-lipsync-line(?:\+embodiment:still-voiced-face-line)?(?:\s*\||$)/i.test(normalized)
    || /embodiment_status:still-voiced-face-line(?:\s*\||$)/i.test(normalized)
    || /face\+lipsync\+voice recovery@/i.test(normalized)
    || /actual source is face and voice/i.test(normalized)
    || /face\+voice recovery@/i.test(normalized)
    || /still-voiced face line/i.test(normalized)
    || /still-voiced face-and-mouth line/i.test(normalized)
}

function isStillVoicedFaceMotionSameHerContinuityReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return false

  return /focus=face\+motion\+voice(?:\s*\|\s*pending=body\+lipsync)?/i.test(normalized)
    || /lane=face\+motion\+voice-only/i.test(normalized)
    || /embodiment_status:still-voiced-face-motion-line(?:\s*\||$)/i.test(normalized)
    || /signature=embodiment:still-voiced-face-motion-line(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|still-voiced-face-motion-line(?:\s*\||$)/i.test(normalized)
    || /actual source is face, motion, and voice/i.test(normalized)
    || /face\+motion\+voice recovery@/i.test(normalized)
    || /still-voiced face-and-motion line/i.test(normalized)
}

function isVisibleRendererRejoinWithoutBodySameHerContinuityReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return false

  const topLevelSameHerContinuitySummary = resolveTopLevelSameHerContinuitySummaryReason(normalized)
  if (topLevelSameHerContinuitySummary)
    return topLevelSameHerContinuitySummary.closureStage === 'renderer-rejoin-without-body'

  return /focus=face\+motion\+lipsync\+voice(?:\s*\|\s*pending=body)?/i.test(normalized)
    || /lane=face\+motion\+lipsync\+voice-only/i.test(normalized)
    || /face\+motion\+lipsync\+voice recovery@/i.test(normalized)
    || /renderer rejoin without body carry/i.test(normalized)
    || /visible recovery without body carry/i.test(normalized)
}

function isStillVoicedMotionSameHerContinuityReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return false

  if (isVisibleRendererRejoinWithoutBodySameHerContinuityReason(normalized))
    return false

  return /focus=motion\+lipsync\+voice(?:\s*\|\s*pending=body\+face)?/i.test(normalized)
    || /lane=motion\+voice-only/i.test(normalized)
    || /embodiment_status:still-voiced-motion-lipsync-line(?:\+embodiment:still-voiced-motion-line)?(?:\s*\||$)/i.test(normalized)
    || /embodiment_status:still-voiced-motion-line(?:\s*\||$)/i.test(normalized)
    || /motion\+lipsync\+voice recovery@/i.test(normalized)
    || /actual source is motion and voice/i.test(normalized)
    || /motion\+voice recovery@/i.test(normalized)
    || /still-voiced motion line/i.test(normalized)
    || /still-voiced motion-and-mouth line/i.test(normalized)
}

function isFullCrossModalLockSameHerContinuityReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return false

  return /bodycontinuityphase[:=]\s*full-cross-modal-lock/i.test(normalized)
    || /locked back onto the same living segment together/i.test(normalized)
    || /identity-continuity embodiment line instead of a temporary visual alignment/i.test(normalized)
    || /共同锁回同一段 living segment/i.test(normalized)
    || /跨模态重锁态/.test(normalized)
}

function resolvePreferredSameHerLaneContinuityReason(reasons: string[]) {
  const sameHerLaneReasons = reasons.filter(isSameHerLaneContinuityReason)
  if (sameHerLaneReasons.length === 0)
    return null

  return sameHerLaneReasons.find(isFullCrossModalLockSameHerContinuityReason)
    ?? sameHerLaneReasons.find(isVoiceLipsyncSameHerContinuityReason)
    ?? sameHerLaneReasons.find(isAudibleSameHerContinuityReason)
    ?? sameHerLaneReasons.find(isQuieterBodyLipsyncSameHerContinuityReason)
    ?? sameHerLaneReasons.find(isVisibleRendererRejoinWithoutBodySameHerContinuityReason)
    ?? sameHerLaneReasons.find(isStillVoicedFaceMotionSameHerContinuityReason)
    ?? sameHerLaneReasons.find(isStillVoicedFaceSameHerContinuityReason)
    ?? sameHerLaneReasons.find(isStillVoicedMotionSameHerContinuityReason)
    ?? sameHerLaneReasons[0]
    ?? null
}

function carriesBroaderProjectBriefingLine(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.includes('project identity')
    || normalized.includes('landed progress')
    || normalized.includes('still-open life loop')
    || normalized.includes('digital life project')
    || normalized.includes('phase 1')
    || normalized.includes('what has landed')
    || normalized.includes('generic assistant')
    || normalized.includes('this digital life')
}

function resolveBriefingHeadline(snapshot: StageQuickReplyPreDialogueClosureSnapshot) {
  const laneRiskReason = resolvePreferredSameHerLaneContinuityReason(snapshot.reasons)
  const laneRiskHeadline = laneRiskReason
    ? resolveLaneContinuityHeadline(laneRiskReason)
    : null
  const normalizedLaneRiskHeadline = laneRiskHeadline?.trim().toLowerCase() ?? ''
  const explicitCompanionBriefingLine = typeof snapshot.companionBriefingLine === 'string' && snapshot.companionBriefingLine.trim()
    ? snapshot.companionBriefingLine.trim()
    : null
  const structuredLaneBriefing = (laneText: string, authoritySummary?: string | null) =>
    describeRendererInternalLaneContinuityHeadline(laneText, authoritySummary ?? laneRiskReason)

  if (
    laneRiskReason
    && isVoiceLipsyncSameHerContinuityReason(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('lipsync and voice')
  }

  if (
    laneRiskReason
    && isAudibleSameHerContinuityReason(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('body, lipsync, and voice')
  }

  if (
    laneRiskReason
    && isQuieterBodyLipsyncSameHerContinuityReason(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('body and lipsync')
  }

  if (
    laneRiskReason
    && isVisibleRendererRejoinWithoutBodySameHerContinuityReason(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('face, motion, lipsync, and voice')
  }

  if (
    laneRiskReason
    && isStillVoicedFaceMotionSameHerContinuityReason(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('face, motion, and voice')
  }

  if (
    laneRiskReason
    && /embodiment_status:still-voiced-face-lipsync-line(?:\+embodiment:still-voiced-face-line)?(?:\s*\||$)/i.test(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('face, lipsync, and voice')
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('mainly through face and lipsync')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('face and lipsync', laneRiskHeadline)
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('still-voiced face-and-mouth line')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('face, lipsync, and voice', laneRiskHeadline)
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('still-voiced face line')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('face and voice', laneRiskHeadline)
  }

  if (
    laneRiskReason
    && /embodiment_status:still-voiced-motion-lipsync-line(?:\+embodiment:still-voiced-motion-line)?(?:\s*\||$)/i.test(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('motion, lipsync, and voice')
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('mainly through motion and lipsync')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('motion and lipsync', laneRiskHeadline)
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('still-voiced motion-and-mouth line')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('motion, lipsync, and voice', laneRiskHeadline)
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('still-voiced motion line')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return structuredLaneBriefing('motion and voice', laneRiskHeadline)
  }

  if (explicitCompanionBriefingLine)
    return explicitCompanionBriefingLine

  const humanReadableProjectStateRepair = resolveHumanReadableProjectStateRepair(snapshot.reasons)
  const openLifeLoopLine = resolvePrimaryOpenLifeLoopLine(snapshot.reasons)
  if (humanReadableProjectStateRepair && openLifeLoopLine)
    return `${humanReadableProjectStateRepair} ${openLifeLoopLine}`
  if (humanReadableProjectStateRepair)
    return humanReadableProjectStateRepair
  if (openLifeLoopLine)
    return openLifeLoopLine

  const summaryParts = (snapshot.summaryLine ?? '')
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)

  const projectPart = summaryParts.find(part => part.toLowerCase().startsWith('project='))
  if (projectPart) {
    return describeAlicizationProjectClosureBriefing({
      identity: 'project continuity carry present',
      currentPhase: 'phase carry present',
      primaryOpenLoop: 'open loop carry present',
    }) || null
  }

  return null
}

function scoreAwarenessHeadlineCandidate(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return Number.NEGATIVE_INFINITY

  let score = normalized.length >= 72 ? 1 : 0
  if (
    normalized.includes('identity-continuity hold')
    || normalized.includes('measured-return')
    || normalized.includes('lower-pressure')
    || normalized.includes('same line inward')
    || normalized.includes('identity-continuity-inward-carry')
    || normalized.includes('quiet-companionship')
    || normalized.includes('current continuity route')
    || normalized.includes('one living her')
  ) {
    score += 3
  }
  if (normalized.includes('digital life') || normalized.includes('phase 1'))
    score += 1

  return score
}

function looksLikeThinAwarenessReminderLine(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return false

  return isAlicizationThinProjectAwarenessLine(line)
}

function sanitizeQuickReplyClosureHeadline(line: string | null | undefined) {
  const normalized = line?.trim().replace(/\s+/g, ' ') ?? ''
  if (!normalized)
    return null
  if (isFixedPersonaQuickReplyClosureTemplate(normalized))
    return null
  if (!containsAlicizationFixedTemplateResidue(normalized))
    return normalized

  const diagnosticHeadline = describeAlicizationEmbodimentClosureHeadline({
    authoritySummary: normalized,
    currentBodyState: normalized,
  }).trim() || null

  return isFixedPersonaQuickReplyClosureTemplate(diagnosticHeadline)
    ? null
    : diagnosticHeadline
}

function isFixedPersonaQuickReplyClosureTemplate(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.includes('identity-continuity living line')
    || normalized.includes('same her')
    || normalized.includes('same-her')
    || normalized.includes('same living line')
    || normalized.includes('one continuous her')
    || normalized.includes('同一个 her')
    || normalized.includes('同一个她')
    || normalized.includes('数字生命主线')
    || normalized.includes('我还需要')
    || normalized.includes('我还在')
    || normalized.includes('continuity evidence')
    || normalized.includes('renderer continuity')
    || normalized.includes('right now i am still holding together')
    || normalized.includes('i still need')
    || normalized.includes('i need my explicit identity-continuity self line')
    || normalized.includes('my emotional seam')
    || normalized.includes('one living her')
    || normalized.includes('current continuity route')
    || normalized.includes('living audio thread')
}

function sanitizeQuickReplyClosureVisibleLine(line: string | null | undefined) {
  const normalized = line?.trim().replace(/\s+/g, ' ') ?? ''
  if (!normalized)
    return null
  const structuredNextMatch = /^next=(.*?)\s*(?:\|\s*surface=structured)?$/iu.exec(normalized)
  if (structuredNextMatch?.[1]?.trim())
    return null
  const nextHelpMatch = /^Next,\s*help me close:\s*(.*)$/i.exec(normalized)
  if (nextHelpMatch?.[1]?.trim())
    return null
  const chineseNextMatch = /^下一步(?:还要继续收住|状态：|：)\s*(.*)$/u.exec(normalized)
  if (chineseNextMatch?.[1]?.trim())
    return null
  if (/surface=structured/iu.test(normalized))
    return null
  if (isInternalFixedTemplateExclusionLine(normalized))
    return null
  if (internalQuickReplyClosureFieldPattern.test(normalized))
    return null

  if (!isFixedPersonaQuickReplyClosureTemplate(normalized) && !containsAlicizationFixedTemplateResidue(normalized))
    return sanitizeAlicizationProviderFacingText(normalized, 720, fixedTemplateQuickReplyClosureLine) || null

  return null
}

function resolvePreferredAwarenessHeadline(
  awarenessSnapshot?: StageQuickReplyPreDialogueAwarenessSnapshot | null,
) {
  const awarenessLine = typeof awarenessSnapshot?.awarenessLine === 'string' && awarenessSnapshot.awarenessLine.trim()
    ? awarenessSnapshot.awarenessLine.trim()
    : null
  const companionHeadlineLine = typeof awarenessSnapshot?.companionHeadlineLine === 'string' && awarenessSnapshot.companionHeadlineLine.trim()
    ? awarenessSnapshot.companionHeadlineLine.trim()
    : null
  const companionBriefingLine = typeof awarenessSnapshot?.companionBriefingLine === 'string' && awarenessSnapshot.companionBriefingLine.trim()
    ? awarenessSnapshot.companionBriefingLine.trim()
    : null

  if (
    awarenessLine
    && looksLikeThinAwarenessReminderLine(awarenessLine)
  ) {
    const awarenessScore = scoreAwarenessHeadlineCandidate(awarenessLine)
    const companionHeadlineScore = scoreAwarenessHeadlineCandidate(companionHeadlineLine)
    const companionBriefingScore = scoreAwarenessHeadlineCandidate(companionBriefingLine)

    if (
      companionHeadlineLine
      && companionHeadlineScore > Math.max(awarenessScore, companionBriefingScore)
    ) {
      return sanitizeQuickReplyClosureHeadline(companionHeadlineLine)
    }

    if (
      companionBriefingLine
      && companionBriefingScore > awarenessScore
    ) {
      return sanitizeQuickReplyClosureHeadline(companionBriefingLine)
    }
  }

  return sanitizeQuickReplyClosureHeadline(awarenessLine)
    ?? sanitizeQuickReplyClosureHeadline(companionHeadlineLine)
    ?? sanitizeQuickReplyClosureHeadline(companionBriefingLine)
}

function resolveHeadline(
  snapshot: StageQuickReplyPreDialogueClosureSnapshot,
  awarenessSnapshot?: StageQuickReplyPreDialogueAwarenessSnapshot | null,
) {
  if (typeof snapshot.companionHeadlineLine === 'string' && snapshot.companionHeadlineLine.trim()) {
    const sanitizedHeadline = sanitizeQuickReplyClosureHeadline(snapshot.companionHeadlineLine)
    if (sanitizedHeadline)
      return sanitizedHeadline
  }

  const humanReadableProjectStateRepair = resolveHumanReadableProjectStateRepair(snapshot.reasons)
  if (humanReadableProjectStateRepair)
    return humanReadableProjectStateRepair

  const laneRiskReason = resolvePreferredSameHerLaneContinuityReason(snapshot.reasons)
  if (laneRiskReason) {
    return resolveLaneContinuityHeadline(laneRiskReason)
      ?? sanitizeQuickReplyClosureHeadline(laneRiskReason.replace(/^continuity-impact:\s*/i, ''))
  }

  const preferredAwarenessHeadline = resolvePreferredAwarenessHeadline(awarenessSnapshot)
  if (preferredAwarenessHeadline)
    return preferredAwarenessHeadline

  const fallback = snapshot.reasons[0] ?? snapshot.summaryLine ?? null
  if (!fallback)
    return null

  const fallbackHeadline = fallback
    .replace(
      /^Replay benchmark currently reports continuity=.*?landing\.$/i,
      '项目状态待同步',
    )
    .replace(
      /^Project identity-continuity self line currently reads .*?outward reply widening begins\.$/i,
      '身份连续性待校准',
    )
    .replace(
      /^Same-her self authority currently reads .*?host-visible wording\.$/i,
      '身份表述待校准',
    )
    .replace(
      /^Same-her emotional closure currently reads .*?emotional seam\.$/i,
      '情绪收束待校准',
    )
    .replace(
      /^Project identity carry currently reads .*?across time\.$/i,
      '项目身份待同步',
    )
  return sanitizeQuickReplyClosureHeadline(fallbackHeadline)
}

function resolveNextClosureLine(snapshot: StageQuickReplyPreDialogueClosureSnapshot) {
  if (typeof snapshot.companionNextClosureLine === 'string' && snapshot.companionNextClosureLine.trim())
    return snapshot.companionNextClosureLine.trim()

  const nextClosureReasonLine = resolveNextClosureReasonLine(snapshot.reasons)
  if (nextClosureReasonLine)
    return nextClosureReasonLine

  const summaryParts = (snapshot.summaryLine ?? '')
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)

  const nextClosureFromSummary = summaryParts.find(part => part.toLowerCase().startsWith('next closure'))
  if (nextClosureFromSummary) {
    return describeAlicizationProjectNextClosure({
      nextClosureTarget: nextClosureFromSummary.replace(/^Next closure:\s*/i, ''),
    }) || null
  }

  const nextClosureFromReasons = snapshot.reasons.find(reason => reason.toLowerCase().includes('next closure target is still '))
  if (nextClosureFromReasons) {
    return describeAlicizationProjectNextClosure({
      nextClosureTarget: nextClosureFromReasons.replace(/^Next closure target is still\s*/i, ''),
    }) || null
  }

  return null
}

export function buildStageQuickReplyClosureDiagnosticEntry(
  snapshot: StageQuickReplyPreDialogueClosureSnapshot | null | undefined,
  awarenessSnapshot?: StageQuickReplyPreDialogueAwarenessSnapshot | null,
): StageQuickReplyClosureDiagnosticEntry {
  const status = typeof snapshot?.status === 'string'
    ? snapshot.status.trim().toLowerCase()
    : ''

  if (!snapshot || !status) {
    return {
      visible: false,
      label: '打开运行诊断',
      hint: defaultHint,
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
      sameHerDriftRiskLine: null,
      proactiveSameHerGapLine: null,
      routeQuery: {},
    }
  }

  const emotionalClosureFocused = snapshot.reasons.some(reason => reason.toLowerCase().includes('identity-continuity emotional closure'))
  const sameHerContinuityFocused = snapshot.reasons.some(isSameHerLaneContinuityReason)
  const preferredSameHerContinuityReason = sameHerContinuityFocused
    ? resolvePreferredSameHerLaneContinuityReason(snapshot.reasons)
    : null
  const headline = resolveHeadline(snapshot, awarenessSnapshot)
  const briefingHeadline = resolveBriefingHeadline(snapshot)
  const nextClosureLine = resolveNextClosureLine(snapshot)
  const focus = emotionalClosureFocused
    ? 'emotional-closure'
    : sameHerContinuityFocused
      ? 'identity-continuity-continuity'
      : resolveProjectStateFocus(snapshot.reasons)
  const projectStateFocused = !emotionalClosureFocused && !sameHerContinuityFocused
  const eventFocus = emotionalClosureFocused
    ? 'takeover-audit'
    : sameHerContinuityFocused
      ? 'renderer-authority'
      : projectStateFocused
        ? 'takeover-audit'
        : 'governance-normalized'
  const sameHerFocus = sameHerContinuityFocused
    ? resolveSameHerContinuityFocus(preferredSameHerContinuityReason)
    : null
  const sameHerClosureStage = sameHerContinuityFocused
    ? resolveSameHerClosureStage(preferredSameHerContinuityReason)
    : null
  const visible = sameHerContinuityFocused || (status !== 'grounded' && status !== 'closed')
  const sanitizedHeadline = sanitizeQuickReplyClosureVisibleLine(headline)
    ?? (sameHerContinuityFocused ? '具身通道待重连' : null)
    ?? (projectStateFocused ? '项目状态待同步' : null)
  const sanitizedBriefingHeadline = sanitizeQuickReplyClosureVisibleLine(briefingHeadline)
  const dedupedBriefingHeadline = sanitizedBriefingHeadline === sanitizedHeadline
    ? null
    : sanitizedBriefingHeadline
  const sanitizedNextClosureLine = sanitizeQuickReplyClosureVisibleLine(nextClosureLine)
  const sanitizedSameHerDriftRiskLine = sanitizeQuickReplyClosureVisibleLine(snapshot.sameHerDriftRiskLine)
  const sanitizedProactiveSameHerGapLine = sanitizeQuickReplyClosureVisibleLine(resolveProactiveSameHerGapLine(snapshot))

  return {
    visible,
    label: visible ? '查看运行诊断' : '诊断正常',
    hint: defaultHint,
    headline: sanitizedHeadline,
    briefingHeadline: dedupedBriefingHeadline,
    nextClosureLine: sanitizedNextClosureLine,
    sameHerDriftRiskLine: sanitizedSameHerDriftRiskLine,
    proactiveSameHerGapLine: sanitizedProactiveSameHerGapLine,
    routeQuery: visible
      ? {
          source: 'quick-reply-closure',
          status,
          focus,
          eventFocus,
          ...(sameHerFocus ? { sameHerFocus } : {}),
          ...(sameHerClosureStage ? { sameHerClosureStage } : {}),
        }
      : {
          source: 'quick-reply-closure',
          status,
          focus,
          eventFocus,
          ...(sameHerFocus ? { sameHerFocus } : {}),
          ...(sameHerClosureStage ? { sameHerClosureStage } : {}),
        },
  }
}
