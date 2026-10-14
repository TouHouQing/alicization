# 桌面生命连续性与后台原生验收

后续整体身体行为、人格窗口同步与新版本验收见 [桌面整体生命感实现记录](./2026-10-05-living-presence-implementation.md)。本文件保留上一轮版本的原始验收范围。

本轮接续 N00–N17 的工程闭环及同类项目源码分析，继续围绕 Phase 1 的同一人格、真实行动、记忆来源和身体表达开展开发。工程验收与长期陪伴的体验验收分别记录；测试通过不能证明主观意识，也不能代替真实日常相处。

## 已复现的问题与运行链路修复

| 问题 | 后果 | 实际修复位置 |
|---|---|---|
| 最后一段创作在写入前清空待续项目 ID | 中断后无法接续原计划，可能另起项目 | `life-personal-project-runtime.ts` 保留根 ID；全部步骤、关联、执行回执和实际文件验证完成才清空；启动恢复采用相同规则 |
| 文件证明与动作作者混为一谈 | 丢失执行返回时无法恢复分享资格，或错误推断自己完成了动作 | `life-project-action-recovery.ts` 将同一卡、任务、attempt、owned-note 参数、已提交 adapter result 与当前独立文件核验对应起来；不足则保留 uncertain，禁止自动重放 |
| 兴趣撤销发生在准备经历与真正入库之间 | 已遗忘来源的派生经历重新出现 | `life-project-experience-fence.ts` 在现有 SQLite memory journal 的写入事务内读取当前目标，校验来源状态、代次、独立验证编号和规范经历内容；过期条目消费后跳过，不阻塞 journal |
| SOUL 变更仅发往无 sender 的全局 Eventa context | 设置保存成功，舞台仍显示旧人格状态 | `runtime.ts` 在提交后通过已绑定舞台窗口的路由发布同一快照；renderer 继续执行原身份过滤，无新增人格权威 |

系列作品的根 TaskThread 保管原计划。每个子步骤同时验证根 ID、步骤序号、计划哈希、任务类别、真实文件和动作回执。明确取消与来源遗忘保留不同原因，错误关联不会成为续作上下文。

Windows 的 8.3 短路径和长路径可能指向同一文件。动作恢复先验证原 workspace 路径边界，再用已有防链接重定向的目录解析器取得 adapter 实际使用的路径。`verifyLifeFileProof` 独立观察文件字节，不重新开启已完成的责任，也不修改它的已提交目标证明。

项目记忆描述实际执行和验证，不把虚构作品情节记成生活经历。规范内容由 `life-project-experience.ts` 单独拥有，发布端与事务写入端共享。普通事件的原有入库流程保持原语义；保留的 `project-experience:` 派生事件必须对应当前合法目标。确定性事件 ID 支持在“经历已发布、索引标记未提交”之间崩溃后的恢复和去重。

## 故障验证

`output/life-continuity-failure-reproduction.log` 记录修复前两项确定失败：最后一步丢失 pending root，以及撤销来源后出现一条不应写入的经历。新增测试使用真实临时 SQLite 和 owned-note 文件，无用户身份或记忆。

验收覆盖最后一步执行前中断、执行结果已持久化后中断、目标证明已提交后中断、重启前文件被改动、保持同一根计划、不重发 uncertain 动作、经历发布后索引前崩溃、来源撤销竞态、错误代次、错误验证编号、伪造经历内容、错误派生引用和跨身份写入。SOUL 测试通过实际 invoke handler 保存并观察窗口出站事件，原生场景再从第二个 renderer 保存并直接观察舞台现有 store，避免一次主动读取掩盖通知缺失。

全量服务测试、renderer 回归、lint、工作区类型检查、构建和最终发布结果在本文件后续验收记录中核对。报告计数不相加，避免重叠用例被重复统计。

原生同步测试最初将标记追加在生成的 SOUL 正文末尾。正文规范化会去掉这段测试内容，因此该试验没有产生有效人格修改，不能作为通知失败的证据。最终场景从第二个 renderer 修改合成人格 frontmatter 中的角色名称，先确认实际返回的新内容，再直接等待舞台现有 store 采用相同内容；没有在舞台主动读取 SOUL 来补齐通知。这个修正只涉及 QA 脚本。

## 主桌面不受测试窗口覆盖

`run-private-desktop.ps1` 用 Win32 创建 `AlicizationQA_<GUID>` 桌面，通过 `STARTUPINFO.lpDesktop` 启动 Node 控制器及其 Electron 子进程。创建的桌面不申请 `DESKTOP_SWITCHDESKTOP` 权限，代码不调用 `SwitchDesktop`。测试子进程先挂入 kill-on-close job 再恢复运行，超时与结束只清理本次子进程树。控制器与 Electron 各自读取实际线程所在桌面，独立验证后才开展原生测试。`electron-launch.cjs` 默认拒绝在普通桌面启动原生验收窗口。

