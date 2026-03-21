import process from 'node:process'

import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

import { cac } from 'cac'
import { x } from 'tinyexec'

const defaultIdentityName = 'Alicization Local Development'
const defaultBundleIdentifier = 'com.tohoqing.alicization'
const defaultDestination = join(homedir(), 'Applications', 'Alicization Local.app')
const localSigningRoot = join(homedir(), 'Library', 'Application Support', defaultBundleIdentifier, 'local-signing')
const localKeychainPath = join(localSigningRoot, 'alicization-local-signing.keychain-db')
const localMetadataPath = join(localSigningRoot, 'identity.json')
const localCertificatePath = join(localSigningRoot, 'local-signing.cert.pem')
const localExecutableRelativePath = join('Contents', 'MacOS', 'alicization')
const macOSTccRepairServices = ['ScreenCapture', 'Accessibility'] as const

interface LocalSigningMetadata {
  identityName: string
  keychainPassword: string
  p12Password: string
}

interface SecurityIdentityEntry {
  fingerprint: string
  name: string
}

interface ResolvedSigningIdentity {
  identityName: string
  fingerprint: string
  keychainPath?: string
  source: 'apple-identity' | 'local-generated'
}

interface AppSignatureInfo {
  executablePath?: string
  identifier?: string
  cdHash?: string
  teamIdentifier?: string
  authority?: string
  designatedRequirement?: string
}

function sanitizeIdentityName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function randomSecret(bytes = 24) {
  return randomBytes(bytes).toString('hex')
}

async function run(command: string, args: string[], options?: {
  cwd?: string
  env?: NodeJS.ProcessEnv
  stdio?: 'pipe' | 'inherit'
}) {
  const result = await x(command, args, {
    cwd: options?.cwd,
    env: options?.env,
    nodeOptions: {
      stdio: options?.stdio ?? 'pipe',
    },
  })
  if (result.exitCode !== 0) {
    const stderr = String(result.stderr ?? '').trim()
    const stdout = String(result.stdout ?? '').trim()
    throw new Error([
      `${command} ${args.join(' ')} failed with exit code ${result.exitCode}.`,
      stderr || stdout || 'No command output was captured.',
    ].join('\n'))
  }
  return result
}

async function runAndReadStdout(command: string, args: string[], options?: {
  cwd?: string
  env?: NodeJS.ProcessEnv
}) {
  const result = await run(command, args, options)
  return String(result.stdout ?? '').trim()
}

async function runAndReadCombinedOutput(command: string, args: string[], options?: {
  cwd?: string
  env?: NodeJS.ProcessEnv
}) {
  const result = await run(command, args, options)
  return [String(result.stdout ?? '').trim(), String(result.stderr ?? '').trim()]
    .filter(Boolean)
    .join('\n')
    .trim()
}

function parseCodesignField(output: string, label: string) {
  const match = output.match(new RegExp(`^${label}=(.+)$`, 'm'))
  if (!match)
    return undefined

  const value = match[1].trim()
  return value === 'not set' ? undefined : value
}

async function readAppSignatureInfo(appPath: string) {
  const verboseOutput = await runAndReadCombinedOutput('codesign', ['-dvvv', appPath])
  const requirementOutput = await runAndReadCombinedOutput('codesign', ['-d', '-r-', appPath])
  const designatedRequirementMatch = requirementOutput.match(/designated => (.+)$/m)

  return {
    executablePath: parseCodesignField(verboseOutput, 'Executable'),
    identifier: parseCodesignField(verboseOutput, 'Identifier'),
    cdHash: parseCodesignField(verboseOutput, 'CDHash'),
    teamIdentifier: parseCodesignField(verboseOutput, 'TeamIdentifier'),
    authority: parseCodesignField(verboseOutput, 'Authority'),
    designatedRequirement: designatedRequirementMatch?.[1]?.trim(),
  } satisfies AppSignatureInfo
}

