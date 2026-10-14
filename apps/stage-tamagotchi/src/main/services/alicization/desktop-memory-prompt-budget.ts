import type { Message } from '@xsai/shared-chat'

import { applyPromptBudget } from '@proj-alicization/stage-ui/composables/alicization-guardrails'

// Desktop memory already has bounded retrieval and working-memory owners.
// Preserve that complete snapshot; the outer provider byte budget remains the
// hard request limit. Legacy soft trimming must not silently erase its facts.
export function applyDesktopMemoryPromptBudget(messages: Message[], options?: Parameters<typeof applyPromptBudget>[1]) {
  const memory = messages.filter((message) => {
    if (message.role !== 'system' || typeof message.content !== 'string')
      return false
    try { return JSON.parse(message.content).type === 'alicization-turn-memory-context' }
    catch { return false }
  })
  if (memory.length > 1)
    throw new Error('Desktop memory must have exactly one authoritative context')
  if (!memory.length)
    return applyPromptBudget(messages, options)
  const result = applyPromptBudget(messages.filter(message => message !== memory[0]), options)
  const index = result.messages.findIndex(message => message.role !== 'system')
  const projected = [...result.messages]
  projected.splice(index < 0 ? projected.length : index, 0, memory[0])
  const tokens = Math.ceil(String(memory[0].content).length / 4)
  return {
    messages: projected,
    report: {
      ...result.report,
      totalBeforeTokens: result.report.totalBeforeTokens + tokens,
      totalAfterTokens: result.report.totalAfterTokens + tokens,
      sections: { ...result.report.sections, memory: { beforeTokens: result.report.sections.memory.beforeTokens + tokens, afterTokens: result.report.sections.memory.afterTokens + tokens } },
    },
  }
}
