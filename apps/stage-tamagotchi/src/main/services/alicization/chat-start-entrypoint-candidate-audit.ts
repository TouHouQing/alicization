import { execFileSync } from 'node:child_process'

import { collectAlicizationChatStartGovernedFiles } from './chat-start-entrypoint-audit'

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

const chatStartPayloadTypeCandidatePattern = String.raw`AlicizationChatStartPayload`
const chatStartNormalizationCallerCandidatePattern = String.raw`resolveAlicizationChatStartPayloadPreDialogueSendIdentity\(`
const mainChatStartStreamCandidatePattern = String.raw`startMainChatStream\(`
const mainChatPreludeCandidatePattern = String.raw`prepareMainChatPrelude\(`
const mainChatExecutionCandidatePattern = String.raw`prepareMainChatExecution\(`
const timeoutFallbackReplyCandidatePattern = String.raw`buildAlicizationMainGatewayTimeoutFallbackReply\(`

export function collectAlicizationChatStartCandidateFiles(rootDir: string) {
  const payloadTypeConsumerFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    chatStartPayloadTypeCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const normalizationCallerFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    chatStartNormalizationCallerCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const mainChatStartStreamCallerFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    mainChatStartStreamCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const mainChatPreludeOwnerFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    mainChatPreludeCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const mainChatExecutionOwnerFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    mainChatExecutionCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const timeoutFallbackOwnerFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    timeoutFallbackReplyCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])

  return [
    ...new Set([
      ...collectAlicizationChatStartGovernedFiles(rootDir),
      ...payloadTypeConsumerFiles,
      ...normalizationCallerFiles,
      ...mainChatStartStreamCallerFiles,
      ...mainChatPreludeOwnerFiles,
      ...mainChatExecutionOwnerFiles,
      ...timeoutFallbackOwnerFiles,
    ]),
  ].sort()
}
