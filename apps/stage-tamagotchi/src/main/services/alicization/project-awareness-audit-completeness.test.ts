import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationProjectAwarenessRootFinalGateAuditFileNames,
  resolveAlicizationProjectAwarenessTopLevelCompletenessGuardFamilies,
} from './project-state-brief'

const projectAwarenessAuditSourceMarkers = [
  'project awareness',
  'pre-dialogue',
  'same-her',
  'project-state',
  'entrypoint governance',
  'normalizedialoguerespondedpayload',
  'same digital-life line',
  'same digital life line',
  'task-thread dispatch owner',
] as const

function walkAuditFiles(rootDir: string) {
  const queued = [rootDir]
  const discovered: string[] = []

  while (queued.length > 0) {
    const currentDir = queued.pop()
    if (!currentDir)
      continue

    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = join(currentDir, entry.name)
      if (entry.isDirectory()) {
        queued.push(absolutePath)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('-audit.test.ts'))
        discovered.push(absolutePath)
    }
  }

  return discovered.sort()
}

function isProjectAwarenessAuditFile(absolutePath: string) {
  const source = readFileSync(absolutePath, 'utf8').toLowerCase()
  return projectAwarenessAuditSourceMarkers.some(marker => source.includes(marker))
}

function toRepoRelativePath(absolutePath: string, repoRootDir: string) {
  return relative(repoRootDir, absolutePath).split('\\').join('/')
}

function collectMentionedAuditFileNamesFromText(text: string) {
  return [...new Set(text.match(/[A-Za-z0-9-]+-audit\.test\.ts/g) ?? [])].sort()
}

function collectProjectAwarenessAuditFiles(rootDir: string, repoRootDir: string) {
  return walkAuditFiles(rootDir)
    .filter(isProjectAwarenessAuditFile)
    .map(path => toRepoRelativePath(path, repoRootDir))
    .sort()
}

function resolveProjectAwarenessAuditedRoots(repoRoot: URL) {
  return [
    new URL('apps/stage-tamagotchi/src/main/services/alicization', repoRoot).pathname,
    new URL('apps/stage-tamagotchi/src/renderer/pages/devtools', repoRoot).pathname,
    new URL('packages/stage-ui/src/stores', repoRoot).pathname,
    new URL('packages/stage-ui/src/components/scenes', repoRoot).pathname,
  ]
}

function toAuditFileNames(relativePaths: string[]) {
  return relativePaths
    .map(path => path.split('/').at(-1) ?? path)
    .sort()
}

function collectPrimaryCoverageAuditFileNamesFromSource(source: string) {
  return [...new Set(
    [...source.matchAll(/^\s*file: '([^']+)'/gm)]
      .map(([, relativePath]) => relativePath.split('/').at(-1) ?? relativePath)
      .sort(),
  )]
}

function isRootFinalGateRouteAuthorityCandidateAuditFile(absolutePath: string) {
  const fileName = absolutePath.split('/').at(-1) ?? absolutePath

  return fileName.endsWith('entrypoint-candidate-audit.test.ts')
    || fileName === 'project-awareness-cross-surface-entrypoint-audit.test.ts'
}

function collectRootFinalGateRouteAuthorityCandidateAuditFileNames(repoRoot: URL, repoRootDir: string) {
  return resolveProjectAwarenessAuditedRoots(repoRoot)
    .flatMap(rootDir => walkAuditFiles(rootDir))
    .filter(isRootFinalGateRouteAuthorityCandidateAuditFile)
    .map(path => toRepoRelativePath(path, repoRootDir))
    .map(path => path.split('/').at(-1) ?? path)
    .filter((fileName, index, allFileNames) => allFileNames.indexOf(fileName) === index)
    .sort()
}

