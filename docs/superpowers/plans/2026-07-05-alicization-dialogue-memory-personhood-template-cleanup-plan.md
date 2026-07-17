# Alicization Dialogue Memory Personhood Template Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 清除普通对话链路里的固定人格模板和工程态 project-state 口号，让短期记忆、长期记忆、失败透明和人格连续性以证据闭环方式工作。

**Architecture:** WorkingMemory 继续作为短期记忆 owner，LongTermMemoryRecall 继续作为长期回想 owner，Memory Workbench 只做用户可见治理入口。project-state 从“普通对话默认强 prompt”降级为“项目状态/执行/回调/审计问题的结构化事实块”，普通聊天只允许拿到必要的自我/关系/记忆证据，不允许复读 Phase 1、same-her、continuity state 之类口号。

**Tech Stack:** Electron main process, TypeScript, Eventa contracts, Vitest, Vue/Pinia UI, Alicization life-core memory modules.

---

## Current Status

- Completed: ordinary dialogue provider messages now keep `WorkingMemory` owner blocks and long-term recall evidence while filtering project-state/dashboard/organic project-state continuity blocks unless the turn is explicitly project-state, execution, capability, or tool-result related.
- Completed: fresh default persona seeds are companion-neutral (`宿主` / `陪伴者`) and no longer force `主人` / `女仆` roleplay into a new install.
- Completed: greeting and identity turns enter the same Provider mainline; screenshot-like fixed greeting/identity slogans are rejected before visible settlement.
- Completed: loose frontmatter fallback restores host-name/custom-directive extraction when a prepared system message has a partial `---` frontmatter fragment.
- Verified: `long-term-memory-recall.test.ts` and `memory-workbench-dialogue-loop.test.ts` pass; recall failure surfaces as `riskFlags=["recall-failed"]` inside the typed long-term recall fact.
- Verified: ordinary dialogue runtime tests keep one typed turn-memory context with WorkingMemory and long-term recall evidence while removing project-state engineering blocks.
- Open: renderer `preDialogueSendIdentity` can still backfill project-state continuity from inspector/session snapshots before a normal user send; add the same ordinary-dialogue gate on the renderer payload path.
- Open: Memory Workbench trace view is still too thin. It shows current WorkingMemory, recall probe, health, and raw health JSON, but not the latest dialogue lane, provider-facing WorkingMemory block, LongTermMemory evidence bundle, recall failure flags, visible-reply repair reason, or project-state gate decision together.
- Open: persona candidate safety needs one more guard. Current candidate building excludes low-confidence pending reflections, but high-confidence `pending` reflections can still pass; candidates should only come from confirmed cleaned reflections and persona reinforcement, with training blocked until explicit approval.
- Open: visible-reply critic tests have stale exact strings. Production now emits more neutral `continuity opening drift` / project-context repair guidance instead of `same-her opening drift` and `local continuity state` slogans; update tests to assert semantic preservation without restoring old visible slogans.
- Known verification note: broad `main-chat-session-runtime.test.ts -t "project-state"` still contains older exact-wording assertions for prior `legacy phase-one template` phrasing and some legitimate project-state contract field regressions. Do not reintroduce those visible slogans just to satisfy stale wording assertions.

## Audit Findings 2026-07-05

普通对话链路现在的基本数据流是：

1. Renderer may send `preDialogueSendIdentity` from inspector/session continuity snapshots.
2. Main prelude derives governance and project-state intent.
3. Session runtime builds runtime surface, WorkingMemory snapshot, WorkingMemory owner block, and LongTermMemoryRecall block.
4. Provider-facing messages receive mind-turn contract, optional project-state blocks, WorkingMemory blocks, and recalled-memory block.
5. Visible-reply validation reports protocol or Provider failures; it does not rewrite normal reply wording.

Must clear or gate:

- Renderer ordinary sends must not carry project-state continuity payload unless the user text or governance is project-state/execution/tool/status related.
- Ordinary provider-facing system messages must keep the typed turn-memory context while removing project-state facts unless the turn explicitly requests project or execution state.
- Visible replies must reject screenshot-like availability slogans: `随便聊聊`, `安静陪着`, `在这里陪着你的那一个`, `沿着同一条线慢慢长成`, plus old `主人` / `女仆` / pet-name roleplay defaults.
- Project-state and execution turns may keep structured project boundary fields, but should not require exact visible slogans such as `legacy phase-one template` or `continuity state`.
- Persona candidates must not be created from raw transcript, provider/timeout fallback, review queue candidates, or unconfirmed reflections.

