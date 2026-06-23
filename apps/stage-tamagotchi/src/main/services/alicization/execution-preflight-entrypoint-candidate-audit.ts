import { execFileSync } from 'node:child_process'

import { collectAlicizationExecutionPreflightGovernedFiles } from './execution-preflight-entrypoint-audit'

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

const executionRuntimeContextCandidatePattern = String.raw`buildAlicizationExecutionRuntimeContext\(`
const runtimeDispatchExecutionBridgeCandidatePattern = String.raw`ensureDispatchInvocationRuntimeContext\(`
const sessionBoundExecutionBridgeCandidatePattern = String.raw`buildExecutionRuntimeContext:`
const resumeDispatchBridgeCandidatePattern = String.raw`buildResumeDispatchPayload\(`
const capabilityProjectBriefingCandidatePattern = String.raw`\[ALICIZATION_PROJECT_BRIEFING\]`
const preDispatchPersistenceCandidatePattern = String.raw`persistExecutionRuntimeContext\(`
const blockedDispatchSafetyGateCandidatePattern = String.raw`buildBlockedDispatchSafetyGate\(`

export function collectAlicizationExecutionPreflightCandidateFiles(rootDir: string) {
  const broaderCandidateFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    '-e',
    executionRuntimeContextCandidatePattern,
    '-e',
    runtimeDispatchExecutionBridgeCandidatePattern,
    '-e',
    sessionBoundExecutionBridgeCandidatePattern,
    '-e',
    resumeDispatchBridgeCandidatePattern,
    '-e',
    capabilityProjectBriefingCandidatePattern,
    '-e',
    preDispatchPersistenceCandidatePattern,
    '-e',
    blockedDispatchSafetyGateCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])

  return [
    ...new Set([
      ...collectAlicizationExecutionPreflightGovernedFiles(rootDir),
      ...broaderCandidateFiles,
    ]),
  ].sort()
}