describe('project awareness audit completeness', () => {
  it('derives repo-relative audit paths without hardcoding the current machine workspace absolute path', () => {
    const source = readFileSync(new URL('./project-awareness-audit-completeness.test.ts', import.meta.url), 'utf8')
    const hardcodedWorkspacePrefix = `/${['Users', 'touhouqing', 'Desktop', 'GIT'].join('/')}/`

    expect(source.includes(hardcodedWorkspacePrefix)).toBe(false)
  })

  it('keeps every in-scope project-awareness audit visible in docs/pre-dialogue-project-awareness-matrix.md even when audit files live outside the main services root', () => {
    const repoRoot = new URL('../../../../../../', import.meta.url)
    const repoRootDir = repoRoot.pathname
    const docsSource = readFileSync(new URL('docs/pre-dialogue-project-awareness-matrix.md', repoRoot), 'utf8')
    const mentionedAuditFiles = collectMentionedAuditFileNamesFromText(docsSource)
    const auditedRoots = resolveProjectAwarenessAuditedRoots(repoRoot)

    const discoveredAuditFiles = auditedRoots
      .flatMap(rootDir => collectProjectAwarenessAuditFiles(rootDir, repoRootDir))
      .sort()
    const discoveredAuditFileNames = toAuditFileNames(discoveredAuditFiles)

    expect(discoveredAuditFiles.length).toBeGreaterThan(20)
    expect(mentionedAuditFiles).toEqual(discoveredAuditFileNames)

    for (const relativePath of discoveredAuditFiles)
      expect(mentionedAuditFiles).toContain(relativePath.split('/').at(-1) ?? relativePath)
  })

  it('keeps every in-scope project-awareness audit anchored in the coverage matrix even when audit files live outside the main services root', () => {
    const repoRoot = new URL('../../../../../../', import.meta.url)
    const repoRootDir = repoRoot.pathname
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const mentionedAuditFiles = collectMentionedAuditFileNamesFromText(coverageSource)
    const auditedRoots = resolveProjectAwarenessAuditedRoots(repoRoot)

    const discoveredAuditFiles = auditedRoots
      .flatMap(rootDir => collectProjectAwarenessAuditFiles(rootDir, repoRootDir))
      .sort()
    const discoveredAuditFileNames = toAuditFileNames(discoveredAuditFiles)

    expect(discoveredAuditFiles.length).toBeGreaterThan(20)
    expect(mentionedAuditFiles).toEqual(discoveredAuditFileNames)

    for (const relativePath of discoveredAuditFiles)
      expect(mentionedAuditFiles).toContain(relativePath.split('/').at(-1) ?? relativePath)
  })

  it('keeps adjacent route-authority audits discoverable when docs/coverage already rely on them even if they do not repeat the broader same-her marker vocabulary verbatim', () => {
    const repoRoot = new URL('../../../../../../', import.meta.url)
    const repoRootDir = repoRoot.pathname
    const auditedRoots = resolveProjectAwarenessAuditedRoots(repoRoot)

    const discoveredAuditFiles = auditedRoots
      .flatMap(rootDir => collectProjectAwarenessAuditFiles(rootDir, repoRootDir))
      .map(relativePath => relativePath.split('/').at(-1) ?? relativePath)

    expect(discoveredAuditFiles).toContain('runtime-dialogue-normalization-audit.test.ts')
    expect(discoveredAuditFiles).toContain('task-thread-dispatch-owner-audit.test.ts')
  })

  it('keeps in-scope project-awareness audit basenames unique so docs/coverage completeness cannot silently pass on substring or cross-directory name collisions', () => {
    const repoRoot = new URL('../../../../../../', import.meta.url)
    const repoRootDir = repoRoot.pathname
    const auditedRoots = resolveProjectAwarenessAuditedRoots(repoRoot)

    const discoveredAuditFileNames = toAuditFileNames(
      auditedRoots
        .flatMap(rootDir => collectProjectAwarenessAuditFiles(rootDir, repoRootDir))
        .sort(),
    )

    expect(new Set(discoveredAuditFileNames).size).toBe(discoveredAuditFileNames.length)
  })

  it('keeps project-state docs sync coverage checks driven by the full coverage registry instead of hand-maintained per-id lookups', () => {
    const source = readFileSync(new URL('./project-state-docs-sync.test.ts', import.meta.url), 'utf8')
    const explicitCoverageIdLookups = source.match(/coverage\.find\(item => item\.id ===/g) ?? []

    expect(source).toContain('for (const item of coverage)')
    expect(explicitCoverageIdLookups).toHaveLength(0)
  })

  it('keeps project-state docs sync guarding docs/project-state-audit.md against stale coverage ids, not only missing ones', () => {
    const source = readFileSync(new URL('./project-state-docs-sync.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('collectProjectStateAuditCoverageIds')
    expect(source).toContain('free of stale coverage ids')
    expect(source).toContain('coverage.map(item => item.id).sort()')
  })

  it('keeps project-state docs sync matching docs/project-state-audit.md by structured id-to-entry mapping instead of only whole-doc contains checks', () => {
    const source = readFileSync(new URL('./project-state-docs-sync.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('collectProjectStateAuditEntries')
    expect(source).toContain('docEntries.get(item.id)')
    expect(source).toContain('toEqual({')
    expect(source).toContain('responsibility: item.responsibility')
    expect(source).toContain('proof: item.proof')
  })

  it('keeps project-state docs sync requiring exactly one responsibility line and one proof line for each project-state audit id', () => {
    const source = readFileSync(new URL('./project-state-docs-sync.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('collectProjectStateAuditEntryCounts')
    expect(source).toContain('docEntryCounts.get(item.id)')
    expect(source).toContain('responsibility: 1')
    expect(source).toContain('proof: 1')
  })

  it('keeps project-awareness coverage anchored by exact primary audit file rows instead of only incidental mentions elsewhere in the matrix source', () => {
    const repoRoot = new URL('../../../../../../', import.meta.url)
    const repoRootDir = repoRoot.pathname
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const auditedRoots = resolveProjectAwarenessAuditedRoots(repoRoot)

    const discoveredAuditFileNames = toAuditFileNames(
      auditedRoots
        .flatMap(rootDir => collectProjectAwarenessAuditFiles(rootDir, repoRootDir))
        .sort(),
    )
    const uniquePrimaryCoverageAuditFiles = collectPrimaryCoverageAuditFileNamesFromSource(coverageSource)

    expect(uniquePrimaryCoverageAuditFiles).toEqual(discoveredAuditFileNames)
  })

  it('keeps root final-gate candidate-audit discovery sourced from the same multi-root audited set instead of a services-only local root so future non-service boundary families fail closed too', () => {
    const source = readFileSync(new URL('./project-awareness-audit-completeness.test.ts', import.meta.url), 'utf8')
    const candidateAuditCollectorSource = source.match(/function collectRootFinalGateRouteAuthorityCandidateAuditFileNames\([\s\S]*?\n\}/)?.[0] ?? ''

    expect(candidateAuditCollectorSource).toContain('resolveProjectAwarenessAuditedRoots(repoRoot)')
    expect(candidateAuditCollectorSource).not.toContain('servicesRootDir')
  })

  it('keeps an explicit shared root final-gate candidate-audit registry synchronized with the current multi-root discovery set so future boundary families cannot rely only on suffix heuristics', () => {
    const repoRoot = new URL('../../../../../../', import.meta.url)
    const repoRootDir = repoRoot.pathname
    const candidateAuditFileNames = collectRootFinalGateRouteAuthorityCandidateAuditFileNames(repoRoot, repoRootDir)

    expect(resolveAlicizationProjectAwarenessRootFinalGateAuditFileNames()).toEqual(candidateAuditFileNames)
  })

  it('keeps an explicit shared top-level completeness-guard family registry synchronized with the current root final-gate candidate audits so governed boundary families do not fragment into separate hand-maintained lists', () => {
    const repoRoot = new URL('../../../../../../', import.meta.url)
    const repoRootDir = repoRoot.pathname
    const candidateAuditFileNames = collectRootFinalGateRouteAuthorityCandidateAuditFileNames(repoRoot, repoRootDir)
    const families = resolveAlicizationProjectAwarenessTopLevelCompletenessGuardFamilies()

    expect(families.map(entry => entry.id)).toEqual([
      'chat-start',
      'cross-surface-dialogue-entry',
      'return-side-project-awareness',
      'recovery-reentry',
      'provider-consumer',
      'autonomous-dialogue',
      'execution-preflight',
      'execution-dispatch',
      'execution-follow-up-continuity',
      'project-state-answer-governance',
      'runtime-dialogue-normalization',
      'runtime-turn-persistence',
    ])
    expect(families.map(entry => entry.candidateAuditFileName).slice().sort()).toEqual(candidateAuditFileNames)
  })

  it('keeps the root Alicization final gate explicitly covering adjacent route-authority future-entrypoint candidate audits so new project-awareness boundary families fail closed at ship time', () => {
    const repoRoot = new URL('../../../../../../', import.meta.url)
    const repoRootDir = repoRoot.pathname
    const packageSource = readFileSync(new URL('package.json', repoRoot), 'utf8')
    const candidateAuditFileNames = collectRootFinalGateRouteAuthorityCandidateAuditFileNames(repoRoot, repoRootDir)
    const registeredCandidateAuditFileNames = resolveAlicizationProjectAwarenessRootFinalGateAuditFileNames()

    expect(registeredCandidateAuditFileNames).toEqual(candidateAuditFileNames)
    expect(registeredCandidateAuditFileNames).toContain('chat-start-entrypoint-candidate-audit.test.ts')
    expect(registeredCandidateAuditFileNames).toContain('autonomous-dialogue-entrypoint-candidate-audit.test.ts')
    expect(registeredCandidateAuditFileNames).toContain('provider-consumer-entrypoint-candidate-audit.test.ts')
    expect(registeredCandidateAuditFileNames).toContain('project-state-answer-governance-entrypoint-candidate-audit.test.ts')
    expect(registeredCandidateAuditFileNames).toContain('runtime-dialogue-normalization-entrypoint-candidate-audit.test.ts')
    expect(registeredCandidateAuditFileNames).toContain('runtime-turn-persistence-entrypoint-candidate-audit.test.ts')
    expect(registeredCandidateAuditFileNames).toContain('execution-follow-up-entrypoint-candidate-audit.test.ts')
    expect(registeredCandidateAuditFileNames).toContain('recovery-reentry-entrypoint-candidate-audit.test.ts')
    expect(registeredCandidateAuditFileNames).toContain('project-awareness-cross-surface-entrypoint-audit.test.ts')
    expect(registeredCandidateAuditFileNames.length).toBeGreaterThan(6)

    for (const fileName of registeredCandidateAuditFileNames)
      expect(packageSource).toContain(fileName)
  })
})