async function tryReadAppSignatureInfo(appPath: string) {
  if (!existsSync(appPath))
    return null

  try {
    return await readAppSignatureInfo(appPath)
  }
  catch (error) {
    console.warn(`Unable to inspect signature for ${appPath}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

async function listRunningExecutablePids(executablePath: string) {
  const raw = await runAndReadStdout('ps', ['-axo', 'pid=,command='])
  return raw
    .split('\n')
    .map((line) => {
      const trimmedLine = line.trim()
      const firstWhitespaceIndex = trimmedLine.search(/\s/)
      if (firstWhitespaceIndex <= 0)
        return null

      return {
        pid: Number.parseInt(trimmedLine.slice(0, firstWhitespaceIndex), 10),
        command: trimmedLine.slice(firstWhitespaceIndex).trim(),
      }
    })
    .filter((entry): entry is { pid: number, command: string } => Boolean(entry))
    .filter(entry =>
      entry.command === executablePath
      || entry.command.startsWith(`${executablePath} `),
    )
    .map(entry => entry.pid)
}

async function stopRunningInstalledApp(destinationAppPath: string, signature?: AppSignatureInfo | null) {
  const executablePath = signature?.executablePath ?? join(destinationAppPath, localExecutableRelativePath)
  const runningPids = await listRunningExecutablePids(executablePath)
  if (runningPids.length === 0)
    return

  console.info(`Stopping running local app before refresh: ${runningPids.join(', ')}`)
  for (const pid of runningPids) {
    try {
      process.kill(pid, 'SIGTERM')
    }
    catch {
      // Process already exited between enumeration and termination.
    }
  }

  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    const remainingPids = await listRunningExecutablePids(executablePath)
    if (remainingPids.length === 0)
      return

    await sleep(250)
  }

  const remainingPids = await listRunningExecutablePids(executablePath)
  if (remainingPids.length > 0) {
    throw new Error(`Local app is still running (${remainingPids.join(', ')}). Quit Alicization Local.app and rerun the installer.`)
  }
}

function shouldAutoRepairLocalTcc(input: {
  identity: ResolvedSigningIdentity
  previousInstallSignature: AppSignatureInfo | null
  nextInstallSignature: AppSignatureInfo
}) {
  const previous = input.previousInstallSignature
  const next = input.nextInstallSignature
  const signatureHasStableTeamIdentifier = Boolean(next.teamIdentifier)

  // NOTICE: Local self-signed identities do not carry an Apple TeamIdentifier.
  // TCC can keep ScreenCapture / Accessibility grants pinned to an older code
  // requirement even when the bundle id stays the same, so a rebuilt local app
  // may be treated as a different program until those entries are reset.
  if (input.identity.source === 'local-generated' || !signatureHasStableTeamIdentifier) {
    const signatureChanged = !previous
      || previous.cdHash !== next.cdHash
      || previous.designatedRequirement !== next.designatedRequirement
      || previous.authority !== next.authority
      || previous.teamIdentifier !== next.teamIdentifier

    return {
      shouldRepair: true,
      reason: !previous
        ? 'local-generated-first-install' as const
        : signatureChanged
          ? 'local-generated-signature-changed' as const
          : 'local-generated-refresh' as const,
    }
  }

  const signatureChanged = !previous
    || previous.cdHash !== next.cdHash
    || previous.designatedRequirement !== next.designatedRequirement
    || previous.authority !== next.authority
    || previous.teamIdentifier !== next.teamIdentifier

  if (!signatureChanged)
    return { shouldRepair: false, reason: 'signature-unchanged' as const }
  return { shouldRepair: false, reason: 'signed-with-stable-team-identity' as const }
}

function parseSecurityFindIdentityOutput(raw: string) {
  return raw
    .split('\n')
    .map((line) => {
      const match = line.match(/^\s*\d+\)\s+([0-9A-F]{40})\s+"(.+)"\s*$/)
      if (!match) {
        return null
      }
      return {
        fingerprint: match[1],
        name: match[2].trim(),
      } satisfies SecurityIdentityEntry
    })
    .filter((entry): entry is SecurityIdentityEntry => Boolean(entry))
}

async function findBuiltApp(explicitPath?: string) {
  if (explicitPath) {
    const resolved = resolve(explicitPath)
    if (!existsSync(resolved))
      throw new Error(`Source app not found: ${resolved}`)
    return resolved
  }

  const distRoot = resolve(import.meta.dirname, '..', 'dist')
  const candidates = [
    join(distRoot, 'mac-arm64', 'alicization.app'),
    join(distRoot, 'mac', 'alicization.app'),
    join(distRoot, 'mac-universal', 'alicization.app'),
    join(distRoot, 'mac-x64', 'alicization.app'),
  ].filter(candidate => existsSync(candidate))

  if (candidates.length === 0)
    throw new Error(`No built macOS app found under ${distRoot}. Run pnpm -F @proj-alicization/stage-tamagotchi build:unpack first.`)

  return candidates[0]
}

async function readLocalSigningMetadata() {
  if (!existsSync(localMetadataPath))
    return null

  const raw = await readFile(localMetadataPath, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<LocalSigningMetadata>
  if (
    typeof parsed.identityName !== 'string'
    || typeof parsed.keychainPassword !== 'string'
    || typeof parsed.p12Password !== 'string'
  ) {
    return null
  }

  return {
    identityName: sanitizeIdentityName(parsed.identityName),
    keychainPassword: parsed.keychainPassword,
    p12Password: parsed.p12Password,
  } satisfies LocalSigningMetadata
}

async function writeLocalSigningMetadata(metadata: LocalSigningMetadata) {
  await mkdir(localSigningRoot, { recursive: true })
  await writeFile(localMetadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf-8')
}

async function ensureKeychainInUserSearchList(keychainPath: string) {
  const raw = await runAndReadStdout('security', ['list-keychains', '-d', 'user'])
  const keychains = raw
    .split('\n')
    .map(line => line.trim().replace(/^"|"$/g, ''))
    .filter(candidate => candidate.length > 0 && existsSync(candidate))
    .filter((candidate, index, list) => list.indexOf(candidate) === index)
    .filter(Boolean)

  if (keychains.includes(keychainPath))
    return

  await run('security', ['list-keychains', '-d', 'user', '-s', keychainPath, ...keychains])
}

async function unlockKeychain(keychainPath: string, password: string) {
  if (!existsSync(keychainPath)) {
    await run('security', ['create-keychain', '-p', password, keychainPath])
  }

  await run('security', ['set-keychain-settings', '-lut', '21600', keychainPath])
  await run('security', ['unlock-keychain', '-p', password, keychainPath])
  await ensureKeychainInUserSearchList(keychainPath)
}

async function listCodesigningIdentities(keychainPath?: string) {
  const args = ['find-identity', '-v', '-p', 'codesigning']
  if (keychainPath) {
    args.push(keychainPath)
  }
  return parseSecurityFindIdentityOutput(await runAndReadStdout('security', args))
}

async function trustLocalCertificate(certificatePath: string, keychainPath: string) {
  await run('security', ['add-trusted-cert', '-d', '-r', 'trustRoot', '-k', keychainPath, certificatePath])
}

async function resetDedicatedLocalSigningKeychain(password: string) {
  await run('security', ['delete-keychain', localKeychainPath]).catch(() => undefined)
  await rm(localKeychainPath, { force: true })
  await unlockKeychain(localKeychainPath, password)
}

async function ensureGeneratedLocalSigningIdentity(identityName: string) {
  const metadata = await readLocalSigningMetadata() ?? {
    identityName,
    keychainPassword: randomSecret(),
    p12Password: randomSecret(),
  } satisfies LocalSigningMetadata

  if (sanitizeIdentityName(metadata.identityName) !== identityName) {
    metadata.identityName = identityName
  }

  await mkdir(localSigningRoot, { recursive: true })
  await unlockKeychain(localKeychainPath, metadata.keychainPassword)

  const existing = (await listCodesigningIdentities(localKeychainPath))
    .find(entry => entry.name === identityName)
  if (existing) {
    await writeLocalSigningMetadata(metadata)
    return {
      identityName,
      fingerprint: existing.fingerprint,
      keychainPath: localKeychainPath,
      source: 'local-generated',
    } satisfies ResolvedSigningIdentity
  }

  if (existsSync(localKeychainPath)) {
    await resetDedicatedLocalSigningKeychain(metadata.keychainPassword)
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'alicization-local-signing-'))
  const opensslConfigPath = join(tempDir, 'codesign.cnf')
  const privateKeyPath = join(tempDir, 'local-signing.key.pem')
  const certificatePath = join(tempDir, 'local-signing.cert.pem')
  const archivePath = join(tempDir, 'local-signing.p12')

  try {
    await writeFile(opensslConfigPath, [
      '[ req ]',
      'distinguished_name = dn',
      'x509_extensions = ext',
      'prompt = no',
      '[ dn ]',
      `CN = ${identityName}`,
      'O = Alicization Local',
      '[ ext ]',
      'basicConstraints = critical,CA:TRUE',
      'keyUsage = critical,digitalSignature,keyCertSign,cRLSign',
      'extendedKeyUsage = codeSigning',
      'subjectKeyIdentifier = hash',
      'authorityKeyIdentifier = keyid:always,issuer',
      '',
    ].join('\n'), 'utf-8')

    await run('openssl', [
      'req',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      privateKeyPath,
      '-x509',
      '-days',
      '3650',
      '-out',
      certificatePath,
      '-config',
      opensslConfigPath,
    ])
    await writeFile(localCertificatePath, await readFile(certificatePath))
    await run('openssl', [
      'pkcs12',
      '-export',
      '-legacy',
      '-out',
      archivePath,
      '-inkey',
      privateKeyPath,
      '-in',
      certificatePath,
      '-name',
      identityName,
      '-passout',
      `pass:${metadata.p12Password}`,
    ])
    await run('security', [
      'import',
      archivePath,
      '-k',
      localKeychainPath,
      '-P',
      metadata.p12Password,
      '-A',
      '-T',
      '/usr/bin/codesign',
      '-T',
      '/usr/bin/security',
    ])
    await trustLocalCertificate(localCertificatePath, localKeychainPath)
    await run('security', [
      'set-key-partition-list',
      '-S',
      'apple-tool:,apple:,codesign:',
      '-s',
      '-k',
      metadata.keychainPassword,
      localKeychainPath,
    ])
    const importedIdentity = (await listCodesigningIdentities(localKeychainPath))
      .find(entry => entry.name === identityName)
    if (!importedIdentity) {
      throw new Error(`Imported local signing identity was not discoverable in keychain ${localKeychainPath}.`)
    }
    await writeLocalSigningMetadata(metadata)
    return {
      identityName,
      fingerprint: importedIdentity.fingerprint,
      keychainPath: localKeychainPath,
      source: 'local-generated',
    } satisfies ResolvedSigningIdentity
  }
  finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function resolveSigningIdentity(preferredIdentity?: string) {
  const requestedIdentity = sanitizeIdentityName(preferredIdentity ?? process.env.ALICIZATION_LOCAL_CODESIGN_IDENTITY ?? '')
  if (requestedIdentity) {
    return await ensureGeneratedLocalSigningIdentity(requestedIdentity)
  }

  const availableIdentities = await listCodesigningIdentities()
  const appleIdentity = availableIdentities.find(identity =>
    /^(?:Apple Development|Developer ID Application):/.test(identity.name),
  )
  if (appleIdentity) {
    return {
      identityName: appleIdentity.name,
      fingerprint: appleIdentity.fingerprint,
      source: 'apple-identity',
    } satisfies ResolvedSigningIdentity
  }

  return await ensureGeneratedLocalSigningIdentity(defaultIdentityName)
}

async function signAppBundle(input: {
  appPath: string
  identity: ResolvedSigningIdentity
}) {
  const args = [
    '--force',
    '--deep',
    '--sign',
    input.identity.fingerprint,
  ]
  if (input.identity.keychainPath) {
    args.push('--keychain', input.identity.keychainPath)
  }
  args.push(input.appPath)
  await run('codesign', args, { stdio: 'inherit' })

  const verifyArgs = ['--verify', '--deep', '--strict', '--verbose=2']
  if (input.identity.keychainPath) {
    verifyArgs.push('--keychain', input.identity.keychainPath)
  }
  verifyArgs.push(input.appPath)
  await run('codesign', verifyArgs, { stdio: 'inherit' })
}

async function installAppBundle(input: {
  sourceAppPath: string
  destinationAppPath: string
  identity: ResolvedSigningIdentity
}) {
  await mkdir(dirname(input.destinationAppPath), { recursive: true })
  await rm(input.destinationAppPath, { recursive: true, force: true })
  await run('ditto', [input.sourceAppPath, input.destinationAppPath], { stdio: 'inherit' })
  await run('xattr', ['-dr', 'com.apple.quarantine', input.destinationAppPath]).catch(() => undefined)
  await signAppBundle({
    appPath: input.destinationAppPath,
    identity: input.identity,
  })
}

async function resetTccService(bundleIdentifier: string, service: typeof macOSTccRepairServices[number]) {
  await run('tccutil', ['reset', service, bundleIdentifier], { stdio: 'inherit' }).catch(() => undefined)
}

async function repairInstalledLocalAppPrivacyState(input: {
  destinationAppPath: string
  reason: string
}) {
  const installedSignature = await tryReadAppSignatureInfo(input.destinationAppPath)
  if (!installedSignature) {
    throw new Error(`Installed app not found or unsigned: ${input.destinationAppPath}`)
  }

  await stopRunningInstalledApp(input.destinationAppPath, installedSignature)

  console.info(`Installed CDHash: ${installedSignature.cdHash ?? 'unknown'}`)
  console.info(`Installed TeamIdentifier: ${installedSignature.teamIdentifier ?? 'not set'}`)
  console.info(`Repairing local macOS privacy state (${input.reason}) for ${defaultBundleIdentifier}`)
  for (const service of macOSTccRepairServices) {
    console.info(`Resetting ${service} permission for ${defaultBundleIdentifier}`)
    await resetTccService(defaultBundleIdentifier, service)
  }

  console.info('')
  console.info('Local macOS privacy state is repaired.')
  console.info(`Relaunch this bundle and re-enable Screen Recording plus Accessibility:`)
  console.info(`open "${input.destinationAppPath}"`)
}

async function main() {
  const cli = cac('install-local-mac-app')
    .option('--source <path>', 'Explicit source .app bundle path')
    .option('--destination <path>', 'Destination .app bundle path', { default: defaultDestination })
    .option('--identity <name>', 'Preferred signing identity name')
    .option('--reset-tcc', 'Force-reset ScreenCapture and Accessibility TCC entries after installing', { default: false })
    .option('--repair-tcc-only', 'Reset ScreenCapture and Accessibility for the installed local app without rebuilding', { default: false })
    .option('--skip-tcc-repair', 'Skip automatic TCC repair for changed local-generated builds', { default: false })
    .help()

  const args = cli.parse()
  const options = args.options as {
    source?: string
    destination: string
    identity?: string
    resetTcc: boolean
    repairTccOnly: boolean
    skipTccRepair: boolean
  }

  if (process.platform !== 'darwin')
    throw new Error('install-local-mac-app.ts is only supported on macOS.')

  const destinationAppPath = resolve(options.destination)
  if (options.repairTccOnly) {
    await repairInstalledLocalAppPrivacyState({
      destinationAppPath,
      reason: options.resetTcc ? 'forced-repair-only' : 'repair-only',
    })
    return
  }

  const sourceAppPath = await findBuiltApp(options.source)
  const identity = await resolveSigningIdentity(options.identity)

  console.info(`Using source app: ${sourceAppPath}`)
  console.info(`Installing to: ${destinationAppPath}`)
  console.info(`Signing identity: ${identity.identityName} [${identity.fingerprint}] (${identity.source})`)
  if (identity.keychainPath)
    console.info(`Signing keychain: ${identity.keychainPath}`)

  const previousInstallSignature = await tryReadAppSignatureInfo(destinationAppPath)
  await stopRunningInstalledApp(destinationAppPath, previousInstallSignature)

  await installAppBundle({
    sourceAppPath,
    destinationAppPath,
    identity,
  })

  const installedSignature = await readAppSignatureInfo(destinationAppPath)
  console.info(`Installed CDHash: ${installedSignature.cdHash ?? 'unknown'}`)
  console.info(`Installed TeamIdentifier: ${installedSignature.teamIdentifier ?? 'not set'}`)

  const autoTccRepair = shouldAutoRepairLocalTcc({
    identity,
    previousInstallSignature,
    nextInstallSignature: installedSignature,
  })
  const shouldRepairTcc = options.resetTcc || (!options.skipTccRepair && autoTccRepair.shouldRepair)

  if (shouldRepairTcc) {
    const repairReason = options.resetTcc ? 'forced-reset' : autoTccRepair.reason
    console.info(`Repairing local macOS privacy state (${repairReason}) for ${defaultBundleIdentifier}`)
    for (const service of macOSTccRepairServices) {
      console.info(`Resetting ${service} permission for ${defaultBundleIdentifier}`)
      await resetTccService(defaultBundleIdentifier, service)
    }
  }

  console.info('')
  console.info('Local macOS Alicization app is ready.')
  console.info(`Launch this bundle from Finder or terminal:`)
  console.info(`open "${destinationAppPath}"`)
  console.info('')
  if (shouldRepairTcc) {
    console.info('macOS privacy permissions were reset for this local build because the signed app identity changed in a way that TCC can treat as a different program.')
    console.info('Reopen Alicization Local.app, then re-enable Screen Recording and Accessibility for this installed app once.')
  }
  else {
    console.info('If you are migrating from an older ad-hoc build, grant Screen Recording once to this installed app and reuse this installed bundle for future local runs.')
  }
  console.info(`Do not keep launching the raw dist bundle: ${basename(sourceAppPath)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
