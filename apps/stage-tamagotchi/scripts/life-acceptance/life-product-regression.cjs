/* eslint-disable style/max-statements-per-line */
/* eslint-disable unicorn/prefer-dom-node-text-content -- Assert rendered product text rather than hidden content. */
const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const { createServer } = require('node:net')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const backgroundQaSurface = process.env.LIFE_QA_PRIVATE_DESKTOP || process.env.LIFE_QA_HOST_VIEWPORT === '1'

const { _electron } = require('playwright')

const { prepareAtomicRequirementsProductChecks } = require('./atomic-requirements-product-checks.cjs')
const { runAuthorizedBrowserProductChecks } = require('./authorized-browser-product-checks.cjs')
const { runBrowserProcedureProductChecks } = require('./browser-procedure-product-checks.cjs')
const { runBusinessFormProductChecks } = require('./business-form-product-checks.cjs')
const { runDownloadGoalProductChecks } = require('./download-goal-product-checks.cjs')
const { runDownloadRecoveryProductChecks } = require('./download-recovery-product-checks.cjs')
const { runElectronKeyboardProductChecks } = require('./electron-keyboard-product-checks.cjs')
const { closePrivateRuntime, launchOptions, nativeRuntimeProcess, packageIdentity, registerPrivateRuntime } = require('./electron-launch.cjs')
const { runExecutionStorageProductChecks } = require('./execution-storage-product-checks.cjs')
const { runExecutionVerifiersProductChecks } = require('./execution-verifiers-product-checks.cjs')
const { runExecutionRepairProductChecks, runExecutionWorkProductChecks } = require('./execution-work-product-checks.cjs')
const { inspectFileRecoveryAfterShutdown, runFileRecoveryProductChecks } = require('./file-recovery-product-checks.cjs')
const { runHostRecoveryProductChecks } = require('./host-recovery-product-checks.cjs')
const { runLearnedProcedureProductChecks } = require('./learned-procedure-product-checks.cjs')
const { runLifeBackupProductChecks } = require('./life-backup-product-checks.cjs')
const { startSpeechQa } = require('./life-current-speech-qa.cjs')
const { runLifeHistoryProductChecks } = require('./life-history-product-checks.cjs')
const { runLive2DDialogueCoherenceChecks } = require('./live2d-dialogue-coherence-checks.cjs')
const { observeLive2DExpression, readLive2DExpression, sampleLive2DSpeech } = require('./live2d-expression-observer.cjs')
const { runLive2DProductChecks, sampleLive2D } = require('./live2d-product-checks.cjs')
const { runLive2DTextDialogueChecks } = require('./live2d-text-dialogue-checks.cjs')
const { inspectLocalMutationAfterShutdown, runLocalMutationProductChecks } = require('./local-mutation-product-checks.cjs')
const { inspectLocalSearchAfterShutdown, runLocalSearchProductChecks } = require('./local-search-product-checks.cjs')
const { runLongWorkProductChecks } = require('./long-work-product-checks.cjs')
const { runMultiPageProcedureProductChecks } = require('./multi-page-procedure-product-checks.cjs')
const ownedNativeCapture = require('./native-capture-observer.cjs')
const { observeNativeDownloads, readNativeDownloads } = require('./native-download-observer.cjs')
const { runNativeMethodProductChecks } = require('./native-method-product-checks.cjs')
const { observeProviderTransport, releaseProviderTransportObservation } = require('./provider-transport-observer.cjs')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function inspectAuthorizedBrowserAfterShutdown({ report, profile, root, check, redact }) {
  if (process.env.LIFE_PRODUCT_AUTHORIZED_BROWSER !== '1')
    return
  try {
    assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
    if (process.env.LIFE_PRODUCT_BUSINESS_FORM === '1') {
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'business-form-inspection.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.businessFormInspection = JSON.parse(await fs.readFile(path.join(root, 'business-form-after-shutdown.json'), 'utf8'))
      check('Read-only inspection binds three iframe/select/upload/service/export workflows to exact actual effects and bytes', report.businessFormInspection.passed)
      return
    }
    execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'authorized-browser-inspection.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
    report.authorizedBrowserInspection = JSON.parse(await fs.readFile(path.join(root, 'authorized-browser-after-shutdown.json'), 'utf8'))
    check('Read-only inspection binds three browser-only plans to real server receipts and excludes ungranted frames', report.authorizedBrowserInspection.passed)
  }
  catch (error) {
    report.passed = false
    report.failure ||= `Authorized browser inspection failed: ${redact(error.message)}`
    process.exitCode = 1
  }
}

async function inspectExecutionProductAfterShutdown({ report, profile, root, check, redact }) {
  if (process.env.LIFE_PRODUCT_LOCAL_MUTATION_ONLY === '1') {
    try { await inspectLocalMutationAfterShutdown({ report, profile, root, check }) }
    catch (error) { report.passed = false; report.failure ||= `Local mutation inspection failed: ${redact(error.message)}`; process.exitCode = 1 }
  }
  if (process.env.LIFE_PRODUCT_LOCAL_SEARCH_ONLY === '1') {
    try { await inspectLocalSearchAfterShutdown({ report, profile, root, check }) }
    catch (error) { report.passed = false; report.failure ||= `Local search inspection failed: ${redact(error.message)}`; process.exitCode = 1 }
  }
  if (process.env.LIFE_PRODUCT_LONG_WORK === '1' && report.longWorkExperiences?.length === 3 && report.longWorkExperiences.every(item => item.completed)) {
    try {
      assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'long-work-inspection.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.longWorkInspection = JSON.parse(await fs.readFile(path.join(root, 'long-work-after-shutdown.json'), 'utf8'))
      check('Read-only reopen binds three complete twenty-one-step product tasks to sixty-three settled effects and six work windows', report.longWorkInspection.passed)
    }
    catch (error) {
      report.passed = false
      report.failure ||= `Long-work inspection failed: ${redact(error.message)}`
      process.exitCode = 1
    }
  }
  if (process.env.LIFE_PRODUCT_HISTORY === '1' && report.historyExperiences?.length === 3) {
    try {
      assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'life-history-inspection.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.historyInspection = JSON.parse(await fs.readFile(path.join(root, 'life-history-after-shutdown.json'), 'utf8'))
      check('Read-only inspection retains sixty-five historical responsibilities after real paginated UI browsing', report.historyInspection.passed)
    }
    catch (error) {
      report.passed = false
      report.failure ||= `History inspection failed: ${redact(error.message)}`
      process.exitCode = 1
    }
  }
  if (process.env.LIFE_PRODUCT_VERIFIERS === '1' && report.verifierExperiences?.length === 3) {
    try {
      assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'execution-verifiers-inspection.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.verifierInspection = JSON.parse(await fs.readFile(path.join(root, 'execution-verifiers-after-shutdown.json'), 'utf8'))
      check('Read-only verification confirms six atomic verifier configuration audits and final revocation', report.verifierInspection.passed)
    }
    catch (error) {
      report.passed = false
      report.failure ||= `Verifier configuration inspection failed: ${redact(error.message)}`
      process.exitCode = 1
    }
  }
  if (process.env.LIFE_PRODUCT_NATIVE_KEYS === '1') {
    try {
      assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
      await fs.writeFile(path.join(root, 'electron-keyboard-shutdown.json'), JSON.stringify({ profile, runtimePid: report.nativeRuntime.pid, ...report.shutdown }))
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'electron-keyboard-inspection.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.electronKeyboardInspection = JSON.parse(await fs.readFile(path.join(root, 'electron-keyboard-after-shutdown.json'), 'utf8'))
      check('Read-only reopen binds three actual Electron approvals, native effects and original saved Unicode artifacts', report.electronKeyboardInspection.passed)
    }
    catch (error) {
      report.passed = false
      report.failure ||= `Electron native keyboard inspection failed: ${redact(error.message)}`
      process.exitCode = 1
    }
  }
  if (process.env.LIFE_PRODUCT_FILE_RECOVERY_DIAGNOSTIC === '1') {
    try { await inspectFileRecoveryAfterShutdown({ report, profile, root, check }) }
    catch (error) { report.passed = false; report.failure ||= `File recovery inspection failed: ${redact(error.message)}`; process.exitCode = 1 }
  }
  if (process.env.LIFE_PRODUCT_DOWNLOAD_RECOVERY === '1') {
    try {
      assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'download-recovery-fixture.ts'), profile, root, '--verify'], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.downloadRecoveryInspection = JSON.parse(await fs.readFile(path.join(root, 'download-recovery-after-shutdown.json'), 'utf8'))
      check('Read-only reopen preserves native host release without upgrading partial bytes to success', report.downloadRecoveryInspection.passed)
    }
    catch (error) {
      report.passed = false
      report.failure ||= `Native download recovery inspection failed: ${redact(error.message)}`
      process.exitCode = 1
    }
  }
  if (process.env.LIFE_PRODUCT_EXECUTION_DOWNLOAD === '1') {
    try {
      assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'download-goal-inspection.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.downloadGoalInspection = JSON.parse(await fs.readFile(path.join(root, 'download-goals-after-shutdown.json'), 'utf8'))
      check('Read-only inspection confirms three actual download artifacts and their current accepted contracts', report.downloadGoalInspection.passed)
    }
    catch (error) {
      report.passed = false
      report.failure ||= `Download goal inspection failed: ${redact(error.message)}`
      process.exitCode = 1
    }
  }
  if (process.env.LIFE_PRODUCT_LEARNED_PROCEDURE === '1') {
    try {
      assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
      const browser = process.env.LIFE_PRODUCT_BROWSER_PROCEDURE === '1'
      const multiplePages = process.env.LIFE_PRODUCT_MULTI_PAGE_PROCEDURE === '1'
      const native = process.env.LIFE_PRODUCT_NATIVE_METHOD_ONLY === '1'
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, native ? 'native-method-inspection.ts' : process.env.LIFE_PRODUCT_INTERACTIVE_FORM === '1' || process.env.LIFE_PRODUCT_UPLOAD_METHOD === '1' ? 'interactive-form-inspection.ts' : multiplePages ? 'multi-page-procedure-inspection.ts' : browser ? 'browser-procedure-inspection.ts' : 'learned-procedure-inspection.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.learnedProcedureInspection = JSON.parse(await fs.readFile(path.join(root, native ? 'native-method-after-shutdown.json' : multiplePages ? 'multi-page-procedure-after-shutdown.json' : browser ? 'browser-procedure-after-shutdown.json' : 'learned-procedure-after-shutdown.json'), 'utf8'))
      check('Read-only inspection confirms learned source binding, independent new delivery and persistent revocation', report.learnedProcedureInspection.passed)
    }
    catch (error) {
      report.passed = false
      report.failure ||= `Learned procedure inspection failed: ${redact(error.message)}`
      process.exitCode = 1
    }
  }
  await inspectAuthorizedBrowserAfterShutdown({ report, profile, root, check, redact })
  if (process.env.LIFE_PRODUCT_EXECUTION_REPAIR === '1') {
    try {
      assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
      // The final report is written after all inspectors; persist this actual
      // close receipt before the read-only subprocess checks it.
      await fs.writeFile(path.join(root, 'work-repair-shutdown.json'), JSON.stringify({ profile, runtimePid: report.nativeRuntime.pid, ...report.shutdown }))
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'work-repair-inspection.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.executionRepairInspection = JSON.parse(await fs.readFile(path.join(root, 'work-repair-after-shutdown.json'), 'utf8'))
      check('Read-only inspection confirms three host step repairs, one original write and the corrected read', report.executionRepairInspection.passed)
    }
    catch (error) {
      report.passed = false
      report.executionRepairInspectionError = redact(error.message)
      report.failure ||= `Work repair inspection failed: ${redact(error.message)}`
      process.exitCode = 1
    }
  }
  if (process.env.LIFE_PRODUCT_CRITERIA_CHANGE === '1') {
    try {
      assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'criteria-revision-inspection.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.executionCriteriaInspection = JSON.parse(await fs.readFile(path.join(root, 'criteria-revision-after-shutdown.json'), 'utf8'))
      check('Read-only inspection confirms three revised contracts, original task identities and no replayed writes', report.executionCriteriaInspection.passed)
    }
    catch (error) {
      report.passed = false
      report.failure ||= `Requirements inspection failed: ${redact(error.message)}`
      process.exitCode = 1
    }
  }
  if (process.env.LIFE_PRODUCT_HOST_RECOVERY === '1') {
    try {
      assert.ok(report.shutdown.completed && report.shutdown.exitCode === 0)
      execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'host-recovery-fixture.ts'), profile, root, '--verify'], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
      report.hostRecoveryInspection = JSON.parse(await fs.readFile(path.join(root, 'host-recovery-after-shutdown.json'), 'utf8'))
      check('Read-only inspection after normal exit preserves unknown receipts and cancelled roots', report.hostRecoveryInspection.passed)
    }
    catch (error) {
      report.passed = false
      report.failure ||= `Host recovery inspection failed: ${redact(error.message)}`
      process.exitCode = 1
    }
  }
  if (process.env.LIFE_PRODUCT_SHUTDOWN_ORDER === '1') {
    const markers = ['[app-exit] Saving life and window state', '[app-exit] State hooks completed; stopping services', '[app-exit] Services stopped; draining file logs', '[FileLogger] File closed successfully', '[app-exit] File logs drained; closing desktop windows', '[app-exit] Desktop windows closed; exiting']
    const positions = markers.map(marker => report.mainExitMessages.findIndex(message => message.includes(marker)))
    const passed = positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1]))
    report.checks.push({ name: 'Shutdown saves life and drains file logs before native window teardown', passed, detail: { markers, positions } })
    if (!passed) { report.passed = false; report.failure ||= 'Shutdown resource ordering was not observed' }
  }
}

