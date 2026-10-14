import type { LifeEffect } from '../../../shared/life-contracts'

import { createHash } from 'node:crypto'

const normalizePath = (value: string) => value.replaceAll('\\', '/').toLocaleLowerCase()

/** The complete terminal ledger proves dispatch scope, never global file absence. */
export function lifeReadOnlyTurnScope(effects: LifeEffect[], turnId: string) {
  if (!effects.length || effects.length > 16)
    return null
  const paths: string[] = []
  for (const effect of effects) {
    const parameters = effect.payload.parameters as Record<string, unknown> | undefined
    const output = effect.receipt?.output as Record<string, unknown> | undefined
    if (effect.kind !== 'execute' || effect.turnId !== turnId || effect.payload.capabilityId !== 'tool.filesystem_read_file' || !['settled', 'failed'].includes(effect.status) || output?.operation !== 'read_file' || typeof parameters?.path !== 'string')
      return null
    paths.push(normalizePath(parameters.path))
  }
  if (new Set(paths).size !== 1)
    return null
  const ordered = [...effects].sort((a, b) => a.id.localeCompare(b.id))
  return { turnId, targetPath: paths[0], effectIds: ordered.map(effect => effect.id), fingerprint: createHash('sha256').update(JSON.stringify(ordered.map(({ id, generation, status, payload, receipt }) => ({ id, generation, status, payload, receipt })))).digest('hex') }
}

export function isReadOnlyNonActionQuote(quote: string) {
  const clauses = quote.split(/[，,。；;！？!?\n]/u).map(value => value.trim()).filter(Boolean)
  return clauses.length > 0 && clauses.every(clause => /^我?[也并还]?(?:没有|没|未)(?:去|到)?(?:其他地方|别的地方|别处)(?:查找|寻找|搜索|找)过?$/u.test(clause) || /^我?[也并还]?(?:没有|没|未)(?:创建|新建)(?:这个|该|新的|任何)?文件$/u.test(clause))
}

export function isCurrentReadRequest(question: string, targetPath: string) {
  return /(?:请|帮我)(?:实际)?(?:读|读取)|\b(?:please read|read this file)\b/iu.test(question)
    && !/以前|之前|昨天|上次|回顾|过去|曾经|\b(?:yesterday|last time|recap|previously)\b/iu.test(question)
    && normalizePath(question).includes(targetPath)
}
