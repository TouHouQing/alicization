import type { Buffer } from 'node:buffer'

import process from 'node:process'

import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, readdir, readFile, readlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const runFile = promisify(execFile)
const digest = (content: string | Uint8Array) => createHash('sha256').update(content).digest('hex')
async function hashFile(file: string) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
async function git(args: string[]) {
  return (await runFile('git', args, { cwd: workspace, windowsHide: true, maxBuffer: 16 * 1024 * 1024 })).stdout.trim()
}
async function tree(directory: string, root = directory): Promise<Array<{ path: string, sha256: string }>> {
  const rows: Array<{ path: string, sha256: string }> = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name)
    if (entry.isDirectory())
      rows.push(...await tree(file, root))
    else rows.push({ path: relative(root, file).replaceAll('\\', '/'), sha256: await hashFile(file) })
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path))
}
async function sourceFiles() {
  const paths = (await git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'])).split('\0').filter(Boolean)
  const inputs = paths.filter(file => file.startsWith('apps/stage-tamagotchi/src/') || file.startsWith('apps/stage-tamagotchi/resources/') || file.startsWith('packages/') || file.startsWith('patches/') || ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'uno.config.ts', 'tsconfig.json', 'apps/stage-tamagotchi/package.json', 'apps/stage-tamagotchi/electron-builder.config.ts', 'apps/stage-tamagotchi/electron-builder.yml', 'apps/stage-tamagotchi/electron.vite.config.ts'].includes(file)).filter(file => !file.includes('/node_modules/') && !file.includes('/dist/') && !file.includes('/out/')).sort()
  const sources: Array<{ path: string, sha256: string | null }> = []
  for (const file of inputs) {
    const absolute = join(workspace, file)
    const stat = await lstat(absolute).catch(() => null)
    sources.push({ path: file, sha256: !stat ? null : stat.isSymbolicLink() ? digest(`symlink:${await readlink(absolute)}`) : await hashFile(absolute) })
  }
  return sources
}
function ownedEvidencePath(file: string) {
  const target = resolve(workspace, file)
  if (!target.startsWith(`${join(workspace, 'output')}\\`))
    throw new Error('Verification evidence must remain in workspace output')
  return target
}
interface ExperienceEvidence {
  format: 'life-experience-release-evidence-v1'
  buildSourceSnapshot: string
  reports: string[]
  nativeReports: string[]
  logs: string[]
  nativeObservationScope: string
  packagedNativeVerified: boolean
  residentLifeVerified?: boolean
  interactionIntentVerified?: boolean
  realExperienceVerified?: boolean
  productExperienceVerified?: boolean
}
async function main() {
  const sources = await sourceFiles()
  if (process.argv[2] === '--snapshot') {
    const target = ownedEvidencePath(process.argv[3] ?? '')
    await writeFile(target, JSON.stringify({ recordedAt: new Date().toISOString(), sourceFingerprint: digest(JSON.stringify(sources)), sourceFiles: sources }, null, 2))
    console.info(JSON.stringify({ snapshot: target, sourceFingerprint: digest(JSON.stringify(sources)) }))
    return
  }
  const release = resolve(process.argv[2] ?? join(workspace, 'apps/stage-tamagotchi/dist/life-phase1-20261005'))
  if (!release.startsWith(`${join(workspace, 'apps/stage-tamagotchi/dist')}\\`))
    throw new Error('Release provenance only writes to a workspace desktop artifact directory')
  const evidence = process.argv[3] ? JSON.parse(await readFile(ownedEvidencePath(process.argv[3]), 'utf8')) as ExperienceEvidence : null
  if (evidence) {
    if (evidence.format !== 'life-experience-release-evidence-v1' || !evidence.reports?.length || !evidence.nativeReports?.length || !evidence.logs?.length)
      throw new Error('Experience release requires tests, native observation evidence and build logs')
    for (const file of [...evidence.reports, ...evidence.nativeReports, ...evidence.logs]) ownedEvidencePath(file)
    const before = JSON.parse(await readFile(ownedEvidencePath(evidence.buildSourceSnapshot), 'utf8'))
    if (before.sourceFingerprint !== digest(JSON.stringify(sources)))
      throw new Error('Production source inputs changed after the build snapshot')
  }
  const compiled = await tree(join(workspace, 'apps/stage-tamagotchi/out'))
  const require = createRequire(join(workspace, 'apps/stage-tamagotchi/package.json'))
  const builderRequire = createRequire(require.resolve('electron-builder'))
  const asarRequire = createRequire(builderRequire.resolve('app-builder-lib'))
  const asar = asarRequire('@electron/asar') as { extractFile: (path: string, file: string) => Buffer }
  const packagedAsar = join(release, 'win-unpacked/resources/app.asar')
  // The installed asar reader resolves archive paths using native separators.
  const packagedMainHash = digest(asar.extractFile(packagedAsar, join('out', 'main', 'index.js')))
  if (packagedMainHash !== await hashFile(join(workspace, 'apps/stage-tamagotchi/out/main/index.js')))
    throw new Error('Packaged main does not match the current compiled runtime')
  for (const file of compiled) {
    if (digest(asar.extractFile(packagedAsar, join('out', ...file.path.split('/')))) !== file.sha256)
      throw new Error(`Packaged output differs: ${file.path}`)
  }
  for (const name of ['pi-license.txt', 'pi-file-tools-license.txt', 'pi-file-tools-notice.txt', 'neko-license.txt', 'neko-notice.txt', 'talkinghead-license.txt', 'neko-motion/LICENSE.txt', 'neko-motion/NOTICE.txt', 'neko-motion/source-manifest.json']) {
    const notice = join('resources', 'licenses', name)
    if (digest(asar.extractFile(packagedAsar, notice)) !== await hashFile(join(workspace, 'apps/stage-tamagotchi', notice)))
      throw new Error(`The adapted module must ship its exact upstream license: ${name}`)
  }
  const artifactNames = (await readdir(release)).filter(file => file.endsWith('.exe') || file.endsWith('.blockmap') || file === 'latest.yml')
  const artifacts = await Promise.all(artifactNames.map(async file => ({ path: file, bytes: (await lstat(join(release, file))).size, sha256: await hashFile(join(release, file)) })))
  const reports = evidence ? [...evidence.reports, ...evidence.nativeReports] : ['output/life-desktop-visible-auth-final-20261005.json', 'output/life-expression-delivery-final-20261005.json', 'output/life-acceptance/nodes.json', 'output/life-acceptance/installer.json', 'output/life-acceptance/configured-persona-pairs.json', 'output/life-acceptance/configured-policy-pairs.json', 'output/life-acceptance/codex-real.json', 'output/life-acceptance/memory-100k.json']
  const packagedAsarSha256 = await hashFile(packagedAsar)
  const packagedScenes = new Set<string>()
  const actualExperiences: Array<{ path: string, parentReport: string | null }> = []
  const productExperiences: string[] = []
  const verification = await Promise.all(reports.map(async (file) => {
    const report = JSON.parse(await readFile(join(workspace, file), 'utf8'))
    if (evidence?.nativeReports.includes(file) && (report.diagnosticSource || ['life-actual-experience-diagnostic-v1', 'life-grounding-live-probe-v1', 'life-current-requirements-live-probe-v1'].includes(report.format)))
      throw new Error(`Diagnostic continuation cannot serve as release acceptance: ${file}`)
    if (typeof report.numFailedTests === 'number' && report.numFailedTests !== 0)
      throw new Error(`Release verification has failing tests: ${file}`)
    if (typeof report.numFailedTestSuites === 'number' && report.numFailedTestSuites !== 0)
      throw new Error(`Release verification has unexecuted or failed suites: ${file}`)
    if (report.format === 'life-node-coverage-v1') {
      if (report.passed !== true || report.nodes?.length !== 18 || new Set(report.nodes.map((node: { node: string }) => node.node)).size !== 18 || !report.nodes.every((node: { passed: boolean, suites: Array<{ passed: boolean, tests: number }> }) => node.passed && node.suites.length > 0 && node.suites.every(suite => suite.passed && suite.tests > 0)))
        throw new Error(`All eighteen nodes require executed, passing coverage: ${file}`)
      if (await hashFile(ownedEvidencePath(report.sourceReport)) !== report.sourceReportSha256)
        throw new Error(`Node coverage no longer matches its full regression report: ${file}`)
    }
    if (evidence?.nativeReports.includes(file) && report.passed !== true)
      throw new Error(`Native observation did not pass: ${file}`)
    if (evidence?.nativeReports.includes(file) && report.format === 'life-product-regression-v1') {
      const requiredPages = ['persona-preview', 'connection-failure', 'model-selected-awaiting-confirmation', 'valid-dropped-card', 'kokoro-offline-feedback', 'tray-about', 'tray-widgets', 'actual-model-reply', 'chat-import-persisted']
      if (report.packagedAsarSha256 !== packagedAsarSha256 || resolve(report.executable ?? '').toLowerCase() !== join(release, 'win-unpacked/alicization.exe').toLowerCase() || !/^AlicizationQA_[a-f0-9]{32}$/u.test(report.privateDesktop ?? '') || report.nativeRuntime?.privateDesktopVerified !== true || report.nativeRuntime?.desktop !== report.privateDesktop || report.syntheticIdentity !== true || report.credentialsRemoved !== true || report.shutdown?.completed !== true || report.shutdown?.exitCode !== 0 || !Number.isFinite(report.shutdown?.elapsedMs) || report.shutdown.elapsedMs > 60_000 || report.errors?.length !== 0 || report.rawKeyPages?.length !== 0 || report.kokoroOfflineFixture !== true || !report.checks?.length || !report.checks.every((check: { passed: boolean }) => check.passed) || (report.pages?.length ?? 0) < 90 || !requiredPages.every(name => report.pages.some((page: { name: string }) => page.name === name)) || !report.actualReplyText?.includes('小艾'))
        throw new Error(`Product experience requires complete observations of this exact isolated package and a normal exit: ${file}`)
      for (const page of report.pages) {
        if (!(await lstat(ownedEvidencePath(page.screenshot))).isFile())
          throw new Error(`Product observation screenshot is missing: ${file}, ${page.name}`)
      }
      productExperiences.push(file)
    }
    if (evidence?.nativeReports.includes(file) && ['life-quality-experience-v1', 'life-quality-execution-v1', 'life-completion-experience-v1', 'life-completion-execution-v1'].includes(report.format)) {
      if (report.completed !== true || report.packagedAsarSha256 !== packagedAsarSha256 || resolve(report.executable).toLowerCase() !== join(release, 'win-unpacked/alicization.exe').toLowerCase() || !/^AlicizationQA_[a-f0-9]{32}$/u.test(report.privateDesktop ?? '') || !report.audioOutputMuted || !report.observations?.allWindowsMuted || report.errors?.length || !report.scenarios?.length)
        throw new Error(`Quality acceptance did not observe this exact isolated package: ${file}`)
      for (const scene of report.scenarios.filter((scene: { name: string }) => scene.name !== 'native-pause-flow')) {
        if (!scene.dialogue?.length || !scene.dialogue.every((event: { isFallback: boolean }) => event.isFallback === false) || !scene.playback?.length || !scene.playback.every((turn: { utterances: string[] }) => turn.utterances.length === 1))
          throw new Error(`Quality acceptance lacks real accepted dialogue and owned speech: ${file}, ${scene.name}`)
      }
      if (report.format === 'life-completion-experience-v1') {
        if (!report.observations.acceptance || !Object.values(report.observations.acceptance).every(Boolean) || report.observations.probeFailures?.length || report.observations.voice?.failures?.length || JSON.stringify(report.observations.initialPersonality) !== JSON.stringify(report.observations.personalityAfterMood))
          throw new Error(`Life completion acceptance has an open criterion: ${file}`)
        if (!report.parentReport && ((report.observations.idleSamples?.length ?? 0) < 12 || report.observations.idleSamples[11].elapsedMs < 360000 || report.observations.executionFile?.content !== '雨声陪伴'))
          throw new Error(`The natural-life interval and bounded execution were not observed: ${file}`)
        actualExperiences.push({ path: file, parentReport: report.parentReport ?? null })
      }
      else if (report.format === 'life-quality-experience-v1') {
        const quiet = report.observations.quietMouth
        if (!quiet || quiet.frames < 8 || quiet.aaPeak > 0.02 || quiet.ohPeak > 0.02 || report.observations.probeFailures?.length !== 0 || report.observations.implicitIntervalReviewed !== true || JSON.stringify(report.observations.initialPersonality) !== JSON.stringify(report.observations.personalityAfterMood))
          throw new Error(`Quiet mouth or personhood continuity failed: ${file}`)
        if (report.parentReport) {
          if (!report.observations.restartBeforeInput?.facts?.some((fact: { current: boolean, lifecycle: string, value: unknown }) => fact.current && fact.lifecycle === 'active' && JSON.stringify(fact.value).includes('钢琴')) || !report.scenarios.some((scene: { name: string }) => scene.name === 'restart-memory'))
            throw new Error(`Restart evidence was not present before resumed input: ${file}`)
        }
        else if (report.observations.executionFile?.content !== '雨声陪伴' || report.observations.idleSamples?.length !== 6) {
          throw new Error(`Bounded file result and actual quiet interval were not observed: ${file}`)
        }
        actualExperiences.push({ path: file, parentReport: report.parentReport ?? null })
      }
      else {
        if (report.format === 'life-completion-execution-v1' && (!report.observations.modalChainVerified || !report.observations.actualPause?.oldBytesPreserved || !report.observations.actualPause.pendingReplacementInterrupted))
          throw new Error(`Actual popup ownership, pause and file preservation were not verified: ${file}`)
        for (const kind of ['browser', 'native']) {
          const proof = report.observations.independentFiles?.[kind]
          if (!proof?.path || !resolve(proof.path).startsWith(`${resolve(report.output)}\\`) || await hashFile(proof.path) !== proof.sha256)
            throw new Error(`Independent ${kind} result no longer matches: ${file}`)
        }
      }
    }
    if (evidence?.realExperienceVerified && report.format === 'life-actual-experience-v1') {
      if (report.completed !== true || report.packagedAsarSha256 !== packagedAsarSha256 || resolve(report.executable).toLowerCase() !== join(release, 'win-unpacked/alicization.exe').toLowerCase() || !/^AlicizationQA_[a-f0-9]{32}$/u.test(report.privateDesktop ?? '') || !report.audioOutputMuted || !report.observations?.allWindowsMuted || report.errors?.length || !report.scenarios?.length)
        throw new Error(`Real experience did not observe this exact muted, isolated package: ${file}`)
      for (const scene of report.scenarios.filter((scene: { name: string }) => scene.name !== 'native-pause-flow')) {
        if (!scene.dialogue?.length || !scene.dialogue.every((event: { isFallback: boolean }) => event.isFallback === false) || !scene.samples.some((frame: { intent: string | null, intentTurnId: string | null }) => frame.intent && scene.dialogue.some((event: { turnId: string }) => event.turnId === frame.intentTurnId)))
          throw new Error(`Real dialogue or its turn-owned body intent failed: ${file}, ${scene.name}`)
        if (!scene.dialogue.every((event: { turnId: string }) => report.observations.life?.playbackByTurn?.some((turn: { turnId: string, utterances: string[] }) => turn.turnId === event.turnId.replace(/:gw\d+$/u, '') && turn.utterances.length === 1)))
          throw new Error(`Actual speech does not have one owner for every accepted turn: ${file}, ${scene.name}`)
      }
      const declined = report.scenarios.find((scene: { name: string }) => scene.name === '16-declined-execution')
      const declinedPath = report.observations.deniedExecution?.path
      if (!declined || !declinedPath || !resolve(declinedPath).startsWith(`${resolve(report.output)}\\`) || report.observations.deniedExecution.exists !== false || report.observations.deniedExecution.refusalRespected !== true || declined.permissions?.length !== 1 || declined.permissions[0].allowed !== false || declined.permissions[0].exactArgumentsObserved !== true || !report.observations.life?.declinedOperations?.some((operation: { turnId: string, path: string, errorCode: string }) => typeof operation.path === 'string' && resolve(operation.path).toLowerCase() === resolve(declinedPath).toLowerCase() && operation.errorCode === 'ALICIZATION_TOOL_DENIED_BY_HOST' && declined.dialogue.some((event: { turnId: string }) => event.turnId === operation.turnId)))
        throw new Error(`Actual refused execution and its accepted speech are not proven: ${file}`)
      if (await lstat(declinedPath).then(() => true, error => error.code === 'ENOENT' ? false : Promise.reject(error)))
        throw new Error(`A refused operation created its file: ${file}`)
      const creativeObservation = report.observations.lifeBeforeCorrection ?? report.observations.life
      if (report.observations.executionFile?.content !== '雨声陪伴' || report.observations.quiet?.messages?.length !== 0 || !creativeObservation?.goals.some((goal: { kind: string, status: string, artifact?: { currentHashMatches: boolean } }) => goal.kind === 'personal-project' && goal.status === 'fulfilled' && goal.artifact?.currentHashMatches))
        throw new Error(`File execution, quiet restraint or personal activity is not proven: ${file}`)
      if (report.observations.outreachPolicy?.quietEnabled !== false || report.observations.quietBoundary?.release !== 'next-host-turn' || report.observations.life?.quietBoundary !== null || report.observations.voice?.failures?.length !== 0 || !report.observations.projectFeedback?.feedback?.some((item: { feedback: string }) => item.feedback === 'positive'))
        throw new Error(`Host quiet boundary, actual speech or presented project feedback is not proven: ${file}`)
      const returnScene = report.scenarios.find((scene: { name: string }) => scene.name === '11-return-from-quiet')
      if (!returnScene || !returnScene.dialogue.every((event: { turnId: string }) => report.observations.life.intervalReviews?.some((review: { turnId: string, accepted: boolean, requestedIntervalHash: string }) => review.turnId === event.turnId && review.accepted && review.requestedIntervalHash)))
        throw new Error(`Actual quiet-period activity has no accepted interval review: ${file}`)
      actualExperiences.push({ path: file, parentReport: report.parentReport })
      if (report.parentReport) {
        const recall = report.scenarios.find((scene: { name: string }) => scene.name === '15-current-memory')
        const text = recall?.messages?.filter((message: { role: string }) => message.role === 'assistant').map((message: { content: string }) => String(message.content)).join('\n') ?? ''
        if (!['晴天', '风声', '阴天', '雨声'].every(fact => text.includes(fact)) || !report.observations.life.facts.some((fact: { current: boolean, lifecycle: string, value: unknown }) => fact.current && fact.lifecycle === 'active' && JSON.stringify(fact.value).includes('晴天和风声')) || report.observations.life.facts.some((fact: { current: boolean, lifecycle: string, value: unknown }) => fact.current && fact.lifecycle === 'active' && JSON.stringify(fact.value).includes('喜欢阴天时听雨声')))
          throw new Error(`Corrected current preference and its actual historical recall are not proven: ${file}`)
      }
    }
    if (evidence?.packagedNativeVerified && evidence.nativeReports.includes(file) && ['life-native-action-scene-v1', 'life-native-persona-scene-v1'].includes(report.format)) {
      if (report.packagedAsarSha256 !== packagedAsarSha256 || resolve(report.executable).toLowerCase() !== join(release, 'win-unpacked/alicization.exe').toLowerCase() || !/^AlicizationQA_[a-f0-9]{32}$/u.test(report.privateDesktop ?? ''))
        throw new Error(`Native scene did not observe this exact package on an isolated desktop: ${file}`)
      if (report.format === 'life-native-action-scene-v1' && (report.gestureMatrixComplete !== true || report.personhoodSync?.stageObservedCommittedSoul !== true))
        throw new Error('Packaged action acceptance requires the complete gesture matrix and cross-window SOUL synchronization')
      if (evidence.residentLifeVerified && report.format === 'life-native-action-scene-v1' && (
        report.personhoodSync?.editorObservedCommittedSoul !== true
        || report.residentLife?.actualComposerListening !== true
        || report.residentLife?.renderedMotorApplied !== true
        || report.residentLife?.returnsToQuiet !== true
        || report.residentLife?.hiddenStageReleasesBehavior !== true
        || !(report.residentLife?.physical?.frames >= 12)
        || !(report.residentLife?.physical?.motorPeak > 0.02)
        || report.residentLife?.physical?.movingHeadBones !== true
      )) {
        throw new Error('Resident life acceptance requires rendered listening movement, pause/resume and bidirectional persona synchronization')
      }
      if (evidence.interactionIntentVerified && report.format === 'life-native-action-scene-v1' && (
        report.interactionIntent?.pausedReleasesIntent !== true
        || report.interactionIntent?.scenes?.length !== 4
        || !report.interactionIntent.scenes.every((scene: { actualBonesMoved: boolean, exactProviderReason: boolean }) => scene.actualBonesMoved && scene.exactProviderReason)
        || report.gesturePlayback?.length !== 18
      )) {
        throw new Error('Intent acceptance requires four main-prepared rendered scenes, pause release and eighteen semantic bone gestures')
      }
      packagedScenes.add(report.format)
    }
    if (evidence?.nativeReports.includes(file) && report.format === 'life-posture-calibration-v1') {
      const modelsPassed = report.models?.every((model: { poses: Array<{ mode: string, frames: number, visible: boolean, headUnobstructed: boolean }>, gestures: Array<{ moving: boolean }>, savedCameraPreserved: boolean, manualCameraAccepted: boolean, dialogueControlsStable?: { actualSendClick: boolean, externalRequest: boolean } }) =>
        model.poses.every(pose => pose.headUnobstructed)
        && ['stand', 'sit', 'lie', 'sleep', 'work'].every(mode => model.poses.some(pose => pose.mode === mode && pose.frames >= 12 && (mode === 'stand' || pose.visible)))
        && model.gestures.length === 3 && model.gestures.every(gesture => gesture.moving)
        && model.savedCameraPreserved && model.manualCameraAccepted
        && model.dialogueControlsStable?.actualSendClick && model.dialogueControlsStable.externalRequest === false,
      )
      if (report.packagedAsarSha256 !== packagedAsarSha256 || resolve(report.executable ?? '').toLowerCase() !== join(release, 'win-unpacked/alicization.exe').toLowerCase() || report.models?.length !== 2 || report.errors?.length || !/^AlicizationQA_[a-f0-9]{32}$/u.test(report.privateDesktop ?? '') || !modelsPassed)
        throw new Error(`Both representative bodies require actual posture and gesture observation: ${file}`)
    }
    if (file.endsWith('/nodes.json') && (report.nodes.length !== 18 || !report.nodes.every((node: { passed: boolean }) => node.passed) || report.native.length !== 8 || !report.native.every((item: { passed: boolean }) => item.passed)))
      throw new Error('All eighteen nodes and all eight packaged native trials must pass before release provenance')
    if (file.endsWith('/installer.json') && (!report.installedRuntimeExact || !report.installedPersonaAndSqlite || !report.identityBytesPreserved || !report.uninstallRemovedExecutable))
      throw new Error('Installer identity retention was not verified')
    return { path: file, sha256: await hashFile(join(workspace, file)), ...(typeof report.numTotalTests === 'number' ? { counts: { total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, skipped: report.numPendingTests } } : {}) }
  }))
  if (evidence?.packagedNativeVerified && packagedScenes.size !== 2)
    throw new Error('Packaged native verification requires exact-package persona and action scenes')
  if (evidence?.productExperienceVerified && productExperiences.length === 0)
    throw new Error('Product experience requires an exact-package product regression report')
  if (evidence?.realExperienceVerified && (actualExperiences.length < 2 || !actualExperiences.some(report => report.parentReport && actualExperiences.some(parent => resolve(workspace, parent.path) === resolve(report.parentReport!)))))
    throw new Error('Real experience requires the same-package first run and resumed identity after restart')
  const nativeReport = evidence ? null : JSON.parse(await readFile(join(workspace, 'output/life-acceptance/nodes.json'), 'utf8')) as { native: Array<{ log: string }> }
  const verificationLogs = evidence?.logs ?? ['output/life-workspace-verified-typecheck.log', 'output/life-all-surfaces-final-build.log', 'output/life-last-shared-closure-lint.log', 'output/life-shared-type-fixtures-verified.log', 'output/life-codex-final-route-sandbox-regression.log', 'output/life-codex-real-execution-native-sandbox.log', ...(nativeReport?.native.map(item => relative(workspace, item.log).replaceAll('\\', '/')) ?? [])]
  const logs = await Promise.all(verificationLogs.map(async file => ({ path: file, sha256: await hashFile(join(workspace, file)) })))
  const portableExecutable = { path: 'win-unpacked/alicization.exe', sha256: await hashFile(join(release, 'win-unpacked/alicization.exe')) }
  const nativeResources = await tree(join(release, 'win-unpacked/resources/app.asar.unpacked'))
  const verificationTools = await tree(join(workspace, 'apps/stage-tamagotchi/scripts/life-acceptance'))
  const head = await git(['rev-parse', 'HEAD'])
  const remote = await git(['rev-parse', 'origin/main'])
  const manifest = { format: 'alicization-local-release-provenance-v1', createdAt: new Date().toISOString(), repository: 'TouHouQing/alicization', baseCommit: head, fetchedRemoteMain: remote, localChangesIncluded: Boolean(await git(['status', '--porcelain'])), sourceScope: 'Desktop production inputs and workspace packages, including pre-existing local changes; this is not an unmodified upstream commit build', ...(evidence ? { nativeObservationScope: evidence.nativeObservationScope, productExperienceVerified: evidence.productExperienceVerified === true, packagedNativeVerified: evidence.packagedNativeVerified, residentLifeVerified: evidence.residentLifeVerified === true, interactionIntentVerified: evidence.interactionIntentVerified === true, realExperienceVerified: evidence.realExperienceVerified === true } : {}), sourceFingerprint: digest(JSON.stringify(sources)), sourceFiles: sources, compiledFingerprint: digest(JSON.stringify(compiled)), compiledFiles: compiled, packagedOutputMatchesCompiled: true, packagedAsarSha256, portableExecutable, nativeResources, artifacts, verification, verificationTools, verificationLogs: logs }
  const file = join(release, 'release-provenance.json')
  await writeFile(file, JSON.stringify(manifest, null, 2))
  console.info(JSON.stringify({ manifest: file, baseCommit: head, fetchedRemoteMain: remote, sourceFingerprint: manifest.sourceFingerprint, artifacts, packagedOutputMatchesCompiled: true }))
}
await main()
