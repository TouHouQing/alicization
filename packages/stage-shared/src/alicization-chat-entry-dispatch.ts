export type AlicizationChatEntryOrigin = 'ui-user' | 'tool-output' | 'context-recall' | 'system'

export interface AlicizationChatEntryIngestOptions<TChatProvider = unknown> {
  providerId: string
  model: string
  chatProvider: TChatProvider
  providerConfig: Record<string, unknown>
  origin?: AlicizationChatEntryOrigin
}

export type AlicizationChatEntryIngest<TChatProvider = unknown> = (
  text: string,
  options: AlicizationChatEntryIngestOptions<TChatProvider>,
) => Promise<unknown>
