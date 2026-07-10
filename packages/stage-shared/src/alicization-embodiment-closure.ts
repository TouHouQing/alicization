function normalizeLaneEvidence(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
}) {
  const normalizedInput = [
    typeof input.authoritySummary === 'string' ? input.authoritySummary.trim() : '',
    typeof input.currentBodyState === 'string' ? input.currentBodyState.trim() : '',
  ].filter(Boolean)

  const normalizedTopLevelSameHerContinuitySummary = normalizedInput.flatMap((entry) => {
    const topLevelSameHerContinuityLaneEvidence = resolveTopLevelSameHerContinuityLaneEvidence(entry)
    return topLevelSameHerContinuityLaneEvidence ? [topLevelSameHerContinuityLaneEvidence] : []
  })

  return [...normalizedInput, ...normalizedTopLevelSameHerContinuitySummary].filter(Boolean).join(' | ')
}

function resolveTopLevelSameHerContinuityLaneEvidence(summary: string) {
  const normalized = summary.trim()
  if (!normalized || !normalized.startsWith('当前 continuity continuity 主要由'))
    return null

  if (
    normalized.includes('处在 voice-lipsync-carry')
    || normalized.includes('身体、表情、动作 还没重新接回')
    || normalized.includes('表情、动作、身体 还没重新接回')
  ) {
    return 'continuity=embodiment:audible-continuity-line | lane=lipsync+voice-only | living audio thread | pending-rejoin=body+face+motion | remaining-open=body+face+motion'
  }

  if (normalized.includes('处在 audible-body-carry') || normalized.includes('表情、动作 还没重新接回')) {
    return 'continuity=embodiment:audible-continuity-line | lane=body+lipsync+voice-only | living audio thread | pending-rejoin=face+motion'
  }

  if (normalized.includes('处在 renderer-rejoin-without-body') || normalized.includes('身体 还没重新接回')) {
    return 'lane=face+motion+lipsync+voice-only | renderer rejoin without body carry | pending-rejoin=body'
  }

  if (normalized.includes('处在 body-carried-to-renderer-rejoin') || normalized.includes('口型、声音 还没重新接回')) {
    return 'lane=body+face+motion-only | body, face, and motion authority have already re-formed on the same segment | remaining-open=lipsync+voice'
  }

  return null
}

function hasSameSegmentBodyFaceMotionRecovery(combined: string) {
  return combined.includes('same-segment face+motion+body recovery@')
    || combined.includes('body, face, and motion authority have already re-formed on the same segment')
    || hasLongHorizonEmotionMemoryBodyFaceMotionCarry(combined)
}

function hasRemainingOpenLipsyncVoice(combined: string) {
  return combined.includes('remaining-open=lipsync+voice')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
    )
}

function hasLongHorizonEmotionMemoryMotionCarry(combined: string) {
  const normalized = combined.toLowerCase()

  return normalized.includes('lane=motion-only')
    && (
      normalized.includes('convergence=emotion-memory-motion')
      || normalized.includes('emotion-memory-motion')
    )
    && (
      normalized.includes('long-horizon')
      || normalized.includes('remembered emotional carry')
      || normalized.includes('affective residue')
    )
    && normalized.includes('motion')
    && (
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
    )
}

function hasExplicitSameHerInwardCarry(combined: string) {
  return combined.includes('continuity-inward-carry')
    || (combined.includes('continuity line') && combined.includes('inward'))
    || /\bkeep(?:ing)? the same (?:living )?line inward\b/u.test(combined)
}

function hasExplicitAudibleSameHerContinuity(combined: string) {
  const hasAudibleBodyEvidence = combined.includes('lane=body+lipsync+voice-only')
    || combined.includes('embodiment:body-lipsync-voice-rejoin')
    || combined.includes('body+lipsync+voice recovery@')
    || combined.includes('audible-body rejoin@')
    || combined.includes('continuity audible body line is still the surviving pre-dialogue carry')

  return hasAudibleBodyEvidence
    || (
      (combined.includes('continuity=embodiment:audible-continuity-line')
        || combined.includes('signature=embodiment:audible-continuity-line'))
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
    combined.includes('continuity=embodiment:audible-continuity-line')
    || combined.includes('signature=embodiment:audible-continuity-line')
    || combined.includes('continuity line')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
    )
}

