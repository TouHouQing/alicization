import type { AlicizationDialogueEmbodimentRendererHints, CharacterPerformanceCapabilitiesManifest } from '@proj-alicization/stage-shared'

import type { AlicizationRuntimeEmbodimentAuthority } from './runtime-embodiment-coordinator'
import type { AlicizationRuntimeEmbodimentSeed } from './runtime-embodiment-seed'

/** Project one planned gesture across all existing body authorities. */
export function projectInteractionPerformance(input: { seed: AlicizationRuntimeEmbodimentSeed, authority: AlicizationRuntimeEmbodimentAuthority, manifest?: CharacterPerformanceCapabilitiesManifest | null, now: number }): AlicizationRuntimeEmbodimentAuthority {
  const { authority, seed } = input
  const intent = seed.interactionIntent
  if (!intent || !authority.embodimentScript || !authority.embodiment || intent.turnId !== seed.turnId || intent.createdAt > input.now + 100 || intent.expiresAt <= input.now)
    return authority
  const contextual = ['greet', 'celebrate', 'play', 'accompany'].includes(intent.purpose) && !['sad', 'angry', 'tired', 'concerned', 'apologetic'].includes(authority.embodiment.performance.baseEmotion)
  if ((seed.authoredActionCue || seed.digitalLife) && !contextual)
    return authority
  if (authority.embodimentScript.state.residentMode === 'repair-before-closeness' || seed.residentPerformance?.reasonTags.includes('rest-protective') || seed.affectiveResidue?.relationshipCadence.shouldProtectRest)
    return authority
  const gesture = intent.purpose === 'greet' ? 'gentle_wave' : intent.purpose === 'celebrate' ? 'celebrate_small' : intent.purpose === 'play' ? 'tilt_head' : intent.purpose === 'accompany' ? 'listen_close' : intent.purpose === 'guide' ? 'open_palm' : intent.purpose === 'care' || intent.purpose === 'repair' ? 'reassuring_nod' : intent.purpose === 'reflect' || intent.purpose === 'clarify' ? 'thoughtful_pause' : intent.purpose === 'defer' ? 'gentle_boundary' : null
  const supported = intent.confidence >= 0.45 && gesture && input.manifest?.supportedActions.some(action => action.key === gesture)
  const cue = supported ? gesture : null
  const token = `${intent.cardId}:${intent.turnId}:intent`
  const script = authority.embodimentScript
  const hints = (raw: AlicizationDialogueEmbodimentRendererHints | null | undefined, action: string | null) => ({ ...raw, preferredMotionAliases: action ? [action] : [] })
  return {
    embodiment: { ...authority.embodiment, variationToken: token, rendererHints: hints(authority.embodiment.rendererHints, cue), performance: { ...authority.embodiment.performance, actionCue: cue } },
    speechTimeline: authority.speechTimeline ? { ...authority.speechTimeline, variationToken: token, segments: authority.speechTimeline.segments.map((segment, index) => ({ ...segment, actionCue: index === 0 ? cue : null, rendererHints: hints(segment.rendererHints, index === 0 ? cue : null) })) } : null,
    embodimentScript: { ...script, speechPlan: { ...script.speechPlan, segments: script.speechPlan.segments.map((segment, index) => ({ ...segment, rendererHints: hints(segment.rendererHints, index === 0 ? cue : null) })) }, motionPlan: { ...script.motionPlan, idleBase: 'idle_settle', actionBursts: script.motionPlan.actionBursts.map((burst, index) => ({ ...burst, actionCue: index === 0 ? cue : null, intensity: cue ? Math.min(burst.intensity, intent.confidence) : 0, source: 'cue-bridge' as const })) } },
    digitalLife: authority.digitalLife ? { ...authority.digitalLife, variationToken: token, performance: { ...authority.digitalLife.performance, actionCue: cue }, action: { ...authority.digitalLife.action, rendererHints: hints(authority.digitalLife.action.rendererHints, cue), actionCue: cue, actionMode: cue ? 'pulse' : 'none' }, frames: authority.digitalLife.frames.map((frame, index) => ({ ...frame, action: { ...frame.action, rendererHints: hints(frame.action.rendererHints, index === 0 ? cue : null), actionCue: index === 0 ? cue : null, actionMode: index === 0 && cue ? 'pulse' as const : 'none' as const } })) } : null,
  }
}
