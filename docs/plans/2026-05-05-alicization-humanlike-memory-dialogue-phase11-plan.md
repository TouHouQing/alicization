# Alicization 真人记忆对话 Phase 11 开发计划

更新日期：2026-05-05

> 本文件从现在开始是唯一活跃开发计划。
> `2026-05-03-alicization-humanlike-memory-dialogue-phase10-plan.md` 视为上一阶段结构基线，不再继续追加任务。
> 后续所有 Phase 11 代码落地、回归、勾选、补证据，只更新本文件。

## 目标

Phase 10 已经把 executable learning runtime、domain-native memory baseline、negative recall suppression、affective residue、recall latency policy、browser/main parity、growth quality gate 落到运行链路里。

Phase 11 不再优先解决“有没有记忆/学习/指标”。

Phase 11 要解决的是：

- 事件图仍主要作为 episodic recall 的加分器，而不是主导“这次像真人一样想起哪段情景/关系时代/修复弧/流程经验”的第一性检索权威。
- fact memory 仍以 ranked fact list 为中心，缺少显式 `claim -> evidence -> contradiction -> supersession -> current belief` 证据图。
- domain-native memory 仍主要由统一 fact 派生，尚未形成 procedure / relationship / self-model / world-model 四套独立 verifier、内化、衰减、召回策略。
- learning executor 已能执行 `record / reflect / verify / revise / internalize`，但 verify 仍偏 supporting facts/reflections/outcomes 的启发式判断，缺少可审计 verified learning artifact。
- visible reply 正常路径已经由 LLM mind authority 主导，但治理失败/污染时仍存在 deterministic fallback surface 接管可见回复的风险。
- recollection narrative 仍残留固定 opening 文案，必须改成结构化心智输入，不能作为可复制的 visible memory shell。
- browser/main parity 已比较共享摘要面，但还没有比较 top-N 候选、拒绝理由、suppression reason、learning causal chain 等深层运行状态。
- benchmark 已形成 gate，但部分成长质量指标仍是 replay quality proxy，需要逐步迁移到 DB-backed runtime causal metrics。

这一阶段必须解决的不是：

- 再加更多 prompt 文案
- 再加更多 care / memory / uncertainty 模板
- 再把规则层写得更像人
- 再靠 replay 标签伪装成长

而是：

- 把记忆检索从“事实/片段排名”推进到“情景候选竞争”。
- 把学习验证从“任务状态变化”推进到“可审计验证产物”。
- 把可见回复修复从“规则 fallback 写话”推进到“LLM second-pass rewrite”。
- 把浏览器回退从“摘要 parity”推进到“候选/抑制/学习因果 parity”。
- 把成长指标从“benchmark 推断”推进到“运行时事实计量”。

最终必须满足：

- visible reply 只允许由大模型心智链生成或重写；规则层只能提供约束、证据、拒绝理由、重写请求，不能直接产出正常可见回复。
- 记忆系统必须能解释“为什么想起这段”和“为什么没有想起那段相似但错线程的记忆”。
- 学习系统必须能解释“它凭什么验证、凭什么内化、凭什么降级、凭什么重开”。
- 回复表层必须持续通过 anti-template / anti-shell / anti-memory-template gate。
- recall hit rate、wrong-thread suppression、accuracy、latency、personality participation、relationship cadence、learning completion、misinternalization 都要有可追溯运行证据。

## 不可退让约束

- 不允许新增 deterministic visible reply 模板。
- 不允许新增固定回忆 opening、固定陪伴壳、固定不确定性壳。
- 任何 fallback 如果会进入 visible reply，必须优先走 LLM second-pass rewrite；只有 provider/auth/transport 彻底失败时才允许最小错误说明，并必须标记为 transport failure，不伪装成真人心智回复。
- memory / learning / parity / benchmark 新增机制必须同时具备 trace、replay、test、rollback path。
- browser fallback 与 main runtime 必须共享同一 reducer/policy 语义，不能在浏览器里复制一套浅层模拟。
- 主运行时仍是 mind-turn composition 与 contract enforcement 的唯一权威。

## 维护规则

每次完成任务后，必须：

1. 把对应条目从 `[ ]` 改成 `[x]`
2. 在条目末尾补 `evidence: <test/receipt>`
3. 优先补 runtime / replay / benchmark / learning execution / wrong-thread suppression / parity 相关回归
4. 不再生成第二份并行活跃 plan；如范围变化，只更新本文件
5. 若某项需要拆子项，也只在本文件内展开

## Phase 10 完成基线

上一阶段已经完成：

- learning task state machine / executor / retry backoff
- domain-native memory view / scoring / consolidation baseline
- stale self-model suppression / relationship-era confusion suppression
- affective residue / relationship cadence memory
- recall latency policy / budget / telemetry
- shared learning projection / affective reducer / parity summary
- benchmark growth dimensions / ship gate / triage

参考：

- [phase10 plan](/Users/touhouqing/Desktop/GIT/airi-alice/docs/plans/2026-05-03-alicization-humanlike-memory-dialogue-phase10-plan.md)

