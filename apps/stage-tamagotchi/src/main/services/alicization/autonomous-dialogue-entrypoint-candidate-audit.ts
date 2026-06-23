import { execFileSync } from 'node:child_process'

import { collectAlicizationAutonomousDialogueGovernedFiles } from './autonomous-dialogue-entrypoint-audit'

function collectServiceRelativePaths(rootDir: string, args: string[]) {
  let output = ''
  try {
    output = execFileSync('rg', args, {
      cwd: rootDir,
      encoding: 'utf8',
    })
  }
  catch (error: any) {
    if (error?.status !== 1)
      throw error
  }

  return output
    .split('\n')
    .map(line => line.trim())
    .map(line => line.replace(/^\.\//, ''))
    .filter(Boolean)
}

function intersectRelativePaths(left: string[], right: string[]) {
  return left.filter(relativePath => right.includes(relativePath))
}

const proactiveAuthorityCandidatePattern = String.raw`ALICIZATION_PROACTIVE_SELF_BRIEF`
const proactiveGatewayStructuredFormatCandidatePattern = String.raw`resolveAlicizationAutonomousDialogueStructuredFormat\('subconscious-proactive-llm'\)`
const autonomousDialogueTurnIdCandidatePattern = String.raw`buildAlicizationAutonomousDialogueTurnId\(`
const reminderOrCallbackKindCandidatePattern = String.raw`kind: '(reminder|execution-callback)'`
const reminderGatewayStructuredFormatCandidatePattern = String.raw`resolveAlicizationAutonomousDialogueStructuredFormat\('subconscious-reminder'\)`
const subconsciousKindCandidatePattern = String.raw`kind: 'subconscious'`
const subconsciousStructuredFormatCandidatePattern = String.raw`resolveAlicizationAutonomousDialogueStructuredFormat\('subconscious-proactive'\)`

export function collectAlicizationAutonomousDialogueCandidateFiles(rootDir: string) {
  const proactiveAuthorityFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    proactiveAuthorityCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const proactiveGatewayStructuredFormatFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    proactiveGatewayStructuredFormatCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const autonomousDialogueTurnIdFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    autonomousDialogueTurnIdCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const reminderOrCallbackKindFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    '-P',
    reminderOrCallbackKindCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const reminderGatewayStructuredFormatFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    reminderGatewayStructuredFormatCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const subconsciousKindFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    subconsciousKindCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const subconsciousStructuredFormatFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    subconsciousStructuredFormatCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])

  const reminderOrCallbackEntryFiles = intersectRelativePaths(
    autonomousDialogueTurnIdFiles,
    reminderOrCallbackKindFiles,
  )
  const subconsciousEntryFiles = intersectRelativePaths(
    autonomousDialogueTurnIdFiles,
    intersectRelativePaths(subconsciousKindFiles, subconsciousStructuredFormatFiles),
  )

  return [
    ...new Set([
      ...collectAlicizationAutonomousDialogueGovernedFiles(rootDir),
      ...proactiveAuthorityFiles,
      ...proactiveGatewayStructuredFormatFiles,
      ...reminderOrCallbackEntryFiles,
      ...reminderGatewayStructuredFormatFiles,
      ...subconsciousEntryFiles,
    ]),
  ].sort()
}
