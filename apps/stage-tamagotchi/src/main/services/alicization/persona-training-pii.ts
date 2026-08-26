export type PersonaTrainingPiiCategory
  = | 'email'
    | 'phone'
    | 'credential'
    | 'ip-address'
    | 'national-id'
    | 'payment-card'
    | 'user-home-path'
    | 'account-identifier'
    | 'precise-address'
    | 'labeled-real-name'

export interface PersonaTrainingPiiDetection {
  detected: boolean
  categories: PersonaTrainingPiiCategory[]
  reason: string | null
}

const DETECTORS: Array<{
  category: Exclude<PersonaTrainingPiiCategory, 'credential' | 'payment-card'>
  patterns: RegExp[]
}> = [
  {
    category: 'email',
    patterns: [/\b[\w.%+-]+@[\w.-]+\.[A-Z]{2,}\b/iu],
  },
  {
    category: 'phone',
    patterns: [/(?:\+?86[-\s]?)?1[3-9]\d{9}\b/u],
  },
  {
    category: 'ip-address',
    patterns: [/\b(?:\d{1,3}\.){3}\d{1,3}\b/u],
  },
  {
    category: 'national-id',
    patterns: [/\b\d{17}[\dX]\b/iu],
  },
  {
    category: 'user-home-path',
    patterns: [
      /(?:^|[\s"'“”‘’([{])(?:\/Users\/|\/home\/|~\/)[^\s"'“”‘’()[\]{}]{1,240}/iu,
      /(?:^|[\s"'“”‘’([{])[A-Z]:\\Users\\[^\\\s"'“”‘’()[\]{}]{1,240}/iu,
      /(?:本地路径|绝对路径|用户目录|home directory|local path|absolute path)\s*(?:[是为=：:]|is)\s*(?:\/(?!\/)[^\s，。；,;]+|[A-Z]:\\[^\s，。；,;]+)/iu,
    ],
  },
  {
    category: 'account-identifier',
    patterns: [
      /(?:我的\s*)?(?:用户名|账号|帐号|微信号|微博账号|社交账号|GitHub(?:\s*(?:用户名|账号))?|Discord(?:\s*(?:用户名|账号|handle))?|Telegram(?:\s*(?:用户名|账号))?)\s*[是为=：:]\s*@?\w[\w.#-]{2,31}\b/iu,
      /(?:my\s+)?(?:username|user\s+name|account|handle|github(?:\s+(?:username|account))?|discord(?:\s+(?:username|account|handle))?|telegram(?:\s+(?:username|account))?)\s*(?:is|=|:)\s*@?\w[\w.#-]{2,31}\b/iu,
    ],
  },
  {
    category: 'precise-address',
    patterns: [
      /\p{Script=Han}{1,24}(?:市|自治州)\p{Script=Han}{1,24}[区县][\p{Script=Han}\d]{1,32}[路街道巷]\d{1,6}(?:号|弄)/u,
      /\b\d{1,6}\s+[A-Z][A-Z0-9.'-]{0,24}(?:\s+[A-Z][A-Z0-9.'-]{0,24}){0,4}\s+(?:Street|St\.?|Road|Rd\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Lane|Ln\.?|Drive|Dr\.?|Court|Ct\.?|Way)\b/iu,
    ],
  },
  {
    category: 'labeled-real-name',
    patterns: [
      /(?:真实姓名|法定姓名|本名|姓名)\s*[是为=：:]\s*[\p{Script=Han}·]{2,12}/u,
      /(?:real|legal|full)\s+name\s*(?:is|=|:)\s*[A-Z][a-z]+(?:[ '-][A-Z][a-z]+){1,3}\b/u,
    ],
  },
]

const credentialPatterns = [
  /\bAuthorization\s*:\s*Bearer\s+[\w.~+/=-]{16,}/iu,
  /\bBearer\s+[\w.~+/=-]{20,}/iu,
  /\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}\b/u,
  /\b(?:gh[pousr]_|github_pat_)\w{20,}\b/iu,
  /\bxox[baprs]-[\w-]{20,}\b/iu,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\b(?:sk|api|key|token)[-_]?[\dA-Z]{12,}\b/iu,
  /\b(?:password|passwd|secret|api[_-]?key|api[_-]?token|access[_-]?token|client[_-]?secret)\s*(?:is|[=:为是])\s*["']?[\w./+=!@#$%^&*?~-]{12,}/iu,
]

const paymentContextPattern = /银行卡号|信用卡|借记卡|卡号|bank\s*card|credit\s*card|debit\s*card|card\s*number/iu
const paymentCardPattern = /\b\d[\d -]{11,25}\d\b/u
const negatedPaymentCardContextPattern = /(?:订单号|订单编号|流水号|交易号|order\s*(?:number|no\.?|id)|reference)\s*[^。！？!?;；\n]{0,48}(?:不是|并非|不代表|不属于|非|not|isn't|is\s+not)\s*[^。！？!?;；\n]{0,48}(?:银行卡|信用卡|借记卡|卡号|bank\s*card|credit\s*card|debit\s*card|card\s*number)/iu

function hasValidLuhnChecksum(value: string) {
  const digits = value.replace(/\D/gu, '')
  if (digits.length < 13 || digits.length > 19)
    return false
  let sum = 0
  let doubleDigit = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    const digit = Number(digits[index])
    const transformed = doubleDigit ? digit * 2 : digit
    sum += transformed > 9 ? transformed - 9 : transformed
    doubleDigit = !doubleDigit
  }
  return sum % 10 === 0
}

function hasHighEntropySecret(text: string) {
  const candidates = text.match(/[\w./+=!@#$%^&*?~-]{24,}/gu) ?? []
  return candidates.some((candidate) => {
    const classes = Number(/[a-z]/u.test(candidate))
      + Number(/[A-Z]/u.test(candidate))
      + Number(/\d/u.test(candidate))
      + Number(/[^A-Za-z0-9]/u.test(candidate))
    if (classes < 3)
      return false
    const frequencies = new Map<string, number>()
    for (const character of candidate)
      frequencies.set(character, (frequencies.get(character) ?? 0) + 1)
    const entropy = [...frequencies.values()].reduce((sum, frequency) => {
      const probability = frequency / candidate.length
      return sum - probability * Math.log2(probability)
    }, 0)
    return entropy >= 3.5
  })
}

export function detectPersonaTrainingPii(...values: string[]): PersonaTrainingPiiDetection {
  const text = values
    .filter(value => typeof value === 'string')
    .map(value => value.slice(0, 100_000))
    .join(' ')
  const categories: PersonaTrainingPiiCategory[] = DETECTORS
    .filter(detector => detector.patterns.some(pattern => pattern.test(text)))
    .map(detector => detector.category)

  if (credentialPatterns.some(pattern => pattern.test(text)) || hasHighEntropySecret(text))
    categories.push('credential')

  if (paymentContextPattern.test(text)) {
    const cardNumber = paymentCardPattern.exec(text)?.[0]
    if (cardNumber && hasValidLuhnChecksum(cardNumber) && !negatedPaymentCardContextPattern.test(text))
      categories.push('payment-card')
  }

  const uniqueCategories = [...new Set(categories)]
  return {
    detected: uniqueCategories.length > 0,
    categories: uniqueCategories,
    reason: uniqueCategories.length > 0
      ? `possible personal identifier detected: ${uniqueCategories.join(', ')}`
      : null,
  }
}
