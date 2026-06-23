import type { SpeechIntentMetadata } from '@proj-alicization/pipelines-audio'

import { defineEventa } from '@moeru/eventa'
import { createSafeBroadcastChannelContext } from '@proj-alicization/stage-shared'

export interface SpeechIntentStartPayload {
  originId: string
  intentId: string
  streamId: string
  ownerId?: string
  priority?: number
  behavior?: 'queue' | 'interrupt' | 'replace'
  metadata?: SpeechIntentMetadata | null
}

export interface SpeechIntentTokenPayload {
  originId: string
  intentId: string
  streamId: string
  sequence: number
  value?: string
  ownerId?: string
  priority?: number
  behavior?: 'queue' | 'interrupt' | 'replace'
  metadata?: SpeechIntentMetadata | null
}

export interface SpeechIntentEndPayload {
  originId: string
  intentId: string
  streamId: string
}

export interface SpeechIntentCancelPayload {
  originId: string
  intentId: string
  streamId: string
  reason?: string
}

export interface SpeechOwnerCancelPayload {
  originId: string
  ownerId: string
  reason?: string
}

export const speechIntentStartEvent = defineEventa<SpeechIntentStartPayload>('eventa:audio:speech:intent:start')
export const speechIntentLiteralEvent = defineEventa<SpeechIntentTokenPayload>('eventa:audio:speech:intent:literal')
export const speechIntentSpecialEvent = defineEventa<SpeechIntentTokenPayload>('eventa:audio:speech:intent:special')
export const speechIntentFlushEvent = defineEventa<SpeechIntentTokenPayload>('eventa:audio:speech:intent:flush')
export const speechIntentEndEvent = defineEventa<SpeechIntentEndPayload>('eventa:audio:speech:intent:end')
export const speechIntentCancelEvent = defineEventa<SpeechIntentCancelPayload>('eventa:audio:speech:intent:cancel')
export const speechOwnerCancelEvent = defineEventa<SpeechOwnerCancelPayload>('eventa:audio:speech:owner:cancel')

const BUS_CHANNEL_NAME = 'proj-alicization:pipelines:outputs:speech'

let context: ReturnType<typeof createSafeBroadcastChannelContext>['context'] | undefined

export function getSpeechBusContext() {
  context ??= createSafeBroadcastChannelContext(BUS_CHANNEL_NAME).context
  return context
}
