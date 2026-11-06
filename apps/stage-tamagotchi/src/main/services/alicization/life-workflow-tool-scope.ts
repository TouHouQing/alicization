import type { Tool } from '@xsai/shared-chat'

/** Explicit host workflows need their own schemas, not duplicate adapter schemas. */
export function selectExplicitLifeWorkflowTools(tools: Tool[] | undefined, userText: string) {
  const requested = new Set([...userText.matchAll(/\blife_(?:execute_work_plan|list_learned_procedures|use_learned_procedure|create_personal_piece)\b/gu)].map(match => match[0]))
  if (requested.has('life_use_learned_procedure'))
    requested.add('life_list_learned_procedures')
  const selected = tools?.filter(tool => requested.has(tool.function.name) || tool.function.name === 'life_read_tool_observation') ?? []
  return { explicit: requested.size > 0, tools: requested.size ? selected : tools, missing: [...requested].filter(name => !selected.some(tool => tool.function.name === name)) }
}