依据微软一手接口文档：[CreateDesktopW](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-createdesktopw)、[STARTUPINFOW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/ns-processthreadsapi-startupinfow)、[线程与桌面连接](https://learn.microsoft.com/en-us/windows/win32/winstation/thread-connection-to-a-desktop)、[Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)。

最小隔离探针已经通过：Node 与 Electron 的实际桌面相同，创建窗口数为零，测试前后用户输入桌面都是 `Default`。证据为 `output/life-acceptance/continuity-private-desktop-probe.log`。

上一轮构建的真实 unpacked EXE 已在独立桌面跑通全部 8 种动作，实际骨骼运动、SQLite/IPC、CLI 真实文件、独立正确/错误内容核验、working → verifying → finished/blocked 阶段均有观测。原始副本为 `output/life-acceptance/continuity-base-package-native.json`；隔离结果为 `output/life-acceptance/continuity-packaged-desktop-isolation.json`。此结果属于旧构建，最终交付包另外核验。

独立桌面隔离的是窗口，不隔离系统级鼠标键盘、音频硬件或屏幕捕获接口。本轮原生场景只操作自己的 renderer、合成身份和测试文件，只截应用页面。含全局输入、desktopCapturer 的 stage smoke、安装器或真实模型/音频硬件场景不属于该后台验收。未验证用户当前桌面的合成器、鼠标穿透、游戏覆盖、真实模型回复自然度或音频硬件。

## 工程与体验的边界

这轮补强的是持续项目、行动归属、记忆可撤销和跨窗口人格同步。现有动作是基础的程序骨骼动作；真实模型驱动的自然行为、丰富美术动画、长期关系稳定、整日打扰预算、睡眠与恢复的长期效果仍需要专门场景及长期使用观察。Phase 1 的体验验收仍开放，不能以本轮自动化结果宣称数字生命已经完成。

## 最终验收记录与交付

| 验收项 | 最终结果 | 证据 |
|---|---|---|
| 桌面全量 | 5,476 通过，0 失败，8 条原有条件跳过 | `output/life-continuity-desktop-final.json` |
| 人格与舞台 renderer 回归 | 24 通过，0 失败 | `output/life-continuity-renderer-final.json` |
| 新增故障链路与证明回归 | 20 通过，0 失败；与全量有重叠 | `output/life-continuity-targeted-final.json` |
| 整个工作区类型检查 | 通过 | `output/life-continuity-workspace-typecheck.log` |
| 修改代码 lint fix | 0 错误；大文件仍有 71 条既有告警 | `output/life-continuity-lint-fix.log`；新增验证器与 QA 脚本最后检查均 0 错误 |
| 实际包人格初始化与托盘 | 确认后真实保存并前进，无 renderer 异常；21 项原生菜单标签为中文，无翻译 key 泄漏 | `output/life-acceptance/continuity-persona-scene.json` |
| 实际包人格同步与动作执行 | 第二 renderer 修改已提交人格，舞台采用同一快照；完整 8 动作实际骨骼运动；真实 CLI 文件的正确/错误核验分别进入 finished/blocked | `output/life-acceptance/continuity-action-scene.json` |
| 原生隔离 | 两个最终场景均退出 0，job 关闭；输入桌面前后均为 Default，未切换 | `output/life-acceptance/continuity-final-persona-isolation.json`、`continuity-final-action-isolation.json` |
| 实际包原生依赖 | SQLite 真实读写，sqlite-vec v0.1.6，Electron 40.8.0 / ABI 143；Node 模式创建 0 窗口 | `output/life-acceptance/continuity-packaged-background.json` |
| 构建与归档对应 | 构建前后源码指纹一致；ASAR 内 1,168 个编译文件逐项匹配，pi MIT notice 原文匹配；两次原生场景前后 ASAR 哈希一致 | `apps/stage-tamagotchi/dist/life-continuity-20261005/release-provenance.json` |

两次 `git fetch origin` 遇到网络连接重置。随后直接通过 GitHub 官方 API 核对当前 main，确认与本地 HEAD / origin/main 均为 `7880afc29ab33a4cf4de89f7a6610664278494c3`。证据是 `output/life-acceptance/continuity-upstream.json`。交付包含该最新基线与现有本地开发修改，不能称为未修改的远端 commit 构建。

安装器：`apps/stage-tamagotchi/dist/life-continuity-20261005/Alicization-0.3.0-windows-x64-continuity-20261005.exe`，606,862,021 字节。

SHA-256：`1fb64e39595f361aaebd8653b8da80959752e3be06b5aace7b25318409b1cfab`。

解包版入口：`apps/stage-tamagotchi/dist/life-continuity-20261005/win-unpacked/alicization.exe`，使用整个 win-unpacked 目录。安装器和 blockmap 改为独立名称，`latest.yml` 同步引用新名称，原有包保留。

源码指纹：`582c2c6b2baad4f0549264a4b0c818be1ff87d503e2ff3ea421cbd7a764638fc`。ASAR SHA-256：`c4fa64e2be13749ea2b3782719a7eb5a0de96fde01aaf751c8103b13660742eb`。发布清单要求原生证据的实际 executable 与 ASAR 哈希对应本包，完整动作矩阵及人格同步均通过才允许标记 packagedNativeVerified。

最终包验证的是解包版及其归档；为保持主桌面可用，这次没有启动安装/卸载流程、系统鼠标输入、整屏捕获或真实模型与音频硬件试验。安装器的安装路径与数据保留不借用旧版本试验当作本包的新证据。

本次自主工作已完成上述开发、故障回归、后台原生场景、构建与交付；尚未关闭 Phase 1 的长期体验验收。
