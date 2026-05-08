# Alicization 真人记忆心智对话最终闭环一次性执行计划

更新日期：2026-05-08

## Execution Summary

本计划直接执行 `docs/requirements/2026-05-08-alicization-humanlike-mind-memory-final-closure.md`。目标不是继续追加 Phase 文档，而是一次性把当前已存在但权力未完全迁移的 `Turn OS / Memory OS / Visible Reply / Self Evolution / Proactive / Replay` 收敛成可运行、可验证、可交付的闭环。

当前最大风险不是缺少功能名词，而是旧权力仍散落在大文件和多条路径里：

- `runtime-organic-memory-prompt.ts` 仍是实际 Memory runtime。
- `TurnGraph` 仍偏 prepare snapshot，而不是 stage settlement ledger。
- `SelfRevision` 已有 patch/version 候选，但激活/回滚/下一轮消费没有成为统一 turn stage。
- `Visible Reply` 已能阻断本地 fallback，但需要保证所有路径都以完整 closure artifact 持久化。
- Replay gate 有指标，但需要升级为能证明完整闭环，而不是只证明“有 trace”。

## Frozen Inputs

- 冻结需求：`docs/requirements/2026-05-08-alicization-humanlike-mind-memory-final-closure.md`
- 现有最终架构参考：`docs/plans/2026-05-06-alicization-final-humanlike-memory-dialogue-architecture-plan.md`
- 当前代码路径：`apps/stage-tamagotchi/src/main/services/alicization/**`
- 当前共享契约：`packages/stage-shared/src/alicization-*`
- 当前 renderer/browser parity：`packages/stage-ui/src/stores/alicization-*`

## Anti-Proxy-Goal-Drift Controls

### Primary Objective

实现可直接使用的真人化心智-记忆-对话闭环。

### Non-Objective Proxy Signals

目录存在、单测存在、prompt 里写了“不要模板”、trace version 存在、telemetry 有数字，都不是完成标准。

### Validation Material Role

必须用 targeted tests、typecheck、lint:fix、replay final gate、gold sample、manual spot check 一起证明。

### Declared Tier

最高。

### Intended Scope

只改 Alicization runtime / memory / visible reply / self evolution / proactive / replay / shared contract / browser parity 相关代码，避免无关重构。

### Abstraction Layer Target

把编排权、记忆权、回复权、学习进化权、交付判断权迁移到独立 OS/engine，不再让大文件承载最终复杂度。

### Completion State Target

可以运行 final replay gate 并通过所有 acceptance metrics。

### Generalization Evidence Plan

新增或更新 production gold sample pack，覆盖不同时间跨度、错线程、学习纠错、关系修复、主动关怀、执行回调、屏幕引用和 provider 失败路径。

## Internal Grade Decision

XL。原因：

- 涉及多个权威边界和大量旧路径迁移。
- Memory recall 与 visible reply / self evolution / replay 互相依赖，不能用单点 patch 完成。
- 可以分 wave 顺序执行，但每个 wave 内可以按独立文件组并行开发。

## Wave Plan

### Wave 1: Turn OS 成为唯一 turn 编排 authority

目标：

- 将 `AlicizationTurnGraph` 从 prepare snapshot 升级为 mutable/settled `TurnExecutionLedger`。
- Turn OS 负责 stage lifecycle：`encounter -> conscious-frame -> obligation -> memory -> deliberation -> surface -> delivery -> learning -> telemetry -> settlement`。
- 每个 stage 必须有 `startedAt/endedAt/status/inputSummary/outputSummary/error/fallbackReason/decisionTraceId`。
- 所有主路径、background path、proactive path、callback path 都必须通过同一个 turn settlement API 写 trace。

代码动作：

- 新增 `turn-os/turn-ledger.ts`、`turn-os/stage-settlement.ts`、`turn-os/runtime.ts`。
- `main-chat-session-runtime.ts` 只负责 session boundary 和调用 Turn OS，不再直接 build 完整 graph。
- `main-chat-background-run.ts` 和 stream path 不再局部 attach surface；改为 `turnLedger.settleSurface(...)`。
- `runtime.ts` 的 persistence、mind-turn event、learning scheduling 改为消费 settled turn artifact。

验收：

- replay summary 不再只检查 `turnGraph.version`，必须检查所有必需 stage settlement。
- `turn_os_trace_closure_coverage = 1.00`。

### Wave 2: Memory OS 从事后 artifact 升级为运行 authority

目标：

- `Memory OS` 先决定是否回忆，再执行召回，而不是先从 `OrganicMemoryPromptContext` 得到结果再构造 artifact。
- 记忆管线必须显式分为：`recall-intent -> retrieval-plan -> multi-source-retrieval -> candidate-normalization -> candidate-competition -> conflict/reconstruction pass -> memory-deliberation -> speech-posture -> memory-settlement -> feedback-ledger`。
- `runtime-organic-memory-prompt.ts` 降级为 adapter/compiler，最终压到 900 行以下。

