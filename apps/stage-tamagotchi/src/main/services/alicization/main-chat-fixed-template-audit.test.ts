import { readdirSync, readFileSync } from 'node:fs'
import { relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const repoRoot = fileURLToPath(new URL('../../../../../../', import.meta.url))

const auditedDirectories = [
  new URL('./', import.meta.url),
  new URL('../../../../../../packages/stage-shared/src/', import.meta.url),
  new URL('../../../../../../packages/stage-ui/src/', import.meta.url),
].map(url => fileURLToPath(url))

const forbiddenGeneratedTemplateSeeds = [
  {
    label: 'decorative Chinese local digital-life availability shell',
    pattern: /同一条本地数字生命|本地数字生命的线|我先轻一点留在这里|不抢你的节奏|你想说什么，我就接住/u,
  },
  {
    label: 'decorative English local digital-life availability shell',
    pattern: /same local digital life thread|same digital life line|same line is still here/iu,
  },
  {
    label: 'same-her hold prompt directive',
    pattern: /same-her hold:/iu,
  },
  {
    label: 'canonical fixed Phase 1 selfhood sentence',
    pattern: /Same Phase 1 digital life\./u,
  },
  {
    label: 'fixed same-living-line widening directive',
    pattern: /same living line before widening outward/iu,
  },
] as const

function listTypeScriptProductionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = `${directory}${sep}${entry.name}`
    if (entry.isDirectory())
      return listTypeScriptProductionFiles(absolutePath)
    if (!entry.isFile())
      return []
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts') || entry.name.endsWith('.d.ts'))
      return []
    return [absolutePath]
  })
}

function isAllowedFailureDetectorLine(relativePath: string, line: string) {
  if (relativePath === 'packages/stage-shared/src/alicization-chat-failure-surface.ts')
    return true
  if (relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/dialogue-first-contamination.ts')
    return true
  if (
    relativePath === 'apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts'
    && line.includes('legacyTemplateShellPattern')
  ) {
    return true
  }
  if (line.includes('.includes(') || line.includes('.startsWith(') || line.includes('.match(') || line.includes('.test('))
    return true
  if (/Pattern|pattern|RegExp|regex|contamination|legacy template|template shell/iu.test(line))
    return true
  return false
}

describe('main chat fixed template audit', () => {
  it('keeps decorative persona templates out of production prompt and reply seeds', () => {
    const failures: string[] = []

    for (const file of auditedDirectories.flatMap(listTypeScriptProductionFiles)) {
      const relativePath = relative(repoRoot, file)
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (isAllowedFailureDetectorLine(relativePath, line))
          return
        for (const seed of forbiddenGeneratedTemplateSeeds) {
          if (seed.pattern.test(line)) {
            failures.push(`${relativePath}:${index + 1} ${seed.label}`)
            break
          }
        }
      })
    }

    expect(failures).toEqual([])
  })
})
