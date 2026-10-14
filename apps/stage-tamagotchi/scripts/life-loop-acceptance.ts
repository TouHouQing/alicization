import process from 'node:process'

import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const output = join(workspace, 'output', 'life-acceptance')
const desktop = 'apps/stage-tamagotchi/src/'
const core = `${desktop}main/services/alicization/`
const nodes = [
  ['N00', ['life-input-recovery', 'life-input-resume']],
  ['N01', ['life-state-store', 'main-chat-background-run']],
  ['N02', ['runtime-card-scope-orchestrator', 'life-agency-runtime']],
  ['N03', ['life-provider-budget', 'long-term-memory-recall', 'life-memory-repository']],
  ['N04', ['life-fact-validity', 'life-entity-resolver', 'life-memory-repository']],
  ['N05', ['emotional-temporal-continuity', 'life-evidence-repository']],
  ['N06', ['runtime-delivery-reminders', 'runtime-reminder-due-scheduler', 'life-state-store']],
  ['N07', ['life-personal-project-runtime', 'life-project-development', 'life-agency-runtime']],
  ['N08', ['life-reply-grounding-runtime', 'main-chat-background-run']],
  ['N09', ['life-runtime-event-commit', 'life-state-store']],
  ['N10', ['turn-os/tool-registry', 'executor-adapters/cli', 'task-thread-dispatcher']],
  ['N11', ['life-goal-verifier', 'life-task-verification-runtime']],
  ['N12', ['digital-life-kernel', 'digital-life-spine']],
  ['N13', ['life-state-store', 'life-closure-query']],
  ['N14', ['life-evidence-repository', 'life-owned-artifact-governance-runtime']],
  ['N15', ['life-persona-development-runtime', 'life-policy-development-runtime', 'life-growth-repository']],
  ['N16', ['life-backup-runtime', 'life-soul-activation-runtime', 'life-input-recovery']],
  ['N17', ['runtime-invoke-handlers-life', 'life-closure-query']],
] as const
interface TestReport {
  numTotalTests: number
  numPassedTests: number
  numFailedTests: number
  numPendingTests: number
  testResults: Array<{
    name: string
    status: string
    assertionResults: Array<{
      status: string
    }>
  }>
}
async function runPnpm(args: string[]) {
  const pnpm = process.env.npm_execpath
  if (!pnpm)
    throw new Error('Run this harness through pnpm -F @proj-alicization/stage-tamagotchi life:acceptance')
  await new Promise<void>((resolveTask, reject) => {
    const child = /\.[cm]?js$/u.test(pnpm) ? spawn(process.execPath, [pnpm, ...args], { cwd: workspace, stdio: 'inherit', windowsHide: true }) : spawn(pnpm, args, { cwd: workspace, stdio: 'inherit', windowsHide: true })
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolveTask() : reject(new Error(`Acceptance command exited ${code}`)))
  })
}
async function runNative(script: string, environment: Record<string, string> = {}) {
  const log = join(output, `${script.replace('.cjs', '')}-${environment.LIFE_QA_STAGE_MODEL ?? (environment.LIFE_QA_INTERRUPT === '1' ? 'interrupted' : 'default')}.log`)
  let captured = ''
  await new Promise<void>((resolveTask, reject) => {
    const child = spawn(process.execPath, [join(workspace, 'apps/stage-tamagotchi/scripts/life-acceptance', script)], { cwd: workspace, windowsHide: true, env: { ...process.env, ...environment }, stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout.on('data', (bytes) => {
      captured += bytes
    })
    child.stderr.on('data', (bytes) => {
      captured += bytes
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      void writeFile(log, captured).then(() => {
        code === 0 ? resolveTask() : reject(new Error(`Native acceptance ${script} failed; inspect ${log}`))
      }, reject)
    })
  })
  const records = captured.split(/\r?\n/u).flatMap((line) => {
    try {
      return [JSON.parse(line) as Record<string, unknown>]
    }
    catch {
      return []
    }
  })
  const profileRecord = records.findLast(record => typeof record.profile === 'string' || typeof record.userData === 'string')
  return { script, passed: true, log, profile: (profileRecord?.profile ?? profileRecord?.userData) as string | undefined }
}
await mkdir(output, { recursive: true })
const reportOnly = process.argv.indexOf('--report-only')
const desktopReport = reportOnly >= 0 ? resolve(process.argv[reportOnly + 1]) : join(output, 'desktop.json')
if (reportOnly < 0) {
  await runPnpm(['-F', '@proj-alicization/stage-tamagotchi', 'exec', 'vitest', 'run', '--testTimeout', '30000', '--maxWorkers', '2', '--reporter=json', `--outputFile=${desktopReport}`])
  await runPnpm(['exec', 'vitest', 'run', 'packages/stage-ui/src/components/scenes/use-stage-dialogue-arrival-visibility.test.ts', 'packages/stage-ui/src/components/scenes/use-stage-dialogue-hover-visibility.test.ts', 'packages/stage-ui/src/components/scenes/use-stage-embodiment-speech.test.ts', 'packages/stage-ui/src/libs/speech-audio-playback.test.ts', 'packages/stage-ui/src/stores/modules/speech-selection.test.ts', 'packages/stage-ui/src/services/speech/pipeline-runtime.test.ts', 'packages/pipelines-audio/src/managers/playback-manager.test.ts', 'packages/pipelines-audio/src/managers/utterance-playback-tracker.test.ts', '--reporter=json', `--outputFile=${join(output, 'expression.json')}`])
}
const report = JSON.parse(await readFile(desktopReport, 'utf8')) as TestReport
if (process.argv.includes('--configured-growth')) {
  process.env.LIFE_QA_CONFIGURED_GROWTH = '1'
  await runPnpm(['-F', '@proj-alicization/stage-tamagotchi', 'exec', 'vitest', 'run', 'src/main/services/alicization/life-policy-development-runtime.test.ts', 'src/main/services/alicization/life-persona-development-runtime.test.ts', '--maxWorkers', '1'])
  delete process.env.LIFE_QA_CONFIGURED_GROWTH
}
const native: Awaited<ReturnType<typeof runNative>>[] = []
if (process.argv.includes('--native')) {
  if (process.platform !== 'win32')
    throw new Error('Native life acceptance currently targets an interactive Windows desktop')
  await mkdir(join(workspace, 'output/playwright'), { recursive: true })
  native.push(await runNative('life-current-persona-smoke.cjs'))
  for (const script of ['life-current-ui-smoke.cjs', 'life-current-backup-ui.cjs'])
    native.push(await runNative(script))
  for (const model of ['preset-live2d-1', 'preset-vrm-1'])
    native.push(await runNative('life-current-stage-smoke.cjs', { LIFE_QA_STAGE_MODEL: model }))
  if (process.argv.includes('--configured-model')) {
    const ready = native[0].profile
    if (!ready)
      throw new Error('Native persona QA did not record its isolated identity')
    native.push(await runNative('life-current-real-model-smoke.cjs', { LIFE_QA_VOICE: '1', LIFE_QA_READY_SOURCE: ready, LIFE_QA_INTERRUPT: '0' }))
    native.push(await runNative('life-current-real-model-smoke.cjs', { LIFE_QA_VOICE: '1', LIFE_QA_READY_SOURCE: ready, LIFE_QA_INTERRUPT: '1', LIFE_QA_COLLAPSED_CHECK: '1' }))
  }
}
if (process.argv.includes('--installer'))
  native.push(await runNative('life-current-installer.cjs'))
const rows = nodes.map(([node, files]) => {
  const suites = files.map((file) => {
    const name = `${core}${file}.test.ts`
    const result = report.testResults.find(result => result.name.replaceAll('\\', '/').endsWith(name))
    return { file: name, passed: result?.status === 'passed', tests: result?.assertionResults.filter(test => test.status === 'passed').length ?? 0, skipped: result?.assertionResults.filter(test => ['pending', 'skipped'].includes(test.status)).length ?? 0 }
  })
  return { node, passed: suites.every(suite => suite.passed && suite.tests > 0), suites }
})
const summary = { format: 'life-engineering-acceptance-v1', recordedAt: new Date().toISOString(), scope: 'Production service regression coverage; native body/device results and long-term companionship observation are separate evidence.', desktopReport, counts: { total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, skipped: report.numPendingTests }, nodes: rows, native }
await writeFile(join(output, 'nodes.json'), JSON.stringify(summary, null, 2))
console.info(JSON.stringify({ report: join(output, 'nodes.json'), failedNodes: rows.filter(row => !row.passed).map(row => row.node), ...summary.counts }))
if (report.numFailedTests || rows.some(row => !row.passed))
  process.exitCode = 1