代码动作：

- 新增 `memory-os/runtime.ts`，统一调用 access adapter、planner adapter、LLM planning adapter。
- 将 `resolveMemorySearchPrelude`、`retrieveMemorySearchCandidates`、`rankOrganicMemoryCandidatesStage`、`resolveOrganicMemoryRecollectionPlanningStage`、`planAlicizationRecall` 逐步迁入 `memory-os/`。
- `memory-os/candidate-retrieval.ts` 不再只读 context，改为输出标准候选池与 source latency。
- `memory-os/candidate-competition.ts` 增加强制错线程抑制、conflict graph、era/thread ownership。
- `memory-os/memory-deliberation.ts` 支持 LLM authored deliberation artifact；规则只能做 prefilter 和 safety gate。
- `memory-os/memory-settlement.ts` 写 sample-level feedback ledger：expected / retrieved / selected / surfaced / missed / falsePositive / wrongThread / uncertainty。
- `runtime-organic-memory-prompt-blocks.ts` 只编译 `MemoryTurnSettlement` 为 prompt blocks，不再承载 memory authority。

验收：

- `recall_at_3 >= 0.90`
- `precision_at_3 >= 0.86`
- `wrong_thread_rate = 0`
- `memoryClosureCoverage = 1`
- `memoryClosureConflictClosureRate = 1`
- `memoryClosureLowQualityWithholdRate = 1`
- `memoryClosureUncertaintyLabelRate = 1`

### Wave 3: Visible Reply Engine 单点闭环

目标：

- 所有正常可见回复只来自 provider mind 或 provider second-pass rewrite。
- fixed shell、visibleLead、policy text、fallback text 均不能成为用户可见正文。
- 回复前必须经过 critic；失败必须 second-pass；second-pass 失败进入 hold/blocked，不落本地拟人正文。

代码动作：

- `visible-reply/realization-engine.ts` 增加最终 `settleVisibleReply(...)`，统一 draft、critic、rewrite、semantic judge、authority audit、artifact 输出。
- `main-chat-stream-runner.ts`、`main-chat-background-run.ts`、callback、active dialogue、timeout recovery 只调用该 API。
- `response-charter.ts`、`response-surface-contract.ts` 保留为 system block builder，不允许任何 `mustDo` 文本被直接拼成 visible reply。
- `visible-reply/semantic-judge.ts` 纳入 final artifact，而非只在 replay 中旁路评估。

验收：

- `local_humanlike_visible_fallback_count = 0`
- `template_leakage_fail_count = 0`
- `authority_leak_count = 0`
- `replyAuthorityAccuracy = 1`
- provider 失败路径只能持久化 hold/blocked/retry artifact。

### Wave 4: Self Evolution OS 变成可激活人格版本

目标：

- learning outcome 不能停在 telemetry 或 patch candidate。
- self revision 必须经过 shadow replay、production gold、activation、rollback policy，再成为下一轮 memory/reply/proactive/persona 的 active patch。

代码动作：

- 新增 `self-evolution/runtime.ts`，统一 `propose -> validate -> activate -> consume -> rollback`。
- 将 `learning-action-executor` 产生的 `selfRevisionEvent/selfRevisionStatePatch` 直接写入 Self Evolution OS。
- `runtime-organic-memory-access.ts`、`response-charter.ts`、`response-surface-contract.ts`、`proactive-policy.ts` 改为消费 active version snapshot，而不是各自读取 patch。
- `autobiographical-self.ts` 拆为 projection、revision、cadence、preference drift reducer。
- world-model learning 必须默认 validate-only，只有通过 trusted evidence + replay 才能 internalize。

验收：

- `learningOutcomeToSelfRevisionRoundtrip = 1`
- `misinternalizationRate = 0`
- active self revision 能影响下一轮 memory policy、response posture、relationship posture、proactive policy。
- rollback 后下一轮不再消费 rolled-back patch。

### Wave 5: Proactive Mind 与非主对话路径闭环

目标：

- 主动行为的控制决策可以 deterministic，但可见话语必须 LLM mind authored。
- reminder、subconscious tick、execution callback、active dialogue compact path 都进入同一 visible reply settlement 和 turn settlement。

代码动作：

- `proactive-mind/visible-utterance-policy.ts` 只输出 request/hold/requeue/blocked。
- `proactive-mind/visible-utterance-realization.ts` 调用 Visible Reply Engine settle。
- `runtime-subconscious-tick.ts`、`runtime-delivery-reminders.ts`、`main-chat-active-dialogue-loop.ts` 只作为 scheduler/control adapter。
- `main-chat-active-dialogue-loop.ts` 压到 1200 行以下。

验收：

- `proactive_visible_reply_mind_authored_rate = 1`
- provider 不可用时主动话语不伪装完成。
- 主动话语进入 replay final gate，同样检查模板、authority、memory correctness。

### Wave 6: Replay Gate 升级为最终 ship gate

目标：

- Replay gate 能证明“记忆/心智/回复/学习闭环”，而不是只证明局部指标。

