import type {
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationRecallGovernorSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { formatMemoryProvenanceLabel } from './humanlike-memory'
import { buildProceduralMemoryAbstractions } from './memory-procedural-abstraction'
import { buildMemoryRecollectionNarratives } from './memory-recollection-narratives'
import { buildMemoryRecollectionWindows } from './memory-recollection-windows'
import { isRetrospectiveRecallQuery } from './runtime-organic-recall'

interface CreateAlicizationOrganicMemoryPromptRuntimeOptions {
  normalizeOrganicRecallText: (raw: string) => string
  selectPromptActiveThoughts: (input: {
    activeThoughts: OrganicMemoryPromptContext['activeThoughts']
    recallSeed: string
    recalledFragments: OrganicMemoryPromptContext['recalledFragments']
  }) => OrganicMemoryPromptContext['activeThoughts']
  getOrganicMemorySnapshot: () => Promise<{
    hostAttitude: string
    coreIncarnation: string
    activeThoughts: OrganicMemoryPromptContext['activeThoughts']
  }>
  getLatestRelationshipDynamics: () => Promise<OrganicMemoryPromptContext['relationshipDynamics']>
  retrieveMemoryFacts: (recallSeed: string, limit: number) => Promise<OrganicMemoryPromptContext['retrievedFacts']>
  recallSubconsciousFragmentsWithGovernor: (input: {
    text: string
    recalledFragmentCap?: number
    recalledFragmentSourceBudget?: AlicizationRecallGovernorSnapshot['recalledFragmentSourceBudget']
  }) => Promise<OrganicMemoryPromptContext['recalledFragments']>
  recallEpisodicEventsWithGovernor: (input: {
    recallSeed: string
    sessionId?: string | null
    turnId?: string | null
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
  }) => Promise<AlicizationEpisodicEventRecord[]>
  buildHostPersonModel: (input?: {
    now?: number
  }) => Promise<AlicizationHostPersonModelSnapshot | null>
  recallConversationHistory: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
  }) => Promise<Array<{
    turnId: string | null
    sessionId: string
    userText: string
    assistantText: string
    createdAt: number
  }>>
  recallMemoryConsolidations: (input: {
    query: string
    limit?: number
    recollectionIntent?: AlicizationRecallGovernorSnapshot['recollectionIntent'] | null
  }) => Promise<NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>>
  planMemoryRecollection?: (input: {
    recallSeed: string
    recollectionIntent: NonNullable<OrganicMemoryPromptContext['recollectionIntent']>
    consolidatedMemories: NonNullable<OrganicMemoryPromptContext['consolidatedMemories']>
    recollectedWindows: NonNullable<OrganicMemoryPromptContext['recollectedWindows']>
    proceduralMemories: NonNullable<OrganicMemoryPromptContext['proceduralMemories']>
    recalledEpisodes: NonNullable<OrganicMemoryPromptContext['recalledEpisodes']>
    recalledConversationHistory: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']>
  }) => Promise<NonNullable<OrganicMemoryPromptContext['recollectionPlan']> | null>
  isPersonaResidueMemoryText: (text: string) => boolean
}

