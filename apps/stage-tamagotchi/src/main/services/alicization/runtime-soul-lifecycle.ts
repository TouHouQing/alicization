import type { FSWatcher } from 'node:fs'

import type {
  AlicizationGenesisInput,
  AlicizationPersonalityState,
  AlicizationSoulFrontmatter,
  AlicizationSoulSnapshot,
} from '../../../shared/eventa'

import { compilePersonaWorkshopAuthority } from './persona-workshop-compiler'

interface AlicizationSoulLifecycleState {
  revision: number
  watching: boolean
  soulSnapshot: AlicizationSoulSnapshot | null
  queuedWrite: Promise<AlicizationSoulSnapshot | void>
  soulWatchTimer: ReturnType<typeof setTimeout> | undefined
  soulWatcher: FSWatcher | undefined
  muteWatchUntil: number
}

interface AlicizationSoulPersonaKernelOptions {
  placeholderHostAttitudes?: string[]
}

interface AlicizationSoulPersonaKernelResult {
  hostAttitude: string
  coreIncarnation: string
  hostAttitudeSeed?: string
  coreIncarnationSeed?: string
}

interface CreateAlicizationRuntimeSoulLifecycleOptions {
  state: AlicizationSoulLifecycleState
  getPaths: () => {
    soulRoot: string
    soulPath: string
    legacyPromptProfilePath: string
    legacySparkProfilePath: string
  }
  now: () => number
  existsSync: (path: string) => boolean
  mkdir: typeof import('node:fs/promises').mkdir
  readFile: (path: string, encoding: 'utf-8') => Promise<string>
  unlink: typeof import('node:fs/promises').unlink
  importWatch: () => Promise<{
    watch: typeof import('node:fs').watch
  }>
  writeSoulContent: (content: string) => Promise<void>
  parseSoul: (raw: string) => { frontmatter: AlicizationSoulFrontmatter, body: string }
  hashContent: (content: string) => string
  withNeedsGenesis: (snapshot: Omit<AlicizationSoulSnapshot, 'needsGenesis'>) => AlicizationSoulSnapshot
  defaultFrontmatter: AlicizationSoulFrontmatter
  defaultSoulBody: string
  toSoulContent: (frontmatter: AlicizationSoulFrontmatter, body: string) => string
  extractPersonaNotesFromBody: (body: string) => string
  buildSoulBody: (frontmatter: AlicizationSoulFrontmatter, personaNotes: string) => string
  resolveAlicizationSoulPersonaKernel: (
    frontmatter: AlicizationSoulFrontmatter,
    options?: AlicizationSoulPersonaKernelOptions,
  ) => AlicizationSoulPersonaKernelResult
  normalizeCustomDirectives: (raw: unknown) => string
  normalizeHostAttitude: (raw: unknown) => string
  normalizeCoreIncarnation: (raw: unknown) => string
  normalizeGender: (raw: unknown) => AlicizationSoulFrontmatter['profile']['gender']
  normalizeMindAge: (value: unknown) => number
  clamp01: (value: number) => number
  currentSoulSchemaVersion: number
  emitSoulChanged: (snapshot: AlicizationSoulSnapshot) => void
  appendAuditLog: (input: {
    level: 'notice' | 'warning' | 'info'
    category: string
    action: string
    message: string
    payload?: Record<string, unknown>
  }) => Promise<void>
}

