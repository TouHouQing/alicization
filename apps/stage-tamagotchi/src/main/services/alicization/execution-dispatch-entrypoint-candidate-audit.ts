import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { collectAlicizationExecutionDispatchOwnerFiles } from './task-thread-dispatch-owner-audit'

function collectServiceRelativePaths(rootDir: string, args: string[]) {
  let output: string
  try {
    output = execFileSync('rg', args, { cwd: rootDir, encoding: 'utf8' })
  }
  catch (error) {
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT')
      throw error
    const matcher = new RegExp(args[1])
    const found: string[] = []
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory())
          visit(path)
        else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('-audit.ts') && matcher.test(readFileSync(path, 'utf8')))
          found.push(relative(rootDir, path).replaceAll('\\', '/'))
      }
    }
    visit(rootDir)
    return found
  }

  return output
    .split('\n')
    .map(line => line.trim())
    .map(line => line.replaceAll('\\', '/'))
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