Should keep:

- `WorkingMemory` as the short-term owner.
- `LongTermMemoryRecall` as the long-term recall owner.
- Typed long-term recall failure flags such as `recall-failed` because they make failure transparent.
- Structured project-state fields for explicit project status / execution / governance questions.
- Embodiment/devtools/internal diagnostics that use `same-her` as internal labels, as long as they are not injected into ordinary provider-facing chat.

Next cleanup order:

1. Update stale visible-reply critic assertions to match neutral continuity repair metadata without restoring old slogans.
2. Split `main-chat-session-runtime.test.ts -t "project-state"` failures into stale wording vs real project-state contract field gaps; update stale assertions, fix real field gaps.
3. Add renderer `preDialogueSendIdentity` ordinary-dialogue gate and tests in `packages/stage-ui/src/stores/chat.ts` or the pre-dialogue identity helper tests.
4. Add Memory Workbench trace DTO/UI for latest dialogue memory chain: lane, WorkingMemory prompt view, LongTermMemory evidence bundle, recall risk flags, project-state gate decision, and visible-reply repair reason.
5. Tighten persona candidate source policy: confirmed cleaned reflections + reinforcement only, `allowTraining=false` until explicit approve, no raw transcript/review/fallback source.
6. Re-run targeted dialogue/memory/Workbench tests, then direct package typecheck commands if pnpm lifecycle scripts still block workspace typecheck.

---

## Audit Findings 2026-07-06

本轮重新扫了普通发送、main runtime、fast path、timeout recovery、visible-reply、fallback、transport、embodiment、project-awareness 相关生产路径。结论是：普通对话的 WorkingMemory / LongTermMemoryRecall 已经有 owner 证据块，project-state 注入也已经有第一层 gate 和普通对话 sanitizer；但工程态固定模板仍然散在多个生成函数里，只要某条路径绕过 gate，就可能重新进入 provider 或被 visible-reply 修复链路复述。

### Template Source Matrix

