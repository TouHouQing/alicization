import process from 'node:process'

import { parseMemoryQualityTrialCliArgs, runMemoryQualityTrialCli } from '../src/main/services/alicization/memory-quality-trial-cli'

const help = `用法：
  pnpm -F @proj-alicization/stage-tamagotchi memory:quality-trial --user-data-path <path> [选项]

选项：
  --user-data-path <path>  Alicization 用户数据目录
  --database-path <path>   直接指定 alicization.db 所在路径（也可用 --db）
  --card-id <id>           当前机体，默认 default
  --mode <mode>             historical-replay 或 live-provider，默认 historical-replay
  --session-id <id>         可选，但必须是当前机体的主会话
  --read-only               只读试用，不写入 gold pack、质量报告或其他生产状态（也可用 --dry-run）
  --report <path>           将同一份 JSON 报告写入文件
  --help                    显示帮助
`

async function main() {
  const rawArgs = process.argv.slice(2)
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    process.stdout.write(help)
    return
  }

  const args = parseMemoryQualityTrialCliArgs(rawArgs)
  const result = await runMemoryQualityTrialCli({ args })
  if (result.exitCode !== 0)
    process.exitCode = result.exitCode
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