async function runExecutionExperience(context) {
  if (process.env.LIFE_PRODUCT_NATIVE_METHOD_ONLY === '1') {
    assert.ok(backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d' && process.env.LIFE_PRODUCT_LEARNED_PROCEDURE === '1')
    context.report.format = 'life-native-learned-method-product-v1'
    context.report.scope = 'actual-model-passive-native-source-evaluation-activation-three-reuses-and-revocation'
    await runNativeMethodProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_LOCAL_MUTATION_ONLY === '1') {
    assert.ok(backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    context.report.format = 'life-local-mutation-product-v1'
    context.report.scope = 'actual-model-explicit-write-edit-patch-tools-owned-before-images-permission-and-independent-shutdown-inspection'
    await runLocalMutationProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_LOCAL_SEARCH_ONLY === '1') {
    assert.ok(backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    context.report.format = 'life-local-search-product-v1'
    context.report.scope = 'actual-model-unknown-name-content-search-full-read-native-stop-and-unchanged-owned-files'
    await runLocalSearchProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_BACKUP_ONLY === '1') {
    assert.ok(backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    context.report.format = 'life-backup-product-v1'
    context.report.scope = 'actual-settings-eventa-sqlite-backups-four-corrupt-manifest-cases-and-explicit-metadata-repair-with-live2d'
    await runLifeBackupProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_BUSINESS_FORM === '1') {
    assert.ok(backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d' && process.env.LIFE_PRODUCT_AUTHORIZED_BROWSER === '1')
    context.report.format = 'life-business-form-product-v1'
    context.report.scope = 'three-owned-authenticated-iframe-select-upload-service-receipt-and-public-token-export-workflows'
    await runBusinessFormProductChecks(context)
    return
  }
  const { report } = context
  if (process.env.LIFE_PRODUCT_ATOMIC_REQUIREMENTS_ONLY === '1') {
    assert.ok(backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    report.format = 'life-atomic-requirements-preparation-v1'
    report.scope = 'Three actual 25-step tasks, seventeen retained writes and one host revision of seven future paths plus criteria each; paused before native restart. Completion requires the separate restart controller and read-only inspection.'
    const source = path.join(__dirname, 'atomic-requirements-product-checks.cjs')
    report.qaDraft = { source, sha256: createHash('sha256').update(await fs.readFile(source)).digest('hex'), productionRuntimeUnmodified: true }
    await prepareAtomicRequirementsProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_BROWSER_PROCEDURE_ONLY === '1') {
    assert.ok(backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d' && process.env.LIFE_PRODUCT_LEARNED_PROCEDURE === '1' && process.env.LIFE_PRODUCT_BROWSER_PROCEDURE === '1')
    if (process.env.LIFE_PRODUCT_MULTI_PAGE_PROCEDURE === '1') {
      report.format = 'life-multi-page-procedure-product-v2'
      report.scope = 'actual-dialogue-distinct-pages-version2-evaluation-three-uses-failed-second-page-fresh-repair-and-revocation'
      await runMultiPageProcedureProductChecks(context)
      return
    }
    report.format = 'life-browser-procedure-product-v1'
    report.scope = process.env.LIFE_PRODUCT_BROWSER_PROCEDURE_REPAIR === '1' ? 'actual-dialogue-browser-method-failure-downgrade-fresh-repaired-version-three-uses-and-revocation' : 'actual-dialogue-source-seven-case-browser-evaluation-activation-three-fresh-pages-and-revocation'
    await runBrowserProcedureProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_LONG_WORK === '1') {
    assert.ok(backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    report.format = 'life-long-work-product-v1'
    report.scope = 'three-actual-model-ui-twenty-one-step-tasks-with-two-durable-work-windows-each'
    await runLongWorkProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_STORAGE_ONLY === '1') {
    assert.ok(process.env.LIFE_PRODUCT_STORAGE === '1' && backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    report.format = 'life-execution-storage-product-v1'
    report.scope = 'three-native-cache-ui-workflows-only'
    await runExecutionStorageProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_VERIFIERS_ONLY === '1') {
    assert.ok(process.env.LIFE_PRODUCT_VERIFIERS === '1' && backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    report.format = 'life-execution-verifiers-product-v1'
    report.scope = 'three-trusted-verifier-configuration-ui-workflows-only'
    if (process.env.LIFE_PRODUCT_HISTORY === '1') {
      report.scope = 'three-verifier-and-three-history-ui-workflows-only'
      await runLifeHistoryProductChecks(context)
    }
    await runExecutionVerifiersProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_NATIVE_KEYS === '1') {
    assert.ok(process.env.LIFE_QA_HOST_VIEWPORT === '1' && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    assert.ok(['LIFE_PRODUCT_EXECUTION_REPAIR', 'LIFE_PRODUCT_EXECUTION_DOWNLOAD', 'LIFE_PRODUCT_AUTHORIZED_BROWSER', 'LIFE_PRODUCT_HOST_RECOVERY', 'LIFE_PRODUCT_DOWNLOAD_RECOVERY', 'LIFE_PRODUCT_LEARNED_PROCEDURE', 'LIFE_PRODUCT_CRITERIA_CHANGE'].every(key => process.env[key] !== '1'))
    report.format = 'life-owned-host-electron-keyboard-product-v1'
    report.scope = 'three-actual-electron-keyboard-approvals-and-saved-artifacts-only'
    await runElectronKeyboardProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_APPROVAL_DIAGNOSTIC === '1') {
    assert.ok(process.env.LIFE_QA_PRIVATE_DESKTOP && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    assert.ok(['LIFE_PRODUCT_FILE_RECOVERY_DIAGNOSTIC', 'LIFE_PRODUCT_DOWNLOAD_DIAGNOSTIC', 'LIFE_PRODUCT_AUTHORIZED_BROWSER', 'LIFE_PRODUCT_HOST_RECOVERY', 'LIFE_PRODUCT_LEARNED_PROCEDURE', 'LIFE_PRODUCT_CRITERIA_CHANGE', 'LIFE_PRODUCT_EXECUTION_DOWNLOAD', 'LIFE_PRODUCT_DOWNLOAD_RECOVERY'].every(key => process.env[key] !== '1'))
    report.format = 'life-live2d-approval-product-diagnostic-v1'
    report.scope = 'three-actual-work-approval-and-body-workflows-only-diagnostic'
    for (let repetition = 0; repetition < 3; repetition++)
      await runExecutionWorkProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_FILE_RECOVERY_DIAGNOSTIC === '1') {
    assert.ok(process.env.LIFE_QA_PRIVATE_DESKTOP && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    assert.ok(['LIFE_PRODUCT_AUTHORIZED_BROWSER', 'LIFE_PRODUCT_HOST_RECOVERY', 'LIFE_PRODUCT_LEARNED_PROCEDURE', 'LIFE_PRODUCT_CRITERIA_CHANGE', 'LIFE_PRODUCT_EXECUTION_DOWNLOAD', 'LIFE_PRODUCT_DOWNLOAD_RECOVERY'].every(key => process.env[key] !== '1'))
    report.format = 'life-file-recovery-product-diagnostic-v1'
    report.scope = 'three-file-version-host-confirmation-workflows-only-diagnostic'
    await runFileRecoveryProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_DOWNLOAD_DIAGNOSTIC === '1') {
    assert.ok(backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d' && process.env.LIFE_PRODUCT_EXECUTION_DOWNLOAD === '1')
    assert.ok(['LIFE_PRODUCT_AUTHORIZED_BROWSER', 'LIFE_PRODUCT_HOST_RECOVERY', 'LIFE_PRODUCT_LEARNED_PROCEDURE', 'LIFE_PRODUCT_CRITERIA_CHANGE', 'LIFE_PRODUCT_DOWNLOAD_RECOVERY'].every(key => process.env[key] !== '1'))
    report.format = 'life-native-download-product-diagnostic-v1'
    report.scope = 'three-native-download-closure-workflows-only-diagnostic'
    await runDownloadGoalProductChecks(context)
    return
  }
  if (process.env.LIFE_PRODUCT_CRITERIA_DIAGNOSTIC === '1') {
    assert.ok(process.env.LIFE_PRODUCT_CRITERIA_CHANGE === '1' && process.env.LIFE_PRODUCT_AUTHORIZED_BROWSER !== '1' && process.env.LIFE_PRODUCT_HOST_RECOVERY !== '1' && process.env.LIFE_PRODUCT_LEARNED_PROCEDURE !== '1' && process.env.LIFE_PRODUCT_BROWSER_DIAGNOSTIC !== '1')
    report.format = 'life-criteria-change-product-diagnostic-v1'
    report.scope = 'three-host-criteria-change-workflows-only-diagnostic'
    for (let repetition = 0; repetition < 3; repetition++)
      await runExecutionRepairProductChecks({ ...context, reviseCriteria: true })
    return
  }
  if (process.env.LIFE_PRODUCT_BROWSER_DIAGNOSTIC === '1') {
    assert.ok(process.env.LIFE_PRODUCT_AUTHORIZED_BROWSER === '1' && process.env.LIFE_PRODUCT_HOST_RECOVERY !== '1' && process.env.LIFE_PRODUCT_LEARNED_PROCEDURE !== '1' && process.env.LIFE_PRODUCT_CRITERIA_CHANGE !== '1')
    report.format = 'life-selected-browser-product-diagnostic-v1'
    report.scope = 'three-selected-browser-workflows-only-diagnostic'
    await runAuthorizedBrowserProductChecks(context)
    return
  }
  report.scope = 'execution-work-product-experience'
  if (process.env.LIFE_PRODUCT_STORAGE === '1')
    await runExecutionStorageProductChecks(context)
  if (process.env.LIFE_PRODUCT_HISTORY === '1')
    await runLifeHistoryProductChecks(context)
  if (process.env.LIFE_PRODUCT_VERIFIERS === '1')
    await runExecutionVerifiersProductChecks(context)
  if (process.env.LIFE_PRODUCT_DOWNLOAD_RECOVERY === '1')
    await runDownloadRecoveryProductChecks(context)
  if (process.env.LIFE_PRODUCT_HOST_RECOVERY === '1')
    await runHostRecoveryProductChecks(context)
  for (let repetition = 0; repetition < 3; repetition++) {
    await runExecutionWorkProductChecks(context)
    if (process.env.LIFE_PRODUCT_EXECUTION_REPAIR === '1')
      await runExecutionRepairProductChecks(context)
    if (process.env.LIFE_PRODUCT_CRITERIA_CHANGE === '1')
      await runExecutionRepairProductChecks({ ...context, reviseCriteria: true })
  }
  if (process.env.LIFE_PRODUCT_EXECUTION_DOWNLOAD === '1')
    await runDownloadGoalProductChecks(context)
  if (process.env.LIFE_PRODUCT_LEARNED_PROCEDURE === '1') {
    if (process.env.LIFE_PRODUCT_BROWSER_PROCEDURE === '1')
      await runBrowserProcedureProductChecks(context)
    else
      await runLearnedProcedureProductChecks(context)
  }
  if (process.env.LIFE_PRODUCT_AUTHORIZED_BROWSER === '1')
    await runAuthorizedBrowserProductChecks(context)
}

async function main() {
  const root = path.resolve(process.env.LIFE_PRODUCT_REGRESSION_ROOT || 'output/product-regression-20261014')
  assert.ok(root.startsWith(`${path.resolve('output')}${path.sep}`))
  await fs.mkdir(root, { recursive: true })
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-product-regression-'))
  const targetProject = path.resolve(process.env.LIFE_QA_PROJECT_ROOT || process.cwd())
  const package_ = await packageIdentity()
  const identity = { ...package_, ...(process.env.LIFE_QA_HOST_VIEWPORT === '1' || !package_ ? { compiledMainSha256: createHash('sha256').update(await fs.readFile(path.join(targetProject, 'apps/stage-tamagotchi/out/main/index.js'))).digest('hex') } : {}), ...(!package_ ? { scope: 'compiled-development-runtime' } : {}) }
  const configuration = JSON.parse(await fs.readFile(path.join(process.env.APPDATA, 'com.tohoqing.alicization/alicizations/llm-config.json'), 'utf8'))
  const selected = configuration.providerCredentials[configuration.activeProviderId]
  assert.ok(['openai-compatible', 'openai'].includes(configuration.activeProviderId))
  const secret = selected.apiKey
  const redact = value => String(value).replaceAll(secret, '[redacted]')
  const fastExpression = process.env.LIFE_PRODUCT_FAST_EXPRESSION === '1'
  const workOnly = process.env.LIFE_PRODUCT_WORK_ONLY === '1'
  if (workOnly) {
    if (process.env.LIFE_PRODUCT_NATIVE_METHOD_ONLY === '1')
      assert.ok(!fastExpression && backgroundQaSurface && process.env.LIFE_PRODUCT_EXECUTION_WORK === '1' && process.env.LIFE_PRODUCT_LEARNED_PROCEDURE === '1' && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    else if (process.env.LIFE_PRODUCT_LOCAL_SEARCH_ONLY === '1' || process.env.LIFE_PRODUCT_LOCAL_MUTATION_ONLY === '1')
      assert.ok(!fastExpression && backgroundQaSurface && process.env.LIFE_PRODUCT_EXECUTION_WORK === '1' && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    else if (process.env.LIFE_PRODUCT_BACKUP_ONLY === '1')
      assert.ok(!fastExpression && backgroundQaSurface && process.env.LIFE_PRODUCT_EXECUTION_WORK === '1' && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    else if (process.env.LIFE_PRODUCT_BUSINESS_FORM === '1')
      assert.ok(!fastExpression && backgroundQaSurface && process.env.LIFE_PRODUCT_EXECUTION_WORK === '1' && process.env.LIFE_PRODUCT_AUTHORIZED_BROWSER === '1' && process.env.LIFE_PRODUCT_RENDERER === 'live2d', 'Business-form acceptance requires its explicit actual model/UI browser and export scope')
    else if (process.env.LIFE_PRODUCT_DOWNLOAD_DIAGNOSTIC === '1')
      assert.ok(!fastExpression && backgroundQaSurface && process.env.LIFE_PRODUCT_EXECUTION_WORK === '1' && process.env.LIFE_PRODUCT_EXECUTION_DOWNLOAD === '1' && process.env.LIFE_PRODUCT_NATIVE_DOWNLOAD_OBSERVE === '1' && process.env.LIFE_PRODUCT_RENDERER === 'live2d', 'Native download diagnostics require real isolated model/UI workflows and forwarded native event observation')
    else if (process.env.LIFE_PRODUCT_ATOMIC_REQUIREMENTS_ONLY === '1')
      assert.ok(!fastExpression && backgroundQaSurface && process.env.LIFE_PRODUCT_EXECUTION_WORK === '1' && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    else if (process.env.LIFE_PRODUCT_LONG_WORK === '1')
      assert.ok(!fastExpression && backgroundQaSurface && process.env.LIFE_PRODUCT_EXECUTION_WORK === '1' && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    else if (process.env.LIFE_PRODUCT_STORAGE_ONLY === '1')
      assert.ok(!fastExpression && process.env.LIFE_PRODUCT_STORAGE === '1' && backgroundQaSurface && process.env.LIFE_PRODUCT_EXECUTION_WORK === '1' && process.env.LIFE_PRODUCT_RENDERER === 'live2d', 'Storage-only acceptance requires the actual owned Live2D surface')
    else if (process.env.LIFE_PRODUCT_VERIFIERS_ONLY === '1')
      assert.ok(!fastExpression && process.env.LIFE_PRODUCT_VERIFIERS === '1' && backgroundQaSurface && process.env.LIFE_PRODUCT_EXECUTION_WORK === '1' && process.env.LIFE_PRODUCT_RENDERER === 'live2d', 'Verifier-only acceptance requires a real owned Live2D surface')
    else if (process.env.LIFE_PRODUCT_BROWSER_PROCEDURE_ONLY === '1')
      assert.ok(!fastExpression && process.env.LIFE_PRODUCT_LEARNED_PROCEDURE === '1' && process.env.LIFE_PRODUCT_BROWSER_PROCEDURE === '1' && backgroundQaSurface && process.env.LIFE_PRODUCT_EXECUTION_WORK === '1' && process.env.LIFE_PRODUCT_RENDERER === 'live2d', 'Browser method acceptance requires its explicit real product scope')
    else
      assert.ok(!fastExpression && process.env.LIFE_PRODUCT_EXECUTION_WORK === '1' && (process.env.LIFE_PRODUCT_EXECUTION_REPAIR === '1' || process.env.LIFE_PRODUCT_NATIVE_KEYS === '1') && process.env.LIFE_PRODUCT_RENDERER === 'live2d', 'Work-only acceptance requires complete three-run repair checks or the explicitly scoped native keyboard experience')
  }
  const textDialogue = process.env.LIFE_PRODUCT_TEXT_DIALOGUE === '1'
  const report = { format: fastExpression ? 'life-live2d-expression-diagnostic-v1' : 'life-product-regression-v1', syntheticIdentity: true, profile, ...identity, privateDesktop: process.env.LIFE_QA_PRIVATE_DESKTOP, startedAt: new Date().toISOString(), checks: [], pages: [], errors: [], passed: false }
  const live2dOnly = process.env.LIFE_PRODUCT_RENDERER === 'live2d'
  report.rendererFocus = live2dOnly ? 'live2d' : 'both'
  const port = await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)) })
  })
  const options = launchOptions(profile)
  if (process.env.LIFE_PRODUCT_LONG_WORK === '1') {
    // Keep this offscreen QA renderer active; native occlusion is separate from
    // timer throttling and is excluded from this functional acceptance scope.
    report.backgroundSchedulerFlags = ['--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion']
    options.args.push(...report.backgroundSchedulerFlags)
  }
  options.env.PORT = String(port)
  // Keep the initial default channel from reaching an unrelated local instance.
  options.args.push('--host-resolver-rules=MAP localhost ~NOTFOUND')
  if (process.env.LIFE_PRODUCT_FILE_RECOVERY_DIAGNOSTIC === '1') {
    assert.match(process.env.LIFE_QA_PRIVATE_DESKTOP || '', /^AlicizationQA_[a-f\d]{32}$/u)
    const bundle = path.resolve(process.env.LIFE_PROBE_BUNDLE || '')
    assert.ok(bundle.startsWith(`${path.resolve('output')}${path.sep}`) && bundle.endsWith('.cjs'))
    execFileSync(require('electron'), [bundle], { cwd: process.cwd(), windowsHide: true, timeout: 90000, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, LIFE_FILE_RECOVERY_PHASE: 'ui-seed', LIFE_FILE_RECOVERY_PROFILE: profile, LIFE_FILE_RECOVERY_PROBE_ROOT: root } })
    report.fileRecoveryFixture = { source: 'actual-adapter-and-DPAPI-capture-in-prior-Electron-process', writerClosedBeforeLaunch: true }
  }
  if (process.env.LIFE_PRODUCT_HOST_RECOVERY === '1') {
    assert.ok(backgroundQaSurface, 'Recovery product fixtures require an owned background QA surface')
    execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'host-recovery-fixture.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
    report.hostRecoveryFixture = { source: 'synthetic-legacy-history-before-app-launch', writerClosedBeforeLaunch: true }
  }
  if (process.env.LIFE_PRODUCT_DOWNLOAD_RECOVERY === '1') {
    assert.ok(backgroundQaSurface && !process.env.LIFE_PRODUCT_BROWSER_DIAGNOSTIC && !process.env.LIFE_PRODUCT_CRITERIA_DIAGNOSTIC)
    execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'download-recovery-fixture.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
    report.downloadRecoveryFixture = { source: 'synthetic-native-restart-journal-before-app-launch', writerClosedBeforeLaunch: true, nativeExecutionClaimed: false }
  }
  if (process.env.LIFE_PRODUCT_HISTORY === '1') {
    assert.ok(backgroundQaSurface && process.env.LIFE_PRODUCT_RENDERER === 'live2d')
    execFileSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), path.join(__dirname, 'life-history-fixture.ts'), profile, root], { cwd: process.cwd(), windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
    report.historyFixture = { source: 'synthetic-terminal-responsibilities-before-app-launch', writerClosedBeforeLaunch: true }
  }
  const app = await _electron.launch(options)
  const launcherProcess = app.process()
  let nativeProcess = launcherProcess
  let voice
  let expressionStage
  report.mainExitMessages = []
  report.nativeProcessEvents = []
  launcherProcess.on('exit', (code, signal) => report.nativeProcessEvents.push({ event: 'launcher-exit', pid: launcherProcess.pid, at: Date.now(), code, signal }))
  app.on('close', () => report.nativeProcessEvents.push({ event: 'application-closed', at: Date.now() }))
  app.on('console', (message) => {
    const text = message.text()
    if (/\[FileLogger\]|\[app-exit\]/.test(text))
      report.mainExitMessages.push(redact(text))
  })
  report.kokoroDownloadRequests = []
  app.context().on('request', (request) => {
    if (/https:\/\/(?:[^/]+\.)?huggingface\.co\//.test(request.url()))
      report.kokoroDownloadRequests.push(redact(request.url()))
  })
  const save = () => fs.writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  const check = (name, ok, detail) => { report.checks.push({ name, passed: Boolean(ok), detail }); assert.ok(ok, name) }
  const click = async (locator, repetitions = 1) => {
    const deadline = Date.now() + 10000
    while (Date.now() < deadline) {
      const clicked = await locator.evaluate((node, repetitions) => {
        const r = node.getBoundingClientRect()
        const s = getComputedStyle(node)
        if (!node.isConnected || !r.width || !r.height || node.disabled || s.visibility === 'hidden' || s.display === 'none')
          return false
        node.scrollIntoView({ block: 'center' })
        for (let index = 0; index < repetitions; index++) node.click()
        return true
      }, repetitions, { timeout: 10000 })
      if (clicked) {
        await wait(400)
        return
      }
      await wait(100)
    }
    throw new Error(`UI control did not become available: ${locator}`)
  }
  const captureNativeImage = async (page) => {
    report.nativeCaptureTrace = { name: report.activeCaptureName, phase: 'owned-native-value-capture', url: page.url(), at: Date.now() }
    const observed = (await ownedNativeCapture.read(app, page.url(), true)).image
    assert.ok(observed.size.width > 0 && observed.size.height > 0 && !observed.focusable && !observed.focused)
    return observed
  }
  const capture = async (page, name) => {
    report.activeCaptureName = name
    report.nativeCaptureTrace = { name, phase: 'initial-viewport', url: page.url(), at: Date.now() }
    if (process.env.LIFE_QA_HOST_VIEWPORT === '1') {
      const viewport = (await ownedNativeCapture.read(app, page.url())).viewport
      assert.ok(viewport.windows.length > 0)
      report.hostViewportObservations ||= []
      report.hostViewportObservations.push({ name, ...viewport })
      assert.ok(viewport.windows.every(window => !window.focusable && !window.focused && viewport.displays.every(display => window.bounds.x >= display.x + display.width || window.bounds.x + window.bounds.width <= display.x || window.bounds.y >= display.y + display.height || window.bounds.y + window.bounds.height <= display.y)), 'Actual owned QA windows remain outside all displays without focus')
    }
    const readyStartedAt = Date.now()
    // A native window can expose its final URL before its first Vue document is
    // mounted. Wait for that document instead of racing the default body timeout.
    // Query current native metadata in one main-process call instead of
    // retaining an evaluation handle across renderer lifecycle changes.
    const nativeBefore = process.env.LIFE_QA_HOST_VIEWPORT === '1'
      ? (await ownedNativeCapture.read(app, page.url())).nativeBefore
      : await app.evaluate(({ BrowserWindow }, expectedUrl) => {
          const matches = BrowserWindow.getAllWindows().filter(window => !window.isDestroyed() && window.webContents.getURL() === expectedUrl)
          if (matches.length !== 1)
            throw new Error('Native capture must have one exact current page owner')
          const window = matches[0]
          return { nativeWindowId: window.id, observedAt: Date.now(), url: window.webContents.getURL(), loading: window.webContents.isLoading(), loadingMainFrame: window.webContents.isLoadingMainFrame(), backgroundThrottling: window.webContents.getBackgroundThrottling(), visible: window.isVisible(), focusable: window.isFocusable(), focused: window.isFocused() }
        }, page.url())
    const mount = { name, nativeBefore, polls: 0, first: null, last: null }
    report.documentMountObservations ||= []
    report.documentMountObservations.push(mount)
    while (true) {
      const remaining = 30000 - (Date.now() - readyStartedAt)
      if (remaining <= 0)
        throw new Error(`Actual QA document did not mount within 30000ms: ${JSON.stringify(mount.last)}`)
      let timer
      let state
      try {
        state = await Promise.race([
          page.evaluate(() => ({ readyState: document.readyState, hasBody: Boolean(document.body), mounted: Boolean(document.querySelector('#app')?.__vue_app__) })),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Actual QA document evaluation exceeded its 30000ms mount budget')), remaining) }),
        ])
      }
      finally { clearTimeout(timer) }
      mount.first ||= state
      mount.last = state
      mount.polls++
      if (state.readyState !== 'loading' && state.hasBody && state.mounted)
        break
      if (Date.now() - readyStartedAt >= 30000)
        throw new Error(`Actual QA document did not mount within 30000ms: ${JSON.stringify(state)}`)
      await wait(100)
    }
    if (page.url().includes('#/settings')) {
      await page.waitForFunction(() => {
        let heading = document.querySelector('h1')
        for (let depth = 0; heading && depth < 5; depth++, heading = heading.parentElement) {
          if (Number(getComputedStyle(heading).opacity) < 0.99)
            return false
        }
        return true
      }, undefined, { polling: 100, timeout: 5000 })
    }
    const documentReadyMs = Date.now() - readyStartedAt
    const text = redact(await page.locator('body').innerText())
    const screenshot = path.join(root, `${String(report.pages.length).padStart(3, '0')}-${name}.png`)
    let captureObservation = { backend: 'playwright-cdp' }
    if (process.env.LIFE_QA_HOST_VIEWPORT === '1') {
      const observed = await captureNativeImage(page)
      const png = Buffer.from(observed.png, 'base64')
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
      await fs.writeFile(screenshot, png, { flag: 'wx' })
      const { png: _png, ...metadata } = observed
      captureObservation = { backend: 'electron-native-page', stayHidden: true, stayAwake: true, ...metadata }
    }
    else {
      await page.screenshot({ path: screenshot, timeout: 8000 })
    }
    const dimensions = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }))
    const fields = await page.locator('textarea,input').evaluateAll(nodes => nodes.flatMap(node => [node.getAttribute('placeholder') || '', node.tagName === 'TEXTAREA' ? node.value : '']))
    const rawKeys = [...new Set([text, ...fields].join('\n').match(/settings\.[\w.-]+|about\.[\w.-]+|inlay\.[\w.-]+|(?<!stage\.)memory-workbench\.[\w.-]+/g) || [])]
    const renderer = await page.evaluate(() => {
      const model = document.querySelector('#app').__vue_app__?.config.globalProperties.$pinia?._s.get('settings-stage-model')
      return model ? { renderer: model.stageModelRenderer, modelId: model.stageModelSelected, mounted: document.documentElement.dataset.alicizationStageMounted } : null
    })
    const navigationControls = await page.locator('button').evaluateAll(nodes => nodes.filter(node => node.querySelector('[class*=arrow]') || node.getAttribute('aria-label')).map(node => ({ text: node.textContent.trim().slice(0, 80), label: node.getAttribute('aria-label'), title: node.getAttribute('title'), hidden: node.closest('[inert],[aria-hidden=true]')?.outerHTML.slice(0, 180) ?? null })))
    if (live2dOnly && renderer?.renderer)
      check(`Live2D is the selected renderer at ${name}`, renderer.renderer === 'live2d', renderer)
    report.pages.push({ name, url: page.url(), text, screenshot, captureObservation, dimensions, rawKeys, renderer, navigationControls, documentReadyMs })
    await save()
  }
  report.rendererConsoleErrors = []
  report.pageLifecycle = []
  const observe = (page) => {
    page.setDefaultTimeout(10000)
    page.setDefaultNavigationTimeout(15000)
    const record = (event) => {
      if (report.pageLifecycle.length < 100)
        report.pageLifecycle.push({ event, at: Date.now(), role: page.url().startsWith('file:') ? page.url().split('#')[1]?.split('?')[0] ?? 'app' : 'other' })
    }
    page.on('close', () => record('page-closed'))
    page.on('crash', () => record('page-crashed'))
    page.on('pageerror', error => report.errors.push({ message: redact(error.message), stack: redact(error.stack), url: page.url() }))
    page.on('console', (message) => {
      if (message.type() === 'error')
        report.rendererConsoleErrors.push({ message: redact(message.text()), url: page.url() })
    })
  }
  app.on('window', observe)
  app.windows().forEach(observe)
  try {
    report.nativeRuntime = await registerPrivateRuntime(app)
    if (process.env.LIFE_QA_HOST_VIEWPORT === '1')
      report.nativeObservationTransport = await ownedNativeCapture.open(app, report.nativeRuntime)
    if (process.env.LIFE_PRODUCT_NATIVE_DOWNLOAD_OBSERVE === '1')
      report.nativeDownloadObservation = await observeNativeDownloads(app)
    nativeProcess = nativeRuntimeProcess(app)
    nativeProcess.on('exit', (code, signal) => report.nativeProcessEvents.push({ event: 'native-exit', pid: nativeProcess.pid, at: Date.now(), code, signal }))
    assert.equal(await fs.realpath(report.nativeRuntime.profile), await fs.realpath(profile), 'The actual app must own this exact synthetic profile')
    if (process.env.LIFE_QA_HOST_VIEWPORT === '1') {
      assert.equal(report.nativeRuntime.hostViewport.actualMainSha256, report.compiledMainSha256)
      report.hostViewportScope = report.nativeRuntime.hostViewport.scope
    }
    if (process.env.LIFE_PRODUCT_LONG_WORK === '1') {
      report.backgroundFramePolicy = await app.evaluate(({ app, BrowserWindow }) => {
        const windows = []
        const configure = (window) => {
          if (window.isDestroyed())
            return
          const before = window.webContents.getBackgroundThrottling()
          window.webContents.setBackgroundThrottling(false)
          windows.push({ id: window.id, before, after: window.webContents.getBackgroundThrottling() })
        }
        BrowserWindow.getAllWindows().forEach(configure)
        app.on('browser-window-created', (_event, window) => configure(window))
        return { mode: 'QA-visible-frame-pacing-for-owned-background-windows', scope: 'Only this synthetic runtime; offscreen animation pacing is maintained without foreground focus. OS visibility/throttling behavior is excluded.', windows }
      })
    }
    await observeProviderTransport(app, selected.baseUrl)
    report.channelFixture = { port, url: `ws://127.0.0.1:${port}/ws`, scope: 'Only synthetic QA network preferences; no life state is injected.' }
    await app.context().addInitScript((url) => {
      if (location.protocol === 'file:')
        localStorage.setItem('settings/connection/websocket-url', url)
    }, report.channelFixture.url)
    for (const page of app.windows().filter(page => page.url().endsWith('#/') || page.url().endsWith('#/onboarding'))) await page.reload()
    await app.evaluate(({ Tray }) => {
      const original = Tray.prototype.setContextMenu
      Tray.prototype.setContextMenu = function (menu) {
        globalThis.productQaMenu = menu
        return original.call(this, menu)
      }
    })
    let onboarding
    for (let i = 0; i < 120; i++) {
      onboarding = app.windows().find(page => page.url().endsWith('#/onboarding')); if (onboarding)
        break; await wait(250)
    }
    assert.ok(onboarding)
    if (process.env.LIFE_PRODUCT_LONG_WORK === '1') {
      // The real accessibility preference skips onboarding CSS/out-in waiting.
      // Its animation timing remains outside this background functional scope.
      await onboarding.emulateMedia({ reducedMotion: 'reduce' })
      report.onboardingMotionPolicy = { reducedMotion: 'reduce', scope: 'Real reduced-motion onboarding preference; animation timing and OS visibility remain separate acceptance. Live2D has its own page and clock.' }
    }
    await app.evaluate(({ app, BrowserWindow }) => {
      const owner = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().endsWith('#/onboarding'))
      if (!owner)
        throw new Error('Actual onboarding owner unavailable')
      const qa = globalThis.productQaOnboardingWindows = { ownerId: owner.id, events: [] }
      qa.onCreated = (_event, window) => {
        if (qa.events.length < 100)
          qa.events.push({ event: 'created', id: window.id })
      }
      app.on('browser-window-created', qa.onCreated)
      owner.webContents.once('destroyed', () => qa.events.push({ event: 'onboarding-renderer-destroyed', id: qa.ownerId }))
      owner.once('closed', () => qa.events.push({ event: 'onboarding-closed', id: qa.ownerId }))
    })
    const welcomeStartedAt = Date.now()
    await onboarding.getByRole('button', { name: '开始吧！', exact: true }).waitFor({ timeout: 30000 })
    report.welcomeReadyMs = Date.now() - welcomeStartedAt
    await click(onboarding.getByRole('button', { name: '开始吧！', exact: true }))
    await onboarding.locator('form.persona-step input').nth(1).fill('QA 产品回归')
    await click(onboarding.locator('button[type=submit]'))
    const personaStep = title => onboarding.locator('form.persona-step').filter({ has: onboarding.getByRole('heading', { name: title, exact: true }) })
    const coreStep = personaStep('你期待怎样的她')
    await coreStep.locator('textarea').fill('温柔而有主见，喜欢画画。')
    await click(coreStep.locator('button[type=submit]'))
    await click(personaStep('让相处更合你的心意').locator('button[type=submit]'))
    await personaStep('这是她最初的样子').waitFor()
    await capture(onboarding, 'persona-preview')
    await click(personaStep('这是她最初的样子').getByRole('button', { name: '确认并继续', exact: true }))
    if (process.env.LIFE_PRODUCT_LONG_WORK !== '1') {
      await onboarding.locator('input[value=ollama]').waitFor({ timeout: 30000 })
      await click(onboarding.locator('input[value=ollama]'))
      await click(onboarding.getByRole('button', { name: '下一步', exact: true }))
      await onboarding.locator('input[type=text]').fill('')
      check('Empty service URL cannot proceed', await onboarding.getByRole('button', { name: '下一步', exact: true }).isDisabled())
      await onboarding.locator('input[type=text]').fill('http://127.0.0.1:1/v1/')
      await click(onboarding.getByRole('button', { name: '下一步', exact: true }))
      // Connectivity and model listing each have a bounded 10s production
      // deadline. The default 10s locator wait can expire before their result.
      await onboarding.getByRole('button', { name: '重试', exact: true }).waitFor({ timeout: 30000 })
      await capture(onboarding, 'connection-failure')
      const failureText = await onboarding.locator('body').innerText()
      check('Connection failure has Chinese recovery guidance', failureText.includes('请检查服务是否启动'))
      check('Technical error details are collapsed', !(await onboarding.locator('details').getAttribute('open')))
      await click(onboarding.getByRole('button', { name: '返回上一级', exact: true }))
    }
    else {
      report.onboardingSetupScope = 'Direct real configured-service setup for the long-work scenario; connection-failure/back-navigation acceptance is separate.'
    }
    await onboarding.getByRole('heading', { name: '选择服务来源', exact: true }).waitFor({ timeout: 10000 })
    report.providerSelectionDom = await onboarding.getByRole('radio').evaluateAll(nodes => nodes.map(node => ({ value: node.value, attribute: node.getAttribute('value'), label: node.closest('label')?.textContent.trim() })))
    const configuredProvider = onboarding.getByRole('radio', { name: configuration.activeProviderId === 'openai-compatible' ? /^OpenAI 兼容 API/u : /^OpenAI\s+OpenAi\.com$/u })
    assert.equal(await configuredProvider.inputValue(), configuration.activeProviderId, 'The actual accessible option must still bind the configured provider ID')
    await click(configuredProvider)
    await click(onboarding.getByRole('button', { name: '下一步', exact: true }))
    await onboarding.locator('input[type=password]').fill(secret)
    await onboarding.locator('input[type=text]').fill(selected.baseUrl)
    await click(onboarding.getByRole('button', { name: '下一步', exact: true }))
    await onboarding.getByRole('button', { name: '保存并继续', exact: true }).waitFor({ timeout: 60000 })
    const model = configuration.activeModelId
    if (await onboarding.locator(`input[type=radio][value="${model}"]`).count() === 0)
      await onboarding.locator('input[type=search]').fill(model)
    await click(onboarding.locator(`input[type=radio][value="${model}"]`))
    check('Selecting a model waits for explicit confirmation', await onboarding.getByRole('button', { name: '保存并继续', exact: true }).isVisible())
    await capture(onboarding, 'model-selected-awaiting-confirmation')
    await click(onboarding.getByRole('button', { name: '保存并继续', exact: true }))
    await click(onboarding.getByRole('button', { name: '去配置动作映射', exact: true }))
    let settings
    for (let i = 0; i < 80; i++) {
      settings = app.windows().find(page => page.url().includes('#/settings')); if (settings)
        break; await wait(250)
    }
    assert.ok(settings)
    if (!onboarding.isClosed())
      await onboarding.waitForEvent('close', { timeout: 30000 })
    for (let attempt = 0; attempt < 120; attempt++) {
      if (await app.evaluate(() => globalThis.productQaOnboardingWindows.events.some(event => event.event === 'onboarding-renderer-destroyed')))
        break
      await wait(250)
    }
    report.onboardingWindowOrder = await app.evaluate(({ app, BrowserWindow }) => {
      const qa = globalThis.productQaOnboardingWindows
      const settings = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().includes('#/settings'))
      app.removeListener('browser-window-created', qa.onCreated)
      return { ownerId: qa.ownerId, settingsId: settings?.id, events: qa.events }
    })
    const settingsCreated = report.onboardingWindowOrder.events.findIndex(event => event.event === 'created' && event.id === report.onboardingWindowOrder.settingsId)
    const onboardingClosed = report.onboardingWindowOrder.events.findIndex(event => event.event === 'onboarding-renderer-destroyed')
    check('First-run follow-up settings opens before onboarding renderer disposal', settingsCreated >= 0 && onboardingClosed > settingsCreated, report.onboardingWindowOrder)
    await capture(settings, 'onboarding-follow-up-settings')
    await settings.getByRole('button', { name: '返回上一级', exact: true }).waitFor({ timeout: 30000 })
    await click(settings.getByRole('button', { name: '返回上一级', exact: true }))
    await settings.waitForURL('**#/settings')
    check('Cold settings deep link returns to settings home', settings.url().endsWith('#/settings'))
    const stage = app.windows().find(page => page.url().endsWith('#/'))
    assert.ok(stage)
    if (live2dOnly)
      check('First-run setup completes before desktop experience', onboarding.isClosed())
    const home = async () => {
      await click(stage.locator('button:has([i-solar\\:settings-minimalistic-outline])').last())
      await settings.waitForURL('**#/settings')
    }
    const go = async (route, name) => { await click(settings.locator(`a[href="#${route}"]`).first()); await settings.waitForURL(`**#${route}`); await wait(500); await capture(settings, name) }
    if (!fastExpression && !workOnly) {
      await go('/settings/modules', 'modules')
      const moduleLinks = await settings.locator('a[href^="#/settings/modules/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href').slice(1)))
      for (const route of moduleLinks) {
        await go(route, `module-${route.split('/').at(-1)}`)
        if (route.endsWith('/consciousness'))
          check('Configured provider is visible in consciousness', !(await settings.locator('body').innerText()).includes('没有配置服务来源'))
        if (route.endsWith('/memory')) {
          for (const tab of ['长期记忆', '回收站', '待审核', '召回测试', '人格候选', '质量验证', '健康与审计', '能力与技能']) {
            await click(settings.getByRole('button', { name: tab, exact: true }))
            await capture(settings, `memory-${['长期记忆', '回收站', '待审核', '召回测试', '人格候选', '质量验证', '健康与审计', '能力与技能'].indexOf(tab)}`)
          }
        }
        await click(settings.getByRole('button', { name: '返回上一级', exact: true }).first())
        await settings.waitForURL('**#/settings/modules')
      }
      await home()
      await go('/settings/models', 'body-settings')
      const models = live2dOnly
        ? [['Hiyori (Free)', 'preset-live2d-2'], ['Hiyori (Pro)', 'preset-live2d-1']]
        : [['AvatarSample_A', 'preset-vrm-1'], ['Hiyori (Pro)', 'preset-live2d-1']]
      for (const [modelName, modelId] of models) {
        await click(settings.getByRole('button', { name: '选择模型', exact: true }))
        await settings.getByText(modelName, { exact: true }).waitFor()
        await capture(settings, `model-selector-${modelId}`)
        await click(settings.getByText(modelName, { exact: true }))
        await click(settings.getByRole('button', { name: '确认选择', exact: true }))
        await stage.waitForFunction(expected => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia._s.get('settings-stage-model')?.stageModelSelected === expected, modelId)
        check(`Model choice reaches desktop: ${modelId}`, await stage.evaluate(expected => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('settings-stage-model')?.stageModelSelected === expected, modelId))
        await wait(3000)
        if (live2dOnly)
          await stage.waitForFunction(() => document.documentElement.dataset.alicizationStageMounted === 'true', undefined, { timeout: 30000 })
        await capture(stage, `desktop-${modelId}`)
      }
      if (live2dOnly)
        await runLive2DProductChecks({ app, stage, settings, click, capture, check, report, wait })
      await home()
      await go('/settings/airi-card', 'cards-localized')
      const cardCount = await settings.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('airi-card').cards.size)
      check('Card upload uses its translated slot', (await settings.locator('body').innerText()).includes('点击或拖拽文件到此处上传'))
      await settings.locator('input[type=file]').setInputFiles({ name: 'invalid-card.json', mimeType: 'application/json', buffer: Buffer.from('{invalid json') })
      await settings.getByRole('alert').waitFor()
      check('Invalid card import shows an actionable error', (await settings.getByRole('alert').innerText()).includes('导入失败'))
      await capture(settings, 'invalid-card-feedback')
      await settings.locator('label:has(input[type=file])').evaluate((label) => {
        const transfer = new DataTransfer()
        transfer.items.add(new File(['{}'], 'invalid-drop.json', { type: 'application/json' }))
        label.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
      })
      check('Dropped card reaches import handler', (await settings.getByRole('alert').innerText()).includes('导入失败'))
      await settings.locator('label:has(input[type=file])').evaluate((label) => {
        const transfer = new DataTransfer()
        transfer.items.add(new File([JSON.stringify({ data: { name: 'QA 拖放角色卡', description: 'Synthetic drag and drop fixture', first_mes: '你好' } })], 'valid-drop.json', { type: 'application/json' }))
        label.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
      })
      await settings.getByRole('button', { name: '取消操作', exact: true }).waitFor()
      check('Valid dropped card opens the actual editor', await settings.getByRole('button', { name: '保存更改', exact: true }).isVisible())
      check('Invalid files never mutate the card list', await settings.evaluate(expected => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('airi-card').cards.size === expected + 1, cardCount))
      check('Imported inactive card does not replace personhood authority', await stage.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('airi-card').activeCardId === 'default'))
      await capture(settings, 'valid-dropped-card')
      await click(settings.getByRole('button', { name: '取消操作', exact: true }))
      check('Cancelling inactive card editing keeps the current identity', await stage.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('airi-card').activeCardId === 'default'))
      await click(settings.locator('button[title="编辑模块绑定"]').last())
      await click(settings.getByRole('button', { name: '保存更改', exact: true }))
      check('Saving inactive card bindings keeps the current identity', await stage.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('airi-card').activeCardId === 'default'))
      await home()
      await go('/settings/life', 'life')
      await settings.locator('input[type=number]').first().fill('0')
      await click(settings.getByRole('button', { name: '保存交流节奏', exact: true }))
      await settings.reload()
      await settings.waitForFunction(() => document.querySelector('input[type=number]')?.value === '0')
      check('Paused initiative persists after reload', await settings.locator('input[type=number]').first().inputValue() === '0')
      await click(settings.locator('summary').filter({ hasText: '本地备份与恢复' }))
      await click(settings.getByRole('button', { name: '创建备份', exact: true }))
      await settings.getByRole('button', { name: '恢复此备份', exact: true }).waitFor()
      await capture(settings, 'backup-created')
      await home()
      await go('/settings/system', 'appearance')
      for (const sub of ['general', 'color-scheme', 'developer']) {
        await go(`/settings/system/${sub}`, `appearance-${sub}`)
        if (sub === 'general') {
          for (const language of ['English', '简体中文']) {
            await click(settings.getByRole('button', { name: 'Show popup', exact: true }))
            await click(settings.getByRole('option', { name: language, exact: true }))
          }
          await wait(600)
          report.trayLabels = await app.evaluate(() => globalThis.productQaMenu?.items.map(item => item.label).filter(Boolean))
          check('Actual rebuilt tray menu has Chinese labels', report.trayLabels?.some(label => label.startsWith('关于')) && report.trayLabels.every(label => !label.includes('tamagotchi.')))
        }
        await click(settings.getByRole('button', { name: '返回上一级', exact: true }).first())
      }
      await home()
      for (const sub of ['data', 'connection']) { await go(`/settings/${sub}`, sub); await home() }
      await go('/settings/providers', 'providers')
      for (const [category, prefix] of [['对话模型', 'chat'], ['语音合成', 'speech'], ['语音识别', 'transcription']]) {
        if (await settings.locator(`a[href^="#/settings/providers/${prefix}/"]`).count() === 0)
          await click(settings.getByRole('button', { name: category, exact: true }))
      }
      await capture(settings, 'provider-categories-expanded')
      for (const route of ['/settings/modules/speech', '/settings/modules/hearing']) {
        await go(route, `builtin-${route.split('/').at(-1)}`)
        await click(settings.getByRole('button', { name: '返回上一级', exact: true }).first())
        await settings.waitForURL('**#/settings/providers')
      }
      const providerLinks = await settings.locator('a[href^="#/settings/providers/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href').slice(1)))
      for (const [i, route] of providerLinks.entries()) {
        const downloadsBefore = report.kokoroDownloadRequests.length
        await go(route, `provider-${i}-${route.split('/').at(-1)}`)
        if (route.endsWith('/kokoro-local')) {
          await settings.getByRole('button', { name: '载入语音模型', exact: true }).waitFor()
          check('Browsing local speech settings does not download a model', report.kokoroDownloadRequests.length === downloadsBefore)
          const localModelSelection = settings.getByPlaceholder('选择一个模型...', { exact: true })
          check('The local speech model has a visible selected label', /WASM|WebGPU/.test(await localModelSelection.inputValue()))
          check('Local speech setup does not ask for an API key', await settings.locator('input[type=password]').count() === 0)
          await app.context().route('**/huggingface.co/**', async (request) => { await wait(1500); await request.abort('failed') })
          const failedLoadStartedAt = Date.now()
          await click(settings.getByRole('button', { name: '载入语音模型', exact: true }))
          check('Local speech model selection is disabled while loading', await localModelSelection.isDisabled())
          await settings.getByRole('alert').filter({ hasText: '模型载入失败' }).waitFor()
          check('Offline local model loading returns an actionable error promptly', Date.now() - failedLoadStartedAt < 15000 && await settings.getByRole('button', { name: '重试载入', exact: true }).isEnabled())
          await capture(settings, 'kokoro-offline-feedback')
          await click(settings.getByRole('button', { name: '重试载入', exact: true }))
          await settings.getByRole('alert').filter({ hasText: '模型载入失败' }).waitFor()
          check('Offline local model loading can be retried without a stuck spinner', await settings.getByRole('button', { name: '重试载入', exact: true }).isEnabled())
          await app.context().unroute('**/huggingface.co/**')
          report.kokoroOfflineFixture = true
        }
        await click(settings.getByRole('button', { name: '返回上一级', exact: true }).first())
        await settings.waitForURL('**#/settings/providers')
        check(`Provider catalogue expansion survives return ${i}`, await settings.locator('a[href^="#/settings/providers/chat/"]').count() > 0 && await settings.locator('a[href^="#/settings/providers/speech/"]').count() > 0)
      }
    }
    if (fastExpression && process.env.LIFE_PRODUCT_FAST_WITH_WINDOWS === '1') {
      await go('/settings/system', 'exit-stress-system')
      await go('/settings/system/general', 'exit-stress-language')
      for (const language of ['English', '简体中文']) {
        await click(settings.getByRole('button', { name: 'Show popup', exact: true }))
        await click(settings.getByRole('option', { name: language, exact: true }))
      }
      await home()
    }
    if ((!fastExpression && !workOnly) || process.env.LIFE_PRODUCT_FAST_WITH_WINDOWS === '1') {
      for (const [prefix, route] of [['关于', '#/about'], ['打开字幕', '#/caption'], ['打开小部件', '#/widgets'], ['打开内嵌', '#/inlay']]) {
        if (process.env.LIFE_PRODUCT_AUX_FILTER && process.env.LIFE_PRODUCT_AUX_FILTER !== route)
          continue
        await app.evaluate((_, prefix) => {
          const item = globalThis.productQaMenu.items.find(item => item.label.startsWith(prefix))
          if (!item)
            throw new Error('Native tray command not found')
          item.click(item)
        }, prefix)
        let window
        for (let i = 0; i < 80; i++) {
          window = app.windows().find(page => page.url().includes(route)); if (window)
            break; await wait(250)
        }
        assert.ok(window, `Native tray command opens ${route}`)
        await wait(700)
        await capture(window, `tray-${route.slice(2)}`)
        if (route === '#/caption' && process.env.LIFE_PRODUCT_DISABLE_CAPTION_FOLLOW === '1') {
          await app.evaluate(async () => {
            const submenu = globalThis.productQaMenu.items.find(item => item.label === '字幕覆盖')?.submenu
            const follow = submenu?.items.find(item => item.label === '跟随窗口')
            if (!follow)
              throw new Error('Actual caption follow command unavailable')
            follow.checked = false
            await follow.click(follow)
          })
          await capture(window, 'caption-follow-disabled-diagnostic')
        }
        if (route === '#/about') {
          const overflow = await window.evaluate(() => [...document.querySelectorAll('*')].filter(node => ['auto', 'scroll'].includes(getComputedStyle(node).overflowX) && node.scrollWidth > node.clientWidth + 1).map(node => ({ tag: node.tagName, width: node.clientWidth, content: node.scrollWidth })))
          check('About window has no horizontal scrollbar', overflow.length === 0, overflow)
        }
        if (route === '#/widgets') {
          await click(window.getByRole('button', { name: '关闭窗口', exact: true }))
          check('An empty widget window can be closed', window.isClosed())
        }
      }
    }
    if (process.env.LIFE_PRODUCT_EXIT_AUX_ONLY === '1') {
      assert.ok(fastExpression, 'Auxiliary exit isolation is diagnostic-only')
      report.scope += ' Auxiliary-window exit isolation only; no dialogue or full-product acceptance.'
      report.passed = report.checks.every(check => check.passed) && report.errors.length === 0
      return
    }
    if (live2dOnly) {
      let startup
      let mounted = false
      for (let attempt = 0; attempt < 150; attempt++) {
        startup = await sampleLive2D(stage)
        mounted = await stage.evaluate(() => document.documentElement.dataset.alicizationStageMounted === 'true')
        if (mounted && startup.models.length === 1 && startup.models[0].drawFrame?.frame > 0)
          break
        await wait(200)
      }
      report.live2dStartup = { mounted, sample: startup, softwareGlRequested: process.env.LIFE_QA_SOFTWARE_GL === '1' }
      check('One actual Live2D model has drawn before task and dialogue acceptance', mounted && startup.models.length === 1 && startup.models[0].drawFrame?.frame > 0, report.live2dStartup)
    }
    await click(stage.locator('button:has([i-solar\\:alt-arrow-up-line-duotone])').last())
    await click(stage.locator('button:has([i-solar\\:chat-line-line-duotone])'))
    let chat
    for (let i = 0; i < 80; i++) {
      chat = app.windows().find(page => page.url().endsWith('#/chat')); if (chat)
        break; await wait(250)
    }
    assert.ok(chat)
    await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor({ timeout: 30000 })
    if (process.env.LIFE_PRODUCT_EXECUTION_WORK === '1') {
      await runExecutionExperience({ app, stage, settings, chat, root, report, capture, check, click })
      report.passed = true
      return
    }
    if (live2dOnly && textDialogue) {
      report.expressionObservation = await observeLive2DExpression(stage)
      const provider = await stage.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('speech').activeSpeechProvider)
      check('Fresh text-only experience uses the normal disabled speech selection', provider === 'speech-noop', provider)
    }
    if (live2dOnly && process.env.LIFE_PRODUCT_EXPRESSION === '1' && !textDialogue) {
      voice = await startSpeechQa(profile, { maxRequests: 48 })
      await Promise.all(app.windows().filter(page => page.url().includes('index.html#')).map(page => page.waitForFunction(() => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s.get('consciousness')?.runtimeConfigHydrated === true, undefined, { timeout: 30000 })))
      const bridgeAssets = path.resolve('apps/stage-tamagotchi/out/renderer/assets')
      const bridgeFile = (await fs.readdir(bridgeAssets)).find(file => /^alicization-bridge-.*\.js$/u.test(file))
      const bridgeAlias = /getAlicizationBridge as (\w+)/u.exec(await fs.readFile(path.join(bridgeAssets, bridgeFile), 'utf8'))?.[1]
      assert.ok(bridgeAlias)
      await app.evaluate(({ app, BrowserWindow }) => {
        app.on('web-contents-created', (_event, contents) => contents.setAudioMuted(true))
        BrowserWindow.getAllWindows().forEach(window => window.webContents.setAudioMuted(true))
      })
      await stage.evaluate(async ({ voiceUrl, bridgeFile, bridgeAlias }) => {
        const module = await import(new URL(`./assets/${bridgeFile}`, location.href).href)
        const bridge = module[bridgeAlias]()
        const mainConfiguration = await bridge.getLlmConfig()
        const voiceConfiguration = { baseUrl: voiceUrl, apiKey: 'qa-only', model: 'qa-sapi', voice: 'qa-sapi' }
        await bridge.syncLlmConfig({ ...mainConfiguration, providerCredentials: { ...mainConfiguration.providerCredentials, 'openai-compatible-audio-speech': voiceConfiguration } })
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
        const providers = pinia._s.get('providers')
        providers.providers['openai-compatible-audio-speech'] = voiceConfiguration
        providers.forceProviderConfigured('openai-compatible-audio-speech')
        const speech = pinia._s.get('speech')
        speech.activeSpeechProvider = 'openai-compatible-audio-speech'
        speech.activeSpeechModel = 'qa-sapi'
        speech.activeSpeechVoiceId = 'qa-sapi'
        speech.ssmlEnabled = false
      }, { voiceUrl: voice.url, bridgeFile, bridgeAlias })
      report.expressionObservation = await observeLive2DExpression(stage)
      await stage.evaluate(() => {
        const button = document.createElement('button')
        button.id = 'live2d-qa-audio-resume'
        button.textContent = 'QA audio context'
        button.style.cssText = 'position:fixed;left:4px;top:60px;z-index:2147483647'
        button.onclick = () => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('audio-context').audioContext.resume()
        document.body.append(button)
      })
      await stage.locator('#live2d-qa-audio-resume').click()
      await stage.locator('#live2d-qa-audio-resume').evaluate(button => button.remove())
      report.speechConfiguration = await stage.evaluate(() => {
        const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
        const speech = pinia._s.get('speech')
        return { provider: speech.activeSpeechProvider, model: speech.activeSpeechModel, voice: speech.activeSpeechVoiceId, audioContext: pinia._s.get('audio-context').audioContext.state }
      })
      check('Synthetic speech selection is ready and its private audio context is running', report.speechConfiguration.provider === 'openai-compatible-audio-speech' && report.speechConfiguration.audioContext === 'running', report.speechConfiguration)
      report.audioOutputMuted = true
      expressionStage = stage
    }
    check('Empty chat has a disabled send button and keyboard hint', await chat.getByRole('button', { name: '发送消息', exact: true }).isDisabled() && (await chat.locator('body').innerText()).includes('Shift + Enter'))
    await chat.locator('textarea').fill('你好，我叫 QA 产品回归，我喜欢在雨天画画。你叫什么？')
    await capture(chat, 'chat-visible-send')
    // Rapid clicks cover configuration preparation before the streaming lock.
    await click(chat.getByRole('button', { name: '发送消息', exact: true }), 2)
    await chat.getByRole('button', { name: '中断回复', exact: true }).waitFor()
    await chat.locator('textarea').fill('这是一份等待期间的新草稿。')
    await chat.locator('textarea').press('Enter')
    check('Repeated send retains the new draft while processing', await chat.locator('textarea').inputValue() === '这是一份等待期间的新草稿。')
    await capture(chat, 'chat-waiting-feedback')
    await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor({ timeout: 180000 })
    await capture(chat, 'actual-model-reply')
    const messages = await chat.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('chat-session')?.messages)
    // Read actual session state for evidence only; all sends went through the UI.
    report.actualReplyText = redact(await chat.locator('body').innerText())
    check('Actual dialogue produced a named persona reply', report.actualReplyText.includes('小艾'))
    check('Chat has no horizontal overflow', (await chat.evaluate(() => document.documentElement.scrollWidth <= innerWidth)))
    report.sessionEvidenceAvailable = Boolean(messages)
    check('Only the submitted user turn entered the conversation', messages?.filter(message => message.role === 'user').length === 1)
    if (!fastExpression) {
      await home()
      await go('/settings/data', 'data-roundtrip')
      const exportedFile = path.join(root, 'synthetic-chat-export.json')
      await app.evaluate(({ session }, target) => {
        session.defaultSession.once('will-download', (_event, item) => {
          item.setSavePath(target)
          item.once('done', (_event, state) => { globalThis.productQaDownloadState = state })
        })
      }, exportedFile)
      await click(settings.getByRole('button', { name: '导出聊天记录', exact: true }))
      for (let i = 0; i < 100 && !(await fs.access(exportedFile).then(() => true, () => false)); i++) await wait(100)
      const exported = await fs.readFile(exportedFile, 'utf8')
      check('Chat export contains the actual synthetic conversation', exported.includes('QA 产品回归'))
      check('Chat export excludes the provider key', !exported.includes(secret))
      await settings.locator('input[type=file]').setInputFiles({ name: 'invalid-chat.json', mimeType: 'application/json', buffer: Buffer.from('{bad') })
      await settings.getByRole('alert').waitFor()
      await capture(settings, 'chat-import-error')
      await settings.locator('input[type=file]').setInputFiles(exportedFile)
      await settings.waitForFunction(() => !document.querySelector('[role=alert]'))
      await chat.reload()
      await chat.waitForFunction(() => document.body?.innerText.includes('小艾'))
      check('Chat import and reload preserve the same conversation', (await chat.locator('body').innerText()).includes('QA 产品回归'))
      await capture(chat, 'chat-import-persisted')
    }
    if (textDialogue) {
      await runLive2DTextDialogueChecks({ stage, chat, report, capture, check, redact })
    }
    if (expressionStage) {
      const voiceAfterReload = await expressionStage.evaluate(() => {
        const speech = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('speech')
        return { provider: speech.activeSpeechProvider, voice: speech.activeSpeechVoiceId }
      })
      check('Chat reload preserves the chosen voice on the live stage', voiceAfterReload.provider === 'openai-compatible-audio-speech' && voiceAfterReload.voice === 'qa-sapi', voiceAfterReload)
      report.expressionTurns = []
      const expressionScenarios = [
        ['shared-joy', '今天画稿终于完成了，还得到了朋友的夸奖，我很开心，想和你分享一下。请简短聊两句。'],
        ['quiet-comfort', '不过我现在有点低落，担心下次画不好。先陪我安静一会儿，再轻轻鼓励我一句，好吗？'],
        ['gentle-acknowledgment', '你能轻轻点一下头回应我吗？一句简短的话就好。'],
      ]
      if (process.env.LIFE_PRODUCT_EXPRESSION_INITIAL_ONLY === '1') {
        for (let attempt = 0; attempt < 240; attempt++) {
          const speech = await sampleLive2DSpeech(expressionStage); const synthesis = voice.summary()
          if (attempt % 12 === 0) {
            report.expressionProgress = { speech, requests: synthesis.requests, pending: synthesis.pending, completed: synthesis.utterances.length }
            await save()
          }
          if (speech.hasSpoken && speech.latestActive === false && synthesis.pending === 0)
            break
          await wait(250)
        }
      }
      for (const [label, prompt] of process.env.LIFE_PRODUCT_EXPRESSION_INITIAL_ONLY === '1' ? [] : expressionScenarios) {
        const previousRequests = voice.summary().requests
        await expressionStage.evaluate((label) => { window.__live2dExpressionObservation.phase = label }, label)
        await chat.locator('textarea').fill(prompt)
        await click(chat.getByRole('button', { name: '发送消息', exact: true }))
        await chat.getByRole('button', { name: '发送消息', exact: true }).waitFor({ timeout: 180000 })
        if (process.env.LIFE_PRODUCT_COHERENCE === '1') {
          await expressionStage.waitForFunction(() => window.__live2dExpressionObservation.frames.at(-1)?.speech.active, null, { timeout: 60000 })
          await capture(expressionStage, `live2d-speaking-${label}`)
        }
        for (let attempt = 0; attempt < 240; attempt++) {
          const speech = await sampleLive2DSpeech(expressionStage)
          const synthesis = voice.summary()
          if (attempt > 10 && speech.latestActive === false && synthesis.pending === 0 && synthesis.requests > previousRequests)
            break
          await wait(250)
        }
        report.expressionTurns.push({ label, prompt, text: redact(await chat.locator('body').innerText()) })
        check(`Actual speech completes for ${label}`, voice.summary().requests > previousRequests && voice.summary().pending === 0)
        await capture(expressionStage, `live2d-expression-${label}`)
        await capture(chat, `dialogue-${label}`)
      }
      if (process.env.LIFE_PRODUCT_COHERENCE === '1')
        await runLive2DDialogueCoherenceChecks({ stage: expressionStage, chat, report, capture, check, redact, root })
      report.expressionCommands = await expressionStage.evaluate(() => {
        const qa = window.__live2dExpressionObservation
        return { motions: qa.motions, requests: qa.motionRequests, phaseTimes: qa.phaseTimes }
      })
      report.expressionFrames = await readLive2DExpression(expressionStage)
      report.speechFixture = voice.summary()
      const speaking = report.expressionFrames.filter(frame => frame.speech.active)
      check('Real dialogue reaches a real Live2D speech render frame', speaking.length > 0)
      check('The real speech pipeline opens the compiled Live2D mouth', speaking.some(frame => frame.values.ParamMouthOpenY > 0.15))
      const silentAudioFrames = []
      const strictPcm = process.env.LIFE_PRODUCT_STRICT_PCM === '1'
      let silentRun
      for (const frame of report.expressionFrames) {
        const audio = frame.actualAudio
        if (strictPcm) {
          if (audio?.quietWindowSeconds >= 0.199 && audio.elapsed >= 0.2 && audio.quietWindowRms < 0.001 && frame.speech.energy < 0.005)
            silentAudioFrames.push(frame)
          continue
        }
        if (!audio || audio.rms >= 0.001 || frame.speech.energy >= 0.005) {
          silentRun = null
          continue
        }
        if (!silentRun || silentRun.id !== audio.id)
          silentRun = { id: audio.id, began: audio.elapsed }
        if (audio.elapsed - silentRun.began >= 0.2)
          silentAudioFrames.push(frame)
      }
      const idleSilentFrames = silentAudioFrames.filter(frame => frame.nativeMotionPriority === 0 || frame.nativeMotionPriority === 1)
      const foregroundSilentFrames = silentAudioFrames.filter(frame => frame.nativeMotionPriority > 1)
      report.actualAudioSilence = { scope: strictPcm ? 'All decoded PCM samples in a 200 ms window at the actual AudioContext playback clock, with window RMS below 0.001 and speech energy below 0.005. NONE/IDLE aperture is below 0.14; foreground actions in these gentle dialogue scenarios may retain small nonverbal facial opening below 0.20. Controlled neutral calibration separately requires below 0.05.' : 'Consecutive low-RMS render observations spanning at least 200 ms, with speech energy below its noise floor.', strictPcm, frames: silentAudioFrames.length, maxMouthOpen: Math.max(0, ...silentAudioFrames.map(frame => frame.values.ParamMouthOpenY)), idleFrames: idleSilentFrames.length, maxIdleMouthOpen: Math.max(0, ...idleSilentFrames.map(frame => frame.values.ParamMouthOpenY)), foregroundFrames: foregroundSilentFrames.length, maxForegroundMouthOpen: Math.max(0, ...foregroundSilentFrames.map(frame => frame.values.ParamMouthOpenY)), idleCeiling: 0.14, foregroundCeiling: 0.20 }
      if (process.env.LIFE_PRODUCT_QUIET_MOUTH_ASSERTIONS === '1')
        check('Actual audio silence releases speaking aperture while retaining small nonverbal expression', silentAudioFrames.length > 0 && idleSilentFrames.length + foregroundSilentFrames.length === silentAudioFrames.length && report.actualAudioSilence.maxIdleMouthOpen < 0.14 && report.actualAudioSilence.maxForegroundMouthOpen < 0.20, report.actualAudioSilence)
      check('Local voice synthesis completed without errors', report.speechFixture.requests > 0 && report.speechFixture.pending === 0 && report.speechFixture.utterances.length === report.speechFixture.requests && report.speechFixture.failures.length === 0, report.speechFixture)
      check('Speech ownership is released after the actual dialogue', report.expressionFrames.at(-1)?.speech.active === false)
      check('The matching cross-window chat intent is closed after playback', report.expressionFrames.at(-1)?.speechActivity?.chatIntentId === null)
      report.expressionScope = 'Actual configured LLM replies and bounded local Windows SAPI audio through the regular speech pipeline, with audio output muted. SAPI supplies test speech; this does not verify cloud voice quality or physical audio hardware.'
    }
    report.rawKeyPages = report.pages.filter(page => page.rawKeys.length).map(page => ({ name: page.name, rawKeys: page.rawKeys }))
    check('All observed product pages resolve translation keys', report.rawKeyPages.length === 0, report.rawKeyPages)
    check('No renderer exceptions', report.errors.length === 0, report.errors)
    if (live2dOnly)
      check('No unexpected Live2D load or render errors', !report.rendererConsoleErrors.some(error => error.url.startsWith('file:') && error.message.startsWith('[Live2D]')), report.rendererConsoleErrors.filter(error => error.message.startsWith('[Live2D]')))
    report.passed = true
  }
  catch (error) {
    report.failure = redact(error.message)
    report.failureStack = redact(error.stack || error.message)
    report.modelFailureProbes = []
    for (const [index, page] of app.windows().entries()) {
      if (!page.isClosed() && page.url().includes('index.html#')) {
        await capture(page, `failure-window-${index}`).catch(() => {})
        const probe = await page.evaluate(async () => {
          const pinia = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia
          const store = pinia?._s.get('settings-stage-model')
          const models = pinia?._s.get('display-models')
          if (!store || !models)
            return null
          const model = await models.getDisplayModel(store.stageModelSelected)
          const result = { selected: store.stageModelSelected, renderer: store.stageModelRenderer, mounted: document.documentElement.dataset.alicizationStageMounted, blobUrl: store.stageModelSelectedUrl?.startsWith('blob:') ? store.stageModelSelectedUrl : null, file: model?.type === 'file' ? { name: model.file.name, size: model.file.size, lastModified: model.file.lastModified } : null }
          if (!result.file)
            return result
          const bounded = task => Promise.race([task, new Promise((_, reject) => setTimeout(() => reject(new Error('Model read diagnostic exceeded 2s')), 2000))])
          try { result.fileBytes = (await bounded(model.file.arrayBuffer())).byteLength }
          catch (failure) { result.fileError = String(failure) }
          if (result.blobUrl) {
            try { result.currentUrlBytes = (await bounded(fetch(result.blobUrl).then(response => response.arrayBuffer()))).byteLength }
            catch (failure) { result.currentUrlError = String(failure) }
          }
          const fresh = URL.createObjectURL(model.file)
          try { result.freshUrlBytes = (await bounded(fetch(fresh).then(response => response.arrayBuffer()))).byteLength }
          catch (failure) { result.freshUrlError = String(failure) }
          finally { URL.revokeObjectURL(fresh) }
          return result
        }).catch(failure => ({ diagnosticError: redact(failure.message) }))
        report.modelFailureProbes.push({ url: page.url(), probe })
      }
    }
    await save()
    throw new Error(report.failure)
  }
  finally {
    if (process.env.LIFE_PRODUCT_NATIVE_DOWNLOAD_OBSERVE === '1')
      report.nativeDownloads = await readNativeDownloads(app).catch(() => null)
    report.providerTransport = await releaseProviderTransportObservation(app).catch(() => null)
    await ownedNativeCapture.close(app)
    if (expressionStage && !expressionStage.isClosed())
      report.audioObservation = await expressionStage.evaluate(() => window.__live2dExpressionObservation?.audioEvents ?? []).catch(() => [])
    if (expressionStage && !expressionStage.isClosed())
      report.streamObservation = await expressionStage.evaluate(() => { const qa = window.__live2dExpressionObservation; return { chatEvents: qa?.chatEvents, selectionChanges: qa?.selectionChanges, hookEvents: qa?.hookEvents, generationReads: qa?.generationReads, providerCalls: qa?.providerCalls } }).catch(() => null)
    if (expressionStage && !expressionStage.isClosed())
      report.expressionFrames = await readLive2DExpression(expressionStage).catch(() => report.expressionFrames)
    if (voice) {
      report.speechFixture = voice.summary()
      await voice.close()
    }
    await save()
    // Remove this QA profile's credential storage only after normal shutdown.
    // Clearing live Local Storage first can reinitialize every open renderer
    // (including its audio graph) while the app is trying to flush and exit.
    report.shutdown = await closePrivateRuntime(app, report.nativeRuntime, { viaUi: true, nativeProcess })
    report.mainExitMessages = report.shutdown.exitMessages
    await save()
    if (report.shutdown.completed && report.shutdown.exitCode === 0)
      await inspectExecutionProductAfterShutdown({ report, profile, root, check, redact })
    else
      report.postShutdownInspectionsSkipped = 'The runtime did not complete normal shutdown; no product acceptance is inferred.'
    const nativeClosed = nativeProcess.exitCode !== null || nativeProcess.signalCode !== null
    if (nativeClosed) {
      try {
        const configPath = path.join(profile, 'alicizations/llm-config.json')
        const config = JSON.parse(await fs.readFile(configPath, 'utf8').catch(() => '{}'))
        config.providerCredentials = {}
        await fs.writeFile(configPath, JSON.stringify(config))
        const storage = path.join(profile, 'Local Storage')
        const resolvedProfile = await fs.realpath(profile)
        assert.match(path.basename(resolvedProfile), /^alicization-life-product-regression-/)
        assert.equal(path.dirname(resolvedProfile).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
        await fs.rm(storage, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
        report.credentialsRemoved = true
      }
      catch (error) { report.credentialCleanupFailure = redact(error.message) }
    }
    else {
      report.credentialsRemoved = false
      report.credentialCleanupDeferred = 'The exact synthetic runtime remains active; live storage was preserved.'
    }
    report.finishedAt = new Date().toISOString()
    if (!report.shutdown.completed || report.shutdown.exitCode !== 0 || !report.credentialsRemoved) {
      report.passed = false
      report.failure ||= report.shutdown.failure || `Application exited abnormally: ${report.shutdown.exitCode}`
      process.exitCode = 1
    }
    await save()
    console.info(JSON.stringify({ root, passed: report.passed, checks: report.checks.length, pages: report.pages.length, failure: report.failure }))
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