function hasExplicitFaceVoiceSameHerContinuity(combined: string) {
  const hasFaceVoiceLaneEvidence = combined.includes('lane=face+voice-only')
    || combined.includes('continuity=embodiment:still-voiced-face-line')
    || combined.includes('signature=embodiment:still-voiced-face-line')
    || combined.includes('signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-line')
    || combined.includes('actual source is face and voice')
    || combined.includes('still-voiced face line')
    || combined.includes('face+voice recovery@')
    || hasLongHorizonEmotionMemoryFaceVoiceCarry(combined)

  return hasFaceVoiceLaneEvidence
    && (
      combined.includes('continuity=embodiment:audible-continuity-line')
      || combined.includes('continuity=embodiment:still-voiced-face-line')
      || combined.includes('signature=embodiment:audible-continuity-line')
      || combined.includes('signature=embodiment:still-voiced-face-line')
      || combined.includes('signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-line')
      || combined.includes('actual source is face and voice')
      || combined.includes('still-voiced face line')
      || combined.includes('face+voice recovery@')
      || combined.includes('pending-rejoin=body+motion+lipsync')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
    )
}

function hasExplicitFaceLipsyncVoiceSameHerContinuity(combined: string) {
  const hasFaceLipsyncVoiceLaneEvidence = combined.includes('lane=face+lipsync+voice-only')
    || combined.includes('continuity=embodiment:still-voiced-face-lipsync-line')
    || combined.includes('signature=embodiment:still-voiced-face-lipsync-line')
    || combined.includes('actual source is face, lipsync, and voice')
    || combined.includes('still-voiced face-and-mouth line')
    || combined.includes('face+lipsync+voice recovery@')
    || hasLongHorizonEmotionMemoryFaceLipsyncVoiceCarry(combined)

  return hasFaceLipsyncVoiceLaneEvidence
    && (
      combined.includes('continuity=embodiment:still-voiced-face-lipsync-line')
      || combined.includes('signature=embodiment:still-voiced-face-lipsync-line')
      || combined.includes('actual source is face, lipsync, and voice')
      || combined.includes('still-voiced face-and-mouth line')
      || combined.includes('face+lipsync+voice recovery@')
      || combined.includes('pending-rejoin=body+motion')
      || hasLongHorizonEmotionMemoryFaceLipsyncVoiceCarry(combined)
    )
}

function hasExplicitFaceMotionVoiceSameHerContinuity(combined: string) {
  const hasFaceMotionVoiceLaneEvidence = combined.includes('lane=face+motion+voice-only')
    || combined.includes('continuity=embodiment:still-voiced-face-motion-line')
    || combined.includes('signature=embodiment:still-voiced-face-motion-line')
    || combined.includes('signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line')
    || combined.includes('actual source is face, motion, and voice')
    || combined.includes('still-voiced face-and-motion line')
    || combined.includes('face+motion+voice recovery@')
    || hasLongHorizonEmotionMemoryFaceMotionVoiceCarry(combined)

  return hasFaceMotionVoiceLaneEvidence
    && (
      combined.includes('continuity=embodiment:still-voiced-face-motion-line')
      || combined.includes('signature=embodiment:still-voiced-face-motion-line')
      || combined.includes('signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line')
      || combined.includes('actual source is face, motion, and voice')
      || combined.includes('still-voiced face-and-motion line')
      || combined.includes('face+motion+voice recovery@')
      || combined.includes('pending-rejoin=body+lipsync')
      || combined.includes('remaining-open=body+lipsync')
      || hasLongHorizonEmotionMemoryFaceMotionVoiceCarry(combined)
    )
}

