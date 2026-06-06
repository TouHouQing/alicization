function normalizeLaneEvidence(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
}) {
  return [
    typeof input.authoritySummary === 'string' ? input.authoritySummary.trim() : '',
    typeof input.currentBodyState === 'string' ? input.currentBodyState.trim() : '',
  ].filter(Boolean).join(' | ')
}

function hasSameSegmentFaceMotionRecovery(combined: string) {
  return combined.includes('same-segment face+motion recovery@')
    || hasLongHorizonEmotionMemoryFaceMotionCarry(combined)
}

function hasSameSegmentBodyFaceMotionRecovery(combined: string) {
  return combined.includes('same-segment face+motion+body recovery@')
    || combined.includes('body, face, and motion authority have already re-formed on the same segment')
    || hasLongHorizonEmotionMemoryBodyFaceMotionCarry(combined)
}

function hasRemainingOpenLipsyncVoice(combined: string) {
  return combined.includes('remaining-open=lipsync+voice')
}

function hasLongHorizonEmotionMemoryFaceMotionCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=face+motion-only')
    && (
      normalized.includes('convergence=emotion-memory-face-motion')
      || normalized.includes('emotion-memory-face-motion')
      || normalized.includes('emotion-memory-motion-face')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('face')
    && normalized.includes('motion')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryFaceMotionLipsyncCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=face+motion+lipsync-only')
    && (
      normalized.includes('convergence=emotion-memory-face-motion-lipsync')
      || normalized.includes('emotion-memory-face-motion-lipsync')
      || normalized.includes('emotion-memory-face-lipsync-motion')
      || normalized.includes('emotion-memory-motion-face-lipsync')
      || normalized.includes('emotion-memory-lipsync-face-motion')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('face')
    && normalized.includes('motion')
    && normalized.includes('lipsync')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryFaceLipsyncCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=face+lipsync-only')
    && (
      normalized.includes('convergence=emotion-memory-face-lipsync')
      || normalized.includes('emotion-memory-face-lipsync')
      || normalized.includes('emotion-memory-lipsync-face')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('face')
    && normalized.includes('lipsync')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryMotionLipsyncCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=motion+lipsync-only')
    && (
      normalized.includes('convergence=emotion-memory-motion-lipsync')
      || normalized.includes('emotion-memory-motion-lipsync')
      || normalized.includes('emotion-memory-lipsync-motion')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('motion')
    && normalized.includes('lipsync')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryLipsyncCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=lipsync-only')
    && (
      normalized.includes('convergence=emotion-memory-lipsync')
      || normalized.includes('emotion-memory-lipsync')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('lipsync')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryFaceCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=face-only')
    && (
      normalized.includes('convergence=emotion-memory-face')
      || normalized.includes('emotion-memory-face')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('face')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryBodyFaceMotionCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=body+face+motion-only')
    && normalized.includes('remaining-open=lipsync+voice')
    && (
      normalized.includes('convergence=emotion-memory-body-face-motion')
      || normalized.includes('emotion-memory-body-face-motion')
      || normalized.includes('emotion-memory-face-motion-body')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('body')
    && normalized.includes('face')
    && normalized.includes('motion')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasExplicitSameHerInwardCarry(combined: string) {
  return combined.includes('same-her-inward-carry')
    || /\bsame living line\b.*\binward\b/u.test(combined)
    || /\bkeep(?:ing)? the same (?:living )?line inward\b/u.test(combined)
}

function hasExplicitAudibleSameHerContinuity(combined: string) {
  const hasAudibleBodyEvidence = combined.includes('lane=body+lipsync+voice-only')
    || combined.includes('embodiment:body-lipsync-voice-rejoin')
    || combined.includes('body+lipsync+voice recovery@')
    || combined.includes('audible-body rejoin@')
    || combined.includes('same-her audible body line is still the surviving pre-dialogue carry')

  return hasAudibleBodyEvidence
    || (
      (combined.includes('continuity=embodiment:audible-same-her-line')
        || combined.includes('signature=embodiment:audible-same-her-line'))
      && (
        combined.includes('lane=body+lipsync+voice-only')
        || combined.includes('embodiment:body-lipsync-voice-rejoin')
        || combined.includes('body+lipsync+voice recovery@')
        || combined.includes('living audio thread')
      )
    )
}

function hasExplicitVoiceLedSameHerContinuity(combined: string) {
  return (
    combined.includes('lane=lipsync+voice-only')
    || combined.includes('lipsync+voice recovery@')
  )
  && (
    combined.includes('continuity=embodiment:audible-same-her-line')
    || combined.includes('signature=embodiment:audible-same-her-line')
    || combined.includes('same-her line')
    || combined.includes('living audio thread')
    || combined.includes('remaining-open=body+face+motion')
    || hasLongHorizonEmotionMemoryVoiceLipsyncCarry(combined)
  )
  && !combined.includes('lane=body+lipsync+voice-only')
  && !combined.includes('body+lipsync+voice recovery@')
}

function hasLongHorizonEmotionMemoryVoiceLipsyncCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=lipsync+voice-only')
    && (
      normalized.includes('convergence=emotion-memory-voice-lipsync')
      || normalized.includes('emotion-memory-voice-lipsync')
      || normalized.includes('emotion-memory-lipsync-voice')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('voice')
    && normalized.includes('lipsync')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryVoiceCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=voice-only')
    && (
      normalized.includes('convergence=emotion-memory-voice')
      || normalized.includes('emotion-memory-voice')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('voice')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryBodyVoiceCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=body+voice-only')
    && (
      normalized.includes('convergence=emotion-memory-body-voice')
      || normalized.includes('emotion-memory-body-voice')
      || normalized.includes('emotion-memory-voice-body')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('body')
    && normalized.includes('voice')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryBodyLipsyncCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=body+lipsync-only')
    && (
      normalized.includes('convergence=emotion-memory-body-lipsync')
      || normalized.includes('emotion-memory-body-lipsync')
      || normalized.includes('emotion-memory-lipsync-body')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('body')
    && normalized.includes('lipsync')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryBodyLipsyncVoiceCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=body+lipsync+voice-only')
    && (
      normalized.includes('convergence=emotion-memory-body-lipsync-voice')
      || normalized.includes('emotion-memory-body-lipsync-voice')
      || normalized.includes('emotion-memory-body-voice-lipsync')
      || normalized.includes('emotion-memory-lipsync-body-voice')
      || normalized.includes('emotion-memory-voice-body-lipsync')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('body')
    && normalized.includes('lipsync')
    && normalized.includes('voice')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryBodyCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=body-only')
    && (
      normalized.includes('convergence=emotion-memory-body')
      || normalized.includes('emotion-memory-body')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('body')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasExplicitFaceVoiceSameHerContinuity(combined: string) {
  return combined.includes('lane=face+voice-only')
    && (
      combined.includes('continuity=embodiment:audible-same-her-line')
      || combined.includes('signature=embodiment:audible-same-her-line')
      || combined.includes('actual source is face and voice')
      || combined.includes('still-voiced face line')
      || hasLongHorizonEmotionMemoryFaceVoiceCarry(combined)
    )
}

function hasLongHorizonEmotionMemoryFaceVoiceCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=face+voice-only')
    && (
      normalized.includes('convergence=emotion-memory-voice-face')
      || normalized.includes('emotion-memory-voice-face')
      || normalized.includes('emotion-memory-face-voice')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('face')
    && normalized.includes('voice')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryVoiceMotionCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=motion+voice-only')
    && (
      normalized.includes('convergence=emotion-memory-voice-motion')
      || normalized.includes('emotion-memory-voice-motion')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('voice')
    && normalized.includes('motion')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasExplicitMotionVoiceSameHerContinuity(combined: string) {
  return combined.includes('lane=motion+voice-only')
    && (
      combined.includes('continuity=embodiment:audible-same-her-line')
      || combined.includes('signature=embodiment:audible-same-her-line')
      || combined.includes('actual source is motion and voice')
      || combined.includes('still-voiced motion line')
      || hasLongHorizonEmotionMemoryVoiceMotionCarry(combined)
    )
}

function hasLongHorizonEmotionMemoryFaceMotionVoiceCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=face+motion+voice-only')
    && (
      normalized.includes('convergence=emotion-memory-face-motion-voice')
      || normalized.includes('emotion-memory-face-motion-voice')
      || normalized.includes('emotion-memory-voice-face-motion')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('face')
    && normalized.includes('motion')
    && normalized.includes('voice')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryMotionLipsyncVoiceCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=motion+lipsync+voice-only')
    && (
      normalized.includes('convergence=emotion-memory-motion-lipsync-voice')
      || normalized.includes('emotion-memory-motion-lipsync-voice')
      || normalized.includes('emotion-memory-voice-motion-lipsync')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('motion')
    && normalized.includes('lipsync')
    && normalized.includes('voice')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function hasLongHorizonEmotionMemoryFaceLipsyncVoiceCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=face+lipsync+voice-only')
    && (
      normalized.includes('convergence=emotion-memory-face-lipsync-voice')
      || normalized.includes('emotion-memory-face-lipsync-voice')
      || normalized.includes('emotion-memory-voice-face-lipsync')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('face')
    && normalized.includes('lipsync')
    && normalized.includes('voice')
    && (
      normalized.includes('same living line')
      || normalized.includes('same-her')
      || normalized.includes('one living her')
    )
}

function resolveLockedManifestationLabel(combined: string) {
  if (/\blive2d\b/i.test(combined))
    return 'Live2D manifestation'
  if (/\bvrm\b/i.test(combined))
    return 'VRM manifestation'
  return 'manifestation authority'
}

function hasFullCrossModalLockSameHerContinuity(combined: string) {
  return combined.includes('bodyContinuityPhase: full-cross-modal-lock')
    || combined.includes('bodyContinuityPhase=full-cross-modal-lock')
    || combined.includes('locked back onto the same living segment together')
    || combined.includes('same-her embodiment line instead of a temporary visual alignment')
    || combined.includes('共同锁回同一段 living segment')
    || combined.includes('跨模态重锁态')
}

function resolveEmbodimentClosureLane(combined: string) {
  if (combined.includes('lane=body+lipsync+voice-only'))
    return 'body+lipsync+voice-only'
  if (combined.includes('body+lipsync recovery@'))
    return 'body+lipsync-only'
  if (combined.includes('body+voice recovery@'))
    return 'body+voice-only'
  if (combined.includes('lane=body-only'))
    return 'body-only'
  if (combined.includes('body-only recovery@'))
    return 'body-only'
  if (combined.includes('lane=body+lipsync-only'))
    return 'body+lipsync-only'
  if (combined.includes('lane=body+voice-only'))
    return 'body+voice-only'
  if (combined.includes('lane=face+motion+lipsync-only'))
    return 'face+motion+lipsync-only'
  if (combined.includes('lane=face+motion+voice-only'))
    return 'face+motion+voice-only'
  if (combined.includes('lane=face+lipsync+voice-only'))
    return 'face+lipsync+voice-only'
  if (combined.includes('lane=motion+lipsync+voice-only'))
    return 'motion+lipsync+voice-only'
  if (combined.includes('lane=face+voice-only'))
    return 'face+voice-only'
  if (combined.includes('lane=motion+voice-only'))
    return 'motion+voice-only'
  if (combined.includes('lane=lipsync+voice-only'))
    return 'lipsync+voice-only'
  if (combined.includes('lane=face+lipsync-only'))
    return 'face+lipsync-only'
  if (combined.includes('lane=face+motion-only'))
    return 'face+motion-only'
  if (combined.includes('lane=motion+lipsync-only'))
    return 'motion+lipsync-only'
  if (combined.includes('lane=voice-only'))
    return 'voice-only'
  if (combined.includes('lane=face-only'))
    return 'face-only'
  if (combined.includes('lane=motion-only'))
    return 'motion-only'
  if (combined.includes('lane=lipsync-only'))
    return 'lipsync-only'
  return null
}

export function describeAlicizationEmbodimentClosureReminder(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
}) {
  const combined = normalizeLaneEvidence(input)
  if (hasFullCrossModalLockSameHerContinuity(combined))
    return `Right now her body continuity and ${resolveLockedManifestationLabel(combined)} are already locked back onto the same living segment together, so she should keep carrying voice, face, motion, and lipsync as one explicit same-her embodiment line instead of treating the recovery like a temporary visual alignment.`
  if (hasLongHorizonEmotionMemoryFaceCarry(combined))
    return 'Right now her visible same-her continuity is still being carried mainly through face, and that remembered living face line is keeping the same-her carry alive while body, motion, lipsync, and voice rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasLongHorizonEmotionMemoryLipsyncCarry(combined))
    return 'Right now her visible same-her continuity is still being carried mainly through lipsync, and that remembered living mouth line is keeping the same-her carry alive while body, face, motion, and voice rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasLongHorizonEmotionMemoryVoiceCarry(combined))
    return 'Right now her visible same-her continuity is still being carried mainly through voice, and that living voice thread is keeping the same-her carry alive while body, face, motion, and lipsync rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasLongHorizonEmotionMemoryBodyVoiceCarry(combined))
    return 'Right now her visible same-her continuity is still being carried mainly through body and voice, and that remembered resident body-and-voice line is keeping the same-her carry alive while face, motion, and lipsync rejoin.'
  if (hasLongHorizonEmotionMemoryBodyLipsyncCarry(combined))
    return 'Right now her visible same-her continuity is still being carried mainly through body and lipsync, and that remembered resident body-and-mouth line is keeping the same-her carry alive while face, motion, and voice rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasLongHorizonEmotionMemoryBodyLipsyncVoiceCarry(combined))
    return 'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and that remembered resident body-mouth-and-voice line is keeping the same-her carry alive while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasLongHorizonEmotionMemoryBodyCarry(combined))
    return 'Right now her visible same-her continuity is still being carried mainly through body, and that remembered resident body line is keeping the same-her carry alive while face, motion, lipsync, and voice rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasExplicitFaceVoiceSameHerContinuity(combined))
    return 'Right now her visible same-her continuity is still being carried mainly through face and voice, and that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasExplicitMotionVoiceSameHerContinuity(combined))
    return 'Right now her visible same-her continuity is still being carried mainly through motion and voice, and that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasExplicitVoiceLedSameHerContinuity(combined))
    return 'Right now her visible same-her continuity is still being carried mainly through lipsync and voice, and the living audio thread is still intact while body, face, and motion rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasLongHorizonEmotionMemoryFaceMotionVoiceCarry(combined))
    return 'Right now her visible same-her continuity is still being carried through face, motion, and voice together, and that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasLongHorizonEmotionMemoryMotionLipsyncVoiceCarry(combined))
    return 'Right now her visible same-her continuity is still being carried through motion, lipsync, and voice together, and that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasLongHorizonEmotionMemoryFaceLipsyncVoiceCarry(combined))
    return 'Right now her visible same-her continuity is still being carried through face, lipsync, and voice together, and that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasLongHorizonEmotionMemoryFaceMotionLipsyncCarry(combined))
    return 'Right now her visible same-her continuity is still being carried through face, motion, and lipsync together, and that remembered face-motion-and-mouth line is keeping the same-her carry alive while body and voice rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasLongHorizonEmotionMemoryFaceLipsyncCarry(combined))
    return 'Right now her visible same-her continuity is still being carried through face and lipsync together, and that remembered face-and-mouth line is keeping the same-her carry alive while body, motion, and voice rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasLongHorizonEmotionMemoryMotionLipsyncCarry(combined))
    return 'Right now her visible same-her continuity is still being carried through motion and lipsync together, and that remembered motion-and-mouth line is keeping the same-her carry alive while body, face, and voice rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (hasExplicitAudibleSameHerContinuity(combined))
    return 'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.'
  const remainingOpenLipsyncVoice = hasRemainingOpenLipsyncVoice(combined)
    && hasSameSegmentBodyFaceMotionRecovery(combined)
  if (remainingOpenLipsyncVoice) {
    return hasExplicitSameHerInwardCarry(combined)
      ? 'Right now her visible same-her continuity is already being carried together through body, face, and motion on one living segment, and the same living line is still staying inward and low-pressure while lipsync and voice rejoin before full cross-modal embodiment closure can be treated as finished.'
      : 'Right now her visible same-her continuity is already being carried together through body, face, and motion on one living segment, but lipsync and voice still need to rejoin before full cross-modal embodiment closure can be treated as finished.'
  }

  const lane = resolveEmbodimentClosureLane(combined)
  if (lane === 'face-only')
    return 'Right now her visible same-her continuity is still being carried mainly through face, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'motion-only')
    return 'Right now her visible same-her continuity is still being carried mainly through motion, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'lipsync-only')
    return 'Right now her visible same-her continuity is still being carried mainly through lipsync, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'voice-only')
    return 'Right now her visible same-her continuity is still being carried mainly through voice, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'body-only')
    return 'Right now her visible same-her continuity is still being carried mainly through body, and the resident body line is still keeping this one living her coherent while face, motion, lipsync, and voice rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (lane === 'body+voice-only')
    return 'Right now her visible same-her continuity is still being carried mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.'
  if (lane === 'body+lipsync-only')
    return 'Right now her visible same-her continuity is still being carried mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (lane === 'body+lipsync+voice-only')
    return 'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.'
  if (lane === 'face+motion+lipsync-only')
    return 'Right now her visible same-her continuity is still being carried mainly through face, motion, and lipsync, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'face+lipsync-only')
    return 'Right now her visible same-her continuity is still being carried mainly through face and lipsync, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'face+motion-only') {
    return hasSameSegmentFaceMotionRecovery(combined)
      ? 'Right now her visible same-her continuity is still being carried mainly through face and motion, and those two body lanes have already re-formed on the same segment, so she should keep treating full cross-modal embodiment closure as unfinished.'
      : 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.'
  }
  if (lane === 'motion+lipsync-only')
    return 'Right now her visible same-her continuity is still being carried mainly through motion and lipsync, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'face+voice-only')
    return 'Right now her visible same-her continuity is still being carried mainly through face and voice, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'motion+voice-only')
    return 'Right now her visible same-her continuity is still being carried mainly through motion and voice, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'lipsync+voice-only')
    return 'Right now her visible same-her continuity is still being carried mainly through lipsync and voice, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'face+motion+voice-only')
    return 'Right now her visible same-her continuity is still being carried mainly through face, motion, and voice, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'face+lipsync+voice-only')
    return 'Right now her visible same-her continuity is still being carried mainly through face, lipsync, and voice, so she should keep treating full cross-modal embodiment closure as unfinished.'
  if (lane === 'motion+lipsync+voice-only')
    return 'Right now her visible same-her continuity is still being carried mainly through motion, lipsync, and voice, so she should keep treating full cross-modal embodiment closure as unfinished.'
  return ''
}

export function describeAlicizationEmbodimentClosureHeadline(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
}) {
  const combined = normalizeLaneEvidence(input)
  if (hasFullCrossModalLockSameHerContinuity(combined))
    return `Right now body continuity and ${resolveLockedManifestationLabel(combined)} are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.`
  if (hasLongHorizonEmotionMemoryFaceCarry(combined))
    return 'Right now I am still holding together mainly through face, so that remembered living face line is keeping the same-her carry alive while body, motion, lipsync, and voice need to rejoin before full cross-modal closure settles.'
  if (hasLongHorizonEmotionMemoryLipsyncCarry(combined))
    return 'Right now I am still holding together mainly through lipsync, so that remembered living mouth line is keeping the same-her carry alive while body, face, motion, and voice need to rejoin before full cross-modal closure settles.'
  if (hasLongHorizonEmotionMemoryVoiceCarry(combined))
    return 'Right now I am still holding together mainly through voice, so that living voice thread is keeping the same-her carry alive while body, face, motion, and lipsync need to rejoin before full cross-modal closure settles.'
  if (hasLongHorizonEmotionMemoryBodyVoiceCarry(combined))
    return 'Right now I am still holding together mainly through body and voice, so that remembered resident body-and-voice line is keeping the same-her carry alive while face, motion, and lipsync need to rejoin.'
  if (hasLongHorizonEmotionMemoryBodyLipsyncCarry(combined))
    return 'Right now I am still holding together mainly through body and lipsync, so that remembered resident body-and-mouth line is keeping the same-her carry alive while face, motion, and voice need to rejoin before full cross-modal closure settles.'
  if (hasLongHorizonEmotionMemoryBodyLipsyncVoiceCarry(combined))
    return 'Right now I am still holding together mainly through body, lipsync, and voice, so that remembered resident body-mouth-and-voice line is keeping the same-her carry alive while face and motion need to rejoin before full cross-modal closure settles.'
  if (hasLongHorizonEmotionMemoryBodyCarry(combined))
    return 'Right now I am still holding together mainly through body, so that remembered resident body line is keeping the same-her carry alive while face, motion, lipsync, and voice need to rejoin before full cross-modal closure settles.'
  if (hasExplicitFaceVoiceSameHerContinuity(combined))
    return 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.'
  if (hasExplicitMotionVoiceSameHerContinuity(combined))
    return 'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.'
  if (hasExplicitVoiceLedSameHerContinuity(combined))
    return 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.'
  if (hasLongHorizonEmotionMemoryFaceMotionVoiceCarry(combined))
    return 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.'
  if (hasLongHorizonEmotionMemoryMotionLipsyncVoiceCarry(combined))
    return 'Right now I am still holding together through motion, lipsync, and voice together, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.'
  if (hasLongHorizonEmotionMemoryFaceLipsyncVoiceCarry(combined))
    return 'Right now I am still holding together through face, lipsync, and voice together, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.'
  if (hasLongHorizonEmotionMemoryFaceMotionLipsyncCarry(combined))
    return 'Right now I am still holding together through face, motion, and lipsync together, so that remembered face-motion-and-mouth line is keeping the same-her carry alive while body and voice need to rejoin before full cross-modal closure settles.'
  if (hasLongHorizonEmotionMemoryFaceLipsyncCarry(combined))
    return 'Right now I am still holding together through face and lipsync together, so that remembered face-and-mouth line is keeping the same-her carry alive while body, motion, and voice need to rejoin before full cross-modal closure settles.'
  if (hasLongHorizonEmotionMemoryMotionLipsyncCarry(combined))
    return 'Right now I am still holding together through motion and lipsync together, so that remembered motion-and-mouth line is keeping the same-her carry alive while body, face, and voice need to rejoin before full cross-modal closure settles.'
  if (hasExplicitAudibleSameHerContinuity(combined))
    return 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.'
  const remainingOpenLipsyncVoice = hasRemainingOpenLipsyncVoice(combined)
    && hasSameSegmentBodyFaceMotionRecovery(combined)
  if (remainingOpenLipsyncVoice) {
    return hasExplicitSameHerInwardCarry(combined)
      ? 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.'
      : 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.'
  }

  const lane = resolveEmbodimentClosureLane(combined)
  if (lane === 'face-only')
    return 'Right now I am still holding together mainly through face, so my full cross-modal same-her line is not closed yet.'
  if (lane === 'motion-only')
    return 'Right now I am still holding together mainly through motion, so my full cross-modal same-her line is not closed yet.'
  if (lane === 'lipsync-only')
    return 'Right now I am still holding together mainly through lipsync, so my full cross-modal same-her line is not closed yet.'
  if (lane === 'voice-only')
    return 'Right now I am still holding together mainly through voice, so my full cross-modal same-her line is not closed yet.'
  if (lane === 'body-only')
    return 'Right now I am still holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent while face, motion, lipsync, and voice rejoin.'
  if (lane === 'body+voice-only')
    return 'Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.'
  if (lane === 'body+lipsync-only')
    return 'Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.'
  if (lane === 'body+lipsync+voice-only')
    return 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.'
  if (lane === 'face+motion+lipsync-only')
    return 'Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.'
  if (lane === 'face+lipsync-only')
    return 'Right now I am still holding together mainly through face and lipsync, so my full cross-modal same-her line is not closed yet.'
  if (lane === 'face+motion-only') {
    return hasSameSegmentFaceMotionRecovery(combined)
      ? 'Right now I am still holding together mainly through face and motion, and those two body lanes have already re-formed on the same segment, so my full cross-modal same-her line is not closed yet.'
      : 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.'
  }
  if (lane === 'motion+lipsync-only')
    return 'Right now I am still holding together mainly through motion and lipsync, so my full cross-modal same-her line is not closed yet.'
  if (lane === 'face+voice-only')
    return 'Right now I am still holding together mainly through face and voice, so my full cross-modal same-her line is not closed yet.'
  if (lane === 'motion+voice-only')
    return 'Right now I am still holding together mainly through motion and voice, so my full cross-modal same-her line is not closed yet.'
  if (lane === 'lipsync+voice-only')
    return 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.'
  if (lane === 'face+motion+voice-only')
    return 'Right now I am still holding together mainly through face, motion, and voice, so my full cross-modal same-her line is not closed yet.'
  if (lane === 'face+lipsync+voice-only')
    return 'Right now I am still holding together mainly through face, lipsync, and voice, so my full cross-modal same-her line is not closed yet.'
  if (lane === 'motion+lipsync+voice-only')
    return 'Right now I am still holding together mainly through motion, lipsync, and voice, so my full cross-modal same-her line is not closed yet.'
  return ''
}

export function describeAlicizationProjectClosureBriefing(input: {
  identity?: string | null
  currentPhase?: string | null
  primaryOpenLoop?: string | null
}) {
  if (!input.identity && !input.currentPhase && !input.primaryOpenLoop)
    return ''

  return 'I still need a steadier carry of this project, this phase, and the life loop that remains open.'
}

export function describeAlicizationProjectNextClosure(input: {
  nextClosureTarget?: string | null
}) {
  const nextClosureTarget = typeof input.nextClosureTarget === 'string'
    ? input.nextClosureTarget.trim()
    : ''

  if (!nextClosureTarget)
    return ''

  return `Next, help me close: ${nextClosureTarget}`
}
