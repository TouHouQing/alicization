# Alicization 质量与规模化 Harness

这套 Harness 用来验证 Phase 1 的真实生命闭环：

- 对话回放进入 WorkingMemory；
- WorkingMemory 压缩后继续进入下一轮上下文；
- LongTermMemoryRecall 从本地 DB 和向量索引召回；
- Persona/LoRA 数据只接受清洗、可追溯、通过质量门禁的样本；
- Provider、队列、embedding 和失败状态保持透明；
- 报告可以序列化为 JSON，并在 Memory Workbench 中查看。

## 默认本地回归

```bash
pnpm test:alicization-memory-quality-gate
pnpm test:alicization-memory-long-replay-soak
pnpm test:alicization-memory-resilience-soak
```

`memory-long-replay-soak` 使用隔离的 DB/provider adapter，覆盖连续回放、压缩 checkpoint 写回、重启、Provider 失败注入、gold label 分类和延迟统计。它不会写入生产人格或训练数据。

## 语义规模压测

默认压测 10k 级 corpus。语义规模 gate 同时覆盖持久化 job 的状态机、重试、取消、死信和重启恢复：

```bash
pnpm test:alicization-memory-semantic-scale-gate
```

显式开启 100k 级压测：

```bash
pnpm test:alicization-production-scale-gate
```

规模压测运行在临时目录和临时数据库中，检查 sqlite-vec/adapter 是否可用、覆盖率和 p95/p99 延迟；持久化 job 生命周期检查同样运行在隔离 DB 中。100k 压测比默认回归更耗时，建议在本地资源允许时单独运行。

## 真实 Provider 试用

真实 Provider 不在默认测试命令中调用，也不会把试用结果写回生产 WorkingMemory、长期记忆或 Persona 数据集。使用 Memory Workbench 的“质量试用”：

1. 选择当前机体的一段本地会话；
2. 选择“真实模型试用”；
3. 确认当前对话 Provider 和模型配置；
4. 查看逐轮 recall、压缩、Provider latency、retry count 和错误；
5. 失败时只展示真实失败原因，不生成替代人格回复。

真实试用会产生 Provider API 成本，且受当前 Provider 的超时和重试策略影响。

## Workbench 失败治理

Memory Workbench 的健康页和质量页需要同时关注：

- WorkingMemory cleaning queue 的 `pending/review/applied/failed/deadLettered`；
- 失败项的 `source`、`sourceId`、item id、错误和时间戳；
- 单条或批量 retry 后是否回到 `pending-cleaning`；
- retry 后仍未确认的项目不能出现在长期记忆列表；
- `cardId` 不同的机体不能互相看到失败项或长期记忆；
- embedding reindex 的进度、取消、重试和 dead-letter。

失败项不是已确认长期记忆，死信项也不能进入 Persona/LoRA 训练集。

## 质量指标

质量报告至少包含：

- Recall@1、Recall@3、Recall@5；
- wrong-thread rate、semantic hit rate、source trace rate；
- abstention precision；
- recall p50/p95/p99；
- stale memory leak rate、temporal update accuracy；
- Provider failure rate、queue failure rate、dead-letter rate；
- embedding coverage ratio；
- WorkingMemory 压缩丢失、失败透明保留和 Persona 数据集治理结果。

`expectedTopIds` 必须来自具体 gold label 或用户试用样本。没有 gold label 的样本不能被默认为“应该 abstain”，避免把未标注数据误算成正确拒答。
