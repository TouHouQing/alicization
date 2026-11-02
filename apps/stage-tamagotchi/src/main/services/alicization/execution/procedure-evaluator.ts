import type { AlicizationDbService } from '../db'
import type { ToolRegistry } from '../turn-os/tool-registry'
import type { ProcedureBrowserReplay, ProcedureBrowserReplayFactory, ProcedureFormFixtureInput } from './procedure-browser-replay-types'
import type { ProcedureCandidate, ProcedureEvaluation } from './procedure-candidate-repository'
import type { ProcedureDelegatedReplay, ProcedureDelegatedReplayFactory } from './procedure-delegated-replay-types'
import type { ProcedureDesktopReplay, ProcedureDesktopReplayFactory } from './procedure-desktop-replay-types'
import type { ProcedureSample } from './procedure-performance'

import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative } from 'node:path'

import { errorMessageFrom } from '@moeru/std'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { executionDigest } from './acceptance-compiler'
import { procedureBrowserInteraction } from './procedure-browser-interaction'
import { procedureDesktopInteraction } from './procedure-desktop-interaction'
import { procedureEvaluationDiagnostic } from './procedure-evaluation-diagnostic'
import { procedurePageRoutes } from './procedure-page-routes'
import { procedureComparisonFamily, readProcedureSample } from './procedure-performance'
import { instantiateProcedureTemplate } from './procedure-template'
import { procedureEvaluationCases, procedureEvaluatorVersion } from './procedure-transfer-operations'
import { createExecutionResourceBroker } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

const digest = (text: string) => createHash('sha256').update(text).digest('hex')