代码动作：

- `replay/final-gates.ts` 增加 `turn_os_trace_closure_coverage`，要求每个 turn 有完整 stage settlement。
- `main-chat-session-replay-harness.ts` 增加 gold sample pack 读取与 per-sample expected memory ids。
- 增加 first failing stage 定位：memory intent、retrieval miss、competition wrong-thread、deliberation over-surface、visible reply template、self revision not consumed。
- CI final gate 失败时输出 owner 和 first-check 文件路径。

验收：

- 所有 acceptance metrics 达标。
- final report 包含 failing stage、owner、first concrete file。

### Wave 7: 复杂度压降与旧 authority 删除

目标行数：

- `runtime.ts < 2500`
- `runtime-governance.ts < 1400`
- `runtime-organic-memory-prompt.ts < 900`
- `main-chat-active-dialogue-loop.ts < 1200`
- `main-chat-background-run.ts < 900`
- `autobiographical-self.ts < 700`

必须删除：

- 分散 prompt authority 重算点。
- 分散 memory gate 重算点。
- 分散 local visible fallback 分支。
- 兼容性壳层中的拟人文本出口。
- 只为旧路径存在的 duplicate tests 或 duplicate helpers。

## Ownership Boundaries

- Turn OS owner: `apps/stage-tamagotchi/src/main/services/alicization/turn-os/**`
- Memory OS owner: `apps/stage-tamagotchi/src/main/services/alicization/memory-os/**`，迁出 `runtime-organic-memory-prompt.ts`
- Visible Reply owner: `apps/stage-tamagotchi/src/main/services/alicization/visible-reply/**`
- Self Evolution owner: `apps/stage-tamagotchi/src/main/services/alicization/self-evolution/**`
- Proactive owner: `apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/**`
- Replay owner: `apps/stage-tamagotchi/src/main/services/alicization/replay/**`、`main-chat-session-replay-harness.ts`、`replay-benchmark-runtime.ts`
- Shared/browser parity owner: `packages/stage-shared/src/alicization-*`、`packages/stage-ui/src/stores/alicization-*`

## Verification Commands

Targeted during development:

```sh
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-os/memory-turn-artifact.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-os/recall-feedback-runtime.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/visible-reply/realization-engine.test.ts apps/stage-tamagotchi/src/main/services/alicization/visible-reply/semantic-judge.test.ts apps/stage-tamagotchi/src/main/services/alicization/visible-reply/second-pass-rewrite.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/self-evolution/self-revision-ledger.test.ts apps/stage-tamagotchi/src/main/services/alicization/self-evolution/state-revision-bus.test.ts apps/stage-tamagotchi/src/main/services/alicization/self-evolution/version-runtime.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/visible-utterance-policy.test.ts apps/stage-tamagotchi/src/main/services/alicization/proactive-mind/visible-utterance-realization.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay/final-gates.test.ts apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.test.ts
```

Final:

```sh
pnpm -F @proj-alicization/stage-tamagotchi typecheck
pnpm lint:fix
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization
```

If the full directory test is too slow or unstable, run the targeted suites plus final replay benchmark command and record skipped reason.

## Rollback Plan

- Each wave must be independently revertible.
- New OS APIs should be introduced behind local adapters first, then old callers migrated.
- Do not delete old helper files until final gate proves the new path covers all callers.
- If a wave fails final gate, rollback that wave's call-site migration, keep pure helper extraction only if tests still pass.
- Self evolution activation must support rollback to previous active candidate and must stop active patch consumption immediately.

## Phase Cleanup Contract

Each wave must leave:

- No temporary scratch files.
- Updated tests for changed behavior.
- Updated replay/gold expectations if behavior intentionally changes.
- No orphaned duplicate authority path.
- A short receipt in the implementation PR or final summary listing files touched, tests run, and remaining risks.

## Direct Build Checklist

- [ ] Create Turn OS runtime and stage settlement ledger.
- [ ] Migrate `main-chat-session-runtime.ts` to call Turn OS.
- [ ] Migrate stream/background/proactive/callback paths to settle surface through Turn OS.
- [ ] Promote Memory OS to own recall pipeline before prompt compilation.
- [ ] Shrink `runtime-organic-memory-prompt.ts` to adapter/compiler.
- [ ] Add recall feedback sample ledger with expected/retrieved/surfaced/missed/false-positive/wrong-thread.
- [ ] Make Visible Reply Engine the only normal visible reply settlement API.
- [ ] Make second-pass failure persist blocked/hold only.
- [ ] Make Self Evolution OS own active version lifecycle and next-turn consumption.
- [ ] Split `autobiographical-self.ts`.
- [ ] Route proactive visible utterances through Visible Reply Engine and Turn OS.
- [ ] Upgrade replay final gate to full closure coverage and gold sample coverage.
- [ ] Delete old deterministic humanlike visible fallback branches.
- [ ] Delete duplicate authority recomputation after final gate passes.
