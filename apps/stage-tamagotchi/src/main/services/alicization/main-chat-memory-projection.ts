import type { AlicizationWorkingMemoryProviderContext } from './main-chat-memory-context'

import { Buffer } from 'node:buffer'

import { selectWorkingMemorySentences } from './life-core/working-memory-retention'

/** Reduce only the inference view; persistence and current-turn bytes are separate. */
export function boundWorkingMemoryProjection(memory: AlicizationWorkingMemoryProviderContext, byteBudget = 22_000) {
  const result = structuredClone(memory)
  const omittedDialogue: string[] = []
  const omittedTimelineSources: string[] = []
  const directSlots = new Set([
    ...result.unresolvedQuestions,
    ...result.commitments,
    ...result.corrections.map(item => item.text),
    result.current.activeTask,
    result.current.threadTitle,
    result.executionState?.summary,
  ].filter(Boolean))
  result.rememberedItems = result.rememberedItems.filter(item => !directSlots.has(item))
  const bytes = () => Buffer.byteLength(JSON.stringify(result), 'utf8')
  const beforeBytes = bytes()
  // Evidence remains attributed; do not repeat the same text in both a long
  // narrative and a full source list when that displaces recent conversation.
  for (const item of result.compressedTimeline) {
    if (bytes() <= byteBudget)
      break
    if (item.evidence?.length) {
      item.evidence = item.evidence.slice(0, 3).map(evidence => ({ ...evidence, quote: selectWorkingMemorySentences(evidence.quote, 260) }))
      item.summary = selectWorkingMemorySentences(item.summary, 400)
    }
    else {
      item.summary = selectWorkingMemorySentences(item.summary, 600)
    }
  }
  for (const item of result.recentDialogue) {
    if (bytes() <= byteBudget)
      break
    if (item.text.length > 500) {
      item.text = selectWorkingMemorySentences(item.text, 500)
      item.excerpt = true
    }
  }
  while (bytes() > byteBudget && result.compressedTimeline.length > 2) {
    // Keep the first selected important event and the latest handoff.
    omittedTimelineSources.push(...result.compressedTimeline.splice(1, 1)[0]!.sourceTurnIds)
  }
  while (bytes() > byteBudget && result.recentDialogue.length > 4) {
    const id = result.recentDialogue[0]!.turnId.replace(/:(?:user|alice)$/u, '')
    do {
      omittedDialogue.push(result.recentDialogue.shift()!.turnId)
    }
    while (result.recentDialogue[0]?.turnId.replace(/:(?:user|alice)$/u, '') === id)
  }
  return {
    memory: result,
    report: { beforeBytes, afterBytes: bytes(), byteBudget, protectedStateOverBudget: bytes() > byteBudget, omittedDialogue, omittedTimelineSources },
  }
}
