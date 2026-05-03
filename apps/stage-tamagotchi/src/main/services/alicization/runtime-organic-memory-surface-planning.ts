import type {
  AlicizationRecallGovernorSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
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
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
}) {
  const allowActiveThoughts = input.recallGovernor?.allowActiveThoughts !== false
  const allowRecalledFragments = input.recallGovernor?.allowRecalledFragments === true
    && !input.suppressAssociativeRecall

  if (
    allowActiveThoughts
    && allowRecalledFragments
    && input.personaKernelMode === 'full'
    && !input.suppressAssociativeRecall
  ) {
    return input.context
  }

  return {
    ...input.context,
    retrievedFacts: input.context.retrievedFacts.slice(
      0,
      input.personaKernelMode === 'muted'
        ? 2
        : input.personaKernelMode === 'backgrounded'
          ? 3
          : Math.max(1, input.context.retrievedFacts.length),
    ),
    activeThoughts: allowActiveThoughts
      ? input.personaKernelMode === 'muted'
        ? input.context.activeThoughts.slice(0, 2)
        : input.context.activeThoughts
      : [],
    recalledFragments: allowRecalledFragments
      ? input.context.recalledFragments.slice(
          0,
          input.personaKernelMode === 'backgrounded'
            ? Math.max(1, Math.min(2, Math.floor(Number(input.recallGovernor?.recalledFragmentCap ?? 2))))
            : Math.max(1, Math.floor(Number(input.recallGovernor?.recalledFragmentCap ?? 2))),
        )
      : [],
    recalledEpisodes: allowRecalledFragments
      ? (input.context.recalledEpisodes ?? []).slice(
          0,
          input.personaKernelMode === 'muted'
            ? 1
            : input.personaKernelMode === 'backgrounded'
              ? 2
              : 3,
        )
      : [],
    recollectedWindows: allowRecalledFragments
      ? (input.context.recollectedWindows ?? []).slice(0, input.personaKernelMode === 'muted' ? 1 : 2)
      : [],
    consolidatedMemories: allowRecalledFragments
      ? (input.context.consolidatedMemories ?? []).slice(0, input.personaKernelMode === 'muted' ? 1 : 2)
      : [],
    recollectionNarratives: allowRecalledFragments
      ? (input.context.recollectionNarratives ?? []).slice(0, input.personaKernelMode === 'muted' ? 1 : 2)
      : [],
    recollectionPlan: allowRecalledFragments ? input.context.recollectionPlan ?? null : null,
    recollectionSpeechPlan: allowRecalledFragments ? input.context.recollectionSpeechPlan ?? null : null,
    memoryDeliberation: allowRecalledFragments ? input.context.memoryDeliberation ?? null : null,
    proceduralMemories: allowRecalledFragments
      ? (input.context.proceduralMemories ?? []).slice(0, input.personaKernelMode === 'muted' ? 1 : 2)
      : [],
  } satisfies OrganicMemoryPromptContext
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
