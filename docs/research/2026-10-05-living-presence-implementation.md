# 桌面整体生命感：连续身体行为与真实交互

本轮接续前两轮的 11 个固定版本项目研究与 Phase 1 工程闭环。当前目标是让已存在的人格、情绪、注意和真实行动产生连续的桌面行为。人格、情感与关系仍由 desktop runtime 所有；本轮没有新增人格中心。

## 本轮深入阅读的实现

| 项目与固定版本 | 阅读节点 | 吸收的实现及边界 |
|---|---|---|
| [N.E.K.O.](https://github.com/Project-N-E-K-O/N.E.K.O/tree/f2fea6de7149ef333422e61bafa4102d44f2cf2c) | `static/vrm/vrm-cursor-follow.js`、`vrm-expression.js`、`vrm-animation.js` | 实际移植 One Euro 滤波内核，改为函数式 TypeScript，限制无效 delta 与恢复时的巨大时间步；保留初次采样和模型切换重置。阅读动作淡出清理与眼／头跟随分层。随机情绪轮换会破坏情绪连续性，本项目保留内在情绪权威。 |
| [VPet](https://github.com/LorisYounger/VPet/tree/c3420bb77d6d00ed5fabf975a0945c4f6179bba3) | `VPet-Simulator.Core/Display/MainLogic.cs` | 吸收行为开始、持续和收尾的生命周期，以及互动与工作状态影响安静行为的办法。未移植它的随机睡眠、漫游、食物数值或美术资源；本轮行为原因来自实际输入、播放和既有任务。 |
| [Open-LLM-VTuber](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/tree/992309c0aa19845960228f880013d4685fde93b5) | `conversations/tts_manager.py`、`single_conversation.py` | 检查异步合成、序号缓冲、实际发送与取消的边界。Alicization 保留自身现有 speech runtime 和 expression receipt；新身体行为在实际语音播放时让位，麦克风检测到主人讲话时取消当前语音 owner。没有把文字生成完成当作语音已播放。 |
| [SillyTavern](https://github.com/SillyTavern/SillyTavern/tree/06bde939fb1e9c4c8d8641d810f0a916b5bce127) | `public/scripts/extensions/expressions/index.js` | 阅读表情分类的相同消息去重、流式节流与忙碌互斥。本轮安静表现无需额外 LLM 分类请求，也不会将短暂身体变化写为情绪或长期记忆。 |

其余 7 个项目的原始代码检查与固定版本记录仍见 `2026-10-05-desktop-life-source-manifest.json`。本轮深入 4 个项目，累计研究 11 个；没有把旧轮次的阅读或测试重复计为新项目。

## 代码边界与实际连接

`apps/stage-tamagotchi/src/renderer/composables/life-resident-behavior.ts` 拥有临时身体行为时钟：安静陪伴、倾听、等待处理、实际说话和收尾。隐藏期间冻结时钟，恢复不会一口气补演，系统时间回退不倒放；切换身份清掉旧行为阶段。稳定动作偏好来自当前人格的 core_incarnation 与 liveliness，不新增习惯存储，也不把随机姿势当成成长。

`use-life-resident-behavior.ts` 读取实际 composer 焦点和草稿、chat sending、授权语音输入、实际 Stage speaking 与暂停／Kill Switch。它只生成渲染偏移，使用 VueUse 管理采样生命周期。页面保持组合职责；VAD 原路径只接入当前语音 owner 的打断，执行任务生命周期保留原权威。

`stage-resident-behavior-frame.ts` 是共享渲染契约与纯投影器。桌面生成行为，Stage 按身份、时间、暂停、实际任务和语音／脚本优先级校验后传给已有 Live2D 和 VRM 渲染链。它保留当前表情、情绪、语音和动作契约，负面情绪会收敛动作幅度。倾听的小动作只在进入该状态时发生一次，安静时没有主动消息、工具调用或虚构记忆。

`posture.ts` 修复累积偏移：没有被动画轨道覆盖的头／颈骨骼会保留上一帧姿态，旧实现把新偏移继续乘在旧结果上。现在先识别并移除本层旧偏移，再平滑应用有界新偏移；若 mixer 替换了姿态，采用新的动画基线。其他动作、待机动画与姿态层可以共存，归零时自然释放本层。

`one-euro-filter.ts` 适配 N.E.K.O. 的真实滤波代码，用于 VRM 视线目标。慢速抖动被抑制，明确目标变化能快速连续跟上，模型切换清除旧滤波尾巴。该文件注明原项目、固定版本和改动，完整 Apache-2.0 许可证与上游 NOTICE 随 desktop resources 打包。本轮没有复制第三方人物模型或动画资源；NOTICE 中提及的第三方模型扩展仍属于上游分发内容。

原生验证进一步复现了人格窗口缓存不一致：主舞台已更新，初始化窗口仍持有旧 SOUL revision。现在窗口创建时显式注册受信任的设置、初始化与独立聊天窗口，只允许接收 SOUL 与 Kill Switch 事件；身体事件保留舞台路由，外部浏览器窗口不注册。`alicization-epoch1.ts` 对同一 SOUL 路径拒绝旧 revision 的异步响应，初始化复用同一快照采用函数；保存失败向调用者明确抛出，避免返回旧快照冒充保存结果。不会自动重试或覆盖用户的旧草稿。

## 验收场景

修复前已复现：连续模拟 3,600 帧后，未被 idle 动画覆盖的头部偏移超出有界姿态；证据为 `output/life-living-posture-reproduction.log`。

新增测试验证持续倾听不重复点头、输入结束回到陪伴、等待与真实讲话／收尾、语音 owner 打断条件、暂停和时钟回退、人格加载及重载一致、跨身份拒绝旧帧、任务／语音让位、负面情绪收敛、长时间姿态有界与释放、视线抖动抑制和明确转向。回归覆盖既有语音队列与角色动作。

原生场景继续使用独立 Windows desktop、合成身份、自己的文件与页面截图，输入桌面保持原样。验证实际对话框输入能驱动渲染 motor，并与既有完整 8 动作、真实执行结果、人格式样同步一起检查。软件后台验证与真实模型、音频硬件、主桌面合成器和长期陪伴评价分别记录。

本轮新增的是可解释、连续、可中断的身体行为基础。它不证明主观意识，也不等于已经形成长期自发的兴趣探索或高质量美术动画。

## 最终验证与故障记录

| 验证 | 实际结果 | 原始报告 |
|---|---|---|
| 桌面完整回归 | 5,482 通过、8 原有跳过、0 失败 | `output/life-living-desktop-verified.json` |
| 场景、语音、SOUL 与 VRM 回归 | 729 通过、0 失败 | `output/life-living-expression-final.json` |
| 新行为、姿态、视线和同步专项 | 42 通过、0 失败 | `output/life-living-causal-final.json` |
| 工作区类型检查 | 通过；最终 desktop build 再检查 node/web | `output/life-living-workspace-typecheck-final.log` |
| 修改范围 lint fix | 0 错误；原有 runtime 及测试保留 13 警告 | `output/life-living-lint-final.log` 与 `life-living-*-lint.log` |

计数分别列示，重叠测试不相加。工作区存在大量先前未提交改动，lint fix 只覆盖本轮触及文件，避免全仓库格式化扰动其他开发。

第一次桌面全量回归的旧记忆集成测试在等待异步 embedding 就绪时达到 5 秒截止，导致 1 项失败。单独跑真实记忆入库／召回链与全部 120 项数据库测试通过，随后把三个同类测试的等待条件补为实际 `searchReady` 并保留完整索引判断，采用 15 秒有界等待，最终全量回归通过。原失败报告和诊断日志保留为 `output/life-living-desktop-final.json`、`life-living-memory-loop-diagnostic.log`、`life-living-db-diagnostic.log`。

增强原生验收在独立 desktop 首次遇到 `BindToCurrentSequence failed` 和 WebGL context loss，不能算渲染通过。按 [Chromium 的 SwiftShader 配置](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md) 增加显式 `LIFE_QA_SOFTWARE_GL=1`，只给隔离 QA 子进程传入软件图形参数；生产默认启动没有这个配置。最终报告记录实际图形后端，不将软件渲染的验证声称为主人桌面硬件合成验证。原失败与 isolation 清理报告保留。

发布材料检查发现初次构建缺少 N.E.K.O. 上游的 NOTICE，因此主动停止尚在依赖收集的打包进程，补入上游完整声明、核对字节哈希，再重新建立源码快照并构建。最初编译／打包日志保留在 `life-living-build-initial-final.log` 与 `life-living-package-initial.log`；没有把该中止产物作为交付版本。

最终源码快照为 `output/life-living-build-source-before.json`，指纹 `8481f787cfa073990b42a63834f0e2d83dea368bf6c6a57f548065d10b091624`。代码测试后只补齐授权材料，最终 desktop build 再次通过 node/web 类型检查；`output/life-living-tested-source-continuity.json` 确认测试快照与交付快照仅相差该 NOTICE 文件。

最终包的人格原生脚本最初连续点击相同 `form` 提交按钮，在组件切换动画结束前再次命中旧步骤。自己的页面截图 `output/playwright/life-living-persona-step-race.png` 明确显示当时仍在第 3 页，尚未提交最终创建；该失败不能算人格保存缺陷。QA 脚本现逐页确认 `aria-current` 的步骤序号与不透明度，再点击下一步，第 4 页出现后才提交。修正没有改变生产源码或最终 EXE。

## 最终 Windows 交付

远端 main 在 2026-10-05 15:05 UTC 通过 GitHub API 再次核对，与本地 HEAD／origin/main 同为 `7880afc29ab33a4cf4de89f7a6610664278494c3`。交付包含此基线、此前未提交开发成果及本轮改动，不是未经修改的上游提交包。

目录：`apps/stage-tamagotchi/dist/life-living-20261005`。

| 产物／验收 | 结果 |
|---|---|
| 安装器 | `Alicization-0.3.0-windows-x64-living-20261005.exe`，606,868,522 字节 |
| 安装器 SHA-256 | `cdc6ac9f795fe746d82f545efec196c5a600f627b4cb7336fcf92475727f84bf` |
| 直接运行 | `win-unpacked/alicization.exe` |
| 打包文件核对 | 1,168 个编译文件逐一与 ASAR 字节哈希对应；pi 许可证、N.E.K.O. 许可证及 NOTICE 精确匹配 |
| ASAR SHA-256 | `8aed96c0827b7a2f4499b1cd0c73eaaf05e7dee7ed32fbde74d70bdcf87cb406`，两项原生场景运行前后相同 |
| 人格原生场景 | 四步表单创建 QA 身份并进入服务配置页；21 个中文托盘标签；0 renderer 异常 |
| 身体原生场景 | 实际对话输入进入倾听并影响骨骼，12 帧采样、渲染 headPitch 峰值 0.077；清空输入回到陪伴；隐藏暂停与恢复通过 |
| 行动与人格原生场景 | 8／8 动作有实际骨骼变化；窗口 SOUL 双向自然同步；真实 CLI 文件正确则验证完成、错误字节则受阻，不动画庆祝成功 |
| 包内 native 模块 | Electron 40.8.0、ABI 143、SQLite 读写与 sqlite-vec 0.1.6；Node 模式 0 窗口 |
| 桌面隔离 | 最终两项原生场景前后输入桌面均为 Default；没有切换桌面；测试 job 已关闭 |

可核对材料：release 目录下 `release-provenance.json`，`output/life-living-release-evidence.json` 与 `output/life-acceptance/living-delivery-check.json`。原生报告为 `living-persona-scene.json`、`living-action-scene.json`、`living-packaged-background.json`，自身窗口截图为 `output/playwright/life-living-persona-review.png`、`life-living-persona-after.png` 和 `life-living-action-working.png`。

最终原生图形后端明确为 `ANGLE_SWIFTSHADER`；这是隔离桌面的软件渲染验收。Live2D 共享投影有代码及回归覆盖，原生骨骼采样来自 VRM。安装器本轮未实际安装／卸载，主桌面硬件合成、鼠标穿透、游戏、真人麦克风／音频、真实模型新对话与长期陪伴体验尚未在本轮验收。

后续 Phase 1 体验验收仍需追踪主动行为的价值和打扰频率、兴趣与习惯在长期真实经历中的稳定性、实际语音打断、不同模型的动作质量，以及日常人格／记忆／关系的连贯程度。这些必须建立在同一人格核心与真实行为证据上。
