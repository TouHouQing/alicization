// Canonical local operation roles help bilingual discovery without indexing
// previous user values, tool output, plugin instructions or permission grants.
const vocabulary: Record<string, string> = {
  'tool.life_programmatic_read': 'programmatic batch read aggregate data JavaScript 批量读取 聚合分析 程序化工具 数据处理',
  'tool.life_language_query': 'language server diagnostics definition references hover symbols LSP 语言服务 类型错误 诊断 定义 引用 符号',
  'tool.life_search_sessions': 'search prior conversations history recall 历史会话 以前说过 上次聊天 对话检索 跨会话 回忆',
  'tool.life_schedule_work': 'schedule automatic recurring verified work 定时执行 自动执行 周期任务 每天 每周 自动化',
  'tool.life_list_automations': 'list scheduled recurring tasks 查看定时任务 自动化列表',
  'tool.life_cancel_automation': 'cancel stop scheduled automation 停止定时任务 取消自动化',
  'tool.filesystem_read_file': 'read complete file contents 读取文件 完整读取 全文 读回 文件内容',
  'tool.filesystem_search_files': 'search local files by contents 内容搜索 搜索文件 查找文件 本地搜索',
  'tool.filesystem_list_directory': 'list directory entries 列出目录 目录列表 文件列表',
  'tool.filesystem_write_file': 'write create save file 写入文件 创建文件 保存文件',
  'tool.filesystem_edit_file': 'edit replace exact text 编辑文件 替换文本 修改文件',
  'tool.filesystem_patch_file': 'patch multiple literal changes 文件补丁 批量替换',
  'tool.browser_search_web': 'search online web 联网搜索 搜索网页 网上查找',
  'tool.browser_read_page': 'read current webpage 读取网页 网页内容',
}

export function capabilitySearchVocabulary(capabilityId: string) {
  return Object.hasOwn(vocabulary, capabilityId) ? vocabulary[capabilityId]! : ''
}
