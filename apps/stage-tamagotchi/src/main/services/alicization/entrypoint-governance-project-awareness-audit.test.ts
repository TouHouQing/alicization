import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'chat-start-governance-registry-seam',
    file: './chat-start-awareness-audit.test.ts',
    snippets: [
      'keeps every current AlicizationChatStartPayload source file explicitly classified',
      'requires every normalize-before-use chat-start consumer to call the canonical pre-dialogue identity resolver',
      'keeps normalization authority files explicit and singularly responsible for the canonical resolver',
    ],
  },
  {
    entry: 'chat-entry-governance-registry-seam',
    file: '../../../../../../packages/stage-ui/src/stores/chat-entry-awareness-audit.test.ts',
    snippets: [
      'keeps every known renderer/chat ingest entrypoint explicitly registered',
      'requires the desktop renderer transport handoff to stay explicitly classified so structured-clone sanitization cannot drop pre-dialogue awareness outside chat-entry governance',
      'requires explicit-pre-dialogue entrypoints to build or forward project awareness intentionally',
      'requires fallback-based entrypoints to route through chatStore.ingest/chatOrchestrator.ingest without pretending to inject a separate identity',
    ],
  },
  {
    entry: 'desktop-root-three-way-bridge-seam',
    file: './route-authority-boundary-registry-audit.test.ts',
    snippets: [
      'keeps the desktop renderer App.vue overlap concrete by anchoring outbound transport sanitization and return-side observation continuity rebuilding in one shared route-authority audit instead of relying only on overlap reason prose',
      'mode: \'renderer-observation-bridge\'',
      'expect(appSource).toContain(\'readConversationTurnProjectStateObservation({\')',
    ],
  },
  {
    entry: 'provider-consumer-governance-registry-seam',
    file: './project-state-provider-consumer-audit.test.ts',
    snippets: [
      'keeps every current main-gateway provider consumer file explicitly registered',
      'requires provider dispatch owner files to wire only the audited main gateway text provider through runtime composition',
      'requires typed gateway consumer files to constrain their provider use to explicit audited source tags',
    ],
  },
  {
    entry: 'autonomous-dialogue-governance-registry-seam',
    file: './entrypoint-governance-registry-audit.test.ts',
    snippets: [
      'resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles(\'autonomous-dialogue\')',
      'expect(registry.filter(entry => entry.domain === \'autonomous-dialogue\' && entry.mode === \'authority\')).toHaveLength(1)',
      'collectAutonomousDialogueGovernedFiles',
    ],
  },
  {
    entry: 'execution-preflight-governance-registry-seam',
    file: './execution-preflight-audit.test.ts',
    snippets: [
      'keeps every current execution-preflight authority seam explicitly registered',
      'requires runtime-owned dispatch bridge files to rebuild canonical execution runtime context before direct execution redispatch opens outward',
      'requires blocked-dispatch safety gates to audit risk policy, confirmation requirement, interruptibility, and same-her runtime context before adapters refuse execution',
    ],
  },
  {
    entry: 'execution-dispatch-governance-registry-seam',
    file: './task-thread-dispatch-owner-audit.test.ts',
    snippets: [
      'keeps every current task-thread dispatch owner seam explicitly registered',
      'requires invoke-handler owners to keep kill-switch and DB wiring explicit before direct task dispatch',
      'requires gateway dispatch owners to keep kill-switch state, audit wiring, and explicit thread ids intact before delegated task dispatch',
      'requires autonomy dispatch owners to route auto-start task dispatch only through the audited autonomous payload builder after explicit eligibility checks',
      'requires orchestrator owners to keep direct dispatch fallback isolated behind the audited runDispatchNow seam',
    ],
  },
  {
    entry: 'recovery-reentry-governance-registry-seam',
    file: './entrypoint-governance-registry-audit.test.ts',
    snippets: [
      'resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles(\'recovery-reentry\')',
      'expect(registry.filter(entry => entry.domain === \'recovery-reentry\' && entry.mode === \'accepted-start-settlement\')).toHaveLength(1)',
      'expect(registry.some(entry => entry.domain === \'recovery-reentry\' && entry.mode === \'timeout-fallback-reconstruction\')).toBe(true)',
    ],
  },
  {
    entry: 'execution-follow-up-governance-registry-seam',
    file: './entrypoint-governance-registry-audit.test.ts',
    snippets: [
      'resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles(\'execution-follow-up-continuity\')',
      'expect(registry.filter(entry => entry.domain === \'execution-follow-up-continuity\' && entry.mode === \'callback-runtime-authority\')).toHaveLength(1)',
      'expect(registry.some(entry => entry.domain === \'execution-follow-up-continuity\' && entry.mode === \'follow-up-obligation-authority\')).toBe(true)',
    ],
  },
  {
    entry: 'pre-dialogue-transport-governance-seam',
    file: './pre-dialogue-transport-audit.test.ts',
    snippets: [
      'keeps every audited outbound pre-dialogue transport boundary explicitly registered',
      'requires identity-construction boundaries to explicitly materialize outbound pre-dialogue send identity',
      'requires transport-sanitization boundaries to preserve pre-dialogue send identity while sanitizing renderer payloads',
      'requires bridge-forwarding boundaries to intentionally forward pre-dialogue send identity across remote chat channels',
    ],
  },
  {
    entry: 'autonomous-dialogue-proactive-entry-seam',
    file: './proactive-prelude-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that proactive initiative starts from project-aware same-her self-brief authority before policy and visible hold continue the same Phase 1 line',
      '[ALICIZATION_PROACTIVE_SELF_BRIEF]',
      'proactive visible utterance realization preserves same-her project awareness before a held beat becomes outward-visible',
    ],
  },
  {
    entry: 'autonomous-dialogue-reminder-entry-seam',
    file: './reminder-delivery-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that host-visible reminder delivery preserves same-her project awareness and restraint before later-turn reminder speech lands',
      'persists mind-authored reminder turns with visible reply authority metadata',
      'requeues mind-authored reminder when memory restraint says visible closeness should wait for a later window',
    ],
  },
  {
    entry: 'autonomous-dialogue-execution-callback-entry-seam',
    file: './execution-callback-runtime-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that execution callback runtime shaping preserves the same-her project line before callback speech lands',
      'expect.objectContaining({ entry: \'callback-delivery-gateway-project-state-carry\' })',
      'expect.objectContaining({ entry: \'callback-payoff-person-state-authority-carry\' })',
    ],
  },
  {
    entry: 'autonomous-dialogue-subconscious-entry-seam',
    file: './subconscious-persistence-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that subconscious persistence, presence-only hold, and deferred autonomy carry preserve same-her project awareness between visible turns',
      'expect.objectContaining({ entry: \'subconscious-persistence-rich-project-state-carry\' })',
      'expect.objectContaining({ entry: \'held-autonomy-fallback-repair-first-carry\' })',
    ],
  },
  {
    entry: 'cross-domain-entrypoint-governance-registry-seam',
    file: './entrypoint-governance-registry-audit.test.ts',
    snippets: [
      'keeps every current discovered dialogue/execution entrypoint seam mapped into one repo-level governance registry',
      'forces each governance domain to keep an explicit ownership shape instead of silently widening into unclassified entrypoints',
      'keeps mirrored pre-dialogue transport seams paired with the expected chat-entry ownership modes so neighboring registries cannot silently reclassify the same send-identity boundary',
      'keeps cross-domain entrypoint ownership explicit so multi-domain bridge files cannot silently multiply',
      'keeps autonomous dialogue family signals explicit so new runtime-owned turn families cannot hide behind scattered format/origin/prefix strings',
      'requires current autonomous dialogue family classifiers to reuse the shared helper instead of re-encoding raw turn-id or format allowlists',
      'resolveAlicizationAutonomousDialogueFamilySignals',
    ],
  },
  {
    entry: 'top-level-entrypoint-governance-completeness-seam',
    file: './project-awareness-route-authority-audit.test.ts',
    snippets: [
      'keeps the governed chat-start discovery synchronized with the explicit entrypoint-governance chat-start domain registry',
      'keeps the governed pre-dialogue transport discovery synchronized with the explicit entrypoint-governance pre-dialogue-transport domain registry',
      'keeps the governed chat-entry discovery synchronized with the explicit entrypoint-governance chat-entry domain registry',
      'keeps the governed provider-consumer discovery synchronized with the explicit entrypoint-governance provider-consumer domain registry',
      'keeps the governed execution-preflight discovery synchronized with the explicit entrypoint-governance execution-preflight domain registry',
      'keeps the governed execution-dispatch discovery synchronized with the explicit entrypoint-governance execution-dispatch domain registry',
      'keeps the shared entrypoint-governance file set synchronized with the explicit governance domain registries',
      'keeps the shared entrypoint-governance overlap set synchronized with the explicit multi-domain bridge registry',
    ],
  },
] as const

