import type {
  AlicizationChatEntryIngest,
  AlicizationChatEntryIngestOptions,
  AlicizationChatEntryPreDialogueSendIdentity,
} from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'

import { assertAlicizationChatEntryPreDialogueSendIdentity } from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'

type WebPerformancePlaygroundIngestOptions = AlicizationChatEntryIngestOptions<AlicizationChatEntryPreDialogueSendIdentity | null | undefined>

export interface WebPerformancePlaygroundChatTurnDispatchInput<TChatProvider = unknown> {
  text: string
  providerId: string
  model: string
  chatProvider: TChatProvider
  providerConfig: Record<string, unknown>
  preDialogueSendIdentity: WebPerformancePlaygroundIngestOptions['preDialogueSendIdentity']
  ingest: AlicizationChatEntryIngest<AlicizationChatEntryPreDialogueSendIdentity | null | undefined, TChatProvider>
}

export async function dispatchWebPerformancePlaygroundChatTurn<TChatProvider>(input: WebPerformancePlaygroundChatTurnDispatchInput<TChatProvider>) {
  assertAlicizationChatEntryPreDialogueSendIdentity(input.preDialogueSendIdentity, 'dispatchWebPerformancePlaygroundChatTurn')

  return input.ingest(input.text, {
    providerId: input.providerId,
    model: input.model,
    chatProvider: input.chatProvider,
    providerConfig: input.providerConfig,
    preDialogueSendIdentity: input.preDialogueSendIdentity,
  })
}
