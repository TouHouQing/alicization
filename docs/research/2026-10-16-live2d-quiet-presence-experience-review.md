# Live2D 安静待机与完整产品体验复查

状态：实现、后台完整产品验收、最终安装包生成及源码一致性检查均已完成。本轮于 2026-10-16 开始，2026-10-17 完成最终复查。

本轮遵循 Phase 1 的同一人格、情绪、记忆与动作意图来源。只使用 Live2D；原生窗口和 Playwright 均运行在独立 Windows desktop，没有切换用户输入桌面。测试档案为独立合成档案，未修改日常使用的人格或关系数据。

## 复现与根因

上一版修复了待机张嘴，却仍保留整段模型动画的自动重播。以已交付的 `live2d-idle-speech-20261016` 免安装包重新启动，在没有语音与交互的约 91.3 秒中记录到 588 个最终绘制采样：

| 通道 | 旧包最小值 | 旧包最大值 |
| --- | ---: | ---: |
| 头部 X | -30 | 26.527 |
| 头部 Y | -30 | 29.320 |
| 头部 Z | -30 | 29.607 |
| 左眼笑意 | 0.045 | 0.857 |
| 嘴角形状 | -1 | 0.993 |
| 嘴部开合 | 0 | 0 |
| 身体 X | -10 | 8.656 |

原始数据：`output/live2d-quiet-presence-baseline-20261016/report.json`。这证明“闭嘴”不足以解决无缘由的动作与表情循环；旧检查通过也不能证明安静陪伴已经自然。

实际代码有三个耦合来源：SDK 在动作结束后请求下一段 Idle；组件在模型加载、动作结束和首选项变化时再次请求首选 Idle；SDK 的示例呼吸还叠加固定周期的头部 X/Y/Z 和身体旋转。其头部幅度参数分别为 15、8、10，再乘 0.5 权重，之后还会叠加动画、注视及情绪层。

## 同类实现的采用与取舍

