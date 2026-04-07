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
  syncPersonalityBaselineInBody: (body: string, personality: AlicizationPersonalityState) => string
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
    syncPersonalityBaselineInBody,
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
        const syncedBody = syncPersonalityBaselineInBody(parsed.body, parsed.frontmatter.personality)
        const content = toSoulContent(parsed.frontmatter, syncedBody)
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
        const nextPersonality: AlicizationPersonalityState = {
          obedience: clamp01(parsed.frontmatter.personality.obedience + (updatePayload.deltas.obedience ?? 0)),
          liveliness: clamp01(parsed.frontmatter.personality.liveliness + (updatePayload.deltas.liveliness ?? 0)),
          sensibility: clamp01(parsed.frontmatter.personality.sensibility + (updatePayload.deltas.sensibility ?? 0)),
        }
        const nextFrontmatter: AlicizationSoulFrontmatter = {
          ...parsed.frontmatter,
          personality: nextPersonality,
        }
        const syncedBody = syncPersonalityBaselineInBody(parsed.body, nextPersonality)
        const content = toSoulContent(nextFrontmatter, syncedBody)
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
    return await withCardScope(cardIdFrom(scope), async () => await ensureVisualPresenceState(getActiveCardId()))
  })
}
