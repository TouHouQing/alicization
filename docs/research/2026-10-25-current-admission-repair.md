# 用当前受理回执修正对话

本轮属于 Phase 1 的执行、对话与审计闭环，不表示 EX00–EX23 完成。

## 实际产品问题

v153 的 28 文件 474 项测试、完整 Node/Vue 类型和桌面构建 pass112 通过，源码指纹 `93bb9edfe8aaffdf76186ce31dcefd14338e5fa92414e8f81a28faa9be58fd5f`。Live2D 完整组合 pass108 在 92 项处失败，正常退出 1838ms，测试凭据已清除，Default 桌面未切换。

本次模型在只取得计划受理回执后，说“第二步的来源文件缺失”。该状态尚未经过独立核对，原拦截应保留。后续文本修正又包含无法绑定的执行意图和等待条件。此前专门的受理修正上下文只接纳所有 claim 都为有效绑定的 task-acknowledgment，故这类带有无证据结果断言的失败只能得到一般历史/观察上下文，模型容易继续猜测状态。

原始失败只读复核为 `output/execution-fresh-review-live2d-failure-20261025-pass108.json`。没有将该失败算作通过，也没有新增文件系统探测来替代已授权的工作步骤。

## 实现

`currentWorkAdmissionRepairContext` 从实际成功、已 settle 的当前 `life_execute_work_plan` 或 `life_use_learned_procedure` effect 提取唯一受理事实，同时核对当前用户请求、计划、责任代次、契约和参数摘要。待执行计划本身、旧请求、未确定 effect、被撤销责任、改动参数或多个歧义回执都不能提供该上下文。

提供给文本修正的内容只有该次受理绑定、计划版本、参数 hash 和一句保守的受理表述，不复制文件路径/内容，不证明来源文件状态、步骤尝试、交付完成或新权限。模式为 `current-admission`，上下文范围为 `current-admission-repair-only`。普通计划使用“工作计划已受理。”，学到的方法使用“方法调用已受理。”。

主对话仍只允许一次文本修正，工具保持禁用。没有公开前缀时，要求模型按提供表述生成一条受理回复；已有公开前缀时保留原文、完成未结束词句，只补充同一受理事实。修正稿仍走原核验，第二次不通过仍必须拒绝。原草稿的 verdict 不会改变，产物和根目标仍由独立验收决定。

新增重复核验测试还发现审计键冲突：内容摘要相同而真实核验时间改变，旧 operationKey 会被复用为不同内容。现在每次实际核验有独立 attempt UUID，语义 reviewHash 单独保留；提交事务内沿用同一个记录 ID。审计保存受理修正模式和上下文 hash，仍记录原始拒绝结果。策略版本为 `review-local-bindings-v80`。

## 验证与剩余工作

实际 SQLite/tool spec/dispatch authority 的 RED 复现一般上下文问题；fixture 初始化错误和未等待后台 owner 的冲突日志单独保留，均未计为功能 RED。重复核验的实际审计冲突另有独立 RED。

三文件 98 项 GREEN 包括：原草稿保持拒绝；实际当前回执提供精确修正；隐私参数不重复进入上下文；两个 review 独立审计；错误来源、未知 effect、错误参数、撤销、歧义和历史请求拒绝；方法复用的真实回执；修正过程不派发 I/O、不完成目标；主对话工具禁用、保留原核验，以及第二次拒绝时不发布回复。审计 hash 的补充断言及新完整组合/类型/构建/Live2D 复验待执行。

Windows 键盘基础实现保留在独立工作区：43 项 TS 快捷键编排与 61 项原生布局、DACL、共享账本和真实双进程检查通过，尚未安装 hook、注入输入或接入产品。它不影响当前主目录源码与验收，也未关闭 EX06。

最近 pass107/108 两份已正常退出的自有测试档案已通过 Electron 官方缓存接口清理，926,544 bytes 清至 0，数据库和失败证据保留，控制进程正常退出且 Default 未切换。见 `output/execution-cache-cleanup-result-20261025-pass23.json`。

v154 桌面构建 pass113（含 Node/Vue 类型）通过；30 文件组合 477/478 通过，学习方法 fixture 的人工接管与自动核对竞争。生产界面由 `createExecutionUserCommandScope` 取得 foreground admission，令 `canContinue=false`；该 fixture 没有模拟这一条件。现于暂停前持有同一调度条件，等待 writer、owner 和已有核对结束，再创建接管确认，三文件 13 项通过。生产确认和资源互斥均未修改。后续源码相对 v154 仅 fixture/文档改动，可核对编译输入一致后复用 pass113 产物，完整组合及 Live2D 仍需通过。