describe('entrypoint governance project awareness audit', () => {
  it('keeps one explicit repo-level proof that current entrypoint governance registries, including runtime-owned autonomous dialogue starters and execution-preflight seams, make it harder for new route additions to bypass same-her project awareness before turns execute', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'chat-start-governance-registry-seam' }),
      expect.objectContaining({ entry: 'chat-entry-governance-registry-seam' }),
      expect.objectContaining({ entry: 'desktop-root-three-way-bridge-seam' }),
      expect.objectContaining({ entry: 'provider-consumer-governance-registry-seam' }),
      expect.objectContaining({ entry: 'autonomous-dialogue-governance-registry-seam' }),
      expect.objectContaining({ entry: 'execution-preflight-governance-registry-seam' }),
      expect.objectContaining({ entry: 'execution-dispatch-governance-registry-seam' }),
      expect.objectContaining({ entry: 'recovery-reentry-governance-registry-seam' }),
      expect.objectContaining({ entry: 'execution-follow-up-governance-registry-seam' }),
      expect.objectContaining({ entry: 'pre-dialogue-transport-governance-seam' }),
      expect.objectContaining({ entry: 'autonomous-dialogue-proactive-entry-seam' }),
      expect.objectContaining({ entry: 'autonomous-dialogue-reminder-entry-seam' }),
      expect.objectContaining({ entry: 'autonomous-dialogue-execution-callback-entry-seam' }),
      expect.objectContaining({ entry: 'autonomous-dialogue-subconscious-entry-seam' }),
      expect.objectContaining({ entry: 'cross-domain-entrypoint-governance-registry-seam' }),
      expect.objectContaining({ entry: 'top-level-entrypoint-governance-completeness-seam' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the entrypoint governance claim to current registry and domain audit tests instead of only coverage prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current cross-domain entrypoint governance is tighter, including runtime-owned autonomous dialogue starters, execution-preflight seams, and subconscious carry entry, while wholly new route shapes still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const registrySource = readFileSync(new URL('./entrypoint-governance-registry-audit.test.ts', import.meta.url), 'utf8')
    const futureEntrypointRow = matrixSource.split('\n').find(line => line.startsWith('| Future new dialogue entrypoints |'))

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('entrypoint-governance-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('The transport ownership layer itself is now also explicit instead of living only as route behavior')
    expect(matrixSource).toContain('the current pre-dialogue transport seams now also sit inside that same explicit entrypoint governance map while staying mirrored into chat-entry governance')
    expect(matrixSource).toContain('desktop renderer App.vue structured-clone handoff now sits in the pre-dialogue transport, chat-entry governance, and return-side project-awareness rebuild chains')
    expect(matrixSource).toContain('return-side-project-awareness-entrypoint-candidate-audit.test.ts')
    expect(matrixSource).toContain('future reopen-time route shapes still need explicit classification')
    expect(matrixSource).toContain('runtime-owned proactive, reminder, execution-callback, and subconscious dialogue starters now also sit inside the same explicit entrypoint governance map')
    expect(matrixSource).toContain('recovery-reentry')
    expect(matrixSource).toContain('execution follow-up continuity')
    expect(futureEntrypointRow).toBeTruthy()
    expect(futureEntrypointRow).toContain('renderer/store dialogue-entry candidates')
    expect(futureEntrypointRow).toContain('main-process chat-start candidates')
    expect(futureEntrypointRow).toContain('reopen-time return-side rebuild candidates')
    expect(futureEntrypointRow).toContain('provider-facing generation entry candidates')
    expect(futureEntrypointRow).toContain('project-state answer surfaces')
    expect(futureEntrypointRow).toContain('host-visible normalization seams')
    expect(futureEntrypointRow).toContain('guarded turn persistence')
    expect(futureEntrypointRow).toContain('execution-preflight context-repair candidates')
    expect(futureEntrypointRow).toContain('direct execution-dispatch bridge candidates')
    expect(futureEntrypointRow).toContain('recovery reentry')
    expect(futureEntrypointRow).toContain('execution follow-up continuity')
    expect(matrixSource).toContain('single repo-level entrypoint governance registry')
    expect(matrixSource).toContain('shared root final-gate candidate-audit registry')
    expect(matrixSource).toContain('shared top-level completeness guard family registry')
    expect(matrixSource).toContain('wholly new route families still are not automatically proven')
    expect(matrixSource).toContain('execution-preflight authority seams now also sit inside that same explicit entrypoint governance map before execution fans outward')
    expect(matrixSource).toContain('their current format/origin/turn-id family signals are explicit and now live behind one shared source of truth instead of living only as scattered string checks')
    expect(matrixSource).toContain('the current cross-domain bridge files are explicit instead of being accidental multi-domain spill')
    expect(auditSource).toContain('desktop renderer App.vue structured-clone handoff is now explicit as one desktop-root bridge across pre-dialogue transport, renderer chat-entry governance, and return-side project-awareness rebuild')
    expect(auditSource).toContain('broader return-side project-awareness candidates now also feed the same top-level completeness guard before the explicit return-side registry is treated as sufficient')
    expect(auditSource).toContain('future reopen-time route shapes still need explicit classification')
    expect(auditSource).toContain('desktop send-time and reopen-time same-her carry')
    expect(coverageSource).toContain('pre-dialogue-transport-governance-seam')
    expect(coverageSource).toContain('execution-preflight-governance-registry-seam')
    expect(coverageSource).toContain('resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles(\\\'pre-dialogue-transport\\\')')
    expect(coverageSource).toContain('resolveAlicizationProjectEntrypointGovernanceAuditDomainFiles(\\\'execution-preflight\\\')')
    expect(auditSource).toContain('runtime-owned autonomous dialogue family signals now also live behind one shared source of truth')
    expect(auditSource).toContain('execution-preflight authority seams are now also explicit at the same repo-level entrypoint governance layer')
    expect(auditSource).toContain('current classifiers must reuse the shared helper instead of re-encoding raw turn-id or structured-format allowlists')
    expect(registrySource).toContain(
      'keeps every current discovered dialogue/execution entrypoint seam mapped into one repo-level governance registry',
    )
    expect(registrySource).toContain(
      'forces each governance domain to keep an explicit ownership shape instead of silently widening into unclassified entrypoints',
    )
  })
})
