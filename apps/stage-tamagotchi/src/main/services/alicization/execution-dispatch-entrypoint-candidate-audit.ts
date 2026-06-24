import { execFileSync } from 'node:child_process'

import { collectAlicizationExecutionDispatchOwnerFiles } from './task-thread-dispatch-owner-audit'

function collectServiceRelativePaths(rootDir: string, args: string[]) {
  const output = execFileSync('rg', args, {
    cwd: rootDir,
    encoding: 'utf8',
  })

  return output
    .split('\n')
    .map(line => line.trim())
    .map(line => line.replace(/^\.\//, ''))
    .filter(Boolean)
}

export function collectAlicizationExecutionDispatchCandidateFiles(rootDir: string) {
  const bridgeFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    String.raw`dispatchTaskThreadWithExecutionDelivery\(|dispatchAutonomyTaskThread\(`,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const directDispatchSinkFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    String.raw`return await dispatchTaskThread\(|await options\.dispatchTaskThread\(|await input\.dispatchTaskThread\(|taskThreadOrchestrator\.dispatch\(`,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])

  return [
    ...new Set([
      ...collectAlicizationExecutionDispatchOwnerFiles(rootDir),
      ...bridgeFiles,
      ...directDispatchSinkFiles,
    ]),
  ].sort()
}
