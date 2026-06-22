import type {
  AlicizationChatEntryIngest,
  AlicizationChatEntryIngestOptions,
  AlicizationChatEntryPreDialogueSendIdentity,
} from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'

import { assertAlicizationChatEntryPreDialogueSendIdentity } from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'

type PocketPerformancePlaygroundIngestOptions = AlicizationChatEntryIngestOptions<AlicizationChatEntryPreDialogueSendIdentity | null | undefined>

export interface PocketPerformancePlaygroundChatTurnDispatchInput<TChatProvider = unknown> {
  text: string
  providerId: string
  model: string
  chatProvider: TChatProvider
  providerConfig: Record<string, unknown>
  preDialogueSendIdentity: PocketPerformancePlaygroundIngestOptions['preDialogueSendIdentity']
  ingest: AlicizationChatEntryIngest<AlicizationChatEntryPreDialogueSendIdentity | null | undefined, TChatProvider>
}

export async function dispatchPocketPerformancePlaygroundChatTurn<TChatProvider>(input: PocketPerformancePlaygroundChatTurnDispatchInput<TChatProvider>) {
  assertAlicizationChatEntryPreDialogueSendIdentity(input.preDialogueSendIdentity, 'dispatchPocketPerformancePlaygroundChatTurn')

  return input.ingest(input.text, {
    providerId: input.providerId,
    model: input.model,
    chatProvider: input.chatProvider,
    providerConfig: input.providerConfig,
    preDialogueSendIdentity: input.preDialogueSendIdentity,
  })
}