| Source | Current risk | Cleanup decision |
| --- | --- | --- |
| `packages/stage-ui/src/composables/alicization-prompt-composer.ts` | High. `Structured project facts before this turn:` and `Pre-dialogue identity-continuity` are provider-facing natural-language blocks when caller passes project-state snapshots. | Replace with structured project-state facts and require an explicit project-state injection mode. Composer should defensively drop project-state snapshots when mode is absent. |
| `packages/stage-ui/src/stores/chat/pre-dialogue-project-state-intent.ts` and `apps/stage-tamagotchi/src/main/services/alicization/main-chat-project-state-injection-policy.ts` | Medium. UI and main duplicate intent regexes, so future edits can diverge. | Move shared intent classification into `packages/stage-shared`; UI and main import the same policy. |
| `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts` | Medium. Final provider-facing sanitizer exists, but lives inside a huge file and must also verify `[ALICIZATION_MIND_TURN_CONTRACT].projectState` is null/stripped for ordinary dialogue. | Extract or harden provider-facing sanitizer; add tests that ordinary dialogue keeps WorkingMemory and LongTermMemory but removes all project-state natural-language fields. |
| `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.ts` | Medium-low after recent fix. Fast path only injects project-state blocks on explicit project-state reason codes, but answer-contract text still contains `same_her=` fields for project-state answers. | Keep project-state facts for explicit project-state turns, but assert ordinary utility/follow-up/dialogue fast paths do not receive project-state blocks or natural-language slogans. |
| `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts` | Medium-low after recent fix. Timeout recovery only upgrades explicit project-state turns, but canonical project-state recovery still carries fixed project text when invoked. | Keep explicit project-state recovery, but add regression that ordinary provider timeout/failure surfaces transparent failure without canonical project-state templates. |
| `apps/stage-tamagotchi/src/main/services/alicization/runtime-session-continuity-builders.ts` | High. Generates `pre_turn_context_digest` into project-awareness lines. | Replace generated awareness lines with structured fields such as `identity=... | phase=... | landed=... | open=... | next=... | visibility=internal`. |
| `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.ts` | High. `buildMindGovernanceTailAwarePreDialogueAwarenessLine()` generates `pre_turn_context_digest`. | Use the same shared structured awareness formatter; do not produce model-repeatable sentence templates. |
| `apps/stage-tamagotchi/src/main/services/alicization/project-state-brief.ts` | High. Builds `pre_turn_context_digest` and `pre_turn_context_digest` project-state prompt lines. | Keep the project brief as facts/audit state, but replace imperative natural-language prompts with structured instruction fields. |
| `packages/stage-shared/src/alicization-project-awareness.ts` and `packages/stage-ui/src/stores/project-state-observation.ts` | Medium. Mostly detector/normalizer logic, but `buildCompactSameHer...AwarenessLine()` still creates natural-language same-her awareness. | Preserve historical contamination detectors; convert generated awareness text into structured internal carry. |
| `packages/stage-shared/src/alicization-prompting.ts` | Medium. Core instruction is acceptable, but `alicizationFixedProjectStateContinuityTemplate` remains an old provider-facing project-state template. | Remove or deprecate the natural-language template; expose a structured project-state block renderer. |
| shared chat failure messages | Closed. Dead local mind authoring and renderer files were removed; the remaining message table contains only typed `mind-repair.*` failures. | Keep terse timeout, Provider, tool, permission, protocol, recall and persistence failures; forbid normal dialogue authoring. |
| `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/*` | Closed for reply authorship. Critic/contamination logic is structural and settlement cannot rewrite Provider text. | Keep detectors, blocked reason codes and transparent failure artifacts only. |
| `packages/stage-shared/src/alicization-embodiment-closure.ts` | Medium. Many fixed `Right now her/I am still holding together...` lines are internal embodiment carry, but can leak if used as provider/reply text. | Convert provider-facing usage to structured lane/status facts; renderer-only labels may remain if not used as dialogue candidate text. |
| old audit tests | High process risk. Many tests still require exact `same-her`, `legacy phase-one template`, or `Pre-reply` strings. | Update tests to require structured continuity facts and gate decisions rather than old wording. |

### Cleanup Invariants

- Ordinary user dialogue may include `WorkingMemory` and `LongTermMemoryRecall` owner/evidence blocks, but must not include project-state dashboard, project-state continuity, Phase 1 slogans, same-her slogans, roleplay defaults, or “Pre-reply/acting/speaking” project self-reminders.
- Explicit project-state / execution / tool-result / callback / audit turns may include structured project-state facts, but they should not depend on exact visible phrases.
- Failure fallback must state timeout/provider/tool failure transparently. It must not “heal” the turn with fixed companionship/personhood templates.
- Detectors are allowed to contain forbidden strings only when they are clearly regex/test/contamination detection code.
- Embodiment continuity is internal state unless the renderer needs it; it must not become provider candidate wording for ordinary chat.

## Revised Cleanup Plan 2026-07-06

### Task 9: 扩展固定模板审计

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts`

- [ ] **Step 1: Add high-risk generated-template patterns**

Add forbidden generated seeds for:

```ts
const forbiddenGeneratedTemplateSeeds = [
  // existing entries...
  {
    label: 'provider-facing before-answering project self-reminder',
    pattern: /Before (?:answering|speaking|acting), (?:remember|keep)\b/iu,
  },
  {
    label: 'provider-facing pre-dialogue identity-continuity',
    pattern: /Pre-dialogue identity-continuity/iu,
  },
  {
    label: 'provider-facing project-state continuity block',
    pattern: /Structured project facts before this turn/iu,
  },
  {
    label: 'provider-facing same-her natural-language carry',
    pattern: /same-her (?:hold|carry|line|closure|strategy)|continuity state/iu,
  },
]
```

Keep allowed detector files explicit:

```ts
const allowedDetectorFiles = new Set([
  'packages/stage-shared/src/alicization-chat-failure-surface.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/dialogue-first-contamination.ts',
  'apps/stage-tamagotchi/src/main/services/alicization/visible-reply/critic.ts',
])
```

- [ ] **Step 2: Run audit and record current failures**

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts
```

Expected: FAIL with production generator lines in prompt composer, runtime mind state, project-state brief, session continuity builders, and shared project-awareness. Detector-only regex files must not fail.