export function createAlicizationRuntimeSoulLifecycle(options: CreateAlicizationRuntimeSoulLifecycleOptions) {
  const {
    state,
    getPaths,
    now,
    existsSync,
    mkdir,
    readFile,
    unlink,
    importWatch,
    writeSoulContent,
    parseSoul,
    hashContent,
    withNeedsGenesis,
    defaultFrontmatter,
    defaultSoulBody,
    toSoulContent,
    extractPersonaNotesFromBody,
    buildSoulBody,
    resolveAlicizationSoulPersonaKernel,
    normalizeCustomDirectives,
    normalizeHostAttitude,
    normalizeCoreIncarnation,
    normalizeGender,
    normalizeMindAge,
    clamp01,
    currentSoulSchemaVersion,
    emitSoulChanged,
    appendAuditLog,
  } = options

  function snapshotFromContent(content: string): AlicizationSoulSnapshot {
    const parsed = parseSoul(content)
    const hash = hashContent(content)
    if (!state.soulSnapshot || state.soulSnapshot.hash !== hash) {
      state.revision += 1
    }
    else {
      state.revision = state.soulSnapshot.revision
    }

    return withNeedsGenesis({
      soulPath: getPaths().soulPath,
      content,
      frontmatter: parsed.frontmatter,
      revision: state.revision,
      hash,
      watching: state.watching,
    })
  }

  function clearWatchTimer() {
    if (!state.soulWatchTimer)
      return
    clearTimeout(state.soulWatchTimer)
    state.soulWatchTimer = undefined
  }

  function stopWatch() {
    if (state.soulWatcher) {
      state.soulWatcher.close()
      state.soulWatcher = undefined
    }
    clearWatchTimer()
  }

  function scheduleWatchReload() {
    if (!state.watching)
      return

    clearWatchTimer()
    state.soulWatchTimer = setTimeout(async () => {
      if (now() <= state.muteWatchUntil) {
        scheduleWatchReload()
        return
      }

      const { soulPath } = getPaths()
      if (!existsSync(soulPath))
        return

      try {
        const content = await readFile(soulPath, 'utf-8')
        if (state.soulSnapshot?.hash === hashContent(content))
          return

        const next = snapshotFromContent(content)
        state.soulSnapshot = next
        emitSoulChanged(next)
      }
      catch (error) {
        console.warn('[alicization-runtime] failed to reload SOUL.md:', error)
        void appendAuditLog({
          level: 'warning',
          category: 'soul',
          action: 'watch-reload-failed',
          message: 'Failed to reload SOUL.md from fs.watch event.',
          payload: {
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }, 80)
  }

  async function ensureWatchState() {
    if (state.soulSnapshot?.needsGenesis) {
      state.watching = false
      stopWatch()
      return
    }

    if (!state.watching) {
      const { watch } = await importWatch()
      state.soulWatcher = watch(getPaths().soulPath, () => scheduleWatchReload())
    }

    state.watching = true
  }

  async function cleanupLegacyProfileFiles() {
    const { legacyPromptProfilePath, legacySparkProfilePath } = getPaths()

    const removeIfExists = async (path: string, category: string) => {
      if (!existsSync(path))
        return

      try {
        await unlink(path)
        await appendAuditLog({
          level: 'notice',
          category: 'migration',
          action: 'legacy-profile-removed',
          message: 'Removed deprecated profile file.',
          payload: {
            path,
            category,
          },
        })
      }
      catch (error) {
        await appendAuditLog({
          level: 'warning',
          category: 'migration',
          action: 'legacy-profile-remove-failed',
          message: 'Failed to remove deprecated profile file.',
          payload: {
            path,
            category,
            reason: error instanceof Error ? error.message : String(error),
          },
        })
      }
    }

    await removeIfExists(legacyPromptProfilePath, 'prompt-profile')
    await removeIfExists(legacySparkProfilePath, 'spark-profile')
  }

  async function readSoulSnapshot() {
    const { soulRoot, soulPath } = getPaths()
    await mkdir(soulRoot, { recursive: true })
    if (!existsSync(soulPath)) {
      const content = toSoulContent(defaultFrontmatter, defaultSoulBody)
      await writeSoulContent(content)
    }

    const content = await readFile(soulPath, 'utf-8')
    const snapshot = snapshotFromContent(content)
    state.soulSnapshot = snapshot
    return snapshot
  }

  async function bootstrap() {
    await cleanupLegacyProfileFiles()
    const snapshot = await readSoulSnapshot()
    await ensureWatchState()
    return {
      ...snapshot,
      watching: state.watching,
    }
  }

  async function queueSoulMutation(task: (current: AlicizationSoulSnapshot) => Promise<AlicizationSoulSnapshot>) {
    const execute = async () => {
      const current = state.soulSnapshot ?? await bootstrap()
      const next = await task(current)
      state.muteWatchUntil = now() + 400
      await writeSoulContent(next.content)
      state.soulSnapshot = {
        ...next,
        watching: state.watching,
      }
      emitSoulChanged(state.soulSnapshot)
      return state.soulSnapshot
    }
    state.queuedWrite = state.queuedWrite.then(execute, execute)

    await state.queuedWrite.catch(async (error) => {
      await appendAuditLog({
        level: 'warning',
        category: 'soul',
        action: 'mutation-failed',
        message: 'SOUL mutation failed.',
        payload: {
          reason: error instanceof Error ? error.message : String(error),
        },
      })
      throw error
    })
    return state.soulSnapshot!
  }

  function normalizePersonality(personality: AlicizationPersonalityState) {
    return {
      obedience: clamp01(personality.obedience),
      liveliness: clamp01(personality.liveliness),
      sensibility: clamp01(personality.sensibility),
    } satisfies AlicizationPersonalityState
  }

  async function initializeGenesis(input: AlicizationGenesisInput) {
    const ownerName = String(input.ownerName ?? '').trim()
    const hostName = String(input.hostName ?? '').trim()
    const alicizationName = String(input.alicizationName ?? '').trim()
    const relationship = String(input.relationship ?? '').trim()
    const gender = normalizeGender(input.gender)
    const genderCustom = String(input.genderCustom ?? '').trim()

    if (!ownerName)
      throw new Error('ownerName is required')
    if (!hostName)
      throw new Error('hostName is required')
    if (!alicizationName)
      throw new Error('alicizationName is required')
    if (!relationship)
      throw new Error('relationship is required')
    if (gender === 'custom' && !genderCustom)
      throw new Error('genderCustom is required when gender is custom')
    if (!Number.isFinite(input.mindAge) || input.mindAge <= 0)
      throw new Error('mindAge must be a positive number')

    const known = state.soulSnapshot
    const candidate = await readSoulSnapshot()

    if (!input.allowOverwrite && known && candidate.hash !== known.hash && candidate.needsGenesis) {
      await appendAuditLog({
        level: 'notice',
        category: 'genesis',
        action: 'conflict-candidate',
        message: 'Genesis detected external SOUL changes before confirmation.',
      })
      return {
        soul: known,
        conflict: true,
        conflictCandidate: candidate,
      }
    }

    const candidatePersonaKernel = candidate.frontmatter.initialized
      ? resolveAlicizationSoulPersonaKernel(candidate.frontmatter, {
          placeholderHostAttitudes: [defaultFrontmatter.host_attitude],
        })
      : null
    const shouldCarryHostAttitude = Boolean(
      candidate.frontmatter.initialized
      && String(candidate.frontmatter.host_attitude ?? '').trim()
      && candidate.frontmatter.host_attitude !== candidatePersonaKernel?.hostAttitudeSeed,
    )
    const shouldCarryCoreIncarnation = Boolean(
      candidate.frontmatter.initialized
      && normalizeCoreIncarnation(candidate.frontmatter.core_incarnation)
      && candidate.frontmatter.core_incarnation !== candidatePersonaKernel?.coreIncarnationSeed,
    )

    const compiledPersonality = compilePersonaWorkshopAuthority({
      personality: normalizePersonality(input.personality),
      personaWorkshop: input.personaWorkshop ?? null,
    })

    const nextFrontmatterBase: AlicizationSoulFrontmatter = {
      ...candidate.frontmatter,
      schemaVersion: currentSoulSchemaVersion,
      initialized: true,
      custom_directives: typeof input.customDirectives === 'string'
        ? normalizeCustomDirectives(input.customDirectives)
        : normalizeCustomDirectives(candidate.frontmatter.custom_directives),
      profile: {
        ownerName,
        hostName,
        alicizationName,
        gender,
        genderCustom,
        relationship,
        mindAge: normalizeMindAge(input.mindAge),
      },
      personality: compiledPersonality,
      host_attitude: shouldCarryHostAttitude
        ? candidate.frontmatter.host_attitude
        : '',
      core_incarnation: shouldCarryCoreIncarnation
        ? candidate.frontmatter.core_incarnation
        : '',
    }
    const seededPersonaKernel = resolveAlicizationSoulPersonaKernel(nextFrontmatterBase, {
      placeholderHostAttitudes: [defaultFrontmatter.host_attitude],
    })
    const nextFrontmatter: AlicizationSoulFrontmatter = {
      ...nextFrontmatterBase,
      host_attitude: normalizeHostAttitude(seededPersonaKernel.hostAttitude),
      core_incarnation: normalizeCoreIncarnation(seededPersonaKernel.coreIncarnation),
    }

    const candidateBody = parseSoul(candidate.content).body
    const previousPersonaNotes = extractPersonaNotesFromBody(candidateBody)
    const personaNotes = typeof input.personaNotes === 'string'
      ? String(input.personaNotes).trim()
      : previousPersonaNotes
    const nextContent = toSoulContent(nextFrontmatter, buildSoulBody(nextFrontmatter, personaNotes))
    const nextSnapshot = snapshotFromContent(nextContent)
    const persisted = await queueSoulMutation(async (current) => {
      if (!input.allowOverwrite && current.hash !== candidate.hash)
        throw new Error('SOUL changed during Genesis, please retry with allowOverwrite=true')
      return nextSnapshot
    })

    await ensureWatchState()
    await appendAuditLog({
      level: 'info',
      category: 'genesis',
      action: 'completed',
      message: 'Genesis initialized successfully.',
      payload: {
        ownerName: nextFrontmatter.profile.ownerName,
        hostName: nextFrontmatter.profile.hostName,
        alicizationName: nextFrontmatter.profile.alicizationName,
        gender: nextFrontmatter.profile.gender,
        relationship: nextFrontmatter.profile.relationship,
        mindAge: nextFrontmatter.profile.mindAge,
      },
    })
    return {
      soul: {
        ...persisted,
        watching: state.watching,
      },
      conflict: false,
    }
  }

  return {
    snapshotFromContent,
    readSoulSnapshot,
    stopWatch,
    ensureWatchState,
    cleanupLegacyProfileFiles,
    bootstrap,
    queueSoulMutation,
    initializeGenesis,
  }
}

export type AlicizationRuntimeSoulLifecycle = ReturnType<typeof createAlicizationRuntimeSoulLifecycle>
