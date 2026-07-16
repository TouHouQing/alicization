import { execFileSync } from 'node:child_process'

import { collectAlicizationDirectProviderImportFiles } from './project-state-gateway-entrypoint-audit'
import { collectAlicizationProviderConsumerGovernedFiles } from './provider-consumer-entrypoint-audit'

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

const providerWrapperImportPattern = String.raw`from '@xsai/generate-text'`
const providerWrapperAuditFamilyPattern = String.raw`resolveAlicizationMainGatewayAuditFamilyForSource|isAlicizationRegisteredMainGatewaySource`
const providerDispatchOwnerCandidatePattern = String.raw`mainGatewayTextProvider\(`
const typedProviderConsumerCandidatePattern = String.raw`generateMainGatewayText:\s*Alicization(MainGatewayGenerateTextProvider|MemoryGatewayTextProvider)`
const directProviderSinkCandidatePattern = String.raw`invokeGenerateText\(|generateText\(|invokeStreamText\(|streamText\(`

export function collectAlicizationProviderConsumerCandidateFiles(rootDir: string) {
  const directProviderEntryFiles = collectAlicizationDirectProviderImportFiles(rootDir)
  const providerWrapperImportFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    providerWrapperImportPattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const providerWrapperAuditFamilyFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    '-P',
    providerWrapperAuditFamilyPattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const providerWrapperFiles = providerWrapperImportFiles.filter(relativePath =>
    providerWrapperAuditFamilyFiles.includes(relativePath),
  )
  const dispatchOwnerFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    providerDispatchOwnerCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const typedConsumerFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    typedProviderConsumerCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
  const directProviderSinkFiles = collectServiceRelativePaths(rootDir, [
    '-l',
    '-P',
    directProviderSinkCandidatePattern,
    '.',
    '-g',
    '!**/*.test.ts',
    '-g',
    '!**/*-audit.ts',
  ])
    .filter(relativePath => directProviderEntryFiles.includes(relativePath))

  return [
    ...new Set([
      ...collectAlicizationProviderConsumerGovernedFiles(rootDir),
      ...directProviderEntryFiles,
      ...directProviderSinkFiles,
      ...providerWrapperFiles,
      ...dispatchOwnerFiles,
      ...typedConsumerFiles,
    ]),
  ].sort()
}