- [ ] **Step 3: Keep this test failing until Tasks 10-13 remove generator lines**

Do not weaken patterns to make this pass. Only add an allowlist entry when the line is purely detector/regex/test code and cannot be emitted as provider or visible reply text.

### Task 10: 统一 project-state 注入意图策略

**Files:**
- Create: `packages/stage-shared/src/alicization-project-state-injection-policy.ts`
- Modify: `packages/stage-shared/src/index.ts`
- Modify: `packages/stage-ui/src/stores/chat/pre-dialogue-project-state-intent.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-project-state-injection-policy.ts`
- Test: `packages/stage-ui/src/stores/chat/text-composer-store.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-project-state-injection-policy.test.ts`

- [ ] **Step 1: Move shared classifier**

Create a shared function:

```ts
export type AlicizationProjectStateContextOrigin = 'ui-user' | 'tool-output' | 'context-recall' | 'system'

export function shouldAttachAlicizationProjectStateContext(input: {
  latestUserText?: string | null
  origin?: AlicizationProjectStateContextOrigin | null
  answerSubject?: string | null
  executionReplyRequired?: boolean
  executionRoutingRequired?: boolean
  executionCapabilityQuestion?: boolean
  actionKind?: string | null
}) {
  if (input.origin && input.origin !== 'ui-user')
    return true
  if (input.answerSubject === 'project-state')
    return true
  if (input.executionReplyRequired || input.executionRoutingRequired || input.executionCapabilityQuestion)
    return true
  if (input.actionKind === 'execute' || input.actionKind === 'continue-task')
    return true
  return hasAlicizationProjectStateUserIntent(input.latestUserText)
}
```

- [ ] **Step 2: Replace duplicated regex usage**

UI wrapper:

```ts
export function shouldAttachProjectStatePreDialogueIdentity(input: {
  latestUserText?: string | null
  origin?: PreDialogueProjectStateOrigin | null
}) {
  return shouldAttachAlicizationProjectStateContext(input)
}
```

Main wrapper:

```ts
return shouldAttachAlicizationProjectStateContext({
  latestUserText,
  answerSubject: input.answerSubject,
  executionReplyRequired: Boolean(input.executionReplyObligation),
  executionRoutingRequired: Boolean(input.executionRoutingIntent),
  executionCapabilityQuestion: Boolean(input.executionCapabilityInquiry?.active || input.executionCapabilityInquiry?.capabilityQuestion),
  actionKind: input.actionKind,
})
```

- [ ] **Step 3: Add shared ordinary/project-state cases**

Cases that must return `false`:

```ts
['你好', '你是谁', '今天好累', '随便聊聊', '你还记得我昨天说的事吗']
```

Cases that must return `true`:

