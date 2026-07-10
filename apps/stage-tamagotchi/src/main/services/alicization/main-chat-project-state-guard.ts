import type { Message } from '@xsai/shared-chat'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

export const alicizationRequiredProjectStateMarker = '[ALICIZATION_PROJECT_STATE]'

const alicizationCanonicalProjectStateRequiredFieldGroups = [
  ['context_role'],
  ['short_term_owner'],
  ['long_term_recall_owner'],
  ['template_policy'],
  ['failure_surface'],
  ['latest_landed_progress', 'visible_governance_entry', 'remaining_focus'],
  ['primary_open_loop'],
] as const

type AlicizationCanonicalProjectStateField
  = typeof alicizationCanonicalProjectStateRequiredFieldGroups[number][number]

const alicizationCanonicalProjectStatePlaceholderValues = new Set([
  'none',
  'null',
  'unknown',
  'n/a',
  'na',
])

function readCanonicalProjectStateField(content: string, field: AlicizationCanonicalProjectStateField | 'identity') {
  const match = content.match(new RegExp(`^${field}=(.+)$`, 'm'))
  return typeof match?.[1] === 'string' ? match[1].trim() : ''
}

function readCanonicalProjectStateFieldGroup(content: string, fields: readonly AlicizationCanonicalProjectStateField[]) {
  return fields
    .map(field => readCanonicalProjectStateField(content, field))
    .find(hasUsableCanonicalProjectStateFieldValue)
    ?? ''
}

function hasUsableCanonicalProjectStateFieldValue(value: string) {
  if (!value)
    return false

  const normalized = value.trim()
  return !alicizationCanonicalProjectStatePlaceholderValues.has(normalized.toLowerCase())
    && !containsAlicizationFixedTemplateResidue(normalized)
}

function isCanonicalProjectStateMessageContent(content: string) {
  if (!content.includes(alicizationRequiredProjectStateMarker))
    return false

  if (/identity=|current_phase=|phase1_local_digital_life|local_desktop_life_loop|visibility=internal[-_][a-z0-9]+/iu.test(content))
    return false

  return alicizationCanonicalProjectStateRequiredFieldGroups.every((fields) => {
    const value = readCanonicalProjectStateFieldGroup(content, fields)
    return hasUsableCanonicalProjectStateFieldValue(value)
  })
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
