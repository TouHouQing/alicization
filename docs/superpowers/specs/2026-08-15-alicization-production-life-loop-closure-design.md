# Alicization Production Life Loop Closure Design

## 目标

把当前已经具备的记忆、质量、Persona 数据治理和 Skill 基础能力收口成用户可直接使用、可验证、可恢复的生产闭环：

- 用当前真实 Provider 验证 WorkingMemory 压缩和 LongTermMemoryRecall 是否改变模型回复
- 让 Workbench 的时间冲突、scope fuzz 和真实 sqlite-vec 规模压测不再只是测试代码
- 让用户通过会话选择器运行质量试用，而不是手动填写 session ID
- 让 Persona 数据集能够交给真实本地训练进程，并可加载、撤销和回滚训练产物
- 阻止 Eventa 与 renderer bridge 的 DTO 漂移
- 在 macOS 打包产物中验证原生 SQLite/vector 能力和可选训练 sidecar

## 设计原则

1. **Owner 不迁移**
   - WorkingMemory 继续拥有短期记忆和压缩。
   - LongTermMemoryRecall 继续拥有长期召回。
   - Provider runtime 继续拥有模型配置、重试和失败透明。
   - Persona training pipeline gate 继续拥有训练准入、撤销和回滚。
   - Memory Workbench 只负责聚合、触发和展示。

2. **试用与生产写入隔离**
   - Live Provider Trial 默认不写 WorkingMemory checkpoint、长期记忆、Persona 状态或训练数据。
   - 规模压测使用独立临时 SQLite 数据库，不污染真实记忆和向量空间。
   - 只有用户明确启动的 Persona 训练可以生成训练产物。

3. **失败面透明**
   - Provider、索引、训练进程、工具协议和打包原生模块失败必须保留真实阶段、错误码和错误文本。
   - 不生成替代人格回复，不把失败结果当作成功样本。

4. **人格训练不是对话日志训练**
   - 训练输入只接受已经清洗、用户授权、通过质量门的 reflection 或 persona reinforcement。
   - raw transcript、Provider 失败回复、工具失败提示、review 队列候选不得进入训练 manifest。

## 方案比较

### 方案 A：把全部逻辑继续堆进 `db.ts`

接线速度快，但 Provider、压测 worker、训练进程和 UI 状态都会挤进同一个 facade，进一步模糊 owner。拒绝采用。

### 方案 B：Focused runtime + DB facade + Eventa 聚合

为 Live Trial、规模压测和本地训练各建 focused runtime。DB 只负责持久化与已有 owner 的调用，runtime 注入真实 Provider/训练 executor，Eventa 只暴露稳定 DTO。采用此方案。

### 方案 C：独立常驻 Python/Agent 服务

训练扩展性最好，但会立刻增加守护进程、升级、签名和多平台生命周期复杂度。当前 Phase 1 只保留可选的外部训练命令协议，不引入常驻服务。

## 架构

### 1. Live Provider Trial

新增 `memory-live-provider-trial.ts`，接收：

- 选中的本地会话和持久化 turns
- 由 WorkingMemory 与 LongTermMemoryRecall 生成的真实 memory context
- 注入的 `AlicizationMemoryTrialProvider`
- 最大轮数、单轮超时、总超时和取消信号

Provider adapter 由 desktop runtime 注入，复用当前 main gateway 配置、Provider retry policy 和 `generateText` 路径。新增注册 source `memory-quality-trial`，归入 `memory-planning` audit family。

默认模式为 `reply-only`：

- 不暴露可执行工具
- 不写生产 checkpoint
- 不持久化 Persona 状态
- 记录 provider/model、耗时、重试、finish reason、输出长度和错误

后续 `read-only-agentic` 模式只允许 ToolRegistry 中声明为观察型且无副作用的能力；本轮不开放写工具。

### 2. 生产质量阶段

`runMemoryWorkbenchProductionTrial()` 必须传入：

- 从 gold label `expired`、knowledge update 和 tombstone 数据构建的 temporal conflict fixtures
- 针对 facts、consolidations、search documents、vectors、review 和 Persona dataset 的真实 scope fuzz views
- 最近一次持久化 semantic scale job 报告

没有对应样本时阶段应显示 `not-run` 原因，而不是伪造通过。

### 3. Replay 会话选择

