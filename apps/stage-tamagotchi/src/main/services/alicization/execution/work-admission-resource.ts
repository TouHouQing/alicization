const prefix = 'life-work-admission:'
const admissions = new Set(['tool.life_execute_work_plan', 'tool.life_use_learned_procedure'])

/** These entry points commit governed plans; their steps own actual resources. */
export function workAdmissionResources(cardId: string, capabilityId: string) {
  return admissions.has(capabilityId) ? [`${prefix}${cardId}`] : null
}

export function isWorkAdmissionResources(resources: readonly string[]) {
  return resources.length === 1 && resources[0].startsWith(prefix) && resources[0].length > prefix.length
}
