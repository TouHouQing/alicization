import {
  resolveStageEmbodimentPreferredLive2DMotionName,
  resolveStageEmbodimentVrmBaseExpressionName,
} from '@proj-alicization/stage-shared'

export enum Emotion {
  Happy = 'happy',
  Sad = 'sad',
  Angry = 'angry',
  Think = 'think',
  Surprise = 'surprised',
  Awkward = 'awkward',
  Question = 'question',
  Curious = 'curious',
  Neutral = 'neutral',
}

export const EMOTION_VALUES = Object.values(Emotion)

export const EmotionHappyMotionName = 'Happy'
export const EmotionSadMotionName = 'Sad'
export const EmotionAngryMotionName = 'Angry'
export const EmotionAwkwardMotionName = 'Awkward'
export const EmotionThinkMotionName = 'Think'
export const EmotionSurpriseMotionName = 'Surprise'
export const EmotionQuestionMotionName = 'Question'
export const EmotionNeutralMotionName = 'Idle'
export const EmotionCuriousMotionName = 'Curious'

export const EMOTION_EmotionMotionName_value = {
  [Emotion.Happy]: resolveStageEmbodimentPreferredLive2DMotionName(Emotion.Happy),
  [Emotion.Sad]: resolveStageEmbodimentPreferredLive2DMotionName(Emotion.Sad),
  [Emotion.Angry]: resolveStageEmbodimentPreferredLive2DMotionName(Emotion.Angry),
  [Emotion.Think]: resolveStageEmbodimentPreferredLive2DMotionName(Emotion.Think),
  [Emotion.Surprise]: resolveStageEmbodimentPreferredLive2DMotionName(Emotion.Surprise),
  [Emotion.Awkward]: resolveStageEmbodimentPreferredLive2DMotionName(Emotion.Awkward),
  [Emotion.Question]: resolveStageEmbodimentPreferredLive2DMotionName(Emotion.Question),
  [Emotion.Neutral]: resolveStageEmbodimentPreferredLive2DMotionName(Emotion.Neutral),
  [Emotion.Curious]: resolveStageEmbodimentPreferredLive2DMotionName(Emotion.Curious),
}

export const EMOTION_VRMExpressionName_value = {
  [Emotion.Happy]: resolveStageEmbodimentVrmBaseExpressionName(Emotion.Happy),
  [Emotion.Sad]: resolveStageEmbodimentVrmBaseExpressionName(Emotion.Sad),
  [Emotion.Angry]: resolveStageEmbodimentVrmBaseExpressionName(Emotion.Angry),
  [Emotion.Think]: resolveStageEmbodimentVrmBaseExpressionName(Emotion.Think),
  [Emotion.Surprise]: resolveStageEmbodimentVrmBaseExpressionName(Emotion.Surprise),
  [Emotion.Awkward]: resolveStageEmbodimentVrmBaseExpressionName(Emotion.Awkward),
  [Emotion.Question]: resolveStageEmbodimentVrmBaseExpressionName(Emotion.Question),
  [Emotion.Neutral]: resolveStageEmbodimentVrmBaseExpressionName(Emotion.Neutral),
  [Emotion.Curious]: resolveStageEmbodimentVrmBaseExpressionName(Emotion.Curious),
} satisfies Record<Emotion, string>

export interface EmotionPayload {
  name: Emotion
  intensity: number
  suppressLive2DMotion?: boolean
}