export function createAlicizationOrganicMemoryPromptRuntime(options: CreateAlicizationOrganicMemoryPromptRuntimeOptions) {
  const {
    normalizeOrganicRecallText,
    selectPromptActiveThoughts,
    getOrganicMemorySnapshot,
    getLatestRelationshipDynamics,
    retrieveMemoryFacts,
    recallSubconsciousFragmentsWithGovernor,
    recallEpisodicEventsWithGovernor,
    buildHostPersonModel,
    recallConversationHistory,
    recallMemoryConsolidations,
    planMemoryRecollection,
    isPersonaResidueMemoryText,
  } = options

  function buildProactiveRecallSeed(input: {
    foregroundWindow?: {
      appName?: string
      processName?: string
      title?: string
    }
    phantomSeed?: string
  }) {
    return [
      normalizeOrganicRecallText(input.foregroundWindow?.appName ?? ''),
      normalizeOrganicRecallText(input.foregroundWindow?.processName ?? ''),
      normalizeOrganicRecallText(input.foregroundWindow?.title ?? ''),
      normalizeOrganicRecallText(input.phantomSeed ?? ''),
    ].filter(Boolean).join(' | ')
  }

  function buildOrganicMemorySystemBlocks(context: OrganicMemoryPromptContext) {
    const blocks: string[] = []
    if (context.hostAttitude) {
      blocks.push([
        '[ALICIZATION_HOST_ATTITUDE]',
        `当前关系态度：${context.hostAttitude}`,
      ].join('\n'))
    }

    if (context.coreIncarnation) {
      blocks.push([
        '[ALICIZATION_CORE_INCARNATION]',
        '这是你当前的摇光心意。它是你理解宿主、理解自己、理解关系的灵魂基底。',
        context.coreIncarnation,
      ].join('\n'))
    }

    if (context.retrievedFacts.length > 0) {
      blocks.push([
        '[ALICIZATION_FACT_LEDGER]',
        'These semantic memory facts are durable carry-over context, not proof of the current scene.',
        'If you reuse them, present them as memory, continuity, or previously learned truth rather than fresh observation.',
        ...context.retrievedFacts.map((fact) => {
          return `- ${fact.subject} ${fact.predicate} ${fact.object} | confidence=${fact.confidence.toFixed(2)} | source=${fact.source} | provenance=${formatMemoryProvenanceLabel(fact.provenance ?? 'remembered')}`
        }),
      ].join('\n'))
    }

    if (context.activeThoughts.length > 0) {
      blocks.push([
        '[ALICIZATION_ACTIVE_THOUGHTS]',
        'These are background continuity residues. Reuse them only when they truly match the current living focus.',
        'They are unresolved threads, not speech-style instructions.',
        '以下是你最近仍在持续关注的活跃思绪：',
        ...context.activeThoughts.map(item => `- ${item.text}`),
      ].join('\n'))
    }

    if (context.recalledFragments.length > 0) {
      const autobiographicalEpisodes = context.recalledFragments.filter(item => item.sourceKind === 'autobiographical-episode')
      const otherFragments = context.recalledFragments.filter(item => item.sourceKind !== 'autobiographical-episode')
      if (autobiographicalEpisodes.length > 0) {
        blocks.push([
          '[ALICIZATION_AUTOBIOGRAPHICAL_EPISODES]',
          'These are remembered autobiographical episodes: things Alicization went through that changed how she understands herself or the bond.',
          'Reuse them as lived history or self continuity, never as fresh scene proof.',
          ...autobiographicalEpisodes.map(item => `[自传回想：${JSON.stringify({
            sourceKind: item.sourceKind,
            text: item.text,
            provenance: formatMemoryProvenanceLabel(item.provenance ?? 'remembered'),
          })}]`),
        ].join('\n'))
      }

      if (otherFragments.length > 0) {
        blocks.push([
          '[ALICIZATION_ASSOCIATIVE_RECALL]',
          'These recalled fragments are secondary to the present scene and must never override fresh grounding.',
          ...otherFragments.map(item => `[触景生情：你隐约回想起了过去的某件事 -> ${JSON.stringify({
            sourceKind: item.sourceKind,
            text: item.text,
            provenance: formatMemoryProvenanceLabel(item.provenance ?? 'remembered'),
          })}]`),
        ].join('\n'))
      }
    }

    if ((context.recalledEpisodes ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_EVENT_GRAPH_RECALL]',
        'These are structured autobiographical events, not loose fragments. Treat them as lived history with explicit provenance.',
        'Observed/remembered events may support continuity. Dreamt/inferred/reconstructed events must be labeled as such if surfaced.',
        ...(context.recalledEpisodes ?? []).map((event) => {
          const provenance = event.latestReconsolidation?.provenance ?? event.provenance
          return `- when=${new Date(event.occurredAt).toISOString()} | where=${event.whereSummary ?? 'unspecified'} | with=${event.withWhom.join(', ') || 'host'} | what=${event.whatHappened} | felt=${event.felt ?? 'n/a'} | changed=${event.whatChanged ?? 'n/a'} | source=${event.sourceKind} | provenance=${formatMemoryProvenanceLabel(provenance)} | confidence=${event.confidence.toFixed(2)}`
        }),
      ].join('\n'))
    }

    if ((context.recalledConversationHistory ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_DEEP_CONVERSATION_RECALL]',
        'These are older conversation excerpts reconstructed from long-range history search.',
        'Use them when the host explicitly asks what we talked about before. Present them as recalled conversation history, not perfect verbatim certainty.',
        ...(context.recalledConversationHistory ?? []).map((item) => {
          return `- when=${new Date(item.createdAt).toISOString()} | session=${item.sessionId} | provenance=reconstructed | host=${item.userText || 'n/a'} | me=${item.assistantText || 'n/a'}`
        }),
      ].join('\n'))
    }

    if ((context.consolidatedMemories ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_CONSOLIDATED_MEMORY]',
        'These are consolidated autobiographical summaries distilled from repeated events over time.',
        'Prefer starting from one of these summaries before unpacking raw memory pieces.',
        ...(context.consolidatedMemories ?? []).map((item) => {
          return `- kind=${item.kind} | period=${item.periodKey} | confidence=${item.confidence.toFixed(2)} | provenance=${item.dominantProvenance} | summary=${item.summary} | lesson=${item.lesson ?? 'none'} | cues=${item.cues.join(' ; ')}`
        }),
      ].join('\n'))
    }

    if ((context.recollectedWindows ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_RECOLLECTED_PERIODS]',
        'These are the memory periods the mind is currently drifting toward before speaking.',
        'Think from the recalled period first, then pull details from its cues, instead of listing unrelated fragments.',
        ...(context.recollectedWindows ?? []).map((window) => {
          return `- period=${window.label} | when=${new Date(window.startedAt).toISOString()}..${new Date(window.endedAt).toISOString()} | confidence=${window.confidence.toFixed(2)} | provenance=${window.dominantProvenance} | summary=${window.summary} | cues=${window.cues.join(' ; ')}`
        }),
      ].join('\n'))
    }

    if ((context.recollectionNarratives ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_RECOLLECTION_NARRATIVES]',
        'These are gist-first recall surfaces. Start from one of them before unpacking details, like a human first remembering the period and only then the fragments.',
        ...(context.recollectionNarratives ?? []).map((item) => {
          return `- mode=${item.mode} | certainty=${item.certainty} | confidence=${item.confidence.toFixed(2)} | opening=${item.opening} | cues=${item.supportCues.join(' ; ')}`
        }),
      ].join('\n'))
    }

    if (context.recollectionPlan) {
      blocks.push([
        '[ALICIZATION_RECOLLECTION_PLAN]',
        'This is the mind-selected recollection foreground for the current turn.',
        `opening=${context.recollectionPlan.opening}`,
        `certainty=${context.recollectionPlan.certainty}`,
        `confidence=${context.recollectionPlan.confidence.toFixed(2)}`,
        `rationale=${context.recollectionPlan.rationale}`,
      ].join('\n'))
    }

    if ((context.proceduralMemories ?? []).length > 0) {
      blocks.push([
        '[ALICIZATION_PROCEDURAL_MEMORY]',
        'These are remembered ways Alicization has handled similar tasks or situations before.',
        'Reuse them as past approach memory, not as a claim that the current task is already solved.',
        ...(context.proceduralMemories ?? []).map((item) => {
          return `- label=${item.label} | confidence=${item.confidence.toFixed(2)} | approach=${item.approach} | pitfalls=${item.pitfalls.join(' ; ') || 'none'} | cues=${item.cues.join(' ; ')}`
        }),
      ].join('\n'))
    }

    if (context.hostPersonModel) {
      blocks.push([
        '[ALICIZATION_HOST_PERSON_MODEL]',
        'This is the long-horizon host model derived from repeated autobiographical episodes.',
        'Use it as relational memory, not as proof of the current moment.',
        context.hostPersonModel.summary
          ? `summary=${context.hostPersonModel.summary}`
          : '',
        `trust_ladder=${context.hostPersonModel.trustLadder.stage} (${context.hostPersonModel.trustLadder.score.toFixed(2)})`,
        context.hostPersonModel.routines.length > 0
          ? `routines=${context.hostPersonModel.routines.join(' ; ')}`
          : '',
        context.hostPersonModel.sensitivities.length > 0
          ? `sensitivities=${context.hostPersonModel.sensitivities.join(' ; ')}`
          : '',
        context.hostPersonModel.repairTriggers.length > 0
          ? `repair_triggers=${context.hostPersonModel.repairTriggers.join(' ; ')}`
          : '',
        context.hostPersonModel.preferredClosenessByContext.length > 0
          ? `preferred_closeness=${context.hostPersonModel.preferredClosenessByContext.map(item => `${item.context}:${item.preference} (${item.confidence.toFixed(2)})`).join(' | ')}`
          : '',
        context.hostPersonModel.recurrentBurdens.length > 0
          ? `recurrent_burdens=${context.hostPersonModel.recurrentBurdens.join(' ; ')}`
          : '',
      ].filter(Boolean).join('\n'))
    }

    const recallProvenances = Array.from(new Set([
      ...context.retrievedFacts.map(item => formatMemoryProvenanceLabel(item.provenance ?? 'remembered')),
      ...context.recalledFragments.map(item => formatMemoryProvenanceLabel(item.provenance ?? 'remembered')),
      ...(context.recalledEpisodes ?? []).map(item => formatMemoryProvenanceLabel(item.latestReconsolidation?.provenance ?? item.provenance)),
    ]))
    if (context.recollectionIntent) {
      const blocksIntent = [
        '[ALICIZATION_MEMORY_RECOLLECTION_INTENT]',
        'Memory should enter because the mind decided this turn needs recollection, not because of a fixed date template.',
        `mode=${context.recollectionIntent.mode}`,
        `temporal_focus=${context.recollectionIntent.temporalFocus}`,
        `confidence=${context.recollectionIntent.confidence.toFixed(2)}`,
        `rationale=${context.recollectionIntent.rationale}`,
        context.recollectionIntent.queryHints.length > 0
          ? `query_hints=${context.recollectionIntent.queryHints.join(' | ')}`
          : '',
      ]
      blocks.push(blocksIntent.filter(Boolean).join('\n'))
    }
    if (recallProvenances.length > 0) {
      blocks.push([
        '[ALICIZATION_MEMORY_PROVENANCE]',
        'Every recalled item carries provenance and reply wording must respect it.',
        'observed = something Alicization actually went through or directly witnessed.',
        'remembered = durable continuity memory from earlier real interaction.',
        'dreamt = dream-only material; never present it as real-world proof.',
        'inferred = learned pattern or abstraction, not direct scene evidence.',
        'reconstructed = partial or interference-prone recall; surface with uncertainty if used.',
        `active_provenances=${recallProvenances.join(', ')}`,
      ].join('\n'))
    }

    if (context.relationshipDynamics) {
      const relationshipDynamics = context.relationshipDynamics
      const signedDelta = (value: number) => {
        const normalized = Number.isFinite(value) ? value : 0
        return `${normalized >= 0 ? '+' : ''}${normalized.toFixed(2)}`
      }
      blocks.push([
        '[ALICIZATION_RELATIONSHIP_DYNAMICS]',
        '这是你最近一次关系动态代谢快照，优先用于保持关系连续性，不可覆盖当前轮次事实边界。',
        `当前关系态势：${relationshipDynamics.hostAttitude}`,
        relationshipDynamics.previousHostAttitude
          ? `上一关系态势：${relationshipDynamics.previousHostAttitude}`
          : '上一关系态势：无',
        `人格漂移：obedience ${signedDelta(relationshipDynamics.obedienceDelta)}, liveliness ${signedDelta(relationshipDynamics.livelinessDelta)}, sensibility ${signedDelta(relationshipDynamics.sensibilityDelta)}`,
        `来源：${relationshipDynamics.source}`,
      ].join('\n'))
    }

    return blocks
  }

  function tuneOrganicMemoryPromptContextForExecutiveTurn(input: {
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
      proceduralMemories: allowRecalledFragments
        ? (input.context.proceduralMemories ?? []).slice(0, input.personaKernelMode === 'muted' ? 1 : 2)
        : [],
    } satisfies OrganicMemoryPromptContext
  }

  function buildPerformanceManifestSystemBlocks(manifest: CharacterPerformanceCapabilitiesManifest | null) {
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

  async function resolveOrganicMemoryPromptContext(options?: {
    recallSeed?: string
    recallGovernor?: AlicizationRecallGovernorSnapshot | null
    sessionId?: string | null
    turnId?: string | null
  }): Promise<OrganicMemoryPromptContext> {
    const snapshot = await getOrganicMemorySnapshot()
    const [relationshipDynamics, hostPersonModel] = await Promise.all([
      getLatestRelationshipDynamics(),
      buildHostPersonModel().catch(() => null),
    ])
    const recallSeed = options?.recallGovernor?.recallSeed || options?.recallSeed || ''
    const recollectionIntent = options?.recallGovernor?.recollectionIntent ?? null
    const retrospectiveRecall = recollectionIntent?.searchConversations === true || isRetrospectiveRecallQuery(recallSeed)
    const retrievedFacts = recallSeed
      ? await retrieveMemoryFacts(recallSeed, 4)
      : []
    const allowRecalledFragments = options?.recallGovernor
      ? options.recallGovernor.allowRecalledFragments === true
      : Boolean(recallSeed)
    const recalledFragments = allowRecalledFragments && recallSeed
      ? (
          await recallSubconsciousFragmentsWithGovernor({
            text: recallSeed,
            recalledFragmentCap: options?.recallGovernor?.recalledFragmentCap,
            recalledFragmentSourceBudget: options?.recallGovernor?.recalledFragmentSourceBudget ?? [],
          })
        ).filter(fragment => !isPersonaResidueMemoryText(fragment.text))
      : []
    const recalledEpisodes = allowRecalledFragments && recallSeed
      ? await recallEpisodicEventsWithGovernor({
          recallSeed,
          sessionId: options?.sessionId ?? null,
          turnId: options?.turnId ?? null,
          recallGovernor: options?.recallGovernor ?? null,
        })
      : []
    const recalledConversationHistory = retrospectiveRecall
      ? (
          await recallConversationHistory({
            query: recallSeed,
            limit: recollectionIntent?.temporalFocus === 'cross-session' ? 8 : 6,
            recollectionIntent,
          })
        ).map(item => ({
          ...item,
          provenance: 'reconstructed' as const,
        }))
      : []
    const consolidatedMemories = recollectionIntent
      ? await recallMemoryConsolidations({
          query: recallSeed,
          limit: recollectionIntent.temporalFocus === 'cross-session' ? 6 : 4,
          recollectionIntent,
        })
      : []
    const recollectedWindows = buildMemoryRecollectionWindows({
      intent: recollectionIntent,
      episodes: recalledEpisodes,
      conversationHistory: recalledConversationHistory,
    })
    const proceduralMemories = buildProceduralMemoryAbstractions({
      intent: recollectionIntent,
      episodes: recalledEpisodes,
    })
    const recollectionPlan = recollectionIntent && planMemoryRecollection && (
      consolidatedMemories.length > 0
      || recollectedWindows.length > 0
      || proceduralMemories.length > 0
      || recalledEpisodes.length > 0
      || recalledConversationHistory.length > 0
    )
      ? await planMemoryRecollection({
          recallSeed,
          recollectionIntent,
          consolidatedMemories,
          recollectedWindows,
          proceduralMemories,
          recalledEpisodes,
          recalledConversationHistory,
        }).catch(() => null)
      : null

    const selectedConsolidationIds = new Set(recollectionPlan?.selectedConsolidationIds ?? [])
    const selectedWindowIds = new Set(recollectionPlan?.selectedWindowIds ?? [])
    const selectedProceduralIds = new Set(recollectionPlan?.selectedProceduralIds ?? [])
    const selectedEpisodeIds = new Set(recollectionPlan?.selectedEpisodeIds ?? [])
    const selectedConversationTurnIds = new Set(recollectionPlan?.selectedConversationTurnIds ?? [])

    const plannedConsolidatedMemories = selectedConsolidationIds.size > 0
      ? consolidatedMemories.filter(item => selectedConsolidationIds.has(item.id))
      : consolidatedMemories
    const plannedWindows = selectedWindowIds.size > 0
      ? recollectedWindows.filter(item => selectedWindowIds.has(item.id))
      : recollectedWindows
    const plannedProceduralMemories = selectedProceduralIds.size > 0
      ? proceduralMemories.filter(item => selectedProceduralIds.has(item.id))
      : proceduralMemories
    const plannedEpisodes = selectedEpisodeIds.size > 0
      ? recalledEpisodes.filter(item => selectedEpisodeIds.has(item.id))
      : recalledEpisodes
    const plannedConversationHistory = selectedConversationTurnIds.size > 0
      ? recalledConversationHistory.filter(item => item.turnId && selectedConversationTurnIds.has(item.turnId))
      : recalledConversationHistory

    const recollectionNarratives = buildMemoryRecollectionNarratives({
      intent: recollectionIntent,
      recollectedWindows: plannedWindows,
    })
    const plannedNarratives = recollectionPlan?.opening
      ? [{
          mode: recollectionIntent?.mode === 'none' ? 'conversation-history' : recollectionIntent?.mode ?? 'conversation-history',
          certainty: recollectionPlan.certainty,
          opening: recollectionPlan.opening,
          supportCues: [
            ...(plannedWindows[0]?.cues ?? []),
            ...(plannedConsolidatedMemories[0]?.cues ?? []),
            ...(plannedProceduralMemories[0]?.cues ?? []),
          ].slice(0, 4),
          confidence: recollectionPlan.confidence,
        }, ...recollectionNarratives]
      : recollectionNarratives
    const activeThoughts = options?.recallGovernor?.allowActiveThoughts === false
      ? []
      : selectPromptActiveThoughts({
          activeThoughts: snapshot.activeThoughts,
          recallSeed,
          recalledFragments,
        })

    return {
      hostAttitude: relationshipDynamics?.hostAttitude || snapshot.hostAttitude,
      coreIncarnation: snapshot.coreIncarnation,
      activeThoughts,
      retrievedFacts,
      recalledFragments,
      recalledEpisodes: plannedEpisodes,
      recalledConversationHistory: plannedConversationHistory,
      consolidatedMemories: plannedConsolidatedMemories,
      recollectedWindows: plannedWindows,
      recollectionNarratives: plannedNarratives,
      recollectionPlan,
      proceduralMemories: plannedProceduralMemories,
      recollectionIntent,
      hostPersonModel,
      relationshipDynamics,
    }
  }

  return {
    buildProactiveRecallSeed,
    buildOrganicMemorySystemBlocks,
    tuneOrganicMemoryPromptContextForExecutiveTurn,
    buildPerformanceManifestSystemBlocks,
    resolveOrganicMemoryPromptContext,
  }
}
