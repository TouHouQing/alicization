import { execFileSync } from 'node:child_process'

import { resolveAlicizationExecutionFollowUpContinuityAuditFiles } from './execution-follow-up-entrypoint-audit'

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

const callbackRuntimeCandidatePattern = String.raw`export function createAlicizationExecutionCallbackRuntime\(`
const callbackDoctrineCandidatePattern = String.raw`executionCallbackDoctrineCue \? \`execution-callback-doctrine:\$\{executionCallbackDoctrineCue\}\` : null`
const callbackDeliveryCandidatePattern = String.raw`callback_context=execution-result; runtime_context=local_runtime; failure_surface=transparent`
const callbackPayoffCandidatePattern = String.raw`export function buildAlicizationExecutionPayoffPrompt\(`
const callbackCapabilityProjectBriefingCandidatePattern = String.raw`briefing_scope=execution_capability-structured \| owner=execution-runtime-context`
const followUpObligationCandidatePattern = String.raw`export function deriveMainChatExecutionReplyObligation\(`
const followUpResponseContractCandidatePattern = String.raw`executionReplyObligation: input\.executionReplyObligation \?\? null`
const followUpSystemBlockCandidatePattern = String.raw`buildMainChatExecutionReplyObligationSystemBlock\(`
const ledgerRecallCandidatePattern = String.raw`export function createAlicizationMemoryLedgerRuntime\(`
const afterglowLearningCandidatePattern = String.raw`executionCallbackAfterglowHold \? \['callback-afterglow-hold'\]`
const callbackPersistenceCandidatePattern = String.raw`const callbackAfterglowHold = deliveryPolicy\.reasonTags\.includes\('callback-afterglow-hold'\)`

export function collectAlicizationExecutionFollowUpCandidateFiles(rootDir: string) {
  const broaderCandidateFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    '-e',
    callbackRuntimeCandidatePattern,
    '-e',
    callbackDoctrineCandidatePattern,
    '-e',
    callbackDeliveryCandidatePattern,
    '-e',
    callbackPayoffCandidatePattern,
    '-e',
    callbackCapabilityProjectBriefingCandidatePattern,
    '-e',
    followUpObligationCandidatePattern,
    '-e',
    followUpResponseContractCandidatePattern,
    '-e',
    followUpSystemBlockCandidatePattern,
    '-e',
    ledgerRecallCandidatePattern,
    '-e',
    afterglowLearningCandidatePattern,
    '-e',
    callbackPersistenceCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])

  return [
    ...new Set([
      ...resolveAlicizationExecutionFollowUpContinuityAuditFiles(),
      ...broaderCandidateFiles,
    ]),
  ].sort()
}
