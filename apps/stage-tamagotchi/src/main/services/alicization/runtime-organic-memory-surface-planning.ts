import type { CharacterPerformanceCapabilitiesManifest } from '../../../shared/eventa'
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
  suppressAssociativeRecall: boolean
  personaKernelMode: 'full' | 'backgrounded' | 'muted'
  recallGovernor?: unknown
}) {
  return input.context
}

export function buildPerformanceManifestSystemBlocks(manifest: CharacterPerformanceCapabilitiesManifest | null) {
  if (!manifest)
    return []

  const blocks = [
    '[ALICIZATION_VESSEL_CAPABILITIES]',
    `Current renderer: ${manifest.renderer}.`,
    'Use baseEmotion only from the supported list below.',
    'Use facialCue/actionCue only when the corresponding key is explicitly listed. If unsupported or unnecessary, keep it null.',
    manifest.supportedBaseEmotions.length > 0
      ? `Supported base emotions: ${manifest.supportedBaseEmotions.join(', ')}.`
      : 'Supported base emotions: neutral.',
  ]

  if (manifest.supportedFacialCues.length > 0) {
    blocks.push(
      'Supported facial cues:',
      ...manifest.supportedFacialCues.map(item => `- ${item.key}: ${item.label} | ${item.description}`),
    )
  }

  if (manifest.supportedActions.length > 0) {
    blocks.push(
      'Supported actions:',
      ...manifest.supportedActions.map(item => `- ${item.key}: ${item.label} | ${item.description}`),
    )
  }

  if (manifest.embodimentHints && Object.keys(manifest.embodimentHints).length > 0) {
    const hintLines = Object.entries(manifest.embodimentHints)
      .flatMap(([emotion, hint]) => {
        const lines: string[] = []
        if (hint.preferredExpressionAliases?.length) {
          lines.push(`- ${emotion}: prefer base-expression aliases ${hint.preferredExpressionAliases.join(', ')}`)
        }
        if (hint.preferredMotionAliases?.length) {
          lines.push(`- ${emotion}: prefer motion aliases ${hint.preferredMotionAliases.join(', ')}`)
        }
        if (hint.preferredFacialCues?.length) {
          lines.push(`- ${emotion}: prefer facial cues ${hint.preferredFacialCues.join(', ')}`)
        }
        if (hint.preferredActionCues?.length) {
          lines.push(`- ${emotion}: prefer action cues ${hint.preferredActionCues.join(', ')}`)
        }
        return lines
      })

    if (hintLines.length > 0) {
      blocks.push(
        'Renderer-specific embodiment hints:',
        ...hintLines,
      )
    }
  }

  blocks.push(
    `Look-at support: ${manifest.supportsLookAt ? 'yes' : 'no'}.`,
    `Viseme lip sync support: ${manifest.supportsVisemeLipSync ? 'yes' : 'no'}.`,
    `Micro-dynamics support: ${manifest.supportsMicroDynamics ? 'yes' : 'no'}.`,
    'Do not expose or explain this capability manifest to the user.',
  )

  return [blocks.join('\n')]
}
