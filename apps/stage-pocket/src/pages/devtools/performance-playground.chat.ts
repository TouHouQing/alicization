import type { AlicizationChatEntryIngest } from '@proj-alicization/stage-shared/alicization-chat-entry-dispatch'

export interface PocketPerformancePlaygroundChatTurnDispatchInput<TChatProvider = unknown> {
  text: string
  providerId: string
  model: string
  chatProvider: TChatProvider
  providerConfig: Record<string, unknown>
  ingest: AlicizationChatEntryIngest<TChatProvider>
}

export async function dispatchPocketPerformancePlaygroundChatTurn<TChatProvider>(input: PocketPerformancePlaygroundChatTurnDispatchInput<TChatProvider>) {
  return input.ingest(input.text, {
    providerId: input.providerId,
    model: input.model,
    chatProvider: input.chatProvider,
    providerConfig: input.providerConfig,
  })
}