/** No provider-provided verdict is accepted: replay uses actual native I/O and the life verifier. */
export async function evaluateProcedureCandidate(candidateId: string, candidate: ProcedureCandidate, registry: ToolRegistry, signal: AbortSignal, browserFactory?: ProcedureBrowserReplayFactory, delegatedFactory?: ProcedureDelegatedReplayFactory, desktopFactory?: ProcedureDesktopReplayFactory): Promise<ProcedureEvaluation> {
  const cases: ProcedureEvaluation['cases'] = []
  // Directory observations return canonical paths. Windows' TEMP can use an
  // 8.3 alias, so bind the owned root to the same physical path before replay.
  const root = await realpath(await mkdtemp(join(tmpdir(), 'alicization-procedure-evaluation-')))
  let database: AlicizationDbService | undefined
  let runtime: ReturnType<typeof createWorkPlanExecutionRuntime> | undefined
  let browser: ProcedureBrowserReplay | undefined
  let delegated: ProcedureDelegatedReplay | undefined
  let desktop: ProcedureDesktopReplay | undefined
  const evaluatorVersion = procedureEvaluatorVersion(candidate.template)
  const inside = (path: string) => {
    const child = relative(root, path)
    return isAbsolute(path) && child !== '..' && !child.startsWith('../') && !child.startsWith('..\\') && !isAbsolute(child)
  }
  try {
    signal.throwIfAborted()
    const interaction = procedureBrowserInteraction(candidate.template)
    const pageRoutes = procedurePageRoutes(candidate.template)
    const desktopInteraction = procedureDesktopInteraction(candidate.template)
    if (desktopInteraction) {
      if (!desktopFactory)
        throw new Error('Desktop methods require an owned real native evaluator')
      desktop = await desktopFactory({ root, template: candidate.template, signal })
    }
    if (candidate.template.tools.some(tool => tool.id.startsWith('tool.browser_'))) {
      if (!browserFactory)
        throw new Error('Browser procedures require an owned real-browser evaluator')
      browser = await browserFactory(root, signal)
      const interactionTools = ['tool.browser_type_text', 'tool.browser_click_element', 'tool.browser_wait', ...(interaction?.uploads.length ? ['tool.browser_upload_files' as const] : [])] as const
      if (interaction && (!browser.prepareForm || !browser.inspectForm || interactionTools.some(id => typeof browser?.tools[id] !== 'function')))
        throw new Error('Interactive procedures require the actual owned form evaluator and observations')
    }
    database = await setupAlicizationDb(join(root, 'life'), { cardId: 'procedure-evaluation' })
    const db = database
    const broker = createExecutionResourceBroker()
    const interrupts = createExecutionInterruptRegistry(broker)
    if (candidate.template.tools.some(tool => tool.id.startsWith('coding_agent.'))) {
      if (!delegatedFactory)
        throw new Error('Delegated procedures require an owned configured executor for evaluation')
      delegated = await delegatedFactory({ root, database: db, registry, template: candidate.template, interrupts, signal })
    }
    const errors: unknown[] = []
    runtime = createWorkPlanExecutionRuntime({
      getDatabase: () => db,
      enabled: () => !signal.aborted,
      broker,
      interrupts,
      toolRegistry: () => registry,
      captureBrowserBinding: () => browser?.binding ?? null,
      isBrowserBindingCurrent: binding => browser?.isCurrent(binding) ?? false,
      onError: error => errors.push(error),
      tools: { ...browser?.tools, ...delegated?.tools, ...desktop?.tools, ...Object.fromEntries(['read_file', 'list_directory', 'write_file'].map(name => [`tool.filesystem_${name}`, async (input: Record<string, unknown>, actionSignal: AbortSignal) => {
        if (typeof input.path !== 'string' || !inside(input.path))
          throw new Error('Procedure evaluation attempted to escape its owned fixture')
        return callLocalFilesystem({ toolName: name, arguments: input, workspace: root, signal: AbortSignal.any([signal, actionSignal]) })
      }])) },
    })
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    async function replay(arguments_: Record<string, unknown>, name: string, expected: boolean, inputHash?: string): Promise<{ passed: boolean, evidenceHash: string, diagnostic?: string, sample?: ProcedureSample }> {
      const replayStarted = Date.now()
      const approvalCount = () => (browser ? browser.approvalCount?.() : 0) === undefined ? undefined : (browser?.approvalCount?.() ?? 0) + (desktop?.approvalCount() ?? 0) + (delegated?.snapshot().approvals ?? 0) + (delegated?.snapshot().denied ?? 0)
      const initialApprovals = approvalCount()
      const sample = (view: Awaited<ReturnType<AlicizationDbService['readLifeState']>>, planId: string) => inputHash && initialApprovals !== undefined
        ? { sample: readProcedureSample({ view, planId, inputHash, elapsedMs: Date.now() - replayStarted, approvals: (approvalCount() ?? initialApprovals) - initialApprovals }) }
        : {}
      const errorCount = errors.length
      const proposal = instantiateProcedureTemplate(candidate.template, arguments_, registry, `Isolated replay ${name}`)
      await life.admit({ cardId: 'procedure-evaluation', turnId: name, conversationId: 'isolated-procedure-evaluation', messages: [{ role: 'user', content: proposal.goal }] }, signal)
      const accepted = await runtime!.propose({ ...proposal, cardId: 'procedure-evaluation', turnId: name, abortSignal: signal })
      await life.settle({ cardId: 'procedure-evaluation', turnId: name, status: 'completed' })
      const deadline = Date.now() + (delegated ? 125_000 : desktop ? 45_000 : interaction ? 20_000 : 10_000)
      while (Date.now() < deadline) {
        signal.throwIfAborted()
        if (expected && errors.length > errorCount)
          throw errors[errorCount]
        const view = await db.readLifeState({ executionPlanId: accepted.planId })
        const goal = view.obligations.find(goal => goal.threadId === accepted.rootThreadId)
        if (name === 'delegation-interrupted' && goal && !runtime!.isActive()) {
          const ids = new Set(view.execution?.results.filter(result => result.planId === accepted.planId).map(result => result.effectId))
          const unknown = view.effects.some(effect => ids.has(effect.id) && effect.status === 'uncertain')
          return { passed: goal.status !== 'fulfilled' && unknown, evidenceHash: executionDigest({ goal: goal.id, status: goal.status, unknown }) }
        }
        if (goal?.verification?.independent && !runtime!.isActive()) {
          const passed = expected ? goal.status === 'fulfilled' && goal.verification.verdict === 'satisfied' : goal.status !== 'fulfilled' && goal.verification.verdict === 'not-satisfied'
          return { passed, evidenceHash: executionDigest({ id: goal.id, verification: goal.verification }), ...sample(view, accepted.planId), ...(!passed ? { diagnostic: procedureEvaluationDiagnostic(view, accepted.planId) } : {}) }
        }
        if (goal && ['blocked', 'cancelled'].includes(goal.status) && !runtime!.isActive()) {
          const effectIds = new Set(view.execution?.results.filter(result => result.planId === accepted.planId).map(result => result.effectId))
          const dispatched = view.effects.some(effect => effectIds.has(effect.id) && effect.status === 'settled' && effect.receipt?.outcome === 'failure' && effect.payload.capabilityId === 'tool.browser_open_url' && (effect.receipt.output as { effectMayHaveOccurred?: boolean })?.effectMayHaveOccurred === false)
          const refused = view.effects.some(effect => effectIds.has(effect.id) && effect.status === 'settled' && effect.receipt?.outcome === 'failure' && (effect.receipt.output as { errorCode?: string })?.errorCode === 'WORK_DELEGATION_NOT_APPROVED')
          const observedForm = Boolean(interaction) && view.effects.some(effect => effectIds.has(effect.id) && effect.status === 'settled' && effect.receipt?.outcome === 'success' && effect.payload.capabilityId === 'tool.browser_read_page')
          const observedDesktop = Boolean(desktopInteraction) && view.effects.some(effect => effectIds.has(effect.id) && effect.status === 'settled' && effect.payload.capabilityId === 'tool.desktop_list_interactables')
          const passed = !expected && (dispatched || refused || observedForm || observedDesktop)
          if (inputHash && view.effects.some(effect => effectIds.has(effect.id) && ['claimed', 'dispatched', 'uncertain'].includes(effect.status)))
            throw new Error(`An uncertain replay cannot start another comparison input: ${procedureEvaluationDiagnostic(view, accepted.planId)}; cause=${errorMessageFrom(errors.at(-1)) ?? 'unavailable'}`)
          return { passed, evidenceHash: executionDigest({ id: goal.id, status: goal.status, dispatched, refused, observedForm }), ...sample(view, accepted.planId), ...(!passed ? { diagnostic: procedureEvaluationDiagnostic(view, accepted.planId) } : {}) }
        }
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      throw new Error('Replay did not settle within its bounded evaluation window')
    }
    let latestArguments: Record<string, unknown> = {}
    let latestText = ''
    let latestPages: Record<string, string> = {}
    let latestForm: ProcedureFormFixtureInput | null = null
    for (const round of [1, 2]) {
      signal.throwIfAborted()
      const directory = join(root, `case-${round}`)
      await mkdir(directory)
      const expectedText = `Different synthetic value ${round} 中文🙂`
      let text = JSON.stringify({ [`key${round}`]: expectedText, value: expectedText })
      if (desktopInteraction)
        text = round === 1 ? 'Native 中文🙂\r\nLiteral $(Get-Process) and "quoted" text' : 'Native العربية e\u0301 👩‍👩‍👧‍👦\nSecond line with LF'
      const pageTexts = Object.fromEntries((pageRoutes ?? []).map((route, index) => [route.urlParameter, JSON.stringify({ [`key${round}`]: expectedText, page: index + 1, value: `Independent page ${index + 1}/${round} 中文🙂` })]))
      const formInput: ProcedureFormFixtureInput | null = interaction ? { caseId: `different-input-${round}`, fields: interaction.fields.map((_, index) => ({ label: `Field ${round}/${index}`, text: `${expectedText} field ${index}` })), submitLabel: `Record ${round}`, receiptText: `Owned receipt ${round}` } : null
      const uploadPaths: string[][] = []
      if (interaction?.uploads.length && formInput) {
        formInput.uploads = []
        for (const [index] of interaction.uploads.entries()) {
          const files = []
          const paths = []
          // Different rounds exercise both single and multiple-file selection.
          for (let fileIndex = 0; fileIndex < round; fileIndex++) {
            const name = `attachment-${round}-${index}-${fileIndex}.txt`
            const content = `${expectedText} attachment ${index}/${fileIndex}\r\nExact received bytes`
            const path = join(directory, name)
            await writeFile(path, content, { flag: 'wx' })
            paths.push(path)
            files.push({ name, bytes: new TextEncoder().encode(content).length, sha256: digest(content) })
          }
          uploadPaths.push(paths)
          formInput.uploads.push({ label: `Attachment ${round}/${index}`, files })
        }
      }
      const form = formInput ? await browser!.prepareForm!(formInput) : null
      if (form)
        text = form.expectedText
      const page = !pageRoutes && !interaction ? await browser?.prepare({ caseId: `different-input-${round}`, text }) : null
      const pages = browser && pageRoutes ? await browser.preparePages({ caseId: `different-input-${round}`, pages: pageRoutes.map(route => ({ id: route.urlParameter, text: pageTexts[route.urlParameter] })) }) : null
      let arguments_: Record<string, unknown> = Object.fromEntries(candidate.template.parameters.map(parameter => [parameter.name, parameter.kind === 'path'
        ? join(directory, `${parameter.name}.json`)
        : parameter.kind === 'directory'
          ? directory
          : parameter.kind === 'file-list' || parameter.kind === 'argument-list'
            ? []
            : parameter.kind === 'url'
              ? form ? form.url : pages ? pages.urls[parameter.name] : page!.url
              : parameter.kind === 'sha256'
                ? digest(text)
                : parameter.kind === 'text-list'
                  ? [parameter.role === 'json-keys' ? `key${round}` : `entry${round}.json`]
                  : parameter.role === 'content'
                    ? text
                    : parameter.role === 'selected-entry' ? `entry${round}.json` : expectedText]))
      for (const route of pageRoutes ?? [])
        arguments_[route.hashParameter] = digest(pageTexts[route.urlParameter])
      if (interaction && formInput) {
        interaction.fields.forEach((field, index) => {
          arguments_[field.labelParameter] = formInput.fields[index].label
          arguments_[field.textParameter] = formInput.fields[index].text
        })
        interaction.uploads.forEach((upload, index) => {
          arguments_[upload.labelParameter] = formInput.uploads![index].label
          arguments_[upload.filesParameter] = uploadPaths[index]
        })
        arguments_[interaction.submitLabelParameter] = formInput.submitLabel
        arguments_[interaction.waitTextParameter] = formInput.receiptText
      }
      // Directory parameters are explicit paths, never inferred from private examples.
      for (const step of candidate.template.steps) {
        if (step.capabilityId === 'tool.filesystem_list_directory') {
          const ref = (step.input as Record<string, { $parameter?: string }>).path?.$parameter
          if (ref)
            arguments_[ref] = join(directory, `${ref}-directory`)
        }
      }
      for (const criterion of candidate.template.criteria) {
        const predicate = criterion.predicate as { kind: string, path?: { $parameter: string } }
        if (predicate.kind === 'directory-members' && predicate.path)
          arguments_[predicate.path.$parameter] = join(directory, `${predicate.path.$parameter}-directory`)
      }
      if (delegated)
        arguments_ = await delegated.prepare({ template: candidate.template, arguments: arguments_, directory, text, mode: 'normal' })
      if (desktop && desktopInteraction) {
        const fixture = await desktop.prepare({ caseId: `different-input-${round}`, entryLabel: `Editor field ${round}`, saveLabel: `Save note ${round}`, path: arguments_[desktopInteraction.pathParameter] as string })
        arguments_[desktopInteraction.windowParameter] = fixture.windowTitle
        arguments_[desktopInteraction.saveLabelParameter] = `Save note ${round}`
        arguments_[desktopInteraction.textParameter] = text
      }
      const proposal = instantiateProcedureTemplate(candidate.template, arguments_, registry, `Isolated different-input replay ${round}`)
      const writes = new Set(proposal.steps.filter(step => step.capabilityId === 'tool.filesystem_write_file').map(step => step.input.path))
      // A delegated child must actually create or change its accepted artifact.
      // Preseeding final bytes would turn a successful no-op into false proof.
      if (delegated || desktop) {
        for (const criterion of proposal.criteria) {
          if ('path' in criterion.predicate)
            writes.add(criterion.predicate.path)
        }
      }
      for (const step of proposal.steps) {
        if (!step.capabilityId.startsWith('tool.filesystem_'))
          continue
        // A dependent path exists only after its committed observation. Seed
        // its source, then let the scheduler resolve and boundary-check it.
        if (step.inputBindings?.some(binding => binding.parameter === 'path'))
          continue
        const path = step.input.path
        if (typeof path !== 'string' || !inside(path))
          throw new Error('Replay path is not owned by its isolated fixture')
        if (step.capabilityId === 'tool.filesystem_list_directory') {
          await mkdir(path, { recursive: true })
          await writeFile(join(path, `entry${round}.json`), text)
        }
        else if (!writes.has(path)) {
          await writeFile(path, text)
        }
        else if (delegated && step.capabilityId === 'tool.filesystem_read_file') {
          await writeFile(path, '{"initial":"different from the accepted final bytes"}')
        }
      }
      for (const criterion of proposal.criteria) {
        const predicate = criterion.predicate
        if (!('path' in predicate) || !inside(predicate.path))
          throw new Error('Replay predicate escaped the isolated fixture')
        if (predicate.kind === 'directory-members') {
          if (!writes.has(predicate.path)) {
            await mkdir(predicate.path, { recursive: true })
            for (const name of predicate.names)
              await writeFile(join(predicate.path, name), text)
          }
        }
        else if (!writes.has(predicate.path)) {
          await writeFile(predicate.path, text)
        }
      }
      const name = `different-input-${round}`
      const logicalInputHash = executionDigest({ name, expectedText, family: procedureComparisonFamily(candidate.template) })
      const result = await replay(arguments_, name, true, logicalInputHash)
      const observedForm = interaction ? browser!.inspectForm!() : null
      const observedDesktop = desktop?.snapshot()
      const passed = result.passed && (!observedForm || (observedForm.requests === 1 && observedForm.accepted === 1 && observedForm.refused === 0 && observedForm.observedText === text)) && (!observedDesktop || (observedDesktop.saves === 1 && observedDesktop.refused === 0 && observedDesktop.content === text && observedDesktop.inFlight === 0))
      cases.push({ name, passed, evidenceHash: executionDigest({ result, observedForm, observedDesktop }), ...(result.sample ? { sample: { ...result.sample, fulfilled: result.sample.fulfilled && passed } } : {}), ...(!passed && result.diagnostic ? { diagnostic: result.diagnostic } : {}) })
      latestArguments = arguments_
      latestText = text
      latestPages = pageTexts
      latestForm = formInput
    }
    if (browser && interaction && latestForm) {
      for (const name of ['page-changed', 'page-missing', 'control-missing', 'control-ambiguous', 'submission-refused'] as const) {
        signal.throwIfAborted()
        const fixture = await browser.prepareForm!({ ...latestForm, caseId: name, fault: name })
        const directory = join(root, name)
        await mkdir(directory)
        const arguments_ = { ...latestArguments, [interaction.urlParameter]: fixture.url, [interaction.pathParameter]: join(directory, 'receipt.txt') }
        const result = await replay(arguments_, name, false)
        const observed = browser.inspectForm!()
        const nativeCounterexample = name === 'page-changed'
          ? observed.requests === 1 && observed.accepted === 1 && observed.observedText !== fixture.expectedText
          : name === 'submission-refused'
            ? observed.requests === 1 && observed.accepted === 0 && observed.refused === 1
            : observed.requests === 0 && observed.accepted === 0
        cases.push({ name, passed: result.passed && nativeCounterexample, evidenceHash: executionDigest({ result, observed, nativeCounterexample }) })
      }
      if (interaction.uploads.length) {
        const name = 'upload-changed-bytes'
        const fixture = await browser.prepareForm!({ ...latestForm, caseId: name })
        const directory = join(root, name)
        await mkdir(directory)
        const arguments_ = { ...latestArguments, [interaction.urlParameter]: fixture.url, [interaction.pathParameter]: join(directory, 'receipt.txt') }
        for (const upload of interaction.uploads) {
          const files = arguments_[upload.filesParameter] as string[]
          await writeFile(files[0], 'Different bytes must never satisfy the original upload receipt')
        }
        const result = await replay(arguments_, name, false)
        const observed = browser.inspectForm!()
        cases.push({ name, passed: result.passed && observed.requests === 1 && observed.accepted === 0 && observed.refused === 1, evidenceHash: executionDigest({ result, observed }) })
      }
    }
    else if (browser && pageRoutes) {
      const ownedBrowser = browser
      async function multiPageCounterexample(name: string, fault: { index: number, missing: boolean } | 'swap') {
        const fixture = await ownedBrowser.preparePages({ caseId: name, pages: pageRoutes!.map((route, index) => ({
          id: route.urlParameter,
          text: fault === 'swap' ? latestPages[pageRoutes![(index + 1) % pageRoutes!.length].urlParameter] : index === fault.index ? 'Changed owned page cannot satisfy its independent expected bytes' : latestPages[route.urlParameter],
          missing: fault !== 'swap' && index === fault.index && fault.missing,
        })) })
        const directory = join(root, name)
        await mkdir(directory)
        const arguments_ = { ...latestArguments }
        for (const parameter of candidate.template.parameters) {
          if (parameter.kind === 'url')
            arguments_[parameter.name] = fixture.urls[parameter.name]
          if (parameter.kind === 'path')
            arguments_[parameter.name] = join(directory, `${parameter.name}.json`)
        }
        const result = await replay(arguments_, name, false)
        cases.push({ name, ...result })
        if (!result.passed)
          throw new Error('Multi-page counterexample did not retain its independent negative result')
      }
      for (const [index] of pageRoutes.entries()) {
        await multiPageCounterexample(`page-${index + 1}-changed`, { index, missing: false })
        await multiPageCounterexample(`page-${index + 1}-missing`, { index, missing: true })
      }
      await multiPageCounterexample('page-results-swapped', 'swap')
    }
    else if (browser) {
      for (const name of ['page-changed', 'page-missing']) {
        const fixture = await browser.prepare({ caseId: name, text: 'Changed owned page cannot satisfy the original result', missing: name === 'page-missing' })
        let arguments_ = { ...latestArguments }
        const directory = join(root, name)
        await mkdir(directory)
        for (const parameter of candidate.template.parameters) {
          if (parameter.kind === 'url')
            arguments_[parameter.name] = fixture.url
          if (parameter.kind === 'path')
            arguments_[parameter.name] = join(directory, `${parameter.name}.json`)
          if (parameter.kind === 'directory')
            arguments_[parameter.name] = directory
        }
        if (delegated)
          arguments_ = await delegated.prepare({ template: candidate.template, arguments: arguments_, directory, text: latestText, mode: 'normal' })
        cases.push({ name, ...await replay(arguments_, name, false) })
      }
    }
    if (delegated) {
      for (const [name, mode] of [['delegation-refused', 'refused'], ['delegation-no-result', 'missing-artifact'], ['delegation-interrupted', 'interrupted']] as const) {
        const directory = join(root, name)
        await mkdir(directory)
        const arguments_ = { ...latestArguments }
        for (const parameter of candidate.template.parameters) {
          if (parameter.kind === 'path')
            arguments_[parameter.name] = join(directory, `${parameter.name}.json`)
          if (parameter.kind === 'directory')
            arguments_[parameter.name] = directory
        }
        const before = delegated.snapshot()
        const prepared = await delegated.prepare({ template: candidate.template, arguments: arguments_, directory, text: latestText, mode })
        const result = await replay(prepared, name, false)
        const after = delegated.snapshot()
        cases.push({ name, passed: result.passed && after.inFlight === 0 && (mode !== 'refused' || (after.denied > before.denied && after.dispatches === before.dispatches)) && (mode !== 'interrupted' || (after.writeObserved > before.writeObserved && after.interrupted > before.interrupted)), evidenceHash: executionDigest({ result, before, after }) })
      }
    }
    if (desktop && desktopInteraction) {
      for (const name of ['control-missing', 'control-ambiguous', 'save-refused', 'saved-content-changed', 'window-closed'] as const) {
        const directory = join(root, name)
        await mkdir(directory)
        const path = join(directory, 'actual-native-note.txt')
        const entryLabel = `Native field ${name}`
        const saveLabel = `Save ${name}`
        const fixture = await desktop.prepare({ caseId: name, entryLabel, saveLabel, path, fault: name })
        const arguments_ = { ...latestArguments, [desktopInteraction.windowParameter]: fixture.windowTitle, [desktopInteraction.saveLabelParameter]: saveLabel, [desktopInteraction.pathParameter]: path }
        const result = await replay(arguments_, name, false)
        const observed = desktop.snapshot()
        const nativeCounterexample = name === 'saved-content-changed' ? observed.saves === 1 && observed.content === latestText : observed.saves === 0
        cases.push({ name, passed: result.passed && nativeCounterexample && observed.inFlight === 0 && (name !== 'save-refused' || observed.refused === 1), evidenceHash: executionDigest({ result, observed, nativeCounterexample }) })
      }
    }
    function rejects(name: string, task: () => unknown) {
      let rejected = false
      try {
        task()
      }
      catch { rejected = true }
      cases.push({ name, passed: rejected, evidenceHash: executionDigest({ name, rejected, version: candidate.version }) })
    }
    rejects('invalid-arguments', () => instantiateProcedureTemplate(candidate.template, { ...latestArguments, undeclared: 'cannot change behavior' }, registry, 'counterexample'))
    const changed = createCanonicalToolRegistry()
    const tool = candidate.template.tools[0]
    changed.replace({ ...changed.resolveActive(tool.id)!, version: 'changed-for-counterexample' })
    rejects('interface-change', () => instantiateProcedureTemplate(candidate.template, latestArguments, changed, 'counterexample'))
    // A valid human ingress ensures this case cannot pass merely because a
    // missing turn or another admission failure happened to throw first.
    const cancelledTurnId = 'cancelled-before-admission'
    await life.admit({ cardId: 'procedure-evaluation', turnId: cancelledTurnId, conversationId: 'isolated-procedure-evaluation', messages: [{ role: 'user', content: 'cancelled-replay' }] }, signal)
    const beforeCancellation = await db.readLifeState()
    const cancelled = new AbortController()
    const cancellationReason = new DOMException('Procedure evaluation cancelled before admission', 'AbortError')
    cancelled.abort(cancellationReason)
    let stopped = false
    try {
      await runtime.propose({ ...instantiateProcedureTemplate(candidate.template, latestArguments, registry, 'cancelled-replay'), cardId: 'procedure-evaluation', turnId: cancelledTurnId, abortSignal: cancelled.signal })
    }
    catch (error) {
      stopped = error === cancellationReason
    }
    const afterCancellation = await db.readLifeState()
    // The complete bounded replay history is larger than one action contract.
    // Hash internal snapshots directly without weakening public payload limits.
    const unchanged = digest(JSON.stringify({ plans: beforeCancellation.execution?.plans, effects: beforeCancellation.effects, obligations: beforeCancellation.obligations })) === digest(JSON.stringify({ plans: afterCancellation.execution?.plans, effects: afterCancellation.effects, obligations: afterCancellation.obligations }))
    const pending = runtime.isActive()
    cases.push({ name: 'cancellation', passed: stopped && unchanged && !pending, evidenceHash: executionDigest({ stopped, unchanged, pending }) })
  }
  catch (error) {
    cases.push({ name: signal.aborted ? 'interrupted' : 'replay-failed', passed: false, evidenceHash: digest(error instanceof Error ? `${error.name}:${error.message}` : 'unknown-failure'), diagnostic: (errorMessageFrom(error) ?? 'Unknown replay failure').replaceAll(root, '[owned-evaluation]').slice(0, 512) })
  }
  finally {
    try {
      await runtime?.dispose()
    }
    finally {
      let childrenSettled = false
      try {
        try { await delegated?.dispose() }
        finally {
          try { await browser?.dispose() }
          finally { await desktop?.dispose() }
        }
        childrenSettled = true
      }
      finally {
        try {
          await database?.close()
        }
        // Only this invocation's unique fixture is owned by the evaluator.
        finally {
          if (childrenSettled)
            await rm(root, { recursive: true, force: true })
        }
      }
    }
  }
  const requiredCases = procedureEvaluationCases(candidate.template)
  return { candidateId, candidateHash: candidate.version, evaluatorVersion, status: cases.length === requiredCases.length && cases.every(item => item.passed) && requiredCases.every(name => cases.some(item => item.name === name)) ? 'passed' : 'failed', cases, completedAt: Date.now() }
}
