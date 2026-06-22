import type { ScreenCaptureDiagnosticsSnapshot } from '@proj-alicization/electron-screen-capture'

import type {
  AlicizationAuditLogInput,
  AlicizationCardScope,
  AlicizationGenesisInput,
  AlicizationPersonalityState,
  AlicizationPersonalityUpdatePayload,
  AlicizationSensoryCacheSnapshot,
  AlicizationSoulFrontmatter,
  AlicizationSoulSnapshot,
  AlicizationSoulUpdatePayload,
} from '../../../shared/eventa'

import {
  electronAlicizationBootstrap,
  electronAlicizationGetSensorySnapshot,
  electronAlicizationGetSoul,
  electronAlicizationGetVisualPresenceState,
  electronAlicizationInitializeGenesis,
  electronAlicizationKillSwitchGetState,
  electronAlicizationKillSwitchResume,
  electronAlicizationKillSwitchSuspend,
  electronAlicizationUpdatePersonality,
  electronAlicizationUpdateSoul,
} from '../../../shared/eventa'
import { deriveAlicizationRuntimeSnapshot, projectAlicizationRuntimeDigest } from './alicization-runtime-architecture'
import { deriveAlicizationDigitalLifeSpine } from './digital-life-spine'
import { compilePersonaWorkshopAuthority } from './persona-workshop-compiler'
import { deriveSensoryCaptureSnapshotFromDiagnostics } from './sensory-capture'

interface RegisterAlicizationSoulStateInvokeHandlersOptions {
  registerInvokeHandler: (channel: unknown, handler: (...args: any[]) => Promise<unknown>) => void
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  cardIdFrom: (scope?: Partial<AlicizationCardScope>) => string
  bootstrap: () => Promise<AlicizationSoulSnapshot>
  getSoulSnapshot: () => AlicizationSoulSnapshot | null | undefined
  getWatching: () => boolean
  initializeGenesis: (payload: AlicizationGenesisInput) => Promise<unknown>
  queueSoulMutation: (mutation: (current: AlicizationSoulSnapshot) => Promise<AlicizationSoulSnapshot>) => Promise<AlicizationSoulSnapshot>
  parseSoul: (content: string) => {
    frontmatter: AlicizationSoulFrontmatter
    body: string
  }
  extractPersonaNotesFromBody: (body: string) => string
  buildSoulBody: (frontmatter: AlicizationSoulFrontmatter, personaNotes: string) => string
  toSoulContent: (frontmatter: AlicizationSoulFrontmatter, body: string) => string
  snapshotFromContent: (content: string) => AlicizationSoulSnapshot | Promise<AlicizationSoulSnapshot>
  clamp01: (value: number) => number
  getScopedKillSwitchSnapshot: () => unknown
  suspendKillSwitch: (reason: string) => Promise<unknown>
  resumeKillSwitch: (reason: string) => Promise<unknown>
  sensoryBus: {
    getSnapshot: () => AlicizationSensoryCacheSnapshot
    refreshNow: (options: {
      force: boolean
      timeoutMs: number
    }) => Promise<unknown>
  }
  isAlicizationKillSwitchSuspended: () => boolean
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  rememberPerceptionObservation: (input: {
    cardId: string
    now: number
    target?: {
      appName?: string
      processName?: string
      title?: string
    } | null
    source: 'sensory-snapshot' | 'subconscious-tick' | 'chat-start'
  }) => Promise<unknown>
  getActiveCardId: () => string
  ensureVisualPresenceState: (cardId: string) => Promise<unknown>
  refreshVisualPresenceForStartupRestore?: (input: {
    cardId: string
    state: Record<string, unknown>
  }) => Promise<Record<string, unknown> | null | undefined>
  getScreenCaptureDiagnosticsForWebContentsId: (webContentsId: number) => ScreenCaptureDiagnosticsSnapshot | null
}

function senderWebContentsIdFrom(eventaOptions: unknown) {
  const senderIdRaw = (eventaOptions as {
    raw?: {
      ipcMainEvent?: {
        sender?: {
          id?: unknown
        }
      }
    }
  })?.raw?.ipcMainEvent?.sender?.id
  const senderId = Number(senderIdRaw)
  return Number.isFinite(senderId) ? Math.max(1, Math.floor(senderId)) : null
}