| 资料与固定源码 | 实际实现细节 | 本轮采用方式 |
| --- | --- | --- |
| [VTube Studio 参数归属文档](https://github.com/DenchiSoft/VTubeStudio/wiki/Interaction-between-Animations,-Tracking,-Physics,-etc.) | 默认值、待机、追踪、单次动作、表情与物理有明确优先级；归属改变时平滑交接 | 默认休息姿态有独立归属；前台动作与命名表情继续表达，动作结束后平滑释放，再交给当前情绪与物理 |
| [N.E.K.O. 的瞬态动作／表情处理](https://github.com/Project-N-E-K-O/N.E.K.O/blob/96dd26258003c74970e9d75e24f4e863012ba20d/static/live2d/live2d-emotion.js) | 播放新动作前清理上一动作残留，并保留当前表达；处理参数时考虑持续的 focus／breathing | 在 SDK 保存基准之前回落动作参数，之后才应用当前命名表情、眨眼、注视、物理与情绪；不把最终画面快照冻结成新基准 |
| [Open-LLM-VTuber Web 的模型更新](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber-Web/blob/d176e7df2366952e3bacbf12cf9a8b18a4315932/src/renderer/WebSDK/src/lappmodel.ts) | 源码也在无动作时连续启动随机 Idle，同时分阶段更新动作、眨眼与呼吸 | 采用明确更新阶段的思路；连续 Idle 仅作为用户显式选择的动画模式，避免照搬展示型默认行为 |
| [Cubism 官方随机眨眼实现](https://github.com/Live2D/CubismWebFramework/blob/d4da0aa07e47d2c1e4f5fa7ea6047861ea5e5d0b/src/effect/cubismeyeblink.ts)与[官方说明](https://docs.live2d.com/en/cubism-sdk-tutorials/eyeblink/) | 眨眼间隔存在波动，避免恒定周期；生理活动有独立控制器 | 保留现有唯一眨眼控制器；自然呼吸与稀疏姿态停留使用各自时钟，避免把整套身体动作当作呼吸循环 |

这些是对公开资料和源码的分析。没有运行商业产品客户端；本轮没有复制第三方代码，也没有改变项目许可。

## 本轮实现

`packages/stage-ui-live2d/src/composables/live2d/idle-presence.ts` 拥有本地身体时钟和 SDK 待机请求策略。`Model.vue` 负责接线；模型 store 拥有每个模型的待机模式；设置组件只负责用户选择。没有新增人格、情绪或主动性的第二来源。

- **默认安静陪伴。** SDK 的后台 Idle 请求不再启动整段模型动作；加载、完成回调和排队的首选动作重启也遵守同一模式。
- **保留有意义的表达。** 手动预览、对话动作、命名表情、当前情绪、口型和物理仍由原来的层处理。休息基准恢复发生在这些表达之前。
- **轻微而有停留的身体变化。** 呼吸只写真实呼吸参数，周期平缓变化。姿态目标之间通常停留几十秒，再缓慢调整不足一度；没有随时间切换笑脸、皱眉或大型动作。
- **让出对话。** 前台动作或发声期间暂停环境姿态调整，之后留出恢复停顿。暂停后恢复不会补演错过的动作。
- **保持视线。** 自动注视幅度缩小，并停留数秒；鼠标交互保留独立归属，注意力到期后及时交还自动注视，不再等待旧的长停留期限。这里的随机性只用于身体节律，不声称是思考或情感。
- **明确的产品选择。** “自然待机”为默认；每个模型可单独勾选“循环播放模型待机动作（会重复动作和表情）”。选动作默认只预览一次，同一个动作可以再次预览，保存首选项和重开设置不触发额外表演。
- **兼顾设置语义。** 暂停循环会同时释放正在运行的 Idle 与其执行记录；已开始或正在异步加载的前台动作保留归属。自然运动偏移在模式切换时平滑混合，前台姿态和表情基准继续保留。所选动作与循环开关分别保存；切换 Pro／Free 不会混用开关。

## 验收记录

最终源码快照：`output/live2d-quiet-presence-final-build-source-20261016.json`，2,998 个输入文件，指纹 `f0c5863f46042d30cc18a7fe95d9dc9cc0bdf15e868c84f0ce8edfd8e050be2b`。基于 main `f514ec005a39fc01c71043caf26275d14d016270` 加本轮本地修复；GitHub main 在最终复查时仍为该提交。

| 检查 | 当前结果 | 证据 |
| --- | --- | --- |
| 原生旧包复现 | 588 个无语音待机采样，头部与嘴角出现大幅循环 | `output/live2d-quiet-presence-baseline-20261016/report.json` |
| 针对性回归 | 42 个文件，522 项全部通过，无失败／跳过；包含人格、情绪连续性、执行风险与主动性既有约束 | `output/live2d-quiet-presence-regressions-verified-20261016.json` |
| 工作区类型检查 | 通过 | `output/live2d-quiet-presence-workspace-typecheck-verified-20261016.log` |
| 工作区格式与静态检查 | 无错误，保留既有 725 条 ESLint 与 7 条 Oxc 警告；新增 QA 脚本检查通过 | `output/live2d-quiet-presence-lint-verified-20261016.log`、`output/live2d-quiet-presence-all-qa-lint-20261016.log` |
| 最终源码编译／官方 NSIS 打包 | 均通过 | `output/live2d-quiet-presence-build-verified-20261016.log`、`output/live2d-quiet-presence-package-verified-20261016.log` |
| 最终 exe 较长待机／表情／口型 | 20 项通过，1,038 个真实绘制帧；其中默认待机 782 帧、约 141.7 秒，自动模型动作启动 0 次 | `output/live2d-quiet-presence-calibration-packaged-20261016/report.json` |
| 最终 exe 完整产品体验 | 115 个界面状态、254 项检查全部通过；页面异常、未解析翻译键均为 0；正常退出码 0、2,015 ms | `output/live2d-quiet-presence-product-packaged-20261016/report.json` |
| 真实对话与语音 | 首次问候及喜悦分享、低落陪伴、轻微回应三个场景；13 段 SAPI 语音实际合成／解码／播放，pending 0、失败 0；声音静音 | 同上 |
| 实际音频静音间隙 | 37 个完整 200 ms PCM 静音窗口，均处于前台动作；最大非语言嘴部开合约 0.145，满足该场景 0.20 上限；受控中性静音另检查低于 0.05 | 同上 `actualAudioSilence` |
| 实际主进程服务请求 | 8 次真实请求的端点均匹配配置，HTTP 均为 200；没有替换请求或回复 | 同上 `providerTransport` |
| 从启动起无 Node 调试器的原生运行 | Live2D 像素及静音 WebAudio 通过，真实关闭按钮正常退出码 0、2,144 ms | `output/live2d-quiet-presence-native-exit-20261016/report.json` |
| 源码与最终包一致性 | 1,173 个编译文件逐个匹配 ASAR；3 次最终原生运行的 exe／ASAR 身份一致 | 发行目录 `release-provenance.json`、`output/live2d-quiet-presence-hygiene-20261016.json` |

新增真实绘制检查要求：默认待机不启动模型动作、不循环中性表情、头部在小幅预算内，同时仍能呼吸、眨眼和改变注视。受控组件输入还验证喜悦、愤怒、惊讶、有声／静音口型、重复点头和摇头。这些受控输入用于检验身体投射，不能代替自主行为或真实对话证据。

最终默认待机的稳态窗口为观察开始 3 秒之后，768 帧中头部 X/Y/Z 最大绝对值约为 **5.279° / 3.920° / 1.097°**。嘴部开合保持 0，嘴角形状变化范围约 0.000029。开始时仍有一次指针注意力回落：第一帧 focus 从约 -0.788 向约 -0.036 释放，头部约 -25.269°，约 0.64 秒后回到轻微范围。该过程没有模型动作启动，全部原始帧保留；不将初始注意力交接或明确交互动作混入静默稳态预算。稳态采样拼图位于 `output/live2d-quiet-presence-calibration-packaged-20261016/quiet-idle-contact-sheet.png`。

最终发布清单认证本轮产品体验。工具中的完整人格／执行原生场景、跨重启生命体验等更广泛认证标志保持 false，避免将渲染校验扩大为 Phase 1 全面完成。

## 失败记录与复查

- `product-compiled-20261016` 在 39 个捕获状态后因两个测试定位器仍使用旧开关名称而停止；该轮保留为失败，已同步为“自然待机”。
- `product-compiled-verified-20261016` 发现旧检测读取了 SDK 绘制后恢复的保存基准，误报身体没有运动。采样器改为只读真实 `beforeModelUpdate` 最终参数与帧号；活跃度阈值仍为 0.001，增加新帧确认。
- `product-draw-verified-20261016` 在真实对话处遇到 `net::ERR_CONNECTION_TIMED_OUT`，未通过命名人格回复检查。审计记录确认该失败回复未进入人格学习或长期记忆凝练。独立服务探测随后完成流式响应；同一最终 exe 的短流程及完整流程均复测通过，HTTP 端点观测随最终报告保存。没有将服务超时算作成功，也没有改变代理或传输策略。
- 初次 CLI 打包参数解析失败，随后通过官方 Node API 完成 NSIS 构建；没有改写依赖收集算法。较早的 517 项回归与候选校准数据只保留为阶段记录，最终以 522 项和包内实际验收为准。

## 交付与整理

发行目录：`apps/stage-tamagotchi/dist/live2d-quiet-presence-20261016/`。

- 安装器：`Alicization-0.3.0-windows-x64-live2d-quiet-presence-20261016.exe`，608,043,054 字节；SHA-256：`27ad5fcec15d2816433388c76e821b948541b936d5d53af6064514d5d560217c`。
- 免安装入口：`win-unpacked/alicization.exe`；SHA-256：`f4e6433a9fad6e599b562b8e4d1ab8d6032576a8bdbd4855a689035272de790e`。
- ASAR SHA-256：`a9588df951d2d383f47a2292853659c9dae486a1e1b39c6d966e111bd6adb5a4`。

9 个本轮合成 QA 档案共扫描 753 个文件、171,922,812 字节，未发现已配置真实 key 的 UTF-8／UTF-16LE 字节；提供商空模板配置可保留，非空凭据字段为 0。实际连接服务的档案已清除凭据及 Local Storage；临时 SAPI 文本与 WAV 均已移除。3 个最终原生 job 已收束，输入桌面前后均为 Default，没有切换或操作用户主桌面。失败证据与缓存保留供复查；此前测试缓存及旧构建删除被自动审批以 `blocked by policy` 拒绝，本轮没有重试相同删除动作。

## 体验范围与限制

完整流程继续检查人格引导、失败反馈、Live2D Pro／Free、模型导入与改名、拖动缩放、设置与重载、颜色和缓存、记忆与节律、供应商配置、辅助窗口、聊天及数据导入导出。真实对话使用现有已配置服务；测试语音使用有界 SAPI 合成并静音播放。

运行验收使用包内免安装 exe；NSIS 生成与包内容一致性已检查，安装向导、注册表写入及卸载流程不在这次后台运行覆盖范围内。私有桌面与软件 GL 不能证明所有显卡、第三方模型 rig、物理鼠标和音频硬件；配置入口可用不能证明所有付费供应商账户可用。语义手势的精细选择、完整手部资产、多日陪伴节律和长期人格连续性仍需长期观察。本轮结论限于已记录的产品流程与身体表达，不宣告完整数字生命已经完成。
