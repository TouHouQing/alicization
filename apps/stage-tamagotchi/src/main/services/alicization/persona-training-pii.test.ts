import { describe, expect, it } from 'vitest'

import { detectPersonaTrainingPii } from './persona-training-pii'

const slackTokenFixture = [
  ['xox', 'b'].join(''),
  '123456789012',
  '123456789012',
  'abcdefghijklmnopqrstuv',
].join('-')

describe('persona training PII detection', () => {
  it.each([
    ['email', '请联系 alice@example.com。'],
    ['phone', '我的手机号是 13800138000。'],
    ['credential', 'API token: sk-1234567890ABCDEF'],
    ['ip-address', '家里的服务地址是 192.168.1.24。'],
    ['national-id', '身份证号 110101199001011234。'],
    ['payment-card', '银行卡号 4111 1111 1111 1111。'],
    ['user-home-path', '文件在 /Users/alice/Documents/private-notes.md。'],
    ['user-home-path', '密钥位于 /home/bob/.ssh/id_ed25519。'],
    ['user-home-path', String.raw`日志在 C:\Users\Carol\Desktop\alice.log。`],
    ['user-home-path', '日记保存在 ~/Documents/diary.md。'],
    ['user-home-path', '本地路径：/private/var/folders/secret/session.json'],
    ['account-identifier', '我的 GitHub 用户名是 alice-dev。'],
    ['account-identifier', '微信号：alice_2026'],
    ['account-identifier', 'My Discord handle is alice#1234.'],
    ['precise-address', '住址是北京市朝阳区建国路88号A座1201室。'],
    ['precise-address', 'Ship it to 123 Main Street, Springfield, CA 90210.'],
    ['labeled-real-name', '真实姓名：张三'],
    ['labeled-real-name', 'My legal name is Alice Smith.'],
  ])('detects %s without exporting the matched text', (category, text) => {
    const result = detectPersonaTrainingPii(text)

    expect(result.detected).toBe(true)
    expect(result.categories).toContain(category)
    expect(result.reason).toContain(category)
    expect(result.reason).not.toContain('alice@example.com')
    expect(result.reason).not.toContain('/Users/alice')
  })

  it.each([
    '项目位于 apps/stage-tamagotchi/src/main，不包含用户目录。',
    'Codex 可执行文件通常放在 /usr/local/bin/codex。',
    '测试夹具使用 /workspace/project 和 /tmp/example。',
    '我们上周在北京讨论了长期记忆。',
    'Main Street is a common fixture name.',
    '使用 @proj-alicization/stage-shared 包。',
    '用户名字段应该保持为空。',
    'Alice 是文档中的示例角色。',
    '地址字段由用户决定是否填写。',
  ])('does not quarantine ordinary project or place descriptions: %s', (text) => {
    expect(detectPersonaTrainingPii(text)).toEqual({
      detected: false,
      categories: [],
      reason: null,
    })
  })

  it('deduplicates categories across all cleaned fields', () => {
    expect(detectPersonaTrainingPii(
      '真实姓名：张三',
      '本名是张三',
      '正例不应复述姓名。',
    )).toEqual({
      detected: true,
      categories: ['labeled-real-name'],
      reason: 'possible personal identifier detected: labeled-real-name',
    })
  })

  it.each([
    ['authorization header', 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret-value.signature'],
    ['bearer token', '请求头 Bearer ghp_1234567890abcdefghijklmnopqrstuv'],
    ['JWT', 'session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'],
    ['GitHub token', 'github_pat_11AAAAAA1234567890abcdefghijklmnopqrstuv'],
    ['Slack token', `SLACK_TOKEN=${slackTokenFixture}`],
    ['AWS access key', 'aws_access_key_id=AKIAIOSFODNN7EXAMPLE'],
    ['AWS secret key', 'aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'],
    ['password context', 'password = "correct-horse-battery-staple"'],
    ['secret context', 'client_secret: "qwertyuiopasdfghjklzxcvbnm123456"'],
    ['token context', 'api_token="mF9!qR2#vL7@xP4$kD8^sN6&hT3*"'],
    ['unlabeled high-entropy secret', 'mF9!qR2#vL7@xP4$kD8^sN6&hT3*Z1'],
  ])('detects %s as credential without exporting the secret', (_label, text) => {
    const result = detectPersonaTrainingPii(text)

    expect(result.detected).toBe(true)
    expect(result.categories).toContain('credential')
    expect(result.reason).toBe('possible personal identifier detected: credential')
    expect(result.reason).not.toContain(text)
  })

  it.each([
    'Authorization is required to continue.',
    'Bearer token authentication is supported.',
    '请先设置 password，再继续。',
    'token budget 还剩 1200。',
    '这是一段普通的高熵-ish 文本，但不是凭据。',
    '订单号 4111111111111111 不代表银行卡号。',
    '银行卡号 6222 0212 3456 7890。',
  ])('does not quarantine credential-like prose or non-card identifiers: %s', (text) => {
    expect(detectPersonaTrainingPii(text)).toEqual({
      detected: false,
      categories: [],
      reason: null,
    })
  })

  it('requires payment context and a Luhn-valid number before detecting a payment card', () => {
    expect(detectPersonaTrainingPii('银行卡号 4111 1111 1111 1111。').categories).toContain('payment-card')
    expect(detectPersonaTrainingPii('银行卡号 4111 1111 1111 1112。')).toEqual({
      detected: false,
      categories: [],
      reason: null,
    })
    expect(detectPersonaTrainingPii('订单号 4111 1111 1111 1111。')).toEqual({
      detected: false,
      categories: [],
      reason: null,
    })
  })
})