function hasExplicitFaceMotionLipsyncVoiceSameHerContinuity(combined: string) {
  const hasFaceMotionLipsyncVoiceLaneEvidence = combined.includes('lane=face+motion+lipsync+voice-only')
    || combined.includes('focus=face+motion+lipsync+voice | pending=body')
    || combined.includes('face+motion+lipsync+voice recovery@')
    || combined.includes('renderer rejoin without body carry')
    || combined.includes('visible recovery without body carry')

  return hasFaceMotionLipsyncVoiceLaneEvidence
    && (
      combined.includes('pending-rejoin=body')
      || combined.includes('focus=face+motion+lipsync+voice | pending=body')
      || combined.includes('face+motion+lipsync+voice recovery@')
      || combined.includes('renderer rejoin without body carry')
      || combined.includes('visible recovery without body carry')
    )
}

function hasExplicitMotionVoiceSameHerContinuity(combined: string) {
  const hasMotionVoiceLaneEvidence = combined.includes('lane=motion+voice-only')
    || combined.includes('continuity=embodiment:still-voiced-motion-line')
    || combined.includes('signature=embodiment:still-voiced-motion-line')
    || combined.includes('signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line')
    || combined.includes('actual source is motion and voice')
    || combined.includes('still-voiced motion line')
    || combined.includes('motion+voice recovery@')
    || hasLongHorizonEmotionMemoryVoiceMotionCarry(combined)

  return hasMotionVoiceLaneEvidence
    && (
      combined.includes('continuity=embodiment:audible-continuity-line')
      || combined.includes('continuity=embodiment:still-voiced-motion-line')
      || combined.includes('signature=embodiment:audible-continuity-line')
      || combined.includes('signature=embodiment:still-voiced-motion-line')
      || combined.includes('signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line')
      || combined.includes('actual source is motion and voice')
      || combined.includes('still-voiced motion line')
      || combined.includes('motion+voice recovery@')
      || combined.includes('pending-rejoin=body+face+lipsync')
      || hasLongHorizonEmotionMemoryVoiceMotionCarry(combined)
    )
}

function hasExplicitMotionLipsyncVoiceSameHerContinuity(combined: string) {
  if (hasExplicitFaceMotionLipsyncVoiceSameHerContinuity(combined))
    return false

  const hasMotionLipsyncVoiceLaneEvidence = combined.includes('lane=motion+lipsync+voice-only')
    || combined.includes('continuity=embodiment:still-voiced-motion-lipsync-line')
    || combined.includes('signature=embodiment:still-voiced-motion-lipsync-line')
    || combined.includes('actual source is motion, lipsync, and voice')
    || combined.includes('still-voiced motion-and-mouth line')
    || combined.includes('motion+lipsync+voice recovery@')
    || hasLongHorizonEmotionMemoryMotionLipsyncVoiceCarry(combined)

  return hasMotionLipsyncVoiceLaneEvidence
    && (
      combined.includes('continuity=embodiment:still-voiced-motion-lipsync-line')
      || combined.includes('signature=embodiment:still-voiced-motion-lipsync-line')
      || combined.includes('actual source is motion, lipsync, and voice')
      || combined.includes('still-voiced motion-and-mouth line')
      || combined.includes('motion+lipsync+voice recovery@')
      || combined.includes('pending-rejoin=body+face')
      || hasLongHorizonEmotionMemoryMotionLipsyncVoiceCarry(combined)
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
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
      normalized.includes('continuity line')
      || normalized.includes('continuity')
      || normalized.includes('continuous identity')
    )
}

