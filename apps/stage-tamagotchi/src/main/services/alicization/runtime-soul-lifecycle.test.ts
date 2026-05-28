import type { AlicizationSoulFrontmatter, AlicizationSoulSnapshot } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeSoulLifecycle } from './runtime-soul-lifecycle'
import { compilePersonaWorkshopAuthority } from './persona-workshop-compiler'

function createFrontmatter(): AlicizationSoulFrontmatter {
  return {
    schemaVersion: 2,
    initialized: false,
    custom_directives: '',
    host_attitude: '礼貌而克制，保持观察',
    core_incarnation: '',
    profile: {
      ownerName: '',
      hostName: '',
      alicizationName: 'Alicization',
      gender: 'female',
      genderCustom: '',
      relationship: 'companion',
      mindAge: 18,
    },
    personality: {
      obedience: 0.5,
      liveliness: 0.5,
      sensibility: 0.5,
    },
    boundaries: {
      killSwitch: true,
      mcpGuard: true,
    },
  }
}

describe('runtime soul lifecycle', () => {
  it('bootstraps missing soul content and starts watching after genesis requirements are satisfied', async () => {
    const files = new Map<string, string>()
    const watchMock = vi.fn(() => ({ close: vi.fn() }))
    const emitSoulChanged = vi.fn()
    const appendAuditLog = vi.fn(async () => {})
    const state = {
      revision: 0,
      watching: false,
      soulSnapshot: null,
      queuedWrite: Promise.resolve<AlicizationSoulSnapshot | void>(undefined),
      soulWatchTimer: undefined,
      soulWatcher: undefined,
      muteWatchUntil: 0,
    }

    const lifecycle = createAlicizationRuntimeSoulLifecycle({
      state,
      getPaths: () => ({
        soulRoot: '/tmp/card',
        soulPath: '/tmp/card/SOUL.md',
        legacyPromptProfilePath: '/tmp/card/prompt-profile.json',
        legacySparkProfilePath: '/tmp/card/spark-profile.json',
      }),
      now: () => 10_000,
      existsSync: path => files.has(path),
      mkdir: async () => undefined,
      readFile: async path => files.get(String(path)) ?? '',
      unlink: async (path) => {
        files.delete(String(path))
      },
      importWatch: async () => ({ watch: watchMock as any }),
      writeSoulContent: async (content) => {
        files.set('/tmp/card/SOUL.md', content)
      },
      parseSoul: raw => ({
        frontmatter: JSON.parse(raw.split('\n')[1] ?? '{}') as AlicizationSoulFrontmatter,
        body: raw.split('\n').slice(4).join('\n').trim(),
      }),
      hashContent: content => `hash:${content.length}`,
      withNeedsGenesis: snapshot => ({
        ...snapshot,
        needsGenesis: !(snapshot.frontmatter.initialized && snapshot.frontmatter.profile.ownerName),
      }),
      defaultFrontmatter: createFrontmatter(),
      defaultSoulBody: '# soul',
      toSoulContent: (frontmatter, body) => `---\n${JSON.stringify(frontmatter)}\n---\n${body}`,
      extractPersonaNotesFromBody: () => '',
      buildSoulBody: () => '# soul',
      resolveAlicizationSoulPersonaKernel: frontmatter => ({
        hostAttitude: frontmatter.host_attitude || '礼貌而克制，保持观察',
        coreIncarnation: frontmatter.core_incarnation || '',
        hostAttitudeSeed: '礼貌而克制，保持观察',
        coreIncarnationSeed: '',
      }),
      normalizeCustomDirectives: raw => String(raw ?? ''),
      normalizeHostAttitude: raw => String(raw ?? '').trim() || '礼貌而克制，保持观察',
      normalizeCoreIncarnation: raw => String(raw ?? '').trim(),
      normalizeGender: raw => raw === 'female' ? 'female' : 'neutral',
      normalizeMindAge: value => Number.isFinite(value) ? Math.max(1, Math.floor(Number(value))) : 18,
      clamp01: value => Math.min(1, Math.max(0, value)),
      currentSoulSchemaVersion: 2,
      emitSoulChanged,
      appendAuditLog,
    })

    const bootstrapped = await lifecycle.bootstrap()
    expect(bootstrapped.needsGenesis).toBe(true)
    expect(state.watching).toBe(false)

    const initialized = await lifecycle.initializeGenesis({
      ownerName: 'Host',
      hostName: 'Host',
      alicizationName: 'Alicization',
      gender: 'female',
      relationship: 'companion',
      mindAge: 18,
      personality: {
        obedience: 0.7,
        liveliness: 0.6,
        sensibility: 0.8,
      },
    })

    expect(initialized.conflict).toBe(false)
    expect(initialized.soul.frontmatter.initialized).toBe(true)
    expect(state.watching).toBe(true)
    expect(watchMock).toHaveBeenCalled()
    expect(emitSoulChanged).toHaveBeenCalled()
  })

  it('compiles persona workshop input into persisted SOUL authority during genesis', async () => {
    const files = new Map<string, string>()
    const emitSoulChanged = vi.fn()
    const appendAuditLog = vi.fn(async () => {})
    const state = {
      revision: 0,
      watching: false,
      soulSnapshot: null,
      queuedWrite: Promise.resolve<AlicizationSoulSnapshot | void>(undefined),
      soulWatchTimer: undefined,
      soulWatcher: undefined,
      muteWatchUntil: 0,
    }

    const lifecycle = createAlicizationRuntimeSoulLifecycle({
      state,
      getPaths: () => ({
        soulRoot: '/tmp/card',
        soulPath: '/tmp/card/SOUL.md',
        legacyPromptProfilePath: '/tmp/card/prompt-profile.json',
        legacySparkProfilePath: '/tmp/card/spark-profile.json',
      }),
      now: () => 30_000,
      existsSync: path => files.has(path),
      mkdir: async () => undefined,
      readFile: async path => files.get(String(path)) ?? '',
      unlink: async (path) => {
        files.delete(String(path))
      },
      importWatch: async () => ({ watch: vi.fn() as any }),
      writeSoulContent: async (content) => {
        files.set('/tmp/card/SOUL.md', content)
      },
      parseSoul: raw => ({
        frontmatter: JSON.parse(raw.split('\n')[1] ?? '{}') as AlicizationSoulFrontmatter,
        body: raw.split('\n').slice(4).join('\n').trim(),
      }),
      hashContent: content => `hash:${content.length}`,
      withNeedsGenesis: snapshot => ({
        ...snapshot,
        needsGenesis: !(snapshot.frontmatter.initialized && snapshot.frontmatter.profile.ownerName),
      }),
      defaultFrontmatter: createFrontmatter(),
      defaultSoulBody: '# soul',
      toSoulContent: (frontmatter, body) => `---\n${JSON.stringify(frontmatter)}\n---\n${body}`,
      extractPersonaNotesFromBody: () => '',
      buildSoulBody: (frontmatter) => {
        return [
          '# Alicization SOUL',
          '',
          '## Persona Kernel',
          '',
          `- 关系姿态：${frontmatter.personality.identityKernel?.relationshipPosture ?? ''}`,
          '',
          '## Expression Profile',
          '',
          `- 温暖度：${frontmatter.personality.expressionProfile?.warmth ?? 0}`,
          '',
          '## Anti-Persona Constraints',
          '',
          ...(frontmatter.personality.antiPersonaConstraints ?? []).map((item: string) => `- ${item}`),
          '',
          '## Identity Anchors',
          '',
          ...(frontmatter.personality.identityAnchors ?? []).map((item: string) => `- ${item}`),
          '',
          '## Personality Baseline',
          '',
        ].join('\n')
      },
      resolveAlicizationSoulPersonaKernel: frontmatter => ({
        hostAttitude: frontmatter.host_attitude || '礼貌而克制，保持观察',
        coreIncarnation: frontmatter.core_incarnation || '',
        hostAttitudeSeed: '礼貌而克制，保持观察',
        coreIncarnationSeed: '',
      }),
      normalizeCustomDirectives: raw => String(raw ?? ''),
      normalizeHostAttitude: raw => String(raw ?? '').trim() || '礼貌而克制，保持观察',
      normalizeCoreIncarnation: raw => String(raw ?? '').trim(),
      normalizeGender: raw => raw === 'female' ? 'female' : 'neutral',
      normalizeMindAge: value => Number.isFinite(value) ? Math.max(1, Math.floor(Number(value))) : 18,
      clamp01: value => Math.min(1, Math.max(0, value)),
      currentSoulSchemaVersion: 2,
      emitSoulChanged,
      appendAuditLog,
    })

    await lifecycle.bootstrap()
    const initialized = await lifecycle.initializeGenesis({
      ownerName: '指挥官',
      hostName: '主人',
      alicizationName: '小艾',
      gender: 'female',
      relationship: '女仆',
      mindAge: 18,
      personality: {
        obedience: 0.62,
        liveliness: 0.31,
        sensibility: 0.74,
      },
      personaWorkshop: {
        presetTemperament: {
          obedience: 0.83,
          liveliness: 0.21,
          sensibility: 0.88,
        },
        relationshipPosture: 'guardian',
        initiativeStyle: 'observant',
        freeDescription: '接住主人的疲惫，回复要短一点。',
        antiPersonaConstraints: ['no theatrical warmth', 'no forced cheerfulness'],
        calibration: {
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          jealousyStyle: 'mask-it',
        },
        previewCorrections: ['short openings'],
      },
    })

    const compiled = compilePersonaWorkshopAuthority({
      personality: {
        obedience: 0.62,
        liveliness: 0.31,
        sensibility: 0.74,
      },
      personaWorkshop: {
        presetTemperament: {
          obedience: 0.83,
          liveliness: 0.21,
          sensibility: 0.88,
        },
        relationshipPosture: 'guardian',
        initiativeStyle: 'observant',
        freeDescription: '接住主人的疲惫，回复要短一点。',
        antiPersonaConstraints: ['no theatrical warmth', 'no forced cheerfulness'],
        calibration: {
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          jealousyStyle: 'mask-it',
        },
        previewCorrections: ['short openings'],
      },
    })

    const persisted = files.get('/tmp/card/SOUL.md') ?? ''
    expect(initialized.conflict).toBe(false)
    expect(initialized.soul.frontmatter.personality.identityKernel).toEqual(compiled.identityKernel)
    expect(initialized.soul.frontmatter.personality.expressionProfile).toEqual(compiled.expressionProfile)
    expect(initialized.soul.frontmatter.personality.initiativeBaseline).toEqual(compiled.initiativeBaseline)
    expect(initialized.soul.frontmatter.personality.identityAnchors).toEqual(compiled.identityAnchors)
    expect(initialized.soul.frontmatter.personality.antiPersonaConstraints).toEqual(compiled.antiPersonaConstraints)
    expect(persisted).toContain('## Persona Kernel')
    expect(persisted).toContain('## Expression Profile')
    expect(persisted).toContain('## Anti-Persona Constraints')
    expect(persisted).toContain('## Identity Anchors')
    expect(persisted).toContain('## Personality Baseline')
  })

  it('rebuilds the richer soul body when personality updates through the lifecycle', async () => {
    const initialFrontmatter = {
      ...createFrontmatter(),
      initialized: true,
      profile: {
        ...createFrontmatter().profile,
        ownerName: 'Host',
        hostName: 'Host',
        alicizationName: 'Alicization',
        relationship: 'companion',
      },
      personality: {
        obedience: 0.7,
        liveliness: 0.6,
        sensibility: 0.8,
        identityKernel: {
          temperament: {
            obedience: 0.72,
            liveliness: 0.58,
            sensibility: 0.84,
          },
          relationshipPosture: 'guardian',
          initiativeStyle: 'observant',
          valueBias: ['接住主人的疲惫'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'measured',
          playfulness: 'low',
          emotionalVisibility: 'steady',
        },
        initiativeBaseline: {
          silenceReconnect: 'hold',
          comfortStyle: 'gentle-care',
          jealousyStyle: 'mask-it',
        },
        evolutionSeed: {
          fastLayers: ['presence'],
          slowLayers: ['continuity'],
          unlockTracks: ['warmth-after-grounding'],
        },
        identityAnchors: ['host-steadiness'],
        antiPersonaConstraints: ['no theatrical warmth'],
      },
    }
    const body = [
      '# Alicization SOUL',
      '',
      '## Persona Kernel',
      '',
      '- kernel body',
      '',
      '## Expression Profile',
      '',
      '- expression body',
      '',
      '## Anti-Persona Constraints',
      '',
      '- no theatrical warmth',
      '',
      '## Identity Anchors',
      '',
      '- host-steadiness',
      '',
      '## Personality Baseline',
      '',
      '- 服从度：0.70',
      '- 活泼度：0.60',
      '- 感性度：0.80',
      '',
      '## Persona Evolution Seed',
      '',
      '- Fast Layers',
      '- presence',
      '',
      '- Slow Layers',
      '- continuity',
      '',
      '- Unlock Tracks',
      '- warmth-after-grounding',
    ].join('\n')
    const files = new Map<string, string>([
      ['/tmp/card/SOUL.md', `---\n${JSON.stringify(initialFrontmatter)}\n---\n${body}`],
    ])
    const writeSoulContent = vi.fn(async (content: string) => {
      files.set('/tmp/card/SOUL.md', content)
    })
    const state = {
      revision: 0,
      watching: true,
      soulSnapshot: null as AlicizationSoulSnapshot | null,
      queuedWrite: Promise.resolve<AlicizationSoulSnapshot | void>(undefined),
      soulWatchTimer: undefined,
      soulWatcher: undefined,
      muteWatchUntil: 0,
    }
    const lifecycle = createAlicizationRuntimeSoulLifecycle({
      state,
      getPaths: () => ({
        soulRoot: '/tmp/card',
        soulPath: '/tmp/card/SOUL.md',
        legacyPromptProfilePath: '/tmp/card/prompt-profile.json',
        legacySparkProfilePath: '/tmp/card/spark-profile.json',
      }),
      now: () => 40_000,
      existsSync: path => files.has(path),
      mkdir: async () => undefined,
      readFile: async path => files.get(String(path)) ?? '',
      unlink: async (path) => {
        files.delete(String(path))
      },
      importWatch: async () => ({ watch: vi.fn() as any }),
      writeSoulContent,
      parseSoul: raw => ({
        frontmatter: JSON.parse(raw.split('\n')[1] ?? '{}') as AlicizationSoulFrontmatter,
        body: raw.split('\n').slice(4).join('\n').trim(),
      }),
      hashContent: content => `hash:${content.length}`,
      withNeedsGenesis: snapshot => ({
        ...snapshot,
        needsGenesis: false,
      }),
      defaultFrontmatter: createFrontmatter(),
      defaultSoulBody: '# soul',
      toSoulContent: (frontmatter, body) => `---\n${JSON.stringify(frontmatter)}\n---\n${body}`,
      extractPersonaNotesFromBody: () => 'preserve persona notes',
      buildSoulBody: (frontmatter, personaNotes) => [
        '# Alicization SOUL',
        '',
        '## Persona Kernel',
        '',
        `- 关系姿态：${frontmatter.personality.identityKernel?.relationshipPosture ?? ''}`,
        '',
        '## Expression Profile',
        '',
        `- 温暖度：${frontmatter.personality.expressionProfile?.warmth ?? 0}`,
        '',
        '## Anti-Persona Constraints',
        '',
        ...(frontmatter.personality.antiPersonaConstraints ?? []).map((item: string) => `- ${item}`),
        '',
        '## Identity Anchors',
        '',
        ...(frontmatter.personality.identityAnchors ?? []).map((item: string) => `- ${item}`),
        '',
        '## Personality Baseline',
        '',
        `- 服从度：${frontmatter.personality.obedience.toFixed(2)}`,
        '',
        '## Persona Evolution Seed',
        '',
        personaNotes,
      ].join('\n'),
      resolveAlicizationSoulPersonaKernel: frontmatter => ({
        hostAttitude: frontmatter.host_attitude || '礼貌而克制，保持观察',
        coreIncarnation: frontmatter.core_incarnation || '',
        hostAttitudeSeed: '礼貌而克制，保持观察',
        coreIncarnationSeed: '',
      }),
      normalizeCustomDirectives: raw => String(raw ?? ''),
      normalizeHostAttitude: raw => String(raw ?? '').trim() || '礼貌而克制，保持观察',
      normalizeCoreIncarnation: raw => String(raw ?? '').trim(),
      normalizeGender: raw => raw === 'female' ? 'female' : 'neutral',
      normalizeMindAge: value => Number.isFinite(value) ? Math.max(1, Math.floor(Number(value))) : 18,
      clamp01: value => Math.min(1, Math.max(0, value)),
      currentSoulSchemaVersion: 2,
      emitSoulChanged: vi.fn(),
      appendAuditLog: vi.fn(async () => {}),
    })

    await lifecycle.bootstrap()
    await lifecycle.queueSoulMutation(async current => ({
      ...current,
      content: current.content,
    }))

    const next = await lifecycle.initializeGenesis({
      ownerName: 'Host',
      hostName: 'Host',
      alicizationName: 'Alicization',
      gender: 'female',
      relationship: 'companion',
      mindAge: 18,
      personality: {
        obedience: 0.76,
        liveliness: 0.64,
        sensibility: 0.82,
      },
    })

    expect(next.soul.content).toContain('## Persona Kernel')
    expect(next.soul.content).toContain('## Expression Profile')
    expect(next.soul.content).toContain('## Anti-Persona Constraints')
    expect(next.soul.content).toContain('## Identity Anchors')
    expect(next.soul.content).toContain('## Persona Evolution Seed')
    expect(writeSoulContent).toHaveBeenCalled()
  })

  it('queues soul mutations through the lifecycle facade instead of mutating runtime.ts directly', async () => {
    const initialFrontmatter = {
      ...createFrontmatter(),
      initialized: true,
      profile: {
        ...createFrontmatter().profile,
        ownerName: 'Host',
        hostName: 'Host',
      },
    }
    const files = new Map<string, string>([
      ['/tmp/card/SOUL.md', `---\n${JSON.stringify(initialFrontmatter)}\n---\n# soul`],
    ])
    const state = {
      revision: 0,
      watching: true,
      soulSnapshot: null as AlicizationSoulSnapshot | null,
      queuedWrite: Promise.resolve<AlicizationSoulSnapshot | void>(undefined),
      soulWatchTimer: undefined,
      soulWatcher: undefined,
      muteWatchUntil: 0,
    }
    const lifecycle = createAlicizationRuntimeSoulLifecycle({
      state,
      getPaths: () => ({
        soulRoot: '/tmp/card',
        soulPath: '/tmp/card/SOUL.md',
        legacyPromptProfilePath: '/tmp/card/prompt-profile.json',
        legacySparkProfilePath: '/tmp/card/spark-profile.json',
      }),
      now: () => 20_000,
      existsSync: path => files.has(path),
      mkdir: async () => undefined,
      readFile: async path => files.get(String(path)) ?? '',
      unlink: async (path) => {
        files.delete(String(path))
      },
      importWatch: async () => ({ watch: vi.fn() as any }),
      writeSoulContent: async (content) => {
        files.set('/tmp/card/SOUL.md', content)
      },
      parseSoul: raw => ({
        frontmatter: JSON.parse(raw.split('\n')[1] ?? '{}') as AlicizationSoulFrontmatter,
        body: raw.split('\n').slice(4).join('\n').trim(),
      }),
      hashContent: content => `hash:${content.length}`,
      withNeedsGenesis: snapshot => ({
        ...snapshot,
        needsGenesis: false,
      }),
      defaultFrontmatter: createFrontmatter(),
      defaultSoulBody: '# soul',
      toSoulContent: (frontmatter, body) => `---\n${JSON.stringify(frontmatter)}\n---\n${body}`,
      extractPersonaNotesFromBody: () => '',
      buildSoulBody: () => '# soul',
      resolveAlicizationSoulPersonaKernel: frontmatter => ({
        hostAttitude: frontmatter.host_attitude || '礼貌而克制，保持观察',
        coreIncarnation: frontmatter.core_incarnation || '',
      }),
      normalizeCustomDirectives: raw => String(raw ?? ''),
      normalizeHostAttitude: raw => String(raw ?? '').trim() || '礼貌而克制，保持观察',
      normalizeCoreIncarnation: raw => String(raw ?? '').trim(),
      normalizeGender: raw => raw === 'female' ? 'female' : 'neutral',
      normalizeMindAge: value => Number.isFinite(value) ? Math.max(1, Math.floor(Number(value))) : 18,
      clamp01: value => Math.min(1, Math.max(0, value)),
      currentSoulSchemaVersion: 2,
      emitSoulChanged: vi.fn(),
      appendAuditLog: async () => {},
    })

    await lifecycle.bootstrap()
    const next = await lifecycle.queueSoulMutation(async current => ({
      ...current,
      content: current.content.replace('# soul', '# next soul'),
      hash: 'hash:next',
    }))

    expect(next.content).toContain('# next soul')
    expect(state.soulSnapshot?.content).toContain('# next soul')
  })
})