## 当前主架构债

- `memory-event-graph-runtime.ts` 已经可建图与打分，但 `db.ts` 的 episodic recall 仍把 graph 当成 `graphBoostByEventId`，还不是主候选生成器。
- `memory-fact-retrieval.ts` 仍以 fact token overlap / confidence / decay / domain boost 排序，缺少 claim evidence graph。
- `learning-action-executor.ts` 的 verify / internalize 仍围绕 supporting fact ids 运转，缺少 domain verifier 与 verified artifact。
- `runtime-governance.ts` 在 reply contamination / strict governance 场景仍可能用 deterministic governed fallback surface 作为 visible override。
- `memory-recollection-narratives.ts` 仍生成固定 opening 文案，违反 Phase 11 对可见回复去模板化的方向。
- `alicization-browser-main-parity.ts` 仍是 summary parity，不够证明浏览器与 main 使用同一记忆现实。
- `main-chat-session-replay-harness.ts` 部分成长质量指标仍由 replay quality 推导，不够运行时因果。

如果不处理这些问题，系统会表现为：

`模块越来越完整，但真正说话时仍可能被固定壳、摘要壳、代理指标和加权检索牵着走。`

## 总体验收门槛

Phase 11 全部完成时，必须同时成立：

- memory recall 主路径至少产出 `MemorySituationCandidate` 或等价结构，包含 selected / rejected / suppressed / unresolved reason。
- learning verify 产出 `VerifiedLearningArtifact` 或等价结构，internalize 只能从已验证 artifact 晋升 durable knowledge。
- visible reply contamination 修复路径优先触发 LLM rewrite，不再直接使用 deterministic normal reply fallback。
- recollection narrative 不再生成固定 natural-language opening；prompt surface 只传结构化 recall center / pressure / evidence cues。
- browser/main parity fixture 比较 top-N 候选、suppression reason、latency decision、learning execution causal event。
- replay benchmark 的成长质量指标逐步由 runtime telemetry / DB event rows 计算，而不是只由 replay pass/fail 代理。

## Phase 11 指标门槛

- `templateLeakageFailCount = 0`
- `wrongThreadSuppression >= 0.82`
- `replyMemoryCoherence >= 0.86`
- `eventGraphRecallCollapse >= 0.82`
- `worldModelValidationDiscipline >= 0.82`
- `learning_task_completion_rate >= 0.88`
- `misinternalizationRate <= 0.05`
- `browser_main_deep_parity_fixture_pass_rate = 1.00`
- `realtime-reply p95 recall latency` 必须保持在 budget policy 内，deep recall 必须支持 defer/follow-up

## Wave 1：Visible Memory De-Templating

- [x] 把 recollection narrative 从固定 opening 文案改为结构化心智输入

移除 `memory-recollection-narratives.ts` 中的固定 “What comes back first...” 句式。

目标结构：

`recallCenter`
`recallPressure`
`evidenceCues`
`provenancePosture`
`speakerInstruction`

这些字段只能作为 LLM 心智输入，不允许作为 visible reply 候选句。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-recollection-narratives.ts`, `packages/stage-shared/src/alicization-transport-contracts.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-recollection-narratives.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 更新 prompt blocks，确保 recollection narratives 不输出可复制自然语言模板

`[ALICIZATION_RECOLLECTION_NARRATIVES]` 只能表达结构化控制状态，例如 `center / pressure / certainty / evidence_cues / provenance_posture`。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt-blocks.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/dialogue-session-manager.ts`, `packages/stage-shared/src/alicization-derived-mind-state-bundle.ts`, `packages/stage-shared/src/alicization-browser-main-parity.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts packages/stage-shared/src/alicization-browser-main-parity.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 增加 anti-template regression

覆盖：

`What comes back first`
`The way I remember`
`I first remember us`
`我首先想起`
`我记得最先浮现`

这些不得由 recollection narrative helper 生成。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-recollection-narratives.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-recollection-narratives.test.ts`

## Wave 2：LLM Second-Pass Reply Shaper

- [x] 把 deterministic governed fallback visible override 改成 rewrite request

规则层只产出：

`violationReasons`
`mustPreserve`
`mustDrop`
`surfaceContract`
`memoryTruthDiscipline`
`rewriteRequired`

实际 visible reply 由 LLM second-pass 重新生成。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-second-pass-rewrite.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-second-pass-rewrite.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`

- [x] 保留 transport/provider/auth 失败的最小错误面

这类不是真人心智回复，必须明确标记为 transport failure，不能伪装成正常 Alicization 对话。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-second-pass-rewrite.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-second-pass-rewrite.test.ts`

- [x] 增加 reply authority tests

覆盖 contamination、unsupported specificity、dialogue shell、memory template leakage 场景。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-second-pass-rewrite.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`, `apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-governance.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-second-pass-rewrite.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-stream-runner.test.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-background-run.test.ts`

## Wave 3：Memory Situation Candidate Runtime

