import type { StageResidentBehaviorFrame } from '@proj-alicization/stage-ui/components/scenes/stage-resident-behavior-frame'

export function interruptLifeVoiceForHost(input: { cardId: string, microphoneEnabled: boolean, speaking: boolean, cancelSpeech: (ownerId: string, reason: string) => void }) {
  if (!input.microphoneEnabled || !input.speaking || !input.cardId.trim())
    return false
  input.cancelSpeech(input.cardId, 'host-voice-start')
  return true
}

/**
 * Small silent movements reflect actual engagement; they never invent emotion,
 * task completion, understanding, or a new autobiographical experience.
 */
export function createLifeResidentBehavior() {
  let cardId = ''
  let mode: StageResidentBehaviorFrame['mode'] = 'accompany'
  let modeStarted = 0
  let elapsed = 0
  let previousAt: number | null = null
  let seed = 0
  let seedIdentity = ''
  let wasSpeaking = false
  let settleUntil = 0
  return {
    sample(input: { cardId: string, identitySeed: string, now: number, paused: boolean, listening: boolean, thinking: boolean, speaking: boolean, liveliness: number }): StageResidentBehaviorFrame | null {
      if (input.cardId !== cardId) {
        cardId = input.cardId
        mode = 'accompany'
        elapsed = 0
        modeStarted = 0
        previousAt = null
        wasSpeaking = false
        settleUntil = 0
        seedIdentity = ''
      }
      if (input.identitySeed !== seedIdentity || seed === 0) {
        seedIdentity = input.identitySeed
        seed = [...`${cardId}:${seedIdentity}`].reduce((hash, letter) => Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0, 2166136261) / 0xFFFFFFFF
      }
      const delta = previousAt == null ? 0 : Math.min(100, Math.max(0, input.now - previousAt))
      previousAt = input.now
      if (input.paused) {
        wasSpeaking = false
        settleUntil = 0
        return null
      }
      elapsed += delta / 1000
      if (wasSpeaking && !input.speaking)
        settleUntil = elapsed + 2.4
      wasSpeaking = input.speaking
      const next = input.speaking ? 'speaking' : input.listening ? 'listening' : input.thinking ? 'thinking' : elapsed < settleUntil ? 'settling' : 'accompany'
      if (next !== mode) {
        mode = next
        modeStarted = elapsed
      }
      const age = elapsed - modeStarted
      const liveliness = Number.isFinite(input.liveliness) ? Math.max(0, Math.min(1, input.liveliness)) : 0.5
      const amplitude = 0.45 + liveliness * 0.55
      const slow = Math.sin(elapsed * 2 * Math.PI / (32 + seed * 17) + seed * 6)
      const breath = Math.sin(elapsed * 2 * Math.PI / (5.8 + seed * 2.2))
      const arrival = mode === 'listening' ? Math.exp(-(((age - 0.45) / 0.25) ** 2)) : 0
      const glance = mode === 'thinking' ? Math.sin(Math.min(age, 2.6) / 2.6 * Math.PI) : 0
      const settling = mode === 'settling' ? Math.max(0, 1 - age / 2.4) : 0
      return { cardId, observedAt: input.now, mode, headYaw: slow * 0.065 * amplitude + glance * (seed > 0.5 ? 0.12 : -0.12), headPitch: arrival * 0.1 + settling * 0.045, headRoll: slow * 0.025 * amplitude, bodySway: slow * 0.07 * amplitude, bodyLean: mode === 'listening' ? 0.09 : settling * -0.04, gazeAzimuth: glance * (seed > 0.5 ? 0.24 : -0.24), gazeElevation: glance * 0.09, breathScale: 1 + breath * 0.065 * amplitude }
    },
  }
}
