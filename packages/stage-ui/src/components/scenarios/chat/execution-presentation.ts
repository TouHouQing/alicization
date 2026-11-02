import type { ChatAssistantMessage } from '../../../types/chat'

const workTools = new Set(['life_execute_work_plan', 'life_use_learned_procedure'])

/** A broken reply does not say whether an already submitted operation stopped. */
export function interruptedReplyMessageKey(message: ChatAssistantMessage) {
  if (!message.delivery)
    return null
  if (message.delivery.reason === 'cancelled')
    return 'stage.chat.message.reply-stopped'
  return message.slices.some(slice => slice.type === 'tool-call' && workTools.has(slice.toolCall.toolName))
    ? 'stage.chat.message.work-reply-interrupted'
    : 'stage.chat.message.reply-interrupted'
}

const toolLabelKeys: Record<string, string> = {
  life_execute_work_plan: 'stage.chat.tool-actions.plan-work',
  life_list_learned_procedures: 'stage.chat.tool-actions.find-method',
  life_use_learned_procedure: 'stage.chat.tool-actions.use-method',
  life_create_personal_piece: 'stage.chat.tool-actions.create-piece',
}

export function toolCallLabelKey(name: string) {
  return Object.hasOwn(toolLabelKeys, name) ? toolLabelKeys[name] : 'stage.chat.tool-actions.operation'
}