function hasFullCrossModalLockSameHerContinuity(combined: string) {
  return combined.includes('bodyContinuityPhase: full-cross-modal-lock')
    || combined.includes('bodyContinuityPhase=full-cross-modal-lock')
    || combined.includes('locked back onto the same living segment together')
    || combined.includes('continuity embodiment line instead of a temporary visual alignment')
    || combined.includes('共同锁回同一段 living segment')
    || combined.includes('跨模态重锁态')
    || hasExplicitFullCrossModalAuthorityLock(combined)
}

function hasExplicitFullCrossModalAuthorityLock(combined: string) {
  return combined.includes('authority-body:yes')
    && combined.includes('authority-face:yes')
    && combined.includes('authority-motion:yes')
    && combined.includes('authority-lipsync:yes')
    && combined.includes('authority-voice:yes')
}

function hasLegacyFullCrossModalLockMarker(combined: string) {
  return combined.includes('bodyContinuityPhase: full-cross-modal-lock')
    || combined.includes('bodyContinuityPhase=full-cross-modal-lock')
    || combined.includes('locked back onto the same living segment together')
    || combined.includes('continuity embodiment line instead of a temporary visual alignment')
    || combined.includes('共同锁回同一段 living segment')
    || combined.includes('跨模态重锁态')
}

function hasAuthorityOnlyFullCrossModalLock(combined: string) {
  return hasExplicitFullCrossModalAuthorityLock(combined)
    && !hasLegacyFullCrossModalLockMarker(combined)
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
  if (combined.includes('lane=body+face+motion-only'))
    return 'body+face+motion-only'
  if (combined.includes('lane=face+motion+lipsync-only'))
    return 'face+motion+lipsync-only'
  if (combined.includes('lane=face+motion+lipsync+voice-only'))
    return 'face+motion+lipsync+voice-only'
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

const ALICIZATION_EMBODIMENT_FACT_LANES = ['body', 'face', 'motion', 'lipsync', 'voice'] as const

function splitEmbodimentClosureLane(lane: string | null) {
  if (!lane)
    return []
  return lane
    .replace(/-only$/u, '')
    .split('+')
    .map(part => part.trim())
    .filter((part): part is typeof ALICIZATION_EMBODIMENT_FACT_LANES[number] =>
      ALICIZATION_EMBODIMENT_FACT_LANES.includes(part as typeof ALICIZATION_EMBODIMENT_FACT_LANES[number]),
    )
}

function hasStructuredEmbodimentContinuityEvidence(combined: string) {
  return hasAuthorityOnlyFullCrossModalLock(combined)
    || hasFullCrossModalLockSameHerContinuity(combined)
    || hasLongHorizonEmotionMemoryFaceCarry(combined)
    || hasLongHorizonEmotionMemoryMotionCarry(combined)
    || hasLongHorizonEmotionMemoryLipsyncCarry(combined)
    || hasLongHorizonEmotionMemoryVoiceCarry(combined)
    || hasLongHorizonEmotionMemoryBodyVoiceCarry(combined)
    || hasLongHorizonEmotionMemoryBodyLipsyncCarry(combined)
    || hasLongHorizonEmotionMemoryBodyLipsyncVoiceCarry(combined)
    || hasLongHorizonEmotionMemoryBodyCarry(combined)
    || hasExplicitFaceVoiceSameHerContinuity(combined)
    || hasExplicitFaceMotionVoiceSameHerContinuity(combined)
    || hasExplicitFaceMotionLipsyncVoiceSameHerContinuity(combined)
    || hasExplicitMotionVoiceSameHerContinuity(combined)
    || hasExplicitVoiceLedSameHerContinuity(combined)
    || hasExplicitMotionLipsyncVoiceSameHerContinuity(combined)
    || hasExplicitFaceLipsyncVoiceSameHerContinuity(combined)
    || hasLongHorizonEmotionMemoryFaceMotionVoiceCarry(combined)
    || hasLongHorizonEmotionMemoryMotionLipsyncVoiceCarry(combined)
    || hasLongHorizonEmotionMemoryFaceLipsyncVoiceCarry(combined)
    || hasLongHorizonEmotionMemoryFaceMotionLipsyncCarry(combined)
    || hasLongHorizonEmotionMemoryFaceLipsyncCarry(combined)
    || hasLongHorizonEmotionMemoryMotionLipsyncCarry(combined)
    || hasExplicitAudibleSameHerContinuity(combined)
    || (hasRemainingOpenLipsyncVoice(combined) && hasSameSegmentBodyFaceMotionRecovery(combined))
    || Boolean(resolveEmbodimentClosureLane(combined))
}

function buildAlicizationStructuredEmbodimentClosureFacts(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
  perspective: 'headline' | 'reminder'
}) {
  const combined = normalizeLaneEvidence(input)
  if (!combined || !hasStructuredEmbodimentContinuityEvidence(combined))
    return ''

  const hasFullLock = hasAuthorityOnlyFullCrossModalLock(combined) || hasFullCrossModalLockSameHerContinuity(combined)
  const lane = hasFullLock
    ? 'body+face+motion+lipsync+voice'
    : resolveEmbodimentClosureLane(combined)
  const activeLanes = splitEmbodimentClosureLane(lane)
  const pendingLanes = hasFullLock
    ? []
    : ALICIZATION_EMBODIMENT_FACT_LANES.filter(laneName => !activeLanes.includes(laneName))
  const evidence = [
    hasFullLock ? 'full-cross-modal-lock' : '',
    hasExplicitSameHerInwardCarry(combined) ? 'low-pressure-inward-carry' : '',
    /long-horizon|remembered emotional carry|affective residue/iu.test(combined)
      ? 'long-horizon-emotion-memory'
      : '',
    /recovery@|same-segment|renderer-rejoin|audible-body|voice-lipsync/iu.test(combined)
      ? 'runtime-lane-authority'
      : '',
  ].filter(Boolean)

  return [
    'continuity=embodiment',
    `lane=${lane ?? 'unknown'}`,
    `status=${hasFullLock ? 'closed' : 'pending-rejoin'}`,
    `pending_rejoin=${pendingLanes.length ? pendingLanes.join('+') : 'none'}`,
    `closure=${hasFullLock ? 'full-cross-modal-closed' : 'full-cross-modal-open'}`,
    evidence.length ? `evidence=${evidence.join('+')}` : '',
    input.perspective === 'headline'
      ? 'visibility=renderer-internal'
      : 'surface=structured',
  ].filter(Boolean).join(' | ')
}