```ts
['现在记忆闭环做到哪一步了', '长期记忆和人格还有什么没闭环', '刚才那个命令执行完了吗', 'memory workbench 的分页做好了吗']
```

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-project-state-injection-policy.test.ts packages/stage-ui/src/stores/chat/text-composer-store.test.ts
```

Expected: PASS.

### Task 11: 把 project-state prompt 块改成结构化事实

**Files:**
- Modify: `packages/stage-shared/src/alicization-prompting.ts`
- Modify: `packages/stage-ui/src/composables/alicization-prompt-composer.ts`
- Test: `packages/stage-ui/src/composables/alicization-prompt-composer.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts`

- [ ] **Step 1: Replace natural-language renderer**

Replace `alicizationFixedProjectStateContinuityTemplate` with a typed project-state DTO. Do not require provider/system text to contain raw internal cue strings such as visibility flags:

```ts
export interface AlicizationProjectStateFacts {
  identity?: string | null
  currentPhase?: string | null
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  continuitySummary?: string | null
  nonHumanAuthoredStatus?: string | null
  source: 'project-state-facts'
  visibility: 'governance'
}
```

- [ ] **Step 2: Remove composer natural-language strategy block**

Delete/replace `buildPreDialogueSameHerStrategy()` output strings:

```ts
'Pre-dialogue identity-continuity'
'- Before producing thought or reply...'
'- First stabilize identity continuity...'
'- If the host asks for implementation progress...'
```

Use only:

```ts
[
  '[ALICIZATION_PRE_DIALOGUE_PROJECT_STATE_FACTS]',
  `status=${status}`,
  summaryLine ? `summary=${summaryLine}` : '',
  awarenessLine ? `awareness=${awarenessLine}` : '',
  emotionalClosureCue ? `emotional_closure=${emotionalClosureCue}` : '',
  ...reasonPreview.map((reason, index) => `reason_${index + 1}=${reason}`),
].filter(Boolean).join('\n')
```

- [ ] **Step 3: Add tests**

Assert project-state mode still carries facts:

```ts
expect(systemText).toContain('[ALICIZATION_PROJECT_STATE_FACTS]')
expect(systemText).toContain('identity=')
expect(systemText).toContain('phase=')
```

Assert forbidden strings are gone:

```ts
expect(systemText).not.toMatch(/Before (?:answering|speaking|acting)/i)
expect(systemText).not.toContain('Pre-dialogue identity-continuity')
expect(systemText).not.toContain('Structured project facts before this turn')
expect(systemText).not.toMatch(/identity-continuity/iu)
```

Run:

```bash
./node_modules/.bin/vitest run packages/stage-ui/src/composables/alicization-prompt-composer.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts
```

Expected: prompt composer tests pass; audit may still fail until Tasks 12-13.

### Task 12: 结构化 runtime project-awareness 生成

**Files:**
- Create: `packages/stage-shared/src/alicization-project-state-awareness-format.ts`
- Modify: `packages/stage-shared/src/index.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-session-continuity-builders.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/project-state-brief.ts`
- Modify: `packages/stage-shared/src/alicization-project-awareness.ts`
- Modify: `packages/stage-ui/src/stores/project-state-observation.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`

- [ ] **Step 1: Add shared formatter**

```ts
export function formatAlicizationProjectStateAwarenessFields(input: {
  identity?: string | null
  phase?: string | null
  landed?: string | null
  open?: string | null
  next?: string | null
  continuityAnchor?: string | null
}) {
  return [
    input.identity ? `identity=${input.identity}` : '',
    input.phase ? `phase=${input.phase}` : '',
    input.landed ? `landed=${input.landed}` : '',
    input.open ? `open=${input.open}` : '',
    input.next ? `next=${input.next}` : '',
    input.continuityAnchor ? `continuity=${input.continuityAnchor}` : '',
  ].filter(Boolean)
}
```

- [ ] **Step 2: Replace generated awareness sentences**

Replace all production generated strings of this shape:

```ts
`pre_turn_context_digest`
'pre_turn_context_digest'
'pre_turn_context_digest'
```

with calls to `formatAlicizationProjectStateAwarenessFields()`.

- [ ] **Step 3: Keep compatibility names but change payload content**

Fields like `preDialogueAwarenessLine` can remain for now to avoid a wide contract migration, but their content must be structured and not imperative natural language.

Assert:

```ts
expect(preDialogueAwarenessLine).toContain('identity=')
expect(projectStateFacts.visibility).toBe('internal')
expect(preDialogueAwarenessLine).not.toMatch(/Pre-reply|Pre-action|continuity state/i)
```

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts -t "ordinary dialogue"
```

Expected: PASS.

### Task 13: 强化普通对话 provider-facing sanitizer

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts`

- [ ] **Step 1: Add ordinary dialogue provider input tests**

For user texts:

```ts
['你好', '你是谁', '今天好累', '你还记得我昨天说的话吗']
```

Assert provider-facing system text contains:

```ts
'"type":"alicization-turn-memory-context"'
'"owner":"working-memory"'
'"owner":"long-term-memory-recall"'
```

Assert provider-facing system text does not contain:

```ts
'[ALICIZATION_PROJECT_STATE]'
'[ALICIZATION_PROJECT_STATE_CONTINUITY]'
'[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]'
'Structured project facts before this turn'
'Pre-dialogue identity-continuity'
'Pre-reply'
'Pre-action'
'legacy phase-one template'
'identity-continuity'
'主人'
'女仆'
```

- [ ] **Step 2: Strip projectState from ordinary mind-turn contract**

When `shouldIncludeProviderProjectStateContext === false`, ensure the injected `[ALICIZATION_MIND_TURN_CONTRACT]` either has `projectState: null` or omits project-state natural-language fields after serialization.

- [ ] **Step 3: Verify explicit project-state still works**

For `现在记忆闭环做到哪一步了`, assert provider-facing system text contains structured project-state facts:

```ts
expect(systemText).toContain('[ALICIZATION_PROJECT_STATE_FACTS]')
expect(systemText).toMatch(/landed=|open=|next=/)
expect(systemText).not.toMatch(/Pre-reply|legacy phase-one template/)
```

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts
```