export function registerAlicizationSoulStateInvokeHandlers(options: RegisterAlicizationSoulStateInvokeHandlersOptions) {
  const {
    registerInvokeHandler,
    withCardScope,
    cardIdFrom,
    bootstrap,
    getSoulSnapshot,
    getWatching,
    initializeGenesis,
    queueSoulMutation,
    parseSoul,
    extractPersonaNotesFromBody,
    buildSoulBody,
    toSoulContent,
    snapshotFromContent,
    clamp01,
    getScopedKillSwitchSnapshot,
    suspendKillSwitch,
    resumeKillSwitch,
    sensoryBus,
    isAlicizationKillSwitchSuspended,
    appendAuditLog,
    rememberPerceptionObservation,
    getActiveCardId,
    ensureVisualPresenceState,
    refreshVisualPresenceForStartupRestore = async ({ state }) => state,
    getScreenCaptureDiagnosticsForWebContentsId,
  } = options

  registerInvokeHandler(electronAlicizationBootstrap, async (scope: AlicizationCardScope) => {
    return await withCardScope(cardIdFrom(scope), async () => await bootstrap())
  })

  registerInvokeHandler(electronAlicizationGetSoul, async (scope: AlicizationCardScope) => {
    return await withCardScope(cardIdFrom(scope), async () => {
      const soulSnapshot = getSoulSnapshot()
      if (!soulSnapshot)
        return await bootstrap()
      return {
        ...soulSnapshot,
        watching: getWatching(),
      }
    })
  })

  registerInvokeHandler(electronAlicizationInitializeGenesis, async (payload: AlicizationCardScope & AlicizationGenesisInput) => {
    const { cardId, ...genesisPayload } = payload
    return await withCardScope(cardId, async () => await initializeGenesis(genesisPayload))
  })

  registerInvokeHandler(electronAlicizationUpdateSoul, async (payload: AlicizationCardScope & AlicizationSoulUpdatePayload) => {
    const { cardId, ...updatePayload } = payload
    return await withCardScope(cardId, async () => {
      return await queueSoulMutation(async (current) => {
        if (updatePayload.expectedRevision != null && updatePayload.expectedRevision !== current.revision) {
          throw new Error(`SOUL revision mismatch. expected=${updatePayload.expectedRevision} actual=${current.revision}`)
        }

        const parsed = parseSoul(updatePayload.content)
        const personaNotes = extractPersonaNotesFromBody(parsed.body)
        const content = toSoulContent(parsed.frontmatter, buildSoulBody(parsed.frontmatter, personaNotes))
        return await snapshotFromContent(content)
      })
    })
  })

  registerInvokeHandler(electronAlicizationUpdatePersonality, async (payload: AlicizationCardScope & AlicizationPersonalityUpdatePayload) => {
    const { cardId, ...updatePayload } = payload
    return await withCardScope(cardId, async () => {
      return await queueSoulMutation(async (current) => {
        if (updatePayload.expectedRevision != null && updatePayload.expectedRevision !== current.revision) {
          throw new Error(`SOUL revision mismatch. expected=${updatePayload.expectedRevision} actual=${current.revision}`)
        }

        const parsed = parseSoul(current.content)
        const mergedPersonality: AlicizationPersonalityState = {
          ...parsed.frontmatter.personality,
          obedience: clamp01(parsed.frontmatter.personality.obedience + (updatePayload.deltas.obedience ?? 0)),
          liveliness: clamp01(parsed.frontmatter.personality.liveliness + (updatePayload.deltas.liveliness ?? 0)),
          sensibility: clamp01(parsed.frontmatter.personality.sensibility + (updatePayload.deltas.sensibility ?? 0)),
          identityKernel: {
            ...parsed.frontmatter.personality.identityKernel,
            temperament: {
              obedience: clamp01(
                (parsed.frontmatter.personality.identityKernel?.temperament?.obedience ?? parsed.frontmatter.personality.obedience)
                + (updatePayload.deltas.obedience ?? 0),
              ),
              liveliness: clamp01(
                (parsed.frontmatter.personality.identityKernel?.temperament?.liveliness ?? parsed.frontmatter.personality.liveliness)
                + (updatePayload.deltas.liveliness ?? 0),
              ),
              sensibility: clamp01(
                (parsed.frontmatter.personality.identityKernel?.temperament?.sensibility ?? parsed.frontmatter.personality.sensibility)
                + (updatePayload.deltas.sensibility ?? 0),
              ),
            },
          },
          expressionProfile: {
            ...parsed.frontmatter.personality.expressionProfile,
          },
          initiativeBaseline: {
            ...parsed.frontmatter.personality.initiativeBaseline,
          },
          evolutionSeed: {
            ...parsed.frontmatter.personality.evolutionSeed,
          },
          identityAnchors: [...(parsed.frontmatter.personality.identityAnchors ?? [])],
          antiPersonaConstraints: [...(parsed.frontmatter.personality.antiPersonaConstraints ?? [])],
        }
        const nextPersonality = compilePersonaWorkshopAuthority({
          personality: mergedPersonality,
          personaWorkshop: null,
        })
        const nextFrontmatter: AlicizationSoulFrontmatter = {
          ...parsed.frontmatter,
          personality: nextPersonality,
        }
        const personaNotes = extractPersonaNotesFromBody(parsed.body)
        const nextBody = buildSoulBody(nextFrontmatter, personaNotes)
        const content = toSoulContent(nextFrontmatter, nextBody)
        return await snapshotFromContent(content)
      })
    })
  })

  registerInvokeHandler(electronAlicizationKillSwitchGetState, async (scope: AlicizationCardScope) => await withCardScope(cardIdFrom(scope), async () => getScopedKillSwitchSnapshot()))
  registerInvokeHandler(electronAlicizationKillSwitchSuspend, async payload => await withCardScope(cardIdFrom(payload), async () => await suspendKillSwitch(payload?.reason ?? 'manual')))
  registerInvokeHandler(electronAlicizationKillSwitchResume, async payload => await withCardScope(cardIdFrom(payload), async () => await resumeKillSwitch(payload?.reason ?? 'manual')))

  registerInvokeHandler(electronAlicizationGetSensorySnapshot, async (scope: AlicizationCardScope, eventaOptions: unknown) => {
    return await withCardScope(cardIdFrom(scope), async () => {
      let snapshot: AlicizationSensoryCacheSnapshot = sensoryBus.getSnapshot()
      if (snapshot.stale && snapshot.running && !isAlicizationKillSwitchSuspended()) {
        try {
          await sensoryBus.refreshNow({ force: true, timeoutMs: 1_200 })
        }
        catch (error) {
          await appendAuditLog({
            level: 'warning',
            category: 'alicization.sensory',
            action: 'refresh-stale-failed',
            message: 'Failed to refresh stale sensory snapshot before renderer request.',
            payload: {
              reason: error instanceof Error ? error.message : String(error),
            },
          })
        }
        snapshot = sensoryBus.getSnapshot()
      }

      const senderWebContentsId = senderWebContentsIdFrom(eventaOptions)
      const captureDiagnostics = senderWebContentsId != null
        ? getScreenCaptureDiagnosticsForWebContentsId(senderWebContentsId)
        : null
      snapshot = {
        ...snapshot,
        capture: deriveSensoryCaptureSnapshotFromDiagnostics(captureDiagnostics),
      }

      await rememberPerceptionObservation({
        cardId: getActiveCardId(),
        now: Number(snapshot.sample.collectedAt || Date.now()),
        target: snapshot.sample.foregroundWindow as {
          appName?: string
          processName?: string
          title?: string
        } | null | undefined,
        source: 'sensory-snapshot',
      })
      return snapshot
    })
  })

  registerInvokeHandler(electronAlicizationGetVisualPresenceState, async (scope: AlicizationCardScope) => {
    const targetCardId = cardIdFrom(scope)
    return await withCardScope(targetCardId, async () => {
      const state = await ensureVisualPresenceState(targetCardId) as Record<string, unknown> | null
      if (!state || typeof state !== 'object')
        return state

      const refreshedState = await refreshVisualPresenceForStartupRestore({
        cardId: targetCardId,
        state,
      }).catch(() => state)
      const stateForDigest = refreshedState && typeof refreshedState === 'object'
        ? refreshedState
        : state
      const runtimeDigest = projectAlicizationRuntimeDigest(
        deriveAlicizationRuntimeSnapshot({
          spine: deriveAlicizationDigitalLifeSpine(stateForDigest as any),
        }),
      )
      return {
        ...stateForDigest,
        runtimeDigest,
      }
    })
  })
}
