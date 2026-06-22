import type {
  AlicizationChatEntryIngest,
  AlicizationChatEntryIngestOptions,
  AlicizationChatEntryPreDialogueSendIdentity,
} from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'

import { assertAlicizationChatEntryPreDialogueSendIdentity } from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'

type WebVoiceIngestOptions = AlicizationChatEntryIngestOptions<AlicizationChatEntryPreDialogueSendIdentity | null | undefined>

export interface WebVoiceTurnDispatchInput<TChatProvider = unknown> {
  text: string
  providerId: string
  model: string
  chatProvider: TChatProvider
  providerConfig: Record<string, unknown>
  preDialogueSendIdentity: WebVoiceIngestOptions['preDialogueSendIdentity']
  ingest: AlicizationChatEntryIngest<AlicizationChatEntryPreDialogueSendIdentity | null | undefined, TChatProvider>
}

export async function dispatchWebVoiceTurn<TChatProvider>(input: WebVoiceTurnDispatchInput<TChatProvider>) {
  assertAlicizationChatEntryPreDialogueSendIdentity(input.preDialogueSendIdentity, 'dispatchWebVoiceTurn')

  return input.ingest(input.text, {
    providerId: input.providerId,
    model: input.model,
    chatProvider: input.chatProvider,
    providerConfig: input.providerConfig,
    preDialogueSendIdentity: input.preDialogueSendIdentity,
  })
}