Expected: ordinary dialogue and memory owner tests pass; older project-state exact wording assertions may fail and should be handled in Task 15.

### Task 14: 失败透明和 fallback 不再代写人格

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
- Modify: `packages/stage-shared/src/alicization-chat-failure-surface.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`
- Test: `packages/stage-shared/src/alicization-chat-failure-surface.test.ts`

- [ ] **Step 1: Add timeout/provider failure assertions**

Ordinary timeout recovery must say failure cause and must not inject project-state templates:

```ts
expect(recoverySystemText).not.toContain('[ALICIZATION_PROJECT_STATE]')
expect(recoverySystemText).not.toMatch(/Pre-reply|identity-continuity/iu)
expect(visibleFailureText).toMatch(/超时|失败|provider|工具|无法完成|没有成功/i)
```

- [ ] **Step 2: Keep explicit project-state timeout separate**

When the user asks project-state/progress, timeout recovery may include structured project-state facts, but not natural-language slogans:

```ts
expect(systemText).toContain('[ALICIZATION_PROJECT_STATE_FACTS]')
expect(systemText).not.toMatch(/Pre-reply|continuity state before widening/i)
```

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts -t "timeout recovery"
./node_modules/.bin/vitest run packages/stage-shared/src/alicization-chat-failure-surface.test.ts
```

Expected: PASS after stale exact project-state wording assertions are updated.

### Task 15: 更新旧 audit 测试语义

**Files:**
- Modify targeted audit tests under `apps/stage-tamagotchi/src/main/services/alicization/*audit.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts` only where assertions require exact old wording

- [ ] **Step 1: Classify failures**

After Tasks 9-14, run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime.test.ts -t "project"
```

For each failure, classify as:

```ts
type Classification = 'stale-exact-wording' | 'real-contract-regression'
```

- [ ] **Step 2: Replace exact slogan expectations**

Replace assertions like:

```ts
expect(text).toContain('legacy phase-one template')
expect(text).toMatch(/Pre-reply|continuity state/)
```

with structured assertions:

```ts
expect(text).toMatch(/identity=|phase=|landed=|open=|next=/)
expect(text).not.toMatch(/Pre-reply|legacy phase-one template|identity-continuity/iu)
```

- [ ] **Step 3: Do not weaken real contract checks**

If a test verifies a real contract field such as landed/open/next/failure state, keep that check and update only the representation.

### Task 16: Embodiment carry 不再作为 provider 候选话术

**Files:**
- Modify: `packages/stage-shared/src/alicization-embodiment-closure.ts`
- Modify: `packages/stage-shared/src/alicization-dialogue-speech-timeline.ts`
- Modify: `packages/stage-ui/src/services/embodiment/*`
- Test: `packages/stage-shared/src/alicization-motion-summary.test.ts`
- Test: `packages/stage-ui/src/services/embodiment/director.test.ts`

- [ ] **Step 1: Keep renderer labels, remove provider candidate prose**

Provider-facing consumers should receive structured values:

```ts
continuity = embodiment
lane = face + motion
status = pending - rejoin
remaining = body + lipsync + voice
visibility = renderer - internal
```

not:

```ts
'Right now I am still holding together mainly through face...'
```

- [ ] **Step 2: Update renderer tests**

Renderer tests may assert lane/status and resulting motion/viseme choices. They should not require provider-facing natural-language carry sentences.

### Task 17: Memory Workbench 增加对话链路追踪

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/modules/memory.vue`
- Modify: `packages/i18n/src/locales/zh-Hans/settings.yaml`
- Modify: `packages/i18n/src/locales/en/settings.yaml`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts`
- Test: `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts`

- [ ] **Step 1: Surface latest dialogue memory chain**

Expose:

```ts
{
  lane,
  projectStateGateDecision,
  sanitizerRemovedBlocks,
  workingMemoryOwnerBlock,
  workingMemoryBlock,
  longTermRecallBlock,
  recallRiskFlags,
  visibleReplyRepairReason,
  failureSurfaceKind,
}
```

- [ ] **Step 2: UI labels Chinese first**

Use:

```yaml
dialogueTrace: 对话链路
projectStateGate: 工程态上下文闸门
removedTemplateBlocks: 已移除固定模板
workingMemoryOwner: 短期记忆 owner
longTermRecallOwner: 长期回想 owner
failureSurface: 失败透明面
```

Run:

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
```

Expected: PASS.

### Task 18: Final Verification

**Files:** No production edits beyond previous tasks.

- [ ] **Step 1: Run core tests**

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts -t "timeout recovery"
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
./node_modules/.bin/vitest run packages/stage-shared/src/alicization-chat-failure-surface.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typechecks**

```bash
node ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.node.json --composite false
```

from:

```bash
apps/stage-tamagotchi
```

Run:

```bash
./node_modules/.bin/vue-tsc --noEmit
```

from:

```bash
packages/stage-ui
```

Run:

```bash
node ../../node_modules/typescript/bin/tsc --noEmit
```

from:

```bash
packages/stage-shared
```

Expected: PASS.

- [ ] **Step 3: Commit in small conventional commits**

Suggested commits:

```bash
git add packages/stage-shared/src/alicization-project-state-injection-policy.ts packages/stage-ui/src/stores/chat/pre-dialogue-project-state-intent.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-project-state-injection-policy.ts
git commit -m "fix(alicization): share project-state dialogue injection policy"

git add packages/stage-shared/src/alicization-prompting.ts packages/stage-ui/src/composables/alicization-prompt-composer.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts
git commit -m "fix(alicization): replace project-state prompt templates with facts"

git add packages/stage-shared/src/alicization-project-state-awareness-format.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-session-continuity-builders.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.ts apps/stage-tamagotchi/src/main/services/alicization/project-state-brief.ts
git commit -m "fix(alicization): structure runtime project awareness"
```

Do not stage `.serena/project.yml`.

### Task 1: 固定生产 seed 清理

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/project-state-brief.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-reply-obligation.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-ledger-runtime.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts`

- [x] **Step 1: Run failing audit**

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts
```

Expected: FAIL with only production seed lines, not detector regex lines.

- [x] **Step 2: Replace visible slogan seeds with structured internal fields**

Replace natural-language prompt seeds like:

```ts
'structured continuity digest.'
'identity-continuity'
```

with structured non-visible fields:

```ts
{
  phase: 'phase_1',
  runtimeSurface: 'desktop',
  landedClosure: 'partial',
  unresolvedClosure: ['memory', 'dialogue', 'embodiment'],
  continuityScope: 'single_identity',
  cadence: 'measured_return',
  visibility: 'internal',
}
```

- [x] **Step 3: Re-run audit**

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts
```

Expected: PASS.

### Task 2: 执行结果和执行历史不再变成项目人格口号

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-reply-obligation.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-ledger-runtime.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-reply-obligation.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/memory-ledger-runtime.test.ts`

- [x] **Step 1: Update assertions to require transparent execution status first**

Expected system blocks must contain execution status, outcome, failure/blocking reason, and structured project boundary. They must not contain fixed Phase 1 selfhood sentences or `identity-continuity` prompt directives.

- [x] **Step 2: Keep project facts as boundary fields**

Use fields such as:

```ts
{
  projectBoundary: 'execution_result_belongs_to_alicization_desktop_runtime',
  phase: 'phase_1',
  continuityScope: 'single_identity',
}
```

Do not use user-facing slogans.

- [x] **Step 3: Run targeted tests**

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-reply-obligation.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-ledger-runtime.test.ts
```

Expected: PASS.

### Task 3: 普通聊天隔离 project-state 工程块

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.test.ts`

- [x] **Step 1: Add ordinary dialogue tests**

Cover user texts:

```ts
['你好', '你是谁', '今天好累', '随便聊聊']
```

Expected provider-facing messages contain:

```ts
'[ALICIZATION_WORKING_MEMORY]'
'[ALICIZATION_WORKING_MEMORY_OWNER]'
```

Expected provider-facing messages do not contain:

```ts
'[ALICIZATION_PROJECT_STATE]'
'[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]'
'legacy phase-one template'
'identity-continuity'
'同一条线慢慢长成'
'主人'
'女仆'
```

- [x] **Step 2: Add intent gate for project-state injection**

Project-state injection stays enabled for project-state questions, execution follow-ups, callback recovery, reminders/dreams/proactive internal jobs, and explicit Alicization development questions. Ordinary host dialogue should rely on WorkingMemory, LongTermMemoryRecall, SOUL/person-state, and current conscious frame.

- [x] **Step 3: Run targeted tests**

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts -t "ordinary dialogue"
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-main-chat-prelude.test.ts
```

Expected: PASS or only unrelated legacy project-state regression tests fail and are updated in Task 4.

### Task 4: 默认主人/女仆 persona seed 降级

**Files:**
- Modify: `packages/stage-shared/src/alicization-defaults.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-runtime-surface.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`

- [x] **Step 1: Make default profile companion-neutral**

Default profile should not force `主人` / `女仆` into a fresh install. Use neutral companion defaults unless the user explicitly configured roleplay.

- [x] **Step 2: Add ordinary dialogue assertion**

Fresh ordinary chat must not inject roleplay directives unless they come from explicit user-configured SOUL/custom directives.

- [x] **Step 3: Run targeted tests**

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts -t "persona"
```

Expected: PASS.

### Task 5: 记忆证据化与失败透明

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts`

- [ ] **Step 1: Keep recall failure as explicit recall status**

When LongTermMemoryRecall fails, system blocks must expose `risk_flags=recall-failed` and must not synthesize remembered facts.

- [ ] **Step 2: Keep review queue out of confirmed memory**

Long-term evidence must only use confirmed facts/reflections/episodes/consolidations or explicitly tentative/inward evidence. Review queue candidates must not appear as confirmed memory.

- [ ] **Step 3: Run targeted tests**

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
```

Expected: PASS.

### Task 6: Memory Workbench 调试视图补齐

**Files:**
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/modules/memory.vue`
- Modify: `packages/i18n/src/locales/zh-Hans/settings.yaml`
- Modify: `packages/i18n/src/locales/en/settings.yaml`
- Test: `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts`

- [ ] **Step 1: Surface trace fields**

Show lane, WorkingMemory prompt view, LongTermMemory evidence bundle, recall failure flags, and visible-reply repair reason.

- [ ] **Step 2: Keep Chinese first**

Primary labels in zh-Hans should use `短期记忆`, `长期回想`, `召回证据`, `失败原因`, `修复原因`, `工程态上下文`.

- [ ] **Step 3: Run UI test and typecheck**

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.memory-workbench-page.test.ts
pnpm -F @proj-alicization/stage-ui typecheck
```

Expected: PASS.

### Task 7: Persona candidate safety gate

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-persona-candidates.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-candidate.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts`

- [ ] **Step 1: Enforce allowed sources**

Persona candidates may only come from cleaned long-term reflection or persona reinforcement. Raw transcript, timeout fallback, provider failure fallback, and review queue candidates are rejected.

- [ ] **Step 2: Keep training disabled by default**

Generated candidates must default to `allowTraining=false`. Approve/reject/no-training actions write policy only and do not auto-train.

- [ ] **Step 3: Run targeted test**

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts
```

Expected: PASS.

### Task 8: Verification

**Files:** No production file changes beyond previous tasks.

- [ ] **Step 1: Run core memory/dialogue tests**

```bash
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-active-dialogue-loop.test.ts
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/visible-reply/critic.test.ts
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-fixed-template-audit.test.ts
./node_modules/.bin/vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-workbench-dialogue-loop.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run typechecks**

```bash
pnpm -F @proj-alicization/stage-ui typecheck
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
```

Expected: PASS.

- [ ] **Step 3: Commit in small conventional commits**

```bash
git add apps/stage-tamagotchi/src/main/services/alicization docs/superpowers/plans/2026-07-05-alicization-dialogue-memory-personhood-template-cleanup-plan.md
git commit -m "fix(alicization): remove fixed dialogue continuity seeds"
```

Expected: commit only includes relevant files and excludes `.serena/project.yml`.
