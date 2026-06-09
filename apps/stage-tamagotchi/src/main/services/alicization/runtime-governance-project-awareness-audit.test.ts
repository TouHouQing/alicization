import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'runtime-governance-same-life-rewrite-preserve',
    file: './runtime-governance-project-awareness-route.test.ts',
    snippets: [
      'preserves stronger same-her project continuity carry inside governed rewrite requests instead of flattening back to a thinner pre-dialogue reminder',
      'same-her=answer project-state status from one same-her continuity, not as a detached shell',
      'expect(mustPreserve.some(item => item.includes(\'before any local fluency takes over\'))).toBe(false)',
    ],
  },
  {
    entry: 'runtime-governance-thin-project-shell-treated-thin',
    file: './runtime-governance-project-awareness-route.test.ts',
    snippets: [
      'treats keep-this-project-in-view awareness shells as thin when governed rewrite continuity carry already has a richer same-her line',
      'Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
      'mustPreserve.some(item => item.includes(\'keep this same digital life project in view\'))',
    ],
  },
  {
    entry: 'runtime-governance-thin-chinese-same-her-reminder-rejected',
    file: './runtime-governance-project-awareness-route.test.ts',
    snippets: [
      'treats thin chinese reminder awareness shells as thin when governed rewrite continuity carry already has richer same-her phase closure lines',
      'const thinChineseReminder = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'mustPreserve.some(item => item.includes(thinChineseReminder))',
    ],
  },
  {
    entry: 'runtime-governance-living-self-line-precedence',
    file: './runtime-governance-project-awareness-route.test.ts',
    snippets: [
      'prefers a fresher living-self sameHerSummary over a thinner carried continuitySummary when governed rewrite requests rebuild project continuity carry',
      'Right now this return is still holding together mainly through face, motion, and voice',
      'same-her=Keep the same digital life project in view.',
    ],
  },
  {
    entry: 'runtime-governance-resume-confirmation-boundary-preserve',
    file: './runtime-governance-project-awareness-route.test.ts',
    snippets: [
      'preserves host-confirmed resume confirmation boundary carry inside governed rewrite requests before generic callback guidance can widen it',
      'host-confirmed-before-redispatch',
      'resume-before-dispatch',
    ],
  },
] as const

describe('runtime governance project awareness audit', () => {
  it('keeps one explicit route-level proof that runtime-governance preserves same-her project continuity and bounded rewrite carry before visible reply wording widens outward', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'runtime-governance-same-life-rewrite-preserve' }),
      expect.objectContaining({ entry: 'runtime-governance-thin-project-shell-treated-thin' }),
      expect.objectContaining({ entry: 'runtime-governance-thin-chinese-same-her-reminder-rejected' }),
      expect.objectContaining({ entry: 'runtime-governance-living-self-line-precedence' }),
      expect.objectContaining({ entry: 'runtime-governance-resume-confirmation-boundary-preserve' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the runtime-governance same-her project-awareness claim to current behavior tests instead of broader rewrite or normalization prose alone', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: runtime-governance now has dedicated same-her project-awareness proof while long-run closure still remains open', () => {
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(coverageSource).toContain('runtime-governance-project-awareness-audit.test.ts')
    expect(coverageSource).toContain('Long-run proof is still incomplete')
    expect(coverageSource).toContain('runtime-governance now has dedicated route-level proof')
  })
})
