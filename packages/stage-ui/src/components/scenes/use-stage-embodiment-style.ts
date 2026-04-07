import type { StageEmbodimentSpeechStyleProfile } from '@proj-alicization/stage-shared'
import type { Ref } from 'vue'

import type { EmotionPayload } from '../../constants/emotions'

import { resolveStageEmbodimentSpeechStyle, resolveStageEmbodimentStageEmotionName } from '@proj-alicization/stage-shared'
import { computed, readonly, ref } from 'vue'

export interface UseStageEmbodimentStyleOptions {
  pitch: Ref<number>
  rate: Ref<number>
}

export function useStageEmbodimentStyle(options: UseStageEmbodimentStyleOptions) {
  const emotionPitchDelta = ref(0)
  const emotionRateMultiplier = ref(1)

  function normalizePresenceEmotionName(rawEmotion: string): EmotionPayload['name'] {
    return resolveStageEmbodimentStageEmotionName(rawEmotion) as EmotionPayload['name']
  }

  function applyEmotionSpeechStyle(
    emotionName: EmotionPayload['name'],
    overrideStyle?: StageEmbodimentSpeechStyleProfile | null,
  ) {
    const style = overrideStyle ?? resolveStageEmbodimentSpeechStyle(emotionName)
    emotionPitchDelta.value = style.pitchDelta
    emotionRateMultiplier.value = style.rateMultiplier
  }

  const styledPitch = computed(() => Math.max(-50, Math.min(50, options.pitch.value + emotionPitchDelta.value)))
  const styledRate = computed(() => Math.max(0.5, Math.min(2, options.rate.value * emotionRateMultiplier.value)))

  return {
    applyEmotionSpeechStyle,
    emotionPitchDelta: readonly(emotionPitchDelta),
    emotionRateMultiplier: readonly(emotionRateMultiplier),
    normalizePresenceEmotionName,
    styledPitch,
    styledRate,
  }
}
