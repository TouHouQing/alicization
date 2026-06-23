import { execFileSync } from 'node:child_process'

import { resolveAlicizationRecoveryReentryAuditedFiles } from './recovery-reentry-entrypoint-audit'

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

const acceptedStartSettlementCandidatePattern = String.raw`export async function resolveAlicizationMainChatStartResult\(`
const acceptedStartOwnerCandidatePattern = String.raw`resolveAlicizationMainChatStartResult\(\{`
const timeoutFallbackReconstructionCandidatePattern = String.raw`export function buildAlicizationMainGatewayTimeoutFallbackReply\(`
const timeoutRecoveryFinishCandidatePattern = String.raw`export async function handleAlicizationMainChatRunFailure\(`
const backgroundRecoveryDriverCandidatePattern = String.raw`handleAlicizationMainChatRunFailure\(\{`

export function collectAlicizationRecoveryReentryCandidateFiles(rootDir: string) {
  const broaderCandidateFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    '-e',
    acceptedStartSettlementCandidatePattern,
    '-e',
    acceptedStartOwnerCandidatePattern,
    '-e',
    timeoutFallbackReconstructionCandidatePattern,
    '-e',
    timeoutRecoveryFinishCandidatePattern,
    '-e',
    backgroundRecoveryDriverCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])

  return [
    ...new Set([
      ...resolveAlicizationRecoveryReentryAuditedFiles(),
      ...broaderCandidateFiles,
    ]),
  ].sort()
}