export function describeAlicizationEmbodimentClosureReminder(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
}) {
  const structuredFacts = buildAlicizationStructuredEmbodimentClosureFacts({
    ...input,
    perspective: 'reminder',
  })
  return structuredFacts
}

export function describeAlicizationEmbodimentClosureHeadline(input: {
  authoritySummary?: string | null
  currentBodyState?: string | null
}) {
  const structuredFacts = buildAlicizationStructuredEmbodimentClosureFacts({
    ...input,
    perspective: 'headline',
  })
  return structuredFacts
}

export function describeAlicizationProjectClosureBriefing(input: {
  identity?: string | null
  currentPhase?: string | null
  primaryOpenLoop?: string | null
}) {
  if (!input.identity && !input.currentPhase && !input.primaryOpenLoop)
    return ''

  return [
    'continuity=project-state',
    input.identity ? `identity=${input.identity}` : '',
    input.currentPhase ? `phase=${input.currentPhase}` : '',
    input.primaryOpenLoop ? `open=${input.primaryOpenLoop}` : '',
    'surface=structured',
  ].filter(Boolean).join(' | ')
}

export function describeAlicizationProjectNextClosure(input: {
  nextClosureTarget?: string | null
}) {
  const nextClosureTarget = typeof input.nextClosureTarget === 'string'
    ? input.nextClosureTarget.trim()
    : ''

  if (!nextClosureTarget)
    return ''

  return `next=${nextClosureTarget} | surface=structured`
}
