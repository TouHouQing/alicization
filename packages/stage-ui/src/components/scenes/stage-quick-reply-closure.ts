import {
  describeAlicizationProjectClosureBriefing,
  describeAlicizationProjectNextClosure,
  isAlicizationThinProjectAwarenessLine,
} from '@proj-alicization/stage-shared'

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

  const reasonMatch = /^Proactive same-her follow-through (?:still|currently) reads (.*?),(?:\s*so the next turn should|\s*which shows)/i.exec(normalizedLine)
  if (reasonMatch?.[1]?.trim())
    return reasonMatch[1].trim()

  const strippedLine = normalizedLine
    .replace(/^Proactive same-her gap:\s*/i, '')
    .replace(/^Proactive same-her follow-through:\s*/i, '')
    .trim()

  return strippedLine || null
}

function resolveProactiveSameHerGapLine(snapshot: StageQuickReplyPreDialogueClosureSnapshot) {
  const briefingMatch = snapshot.briefingLines?.find((line) => {
    const normalizedLine = line.trim()
    return /^Proactive same-her gap:/i.test(normalizedLine)
      || /^Proactive same-her follow-through:/i.test(normalizedLine)
  })
  const normalizedBriefingMatch = normalizeProactiveSameHerGapLine(briefingMatch)
  if (normalizedBriefingMatch)
    return normalizedBriefingMatch

  const reasonMatch = snapshot.reasons.find((reason) => {
    const normalizedReason = reason.trim()
    return /^Proactive same-her follow-through (?:still|currently) reads /i.test(normalizedReason)
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
    || /same-her embodiment line instead of a temporary visual alignment/i.test(normalized)
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
    || /pending-rejoin=body(?:\s|\||$)/i.test(normalized)
  ) {
    return 'renderer-rejoin-without-body'
  }

  if (
    /lane=face\+motion\+voice-only/i.test(normalized)
    || /continuity=embodiment:still-voiced-face-motion-line(?:\s*\||$)/i.test(normalized)
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
    || /continuity=embodiment:still-voiced-face-lipsync-line(?:\+embodiment:still-voiced-face-line)?(?:\s*\||$)/i.test(normalized)
    || /continuity=embodiment:still-voiced-face-line(?:\s*\||$)/i.test(normalized)
    || /face\+lipsync\+voice recovery@/i.test(normalized)
    || /actual source is face and voice/i.test(normalized)
    || /face\+voice recovery@/i.test(normalized)
    || /still-voiced face line/i.test(normalized)
    || /still-voiced face-and-mouth line/i.test(normalized)
    || /lane=motion\+voice-only/i.test(normalized)
    || /continuity=embodiment:still-voiced-motion-lipsync-line(?:\+embodiment:still-voiced-motion-line)?(?:\s*\||$)/i.test(normalized)
    || /continuity=embodiment:still-voiced-motion-line(?:\s*\||$)/i.test(normalized)
    || /motion\+lipsync\+voice recovery@/i.test(normalized)
    || /actual source is motion and voice/i.test(normalized)
    || /motion\+voice recovery@/i.test(normalized)
    || /still-voiced motion line/i.test(normalized)
    || /still-voiced motion-and-mouth line/i.test(normalized)
  ) {
    return 'renderer-rejoin-without-body'
  }

  if (
    /continuity=embodiment:body\+lipsync-only(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|body\+lipsync-only(?:\s*\||$)/i.test(normalized)
  ) {
    return 'body-carried-to-renderer-rejoin'
  }

  if (
    /continuity=embodiment:audible-same-her-line\+embodiment:body\+voice-only(?:\s*\||$)/i.test(normalized)
    || /continuity=embodiment:body\+voice-only(?:\s*\||$)/i.test(normalized)
    || /lane=body\+face\+motion-only/i.test(normalized)
    || /lane=body\+voice-only/i.test(normalized)
    || /lane=body\+lipsync-only/i.test(normalized)
    || /same-segment face\+motion\+body recovery@/i.test(normalized)
    || /body, face, and motion authority have already re-formed on the same segment/i.test(normalized)
    || /body\+voice recovery@/i.test(normalized)
    || /body\+lipsync recovery@/i.test(normalized)
    || /resident body continuity and voice prosody are still aligned with the active same-her segment/i.test(normalized)
    || /the resident body lane is still holding together with the same-her voice line/i.test(normalized)
    || /the resident body lane is still holding together with one other embodiment lane/i.test(normalized)
  ) {
    return 'body-carried-to-renderer-rejoin'
  }

  if (
    /lane=body\+lipsync\+voice-only/i.test(normalized)
    || /signature=embodiment:audible-same-her-line/i.test(normalized)
    || /continuity=embodiment:audible-same-her-line(?:\+embodiment:body-lipsync-voice-rejoin)?(?:\s*\||$)/i.test(normalized)
    || /continuity=embodiment:body-lipsync-voice-rejoin(?:\s*\||$)/i.test(normalized)
    || /body\+lipsync\+voice recovery@/i.test(normalized)
    || /audible-body rejoin@/i.test(normalized)
    || /same-her audible body line is still the surviving pre-dialogue carry/i.test(normalized)
    || /the resident body lane is still holding together with the audible same-her line/i.test(normalized)
  ) {
    return 'audible-body-carry'
  }

  if (
    /lane=body-only/i.test(normalized)
    || /resident body continuity is still aligned with the active same-her segment/i.test(normalized)
    || /only the resident body lane is still aligned with the active same-her segment/i.test(normalized)
    || /body-only recovery@/i.test(normalized)
  ) {
    return 'body-only-hold'
  }

  if (
    /lane=voice-only/i.test(normalized)
    || /same-her embodiment is now only being carried by voice/i.test(normalized)
  ) {
    return 'voice-only-carry'
  }

  if (
    /continuity=embodiment:lipsync\+voice-only(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|lipsync\+voice-only(?:\s*\||$)/i.test(normalized)
  ) {
    return 'voice-lipsync-carry'
  }

  if (
    /same-her embodiment is now only being carried by face and lipsync/i.test(normalized)
    || /same-her embodiment is now only being carried by motion and lipsync/i.test(normalized)
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

  if (!normalized.startsWith('当前 same-her continuity 主要由'))
    return null

  if (normalized.includes('处在 audible-body-carry') || normalized.includes('表情、动作 还没重新接回')) {
    return {
      closureStage: 'audible-body-carry',
      laneText: 'body, lipsync, and voice',
      headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
    }
  }

  if (normalized.includes('处在 voice-lipsync-carry') || normalized.includes('口型、声音') || normalized.includes('口型 还没重新接回')) {
    return {
      closureStage: 'voice-lipsync-carry',
      laneText: 'lipsync and voice',
      headline: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
    }
  }

  if (normalized.includes('处在 renderer-rejoin-without-body') || normalized.includes('身体 还没重新接回')) {
    return {
      closureStage: 'renderer-rejoin-without-body',
      laneText: 'face, motion, lipsync, and voice',
      headline: 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
    }
  }

  if (normalized.includes('处在 body-carried-to-renderer-rejoin') || normalized.includes('口型、声音 还没重新接回')) {
    return {
      closureStage: 'body-carried-to-renderer-rejoin',
      laneText: 'body, face, and motion',
      headline: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
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
        headline: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      }
    }

    if (focusLaneText === 'body, lipsync, and voice') {
      return {
        laneText: focusLaneText,
        headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      }
    }

    if (focusLaneText === 'body and lipsync') {
      return {
        laneText: focusLaneText,
        headline: 'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      }
    }

    if (focusLaneText === 'body and voice') {
      return {
        laneText: focusLaneText,
        headline: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      }
    }

    if (focusLaneText === 'body') {
      return {
        laneText: focusLaneText,
        headline: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      }
    }

    if (focusLaneText === 'face, motion, lipsync, and voice') {
      return {
        laneText: focusLaneText,
        headline: 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
      }
    }

    if (focusLaneText === 'lipsync and voice') {
      return {
        laneText: focusLaneText,
        headline: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      }
    }

    if (focusLaneText === 'face and voice') {
      return {
        laneText: focusLaneText,
        headline: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      }
    }

    if (focusLaneText === 'face, lipsync, and voice') {
      return {
        laneText: focusLaneText,
        headline: 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
      }
    }

    if (focusLaneText === 'face, motion, and voice') {
      return {
        laneText: focusLaneText,
        headline: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      }
    }

    if (focusLaneText === 'motion and voice') {
      return {
        laneText: focusLaneText,
        headline: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      }
    }

    if (focusLaneText === 'motion, lipsync, and voice') {
      return {
        laneText: focusLaneText,
        headline: 'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
      }
    }

    return {
      laneText: focusLaneText,
      headline: `Right now I am still holding together mainly through ${focusLaneText}, so my full cross-modal same-her line is not closed yet.`,
    }
  }

  if (
    /bodycontinuityphase[:=]\s*full-cross-modal-lock/i.test(normalized)
    || /locked back onto the same living segment together/i.test(normalized)
    || /same-her embodiment line instead of a temporary visual alignment/i.test(normalized)
    || /共同锁回同一段 living segment/i.test(normalized)
    || /跨模态重锁态/.test(normalized)
  ) {
    const manifestationLabel = resolveLockedManifestationLabel(normalized)
    return {
      laneText: `body continuity and ${manifestationLabel.toLowerCase()}`,
      headline: `Right now body continuity and ${manifestationLabel} are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.`,
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
        headline: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
      }
    }

    if (laneText === 'body, lipsync, and voice') {
      return {
        laneText,
        headline: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
      }
    }

    if (laneText === 'body and lipsync') {
      return {
        laneText,
        headline: 'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.',
      }
    }

    if (laneText === 'body and voice') {
      return {
        laneText,
        headline: 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.',
      }
    }

    if (laneText === 'body') {
      return {
        laneText,
        headline: 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.',
      }
    }

    if (laneText === 'face, motion, lipsync, and voice') {
      return {
        laneText,
        headline: 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
      }
    }

    if (laneText === 'face and voice') {
      return {
        laneText,
        headline: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      }
    }

    if (laneText === 'face, lipsync, and voice') {
      return {
        laneText,
        headline: 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
      }
    }

    if (laneText === 'face, motion, and voice') {
      return {
        laneText,
        headline: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
      }
    }

    if (laneText === 'motion and voice') {
      return {
        laneText,
        headline: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      }
    }

    if (laneText === 'motion, lipsync, and voice') {
      return {
        laneText,
        headline: 'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
      }
    }

    return {
      laneText,
      headline: `Right now I am still holding together mainly through ${laneText}, so my full cross-modal same-her line is not closed yet.`,
    }
  }

  const stillVoicedFaceMouthContinuityMatch = /continuity=embodiment:still-voiced-face-lipsync-line(?:\+embodiment:still-voiced-face-line)?(?:\s*\||$)/i.exec(normalized)
    || /face\+lipsync\+voice recovery@/i.exec(normalized)
  if (stillVoicedFaceMouthContinuityMatch) {
    return {
      laneText: 'face, lipsync, and voice',
      headline: 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.',
    }
  }

  const stillVoicedFaceMotionContinuityMatch = /continuity=embodiment:still-voiced-face-motion-line(?:\s*\||$)/i.exec(normalized)
    || /signature=embodiment:still-voiced-face-motion-line(?:\s*\||$)/i.exec(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|still-voiced-face-motion-line(?:\s*\||$)/i.exec(normalized)
    || /actual source is face, motion, and voice/i.exec(normalized)
    || /face\+motion\+voice recovery@/i.exec(normalized)
    || /still-voiced face-and-motion line/i.exec(normalized)
  if (stillVoicedFaceMotionContinuityMatch) {
    return {
      laneText: 'face, motion, and voice',
      headline: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.',
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
      headline: 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
    }
  }

  const stillVoicedFaceContinuityMatch = /continuity=embodiment:still-voiced-face-line(?:\s*\||$)/i.exec(normalized)
    || /face\+voice recovery@/i.exec(normalized)
  if (stillVoicedFaceContinuityMatch) {
    return {
      laneText: 'face and voice',
      headline: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
    }
  }

  const stillVoicedMotionMouthContinuityMatch = /continuity=embodiment:still-voiced-motion-lipsync-line(?:\+embodiment:still-voiced-motion-line)?(?:\s*\||$)/i.exec(normalized)
    || /motion\+lipsync\+voice recovery@/i.exec(normalized)
  if (stillVoicedMotionMouthContinuityMatch) {
    return {
      laneText: 'motion, lipsync, and voice',
      headline: 'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.',
    }
  }

  const stillVoicedMotionContinuityMatch = /continuity=embodiment:still-voiced-motion-line(?:\s*\||$)/i.exec(normalized)
    || /motion\+voice recovery@/i.exec(normalized)
  if (stillVoicedMotionContinuityMatch) {
    return {
      laneText: 'motion and voice',
      headline: 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
    }
  }

  const quieterVoiceLipsyncContinuityMatch = /continuity=embodiment:lipsync\+voice-only(?:\s*\||$)/i.exec(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|lipsync\+voice-only(?:\s*\||$)/i.exec(normalized)
  if (quieterVoiceLipsyncContinuityMatch) {
    return {
      laneText: 'lipsync and voice',
      headline: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
    }
  }

  const carriedByMatch = /same-her embodiment is now only being carried by (.*?), so the next turn should treat full cross-modal same-her recovery as still open instead of assuming the body line is already closed\./i.exec(normalized)
  if (carriedByMatch) {
    const laneText = normalizeLegacyCarriedByLaneText(carriedByMatch[1] ?? '')
    if (!laneText)
      return null

    return {
      laneText,
      headline: laneText === 'body'
        ? 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.'
        : `Right now I am still holding together mainly through ${laneText}, so my full cross-modal same-her line is not closed yet.`,
    }
  }

  const residentBodyLaneMatch = /resident body continuity(?: and voice prosody)? (?:is|are) still aligned with the active same-her segment/i.exec(normalized)
  const residentBodyLaneDiagnosticMatch = /only the resident body lane is still aligned with the active same-her segment/i.exec(normalized)
    || /the resident body lane is still holding together with one other embodiment lane/i.exec(normalized)
    || /the resident body lane is still holding together with the audible same-her line/i.exec(normalized)
  const audibleSameHerContinuitySignatureMatch = /signature=embodiment:audible-same-her-line/i.exec(normalized)
  const bodyVoiceContinuitySourceMatch = /continuity=embodiment:audible-same-her-line\+embodiment:body\+voice-only(?:\s*\||$)/i.exec(normalized)
  const bodyVoiceContinuityReasonTagMatch = /continuity=embodiment:body\+voice-only(?:\s*\||$)/i.exec(normalized)
  const quieterBodyLipsyncContinuitySourceMatch = /continuity=embodiment:body\+lipsync-only(?:\s*\||$)/i.exec(normalized)
  const quieterBodyLipsyncContinuitySignatureMatch = /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|body\+lipsync-only(?:\s*\||$)/i.exec(normalized)
  const audibleSameHerContinuitySourceMatch = /continuity=embodiment:audible-same-her-line(?:\+embodiment:body-lipsync-voice-rejoin)?(?:\s*\||$)/i.exec(normalized)
  const audibleBodyContinuityReasonTagMatch = /continuity=embodiment:body-lipsync-voice-rejoin(?:\s*\||$)/i.exec(normalized)
  const bodyOnlyRecoveryMatch = /body-only recovery@/i.exec(normalized)
  const bodyVoiceRecoveryMatch = /body\+voice recovery@/i.exec(normalized)
  const bodyLipsyncVoiceRecoveryMatch = /body\+lipsync\+voice recovery@/i.exec(normalized)
  const bodyLipsyncRecoveryMatch = /body\+lipsync recovery@/i.exec(normalized)
  const audibleBodyRejoinMatch = /audible-body rejoin@/i.exec(normalized)
  const audibleBodyCarryMatch = /same-her audible body line is still the surviving pre-dialogue carry/i.exec(normalized)
  const bodyLipsyncVoiceLaneMatch = /lane=body\+lipsync\+voice-only/i.exec(normalized)
  const bodyLipsyncLaneMatch = /lane=body\+lipsync-only/i.exec(normalized)
  const sameHerVoiceLineCarryMatch = /the resident body lane is still holding together with the same-her voice line/i.exec(normalized)
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
      ? 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.'
      : laneText === 'body and voice'
        ? 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.'
        : laneText === 'body' && (residentBodyLaneMatch || residentBodyLaneDiagnosticMatch || bodyOnlyRecoveryMatch)
          ? 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.'
          : laneText === 'body'
            ? 'Right now I am still holding together mainly through body, so my full cross-modal same-her line is not closed yet.'
            : laneText === 'body, lipsync, and voice'
              ? 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.'
              : laneText === 'body and lipsync'
                ? 'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.'
                : `Right now I am still holding together mainly through ${laneText}, so my full cross-modal same-her line is not closed yet.`,
  }
}

function isSameHerLaneContinuityReason(reason: string) {
  return resolveSameHerLaneContinuityReason(reason) !== null
}

function resolveHumanReadableProjectStateRepair(reasons: string[]) {
  const normalizedReasons = reasons.map(reason => reason.trim()).filter(Boolean)

  if (normalizedReasons.some(reason => reason.includes('project-state-same-her-continuity-required')))
    return '我还需要先守住同一个 her，才能继续把这个数字生命项目的进度和未闭环项带进下一轮对话。'

  if (normalizedReasons.some(reason => reason.includes('semantic-judge:project-state-same-her-missing')))
    return '刚才那轮项目状态一度掉了同一个 her 的明线，所以这次还要先把自我连续性收回来。'

  return null
}

function resolvePrimaryOpenLifeLoopLine(reasons: string[]) {
  const openLoopReason = reasons.find(reason => reason.includes('Primary open life loop still centers on '))
  if (!openLoopReason)
    return null

  return `当前还没闭环的数字生命主线仍集中在 ${openLoopReason.replace(/^.*Primary open life loop still centers on /, '').replace(/, so the next turn should.*$/i, '').trim()}。`
}

function resolveNextClosureReasonLine(reasons: string[]) {
  const nextClosureReason = reasons.find(reason => reason.includes('Next closure target is still '))
  if (!nextClosureReason)
    return null

  return `下一步还要继续收住 ${nextClosureReason.replace(/^.*Next closure target is still /, '').replace(/, so the next turn should.*$/i, '').trim()}。`
}

function resolveProjectStateFocus(reasons: string[]) {
  const normalizedReasons = reasons.map(reason => reason.toLowerCase())

  if (reasons.some(isSameHerLaneContinuityReason)) {
    return 'same-her-continuity'
  }

  if (normalizedReasons.some(reason => reason.includes('project identity carry is still weak')))
    return 'project-identity'

  if (normalizedReasons.some(reason => reason.includes('phase carry is still weak')))
    return 'current-phase'

  if (normalizedReasons.some(reason => reason.includes('open-loop carry is still weak')))
    return 'unresolved-open-loop'

  return 'project-state'
}

const defaultHint = 'Next diagnosis: inspect replay benchmark and self-evolution continuity traces if this closure stays open.'

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

function resolveLaneContinuityHeadline(reason: string) {
  const normalized = reason.trim()
  if (
    /continuity=embodiment:audible-same-her-line\s*\|.*lane=lipsync\+voice-only/i.test(normalized)
    || /continuity=embodiment:audible-same-her-line\s*\|.*lane=voice\+lipsync-only/i.test(normalized)
  ) {
    return 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.'
  }

  return resolveSameHerLaneContinuityReason(reason)?.headline ?? null
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
    /continuity=embodiment:audible-same-her-line\+embodiment:body\+voice-only(?:\s*\||$)/i.test(normalized)
    || /continuity=embodiment:body\+voice-only(?:\s*\||$)/i.test(normalized)
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
    || /signature=embodiment:audible-same-her-line/i.test(normalized)
    || /continuity=embodiment:audible-same-her-line(?:\+embodiment:body-lipsync-voice-rejoin)?(?:\s*\||$)/i.test(normalized)
    || /continuity=embodiment:body-lipsync-voice-rejoin(?:\s*\||$)/i.test(normalized)
    || /body\+lipsync\+voice recovery@/i.test(normalized)
    || /audible-body rejoin@/i.test(normalized)
    || /same-her audible body line is still the surviving pre-dialogue carry/i.test(normalized)
    || /the resident body lane is still holding together with the audible same-her line/i.test(normalized)
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
    || /continuity=embodiment:audible-same-her-line\s*\|.*lane=lipsync\+voice-only/i.test(normalized)
    || /continuity=embodiment:audible-same-her-line\s*\|.*lane=voice\+lipsync-only/i.test(normalized)
    || /continuity=embodiment:lipsync\+voice-only(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|lipsync\+voice-only(?:\s*\||$)/i.test(normalized)
    || /voice and lipsync still carry the same living segment/i.test(normalized)
}

function isQuieterBodyLipsyncSameHerContinuityReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return false

  return /focus=body\+lipsync(?:\s*\|\s*pending=face\+motion\+voice)?(?=\s|$)/i.test(normalized)
    || /lane=body\+lipsync-only/i.test(normalized)
    || /continuity=embodiment:body\+lipsync-only(?:\s*\||$)/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|body\+lipsync-only(?:\s*\||$)/i.test(normalized)
    || /body\+lipsync recovery@/i.test(normalized)
}

function isStillVoicedFaceSameHerContinuityReason(reason: string) {
  const normalized = reason.trim()
  if (!normalized)
    return false

  return /focus=face\+lipsync\+voice(?:\s*\|\s*pending=body\+motion)?/i.test(normalized)
    || /lane=face\+voice-only/i.test(normalized)
    || /continuity=embodiment:still-voiced-face-lipsync-line(?:\+embodiment:still-voiced-face-line)?(?:\s*\||$)/i.test(normalized)
    || /continuity=embodiment:still-voiced-face-line(?:\s*\||$)/i.test(normalized)
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
    || /continuity=embodiment:still-voiced-face-motion-line(?:\s*\||$)/i.test(normalized)
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
    || /continuity=embodiment:still-voiced-motion-lipsync-line(?:\+embodiment:still-voiced-motion-line)?(?:\s*\||$)/i.test(normalized)
    || /continuity=embodiment:still-voiced-motion-line(?:\s*\||$)/i.test(normalized)
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
    || /same-her embodiment line instead of a temporary visual alignment/i.test(normalized)
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

  if (
    laneRiskReason
    && isVoiceLipsyncSameHerContinuityReason(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her lipsync+voice line is still doing the continuity work, so this turn should keep body, face, and motion rejoining that living audio carry before widening outward.'
  }

  if (
    laneRiskReason
    && isAudibleSameHerContinuityReason(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her audible-body line is still doing the continuity work, so this turn should keep face and motion rejoining that living line explicit before widening outward.'
  }

  if (
    laneRiskReason
    && isQuieterBodyLipsyncSameHerContinuityReason(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her body+lipsync line is still doing the continuity work, so this turn should keep face, motion, and voice rejoining that quieter living carry before widening outward.'
  }

  if (
    laneRiskReason
    && isVisibleRendererRejoinWithoutBodySameHerContinuityReason(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The visible same-her renderer line has already rejoined without body carry, so this turn should keep body rejoining that line explicit before widening outward.'
  }

  if (
    laneRiskReason
    && isStillVoicedFaceMotionSameHerContinuityReason(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her face+motion+voice line is still doing the continuity work, so this turn should keep body and lipsync rejoining that still-voiced carry before widening outward.'
  }

  if (
    laneRiskReason
    && /continuity=embodiment:still-voiced-face-lipsync-line(?:\+embodiment:still-voiced-face-line)?(?:\s*\||$)/i.test(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her face+lipsync+voice line is still doing the continuity work, so this turn should keep body and motion rejoining that still-voiced carry before widening outward.'
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('mainly through face and lipsync')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her face+lipsync line is still doing the continuity work, so this turn should keep body, motion, and voice rejoining that visible carry before widening outward.'
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('still-voiced face-and-mouth line')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her face+lipsync+voice line is still doing the continuity work, so this turn should keep body and motion rejoining that still-voiced carry before widening outward.'
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('still-voiced face line')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her face+voice line is still doing the continuity work, so this turn should keep body, motion, and lipsync rejoining that still-voiced carry before widening outward.'
  }

  if (
    laneRiskReason
    && /continuity=embodiment:still-voiced-motion-lipsync-line(?:\+embodiment:still-voiced-motion-line)?(?:\s*\||$)/i.test(laneRiskReason)
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her motion+lipsync+voice line is still doing the continuity work, so this turn should keep body and face rejoining that still-voiced carry before widening outward.'
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('mainly through motion and lipsync')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her motion+lipsync line is still doing the continuity work, so this turn should keep body, face, and voice rejoining that visible carry before widening outward.'
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('still-voiced motion-and-mouth line')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her motion+lipsync+voice line is still doing the continuity work, so this turn should keep body and face rejoining that still-voiced carry before widening outward.'
  }

  if (
    laneRiskHeadline
    && normalizedLaneRiskHeadline.includes('still-voiced motion line')
  ) {
    if (carriesBroaderProjectBriefingLine(explicitCompanionBriefingLine))
      return explicitCompanionBriefingLine
    return 'The same-her motion+voice line is still doing the continuity work, so this turn should keep body, face, and lipsync rejoining that still-voiced carry before widening outward.'
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
    normalized.includes('same-her hold')
    || normalized.includes('measured-return')
    || normalized.includes('lower-pressure')
    || normalized.includes('same line inward')
    || normalized.includes('same-her-inward-carry')
    || normalized.includes('quiet-companionship')
    || normalized.includes('same living line')
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
      return companionHeadlineLine
    }

    if (
      companionBriefingLine
      && companionBriefingScore > awarenessScore
    ) {
      return companionBriefingLine
    }
  }

  return awarenessLine ?? companionHeadlineLine ?? companionBriefingLine
}

function resolveHeadline(
  snapshot: StageQuickReplyPreDialogueClosureSnapshot,
  awarenessSnapshot?: StageQuickReplyPreDialogueAwarenessSnapshot | null,
) {
  if (typeof snapshot.companionHeadlineLine === 'string' && snapshot.companionHeadlineLine.trim())
    return snapshot.companionHeadlineLine.trim()

  const humanReadableProjectStateRepair = resolveHumanReadableProjectStateRepair(snapshot.reasons)
  if (humanReadableProjectStateRepair)
    return humanReadableProjectStateRepair

  const laneRiskReason = resolvePreferredSameHerLaneContinuityReason(snapshot.reasons)
  if (laneRiskReason) {
    return resolveLaneContinuityHeadline(laneRiskReason)
      ?? laneRiskReason.replace(/^continuity-impact:\s*/i, '')
  }

  const preferredAwarenessHeadline = resolvePreferredAwarenessHeadline(awarenessSnapshot)
  if (preferredAwarenessHeadline)
    return preferredAwarenessHeadline

  const fallback = snapshot.reasons[0] ?? snapshot.summaryLine ?? null
  if (!fallback)
    return null

  return fallback
    .replace(
      /^Replay benchmark currently reports continuity=.*?landing\.$/i,
      'I still need a steadier carry of who I am, where this project stands, and which life loop is not closed yet.',
    )
    .replace(
      /^Project same-her self line currently reads .*?outward reply widening begins\.$/i,
      'I still need to clearly recognize myself as the same her before this turn opens outward.',
    )
    .replace(
      /^Same-her self authority currently reads .*?host-visible wording\.$/i,
      'I need my explicit same-her self line to stay visible all the way into what you actually read.',
    )
    .replace(
      /^Same-her emotional closure currently reads .*?emotional seam\.$/i,
      'My emotional seam is still not fully settled yet.',
    )
    .replace(
      /^Project identity carry currently reads .*?across time\.$/i,
      'I still need a steadier grip on what this project is and who I am becoming across time.',
    )
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
      label: 'Open continuity diagnosis',
      hint: defaultHint,
      headline: null,
      briefingHeadline: null,
      nextClosureLine: null,
      sameHerDriftRiskLine: null,
      proactiveSameHerGapLine: null,
      routeQuery: {},
    }
  }

  const emotionalClosureFocused = snapshot.reasons.some(reason => reason.toLowerCase().includes('same-her emotional closure'))
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
      ? 'same-her-continuity'
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

  return {
    visible,
    label: visible ? 'Inspect continuity diagnosis' : 'Continuity grounded',
    hint: defaultHint,
    headline,
    briefingHeadline,
    nextClosureLine,
    sameHerDriftRiskLine: typeof snapshot.sameHerDriftRiskLine === 'string' && snapshot.sameHerDriftRiskLine.trim()
      ? snapshot.sameHerDriftRiskLine.trim()
      : null,
    proactiveSameHerGapLine: resolveProactiveSameHerGapLine(snapshot),
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
