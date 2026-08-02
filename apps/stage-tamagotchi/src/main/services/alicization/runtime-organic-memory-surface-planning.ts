import type { OrganicMemoryPromptContext } from './runtime-soul'

export function buildProactiveRecallSeed(
  input: {
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    phantomSeed?: string
  },
  normalizeOrganicRecallText: (raw: string) => string,
) {
  return [
    normalizeOrganicRecallText(input.foregroundWindow?.appName ?? ''),
    normalizeOrganicRecallText(input.foregroundWindow?.processName ?? ''),
    normalizeOrganicRecallText(input.foregroundWindow?.title ?? ''),
    normalizeOrganicRecallText(input.phantomSeed ?? ''),
  ].filter(Boolean).join(' | ')
}

export function tuneOrganicMemoryPromptContextForExecutiveTurn(input: {
  context: OrganicMemoryPromptContext
  recallGovernor?: unknown
}) {
  return input.context
}