新增只读会话摘要 DTO：

- `sessionId`
- 标题
- 第一轮和最后一轮时间
- 用户/助手轮数
- WorkingMemory checkpoint 更新时间

Workbench 从当前 card scope 分页读取会话，用户通过下拉选择。质量 trial payload 把旧的 `replayPackId` 收敛为明确的 `sessionId`；不保留双重语义。

### 4. Semantic Scale Job

新增持久化 job 和 worker：

- 状态：`queued | running | cancel_requested | completed | failed | cancelled`
- 规模：10k 或 100k
- 进度：已写入向量、已执行 query、当前 corpus size
- 报告：p50/p95/p99、recall@k、false recall、index mode、coverage、错误

worker 使用临时 SQLite 数据库和 `runMemorySemanticScaleVectorAdapterSoak()`。启动时只将 lease 已过期的遗留 `running` job 恢复为 `queued`；仍在有效期内的 lease 保持原 worker ownership，避免重启竞态重复执行。支持取消和重试，并且只允许单个 scale job 占用本机资源。

### 5. 本地 Persona/LoRA Executor

新增进程型 executor，使用显式配置：

- 可执行命令
- base model 路径或模型 ID
- 输出目录
- 超时

Alicization 将通过质量门的 manifest 写成稳定 JSONL 和 manifest JSON，再使用主进程构造的固定参数协议启动训练命令。用户不能注入额外固定参数。训练器必须输出机器可读的 artifact manifest，至少包含 adapter 路径、base model、格式和校验哈希。

首选 macOS Apple Silicon 后端是 MLX-LM；其他平台可以配置 PEFT/Transformers 命令。应用不静默安装 Python 包，也不把未配置训练器伪装为成功。

`PersonaTrainingPipelineGate` 是训练产物治理与启动恢复 owner。它在调用 loader 前先持久化 activation intent，并使用稳定 `operationId` 幂等重放 `load()`；只有真实 loader receipt 持久化并与 artifact CAS 一起完成后才能显示 active。进程重启时，即使 intent 已记录为 loaded，也必须重新调用同一幂等 load operation，不能把上一进程的 receipt 当作当前运行时已生效的证明。

回滚、source revoke 和异常恢复使用 `unload -> discard -> finalize` 持久化 saga。`unload()` 同样使用稳定 `operationId`；只有 finalize 才能提交 rolled-back/revoked 与 audit。cleanup 未完成时 increment 保持清理待处理且不可使用，Workbench 展示阶段和真实错误。DB 只提供 activation/cleanup intent、artifact CAS、run/increment/audit 的持久化端口，不直接调用 loader 或删除文件。

当前对话 Provider 不支持 adapter 热加载时，Gate 强制把产物标记为 unsupported，UI 明确显示“产物已生成但当前 Provider 不支持加载”，不能接受 executor 自称 active。

### 6. DTO Parity

`packages/stage-shared` 是稳定 DTO owner。Eventa 与 renderer bridge 复用共享类型，并通过编译期 type spec 检查以下类型双向可赋值：

- quality trial payload/report
- live provider trace
- session summary
- scale job
- Persona training artifact

Electron 专有传输细节仍留在 Eventa 层，不在各 surface 重复定义业务 DTO。

## UI

Memory Workbench 中文优先：

- 质量面板顶部先选择会话，再选择“历史确定性回放”或“真实模型试用”
- 真实模型试用明确显示会产生 API 调用、默认不写记忆
- 规模压测独立区域提供 10k/100k、开始、取消、重试和历史报告
- Persona 面板显示训练器配置状态、运行状态、产物兼容性、激活与回滚结果
- 所有阶段展示 trace 和原始错误，不使用人格化失败文案

## 验收

- Live Provider Trial 至少一轮真实调用，并证明 memory context 进入 Provider messages
- Live Trial 结束后生产 WorkingMemory、长期记忆和 Persona 行数不变
- Workbench 报告包含 temporal conflict、scope fuzz 和最近 scale report
- 10k job 可完成；100k job 可取消、重试并在重启后恢复
- 未配置训练器时透明失败；配置 fake executable 的集成测试可产出、激活、回滚 artifact
- Eventa/Bridge DTO parity 测试通过
- macOS unpacked app 可启动，sqlite3/sqlite-vec 可加载，Memory Workbench 可打开
