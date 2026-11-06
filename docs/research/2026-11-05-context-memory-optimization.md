# 面向持续数字生命的上下文压缩与对话检索

日期：2026-11-05。主要运行面：`apps/stage-tamagotchi`。本轮优化维持一个人格、一个主进程记忆所有者；聊天窗口缓存、工作记忆和长期事实各自承担既有职责。

## 源码研究

本轮按提交固定抓取五个项目的 32 份文件，合计约 1 MB；未安装或运行第三方项目。精确提交、文件大小、SHA-256 和源码链接见同目录的 `2026-11-05-context-memory-sources.json`。以下为实际采用的机制。

| 项目及提交 | 查阅的实现 | 在 Alicization 中的取舍与落点 |
| --- | --- | --- |
| [Codex `031829da`](https://github.com/openai/codex/blob/031829da6aee2c419364243a7e163e102aa33338/codex-rs/core/src/compact.rs) | `compact.rs`、`context_manager/history.rs`、checkpoint prompt | 保持原始记录与推理窗口独立；摘要携带来源，当前输入单独保留。沿用现有 provider 硬预算与工具回执回读。压缩内容不能获得新的执行权限。 |
| [Pi `0c5b7ee3`](https://github.com/earendil-works/pi/blob/0c5b7ee39352658b54385cf29c25f777b20b0f20/packages/coding-agent/src/core/compaction/compaction.ts) | cut point、近期预算、迭代摘要、失败恢复；compaction 文档 | 从末尾按字节和消息预算保留完整问答，不再固定只留 6 条发言；至少保留最近两个交互。工具调用的完整性继续由原有 provider 请求保护负责。 |
| [DeepSeek Harness `fcc0ad46`](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/compaction/compaction-basic/src/region.ts) | region 选择、异步 source stability、持久化 checkpoint、summary shrink 检查 | 提交语义压缩前比较完整源检查点；SQLite 条件更新与内存检查共同拒绝过期结果。只有真正减少体积的结果才能落盘。 |
| [Hermes `27cbcb12`](https://github.com/NousResearch/hermes-agent/blob/27cbcb122ff47a1d6878cf3c390b24395f98ee14/tools/session_search_tool.py) | FTS 搜索、来源校验、分层详情、会话回读；compression checkpoint | 原文 FTS 索引、相关性排名、稳定游标和来源分页读取。保留 Alicization 自己的呈现回执、哈希、撤回检查和发布事务验证。 |
| [N.E.K.O `1ea9c888`](https://github.com/Project-N-E-K-O/N.E.K.O/blob/1ea9c88872a8a4f96bc431e1f98fdf903e2c8621/memory/recent.py) | 近期摘要、长输入分段、后置维护；[hybrid recall](https://github.com/Project-N-E-K-O/N.E.K.O/blob/1ea9c88872a8a4f96bc431e1f98fdf903e2c8621/memory/hybrid_recall.py) 与 [memory architecture](https://github.com/Project-N-E-K-O/N.E.K.O/blob/1ea9c88872a8a4f96bc431e1f98fdf903e2c8621/docs/architecture/memory-system.md) | 按角色组织日常、事实、经历与关系；对话先提交，较贵的维护在后台执行。重要共同经历、情绪与约定参与保留排序；既有 RRF 检索增加互补证据选择。 |

复用方式为机制与边界设计借鉴，本轮新增模块由 Alicization 实现；没有把第三方人格提示、云端压缩依赖或整套运行时引入项目。源码副本仅用于研究，许可证随来源清单记录的原仓库文件留存。

## 运行链路

```mermaid
flowchart LR
  A[当前完整输入] --> B[主进程工作记忆恢复]
  B --> C[按预算保留完整近期问答]
  C --> D[历史摘要和长期记忆检索]
  D --> E[有来源的受限推理窗口]
  E --> F[模型与受治理工具循环]
  F --> G[提交回复和工作记忆检查点]
  G --> H[后台语义选择]
  H --> I{源检查点仍然一致}
  I -->|是| J[原子替换压缩视图]
  I -->|否| K[丢弃过期结果]
  E --> L[历史关键词搜索]
  L --> M[按来源和偏移回读原文]
  M --> F
```

### 近期记忆与压缩

- 近期默认上限 24 条发言、约 14,000 UTF-8 字节；保护最新两个完整交互。边界按 user/alice 共用的交互 ID 选择。这是保留策略，不是模型分词结果；最终请求仍由 provider 预算检查。
- 工作记忆较长文本在 8,000 字符范围内优先保留完整句，显式纠正、否定、承诺、情绪与后部内容参与排序。新请求在传输层单独保留，不被历史摘录替换。
- 较早对话生成带角色、消息 ID 和发生时间的摘录。时间线最多 24 项，超额后合并较老片段，保留重要摘录、开放事项和来源。推理窗口同时选择近期片段与重要旧片段。
- 供模型使用的工作记忆视图默认目标约 22,000 字节，并受所配置模型窗口影响。优先减少重复槽位、过长历史展示和较低优先级片段；不为凑预算截断当前纠正、承诺或当前完整输入。必要状态仍过大时由 provider 拒绝请求，不能伪装成成功。
- 已有 8 个压缩片段且证据足够时，回复提交后运行语义选择。模型只返回现有摘录 ID 和分类，不写新事实。原始措辞、角色与时间由本地代码取回，禁止未知 ID、重复 ID、额外自由文本和不缩小体积的结果。
- 语义选择属于 `memory-compaction` 后台通道，有响应格式、用量账本、超时、前台抢占与取消。失败时保持已提交的提取式检查点。相同源短时间内不反复请求。
- 落盘使用完整序列化检查点的 compare-and-swap；新消息、清理或其他检查点变更会使旧任务失去写入资格。内存所有者也再次检查，不能被晚到的摘要覆盖。

摘录可能带 `…`，表示省略；它不是逐字引用的充分证据。准确引用必须经过原文读取及原有对话证据验证。摘要不自动成为长期事实、人格修改或训练样本。

### 原文检索与回读

- `agent_conversation_search` 为 `conversation_turns` 的 external-content FTS5 trigram 索引；原始数据仍由原表拥有。初次创建回填一次，插入、修改与删除由触发器更新。
- 三个及以上字符的字面关键词走 FTS；一至两个字符的中文仍走有角色/时间边界的字面过滤。最多 4 个关键词，全部匹配；不会把 `%`、`_` 或引号解释成额外搜索权限。
- 默认相关性排序，可切换时间排序。相关性游标包含排名值、时间与 ID，避免同分记录翻页重复或漏读。
- 数据库阶段先限制角色、真实用户输入来源、已结算状态、时间范围和撤回记录。运行时再核验输入哈希、对话归属以及角色实际呈现回执。未展示的内部回复不能作为她曾经说过的话返回。
- 搜索在有限候选页内补足有效结果，避免无效记录占满名额。摘录优先覆盖多个关键词，保留原文偏移与总长度。
- `life_search_sessions` 同时提供发现与原文页读取：发现得到 `match.id`，再传 `sourceId`、`speaker`、`offset`；每页最多 1,600 字符，沿 `readNext` 继续。来源页同样检查撤回、角色和时间范围。
- 回读页进入同一工具回执与发布证据链；后续页也可参与引用校验。历史中的操作承诺不等于真实操作成功，当前偏好以现有版本事实和当前纠正为准。

### 长期检索

保留现有意图、人物/时间/任务限制、关键词与语义渠道、RRF、事实版本和敏感性策略。在既有相关性排序后加入互补证据选择，降低近义重复项占满少量上下文槽位的概率；不因文本相似就删除重复经历或相反事实。

## 数据升级与边界

- 既有工作记忆版本继续读取；新增 evidence、method、occurredAt 为可选字段。旧时间线通过有来源的合并进入新上限，未凭空补写历史时间。
- 既有聊天记录不因上下文压缩删除。1 万条缓存的启动合并与本轮推理压缩是不同链路。
- FTS 回填只覆盖主进程已有的对话原始记录。旧 IndexedDB 中缺少身份、来源或呈现证明的缓存，不会被本轮自动伪装成可信记忆。
- 本轮不更换人格、情绪或具身表达所有者；回忆只为当前同一个“她”提供有来源的材料。Live2D/语音继续消费同一对话及心智状态。

## 验证范围

针对保留边界、长文末尾纠正、关系事件保留、数百轮与重启、语义选择校验、后台抢占、过期检查点拒绝、真实 SQLite 索引和分页、来源回读、撤回及发布校验建立回归。**57 个文件、670 项测试通过**；另有全工作区类型检查、lint 和实际打包 SQLite 驱动的 7 项无窗口检查。[验收范围与限制](2026-11-05-context-memory-acceptance.md)、[可复核 JSON](2026-11-05-context-memory-validation.json)。所有测试均在后台执行，不打开桌面角色窗口。
