import process from 'node:process'

import {
  parseMemoryEmbeddingSoakCliArgs,
  runMemoryEmbeddingSoakCli,
} from '../src/main/services/alicization/memory-embedding-soak-cli'

const help = `用法：
  pnpm -F @proj-alicization/stage-tamagotchi memory:embedding-soak [选项]

默认读取本地 App 已保存的 embedding 配置，不会把 API key 写入报告。

选项：
  --user-data-path <path>  Alicization 用户数据目录；默认自动查找已安装 App
  --card-id <id>           当前机体，默认 default
  --size <10k|100k>        长期记忆规模，默认 10k
  --dimensions <number>    可选，覆盖配置中的向量维度
  --max-p95-ms <number>    p95 查询延迟门限，默认 3000ms
  --max-p99-ms <number>    p99 查询延迟门限，默认 5000ms
  --report <path>          JSON 报告路径；默认写入 quality-reports
  --help                   显示帮助

示例：
  pnpm -F @proj-alicization/stage-tamagotchi memory:embedding-soak --size 10k
  pnpm -F @proj-alicization/stage-tamagotchi memory:embedding-soak --size 100k
`

async function main() {
  const rawArgs = process.argv.slice(2)
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    process.stdout.write(help)
    return
  }

  const args = parseMemoryEmbeddingSoakCliArgs(rawArgs)
  const result = await runMemoryEmbeddingSoakCli({ args })
  process.stderr.write(`embedding soak 报告已写入：${result.reportPath}\n`)
  if (result.exitCode !== 0)
    process.exitCode = result.exitCode
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
