import type {
  AlicizationChatEntryIngest,
  AlicizationChatEntryIngestOptions,
  AlicizationChatEntryPreDialogueSendIdentity,
} from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'

import { assertAlicizationChatEntryPreDialogueSendIdentity } from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'

type PocketVoiceIngestOptions = AlicizationChatEntryIngestOptions<AlicizationChatEntryPreDialogueSendIdentity | null | undefined>

export interface PocketVoiceTurnDispatchInput<TChatProvider = unknown> {
  text: string
  providerId: string
  model: string
  chatProvider: TChatProvider
  providerConfig: Record<string, unknown>
  preDialogueSendIdentity: PocketVoiceIngestOptions['preDialogueSendIdentity']
  ingest: AlicizationChatEntryIngest<AlicizationChatEntryPreDialogueSendIdentity | null | undefined, TChatProvider>
}

export async function dispatchPocketVoiceTurn<TChatProvider>(input: PocketVoiceTurnDispatchInput<TChatProvider>) {
  assertAlicizationChatEntryPreDialogueSendIdentity(input.preDialogueSendIdentity, 'dispatchPocketVoiceTurn')

  return input.ingest(input.text, {
    providerId: input.providerId,
    model: input.model,
    chatProvider: input.chatProvider,
    providerConfig: input.providerConfig,
    preDialogueSendIdentity: input.preDialogueSendIdentity,
  })
}
