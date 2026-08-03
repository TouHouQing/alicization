# Alicization 长期记忆规模化治理设计

**日期：** 2026-08-03

## 目标

把 Alicization 的长期记忆从“多来源读出后扩大 source window 再在 JavaScript 中分页”升级为真正的数据库级检索闭环，同时让 embedding 重建、向量索引、机体隔离和 persona/LoRA 数据集治理具备可恢复、可审计、可扩展的本地生产能力。

这项工作服务于 Phase 1 的连续人格目标：WorkingMemory 继续拥有短期记忆，LongTermMemoryRecall 继续拥有长期回想，Memory Workbench 只负责聚合和治理入口。

## 已确认的数据策略

当前没有线上用户数据，因此历史上没有 `card_id` 的 `memory_facts` 和 `memory_consolidations` 不迁移、不复制，schema 升级时直接清除。与这些旧来源关联的孤立向量、policy overlay、review 状态也一并清理。

从升级完成开始：

- `memory_facts` 必须带 `card_id`，dedupe 只在同一 card 内生效。
- `memory_consolidations` 必须带 `card_id`，重建只删除并生成当前 card 的记录。
- 所有 facts/consolidations 的写入、查询、召回、Workbench 投影和向量元数据都必须使用同一 card scope。
- 缺失 `cardId` 的业务调用直接失败或返回空结果，不使用隐式全局默认。

## 长期记忆搜索

新增 `long_term_memory_search_documents` 作为统一的 SQLite read model，每条文档代表一个已清洗、可展示的长期记忆来源，包含：

- `id`、`card_id`、`source`、`source_id`、`kind`
- `summary`、`search_text`、`sensitivity`
- `updated_at`、`occurred_at`
- `tombstoned`、`text_hash`

同时建立 SQLite FTS5 索引。列表和搜索都在 SQLite 内完成：

- 无 query：按 `(updated_at DESC, id ASC)` 做 keyset pagination。
- 有 query：使用 FTS5 `MATCH` 和 BM25 排序，在 `(rank, updated_at DESC, id ASC)` 上使用 cursor。
- kind、sensitivity、visibility、training、source、card 均作为 SQL 条件。
- policy overlay 和 tombstone 通过 SQL 关联或投影字段合并，不能把所有来源拉回内存后再分页。

来源写入时同步 upsert search document；提供 reconcile/rebuild 操作修复历史投影和 FTS 索引。投影不改变任何 memory owner 的语义。

## Embedding reindex job

把一次性 `reindexMemoryWorkbenchEmbeddings()` 改成持久化任务状态机：

- `memory_embedding_reindex_jobs`：job 级状态、目标 card/model/dimensions、总数和各状态计数、取消标记、时间戳。
- `memory_embedding_reindex_items`：来源、文本 hash、状态、attempt、lease、下次重试时间、最后错误。

状态包括 `queued`、`running`、`cancel_requested`、`completed`、`cancelled`、`failed`；item 包括 `pending`、`leased`、`indexed`、`retryable`、`dead-lettered`、`cancelled`。

worker 规则：

- 启动时把过期 lease 恢复为 retryable，完成 crash recovery。
- 小批量 claim，单条 provider 失败不会丢失其他 item。
- 指数退避，达到上限进入 dead-letter。
- 取消只阻止未完成 item，不回滚已经写入的向量。
- dead-letter 可显式重试，重试会增加 attempt 并重新排队。
- job 状态和进度全部从 DB 聚合，Workbench 不依赖进程内计数。

## 向量索引 adapter

定义稳定的 `LongTermMemoryVectorIndexAdapter`，隔离底层实现：

```ts
interface LongTermMemoryVectorIndexAdapter {
  initialize: () => Promise<void>
  upsert: (records: PersistentLongTermMemoryVectorRecord[]) => Promise<void>
  delete: (input: { cardId: string, sourceIds: string[] }) => Promise<number>
  search: (input: PersistentLongTermMemoryVectorSearchInput) => Promise<LongTermMemoryVectorSearchResult[]>
  rebuild: (input: { cardId: string, modelId: string, dimensions: number }) => Promise<void>
  getHealth: (input: { cardId: string, modelId: string | null, dimensions: number | null }) => Promise<LongTermMemoryVectorIndexHealth>
}
```

首选 sqlite-vec；adapter 也允许未来接入 HNSW/其他 ANN。底层能力必须真实反映到 health：

- `indexMode: 'sqlite-vec' | 'hnsw' | 'ann' | 'brute-force'`
- `approximate: boolean`
- 扩展不可用时才允许显式 degraded brute-force fallback。
- 不同 model/dimensions 永远不能混在同一向量空间。

Recall 和 Workbench 只依赖 adapter，不直接读取 vector blob 或计算 cosine。

## Persona/LoRA 数据集治理

新增不可变 dataset version 层：

- dataset：`dataset_id`、`version`、`schema_version`、`card_id`、consent 快照、active/rollback 时间。
- example：来源 ID、清洗后内容、类型、PII/sensitivity 状态、内容 hash/dedupe key、`allow_training`、schema version。
- export：manifest hash、导出路径、源 dataset version、consent 快照、导出时间。

规则：

- 只允许 cleaned long-term reflection 和 persona reinforcement。
- raw transcript、review queue candidate、失败 fallback、内部 cue、未清洗 PII 不得进入 export。
- 默认 `allowTraining=false`。
- approve candidate 只写 policy/review 状态，不自动训练。
- dataset 版本不可变；rollback 只切换 active pointer，不删除历史版本。

## 失败和可见性

Provider 超时、embedding 失败、索引不可用、job dead-letter 等继续进入明确的 health/error DTO。任何降级都必须标记真实 index mode 和 lastError，不能用人格文案掩盖。

## 验证闭环

至少覆盖：

- card A 写入的数据不会出现在 card B 的 facts、consolidations、search、vector、persona export。
- DB cursor 在大于 source window 的数据集上不会漏项或重复。
- job 在重启、取消、重试和 dead-letter 后状态可恢复。
- vector adapter 在扩展不可用时诚实降级，在 model/dimensions 切换时要求 reindex。
- dataset export 只包含清洗、去重、已获 consent 且 `allowTraining=true` 的样本，rollback 后 active version 正确切换。
