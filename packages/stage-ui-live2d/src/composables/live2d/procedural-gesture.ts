import type { CharacterActionCapability } from '@proj-alicization/stage-shared'

interface GestureDefinition {
  parameter: 'ParamAngleX' | 'ParamAngleY' | 'ParamAngleZ'
  duration: number
  amplitude: number
  shake?: boolean
}

const gestures: Record<string, GestureDefinition> = {
  nod_soft: { parameter: 'ParamAngleY', duration: 0.9, amplitude: -5 },
  idle_gentle_nod: { parameter: 'ParamAngleY', duration: 1.1, amplitude: -4 },
  reassuring_nod: { parameter: 'ParamAngleY', duration: 1.2, amplitude: -5 },
  slow_nod: { parameter: 'ParamAngleY', duration: 1.5, amplitude: -5 },
  nod_once_firm: { parameter: 'ParamAngleY', duration: 0.75, amplitude: -8 },
  head_shake: { parameter: 'ParamAngleX', duration: 1.2, amplitude: 7, shake: true },
  head_tilt: { parameter: 'ParamAngleZ', duration: 1.4, amplitude: 6 },
}

export function listLive2DProceduralActions(supports: (parameter: string) => boolean): CharacterActionCapability[] {
  return Object.entries(gestures).filter(([, gesture]) => supports(gesture.parameter)).map(([key]) => ({
    key,
    label: key.replaceAll('_', ' '),
    description: 'Bounded head gesture on the model’s compiled Cubism parameters',
    source: 'builtin',
  }))
}

// Renderer fallback for an existing semantic action pulse. No timer, autonomous
// action selection, or SDK motion event is manufactured here.
export function createLive2DProceduralGesture() {
  let active: { cue: string, revision: number, startedAt: number, intensity: number, definition: GestureDefinition } | null = null

  return {
    start(input: { cue: string, revision: number, now: number, intensity: number }, supports: (parameter: string) => boolean) {
      active = null
      const definition = gestures[input.cue]
      if (!definition || !supports(definition.parameter) || !Number.isFinite(input.now) || !Number.isFinite(input.intensity))
        return false
      active = { cue: input.cue, revision: input.revision, startedAt: input.now, intensity: Math.min(1, Math.max(0, input.intensity)), definition }
      return true
    },
    sample(now: number) {
      if (!active)
        return null
      const progress = (now - active.startedAt) / active.definition.duration
      if (!Number.isFinite(progress) || progress < 0 || progress >= 1) {
        active = null
        return null
      }
      const envelope = Math.sin(Math.PI * progress) ** 2
      const oscillation = active.definition.shake ? Math.sin(4 * Math.PI * progress) : 1
      return {
        cue: active.cue,
        revision: active.revision,
        parameter: active.definition.parameter,
        offset: active.definition.amplitude * active.intensity * envelope * oscillation,
        progress,
      }
    },
    cancel() { active = null },
  }
}