- [x] 建立 `MemorySituationCandidate` shared contract

每个候选至少包含：

`candidateId`
`sourceKinds`
`situationKind`
`eraKey`
`relationshipArcKey`
`procedureKey`
`selfModelKey`
`worldClaimKeys`
`selectedEvidenceIds`
`competingCandidateIds`
`suppressionReasons`
`confidence`
`latencyCost`

evidence: `packages/stage-shared/src/alicization-memory-situation-candidate.ts`, `packages/stage-shared/src/index.ts`, tests/validation: `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 让 event graph 成为 episodic recall 主候选生成器

`memory-event-graph-runtime.ts` 不再只提供 boost，应提供 neighborhood candidate collapse。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-event-graph-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/memory-event-graph-runtime.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-event-graph-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 把 fact / episode / conversation / consolidation 汇入同一候选竞争器

输出 selected / rejected / delayed / unresolved。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/memory-situation-competition.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt-blocks.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-situation-competition.test.ts apps/stage-tamagotchi/src/main/services/alicization/memory-event-graph-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 4：Claim Evidence Graph

- [x] 建立 durable claim evidence graph

结构：

`claim`
`supportingEvidence`
`contradictingEvidence`
`supersededBy`
`currentBelief`
`validationState`
`sourceTrust`
`lastRevalidatedAt`

evidence: `packages/stage-shared/src/alicization-claim-evidence-graph.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-claim-evidence-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt-blocks.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 让 world-model fact internalization 只能走 evidence graph

无来源、过期来源、单一弱来源不能进入 validated knowledge。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/learning-claim-evidence-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 加入 source expiry / revalidation policy

外部知识必须能衰减、重验、降级。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/learning-claim-evidence-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 5：Domain Verifier Runtime

- [x] 拆分 verifier

`procedure-verifier`
`relationship-verifier`
`self-model-verifier`
`world-model-verifier`

evidence: `packages/stage-shared/src/alicization-claim-evidence-graph.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-claim-evidence-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 引入 `VerifiedLearningArtifact`

internalize 必须消费 artifact，而不是直接消费 supporting fact ids。

evidence: `packages/stage-shared/src/alicization-claim-evidence-graph.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 增加 misinternalization rollback

当后续 evidence contradiction 出现，必须能追溯 artifact 并降级对应 durable memory。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.ts`, `apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 6：Deep Browser/Main Parity

- [x] parity 比较 top-N memory situation candidates

比较 selected/rejected/suppressed/delayed/unresolved reason。

evidence: `packages/stage-shared/src/alicization-browser-main-parity.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, tests: `pnpm exec vitest run packages/stage-shared/src/alicization-browser-main-parity.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] parity 比较 learning causal chain

比较 scheduled/claimed/running/completed/blocked/reopened/downgraded 与 artifact id。

evidence: `packages/stage-shared/src/alicization-browser-main-parity.ts`, `packages/stage-shared/src/alicization-browser-main-parity.test.ts`, tests: `pnpm exec vitest run packages/stage-shared/src/alicization-browser-main-parity.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] parity UI 展示深层 diff

devtools 必须能看到候选层 divergence，不只看 summary divergence。

evidence: `packages/stage-pages/src/pages/devtools/components/mind-replay-diagnosis-panel.vue`, `packages/stage-ui/src/stores/alicization-mind-replay.ts`, `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## Wave 7：Runtime-Grounded Growth Metrics

- [x] 把 learning growth metrics 改为 DB-backed runtime facts

completion/failure/reopen/misinternalization/cadence regression/stale belief 必须从 runtime rows 计算。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] benchmark 只消费 runtime metric snapshot

replay pass/fail 只能作为诊断，不再作为成长事实本身。

evidence: `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

- [x] 建立真实失败样本回灌

失败 turn 必须写入 backlog，并能进入后续 benchmark pack。

evidence: existing runtime backlog merge path in `apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.ts`, failing turn set enriched with parity/candidate summaries in `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-replay-harness.ts`, tests: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/replay-benchmark-runtime.test.ts`, `pnpm -F @proj-alicization/stage-tamagotchi typecheck`

## 建议执行顺序

1. 先做 Wave 1，因为它直接消除固定记忆句式污染，风险低且收益高。
2. 再做 Wave 2，因为可见回复作者权必须先收紧，否则后续记忆再强也可能被 fallback 模板破坏。
3. 再做 Wave 3 / Wave 4，因为召回率与准确率的核心不是加权，而是候选竞争和证据图。
4. 再做 Wave 5，因为学习内化必须建立在 verified artifact 上。
5. 最后做 Wave 6 / Wave 7，把 parity 与指标变成长期防退化机制。

## Phase 11 回归命令

优先跑：

- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-recollection-narratives.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/runtime-organic-memory-prompt.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/reply-authority-invariants.test.ts`
- `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/learning-action-executor.test.ts`
- `pnpm exec vitest run packages/stage-shared/src/alicization-browser-main-parity.test.ts`

完成一组结构性改造后跑：

- `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
