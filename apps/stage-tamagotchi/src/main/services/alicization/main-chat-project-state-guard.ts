import type { Message } from '@xsai/shared-chat'

export const alicizationRequiredProjectStateMarker = '[ALICIZATION_PROJECT_STATE]'

const alicizationCanonicalProjectStateRequiredFields = [
  'current_phase',
  'current_objective',
  'project_preflight',
  'latest_landed_progress',
  'same_her_self_line',
  'same_her_drift_risk',
  'primary_open_loop',
  'next_closure_target',
] as const

function readCanonicalProjectStateField(content: string, field: (typeof alicizationCanonicalProjectStateRequiredFields)[number]) {
  const match = content.match(new RegExp(`^${field}=(.+)$`, 'm'))
  return typeof match?.[1] === 'string' ? match[1].trim() : ''
}

function carriesCanonicalProjectIdentity(content: string) {
  return /alicization is a local-first digital life project|local-first digital life project|数字生命项目/iu.test(content)
}

function isCanonicalProjectStateMessageContent(content: string) {
  if (!content.includes(alicizationRequiredProjectStateMarker))
    return false

  if (!carriesCanonicalProjectIdentity(content))
    return false

  return alicizationCanonicalProjectStateRequiredFields.every(field => Boolean(readCanonicalProjectStateField(content, field)))
}

export function carriesAlicizationCanonicalProjectState(messages: Message[]) {
  if (!Array.isArray(messages))
    return false

  return messages.some((message) => {
    if (!message || typeof message !== 'object')
      return false
    if (message.role !== 'system')
      return false
    return typeof message.content === 'string'
      && isCanonicalProjectStateMessageContent(message.content)
  })
}

export function assertAlicizationCanonicalProjectState(
  messages: Message[],
  surface: 'one-shot' | 'stream',
) {
  if (carriesAlicizationCanonicalProjectState(messages))
    return

  throw new Error(`Alicization ${surface} messages must include canonical project-state context before generation.`)
}
