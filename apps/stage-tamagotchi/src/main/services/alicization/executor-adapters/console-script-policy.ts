import type { Node } from 'acorn'

import { Buffer } from 'node:buffer'

import { parse } from 'acorn'

type SyntaxNode = Node & Record<string, unknown>
const globals = new Set(['console', 'process', 'Math', 'Date', 'JSON', 'String', 'Number', 'Boolean', 'undefined', 'NaN', 'Infinity'])
const calls = new Set(['console.log', 'console.error', 'console.warn', 'process.stdout.write', 'process.stderr.write', 'process.cwd', 'process.exit', 'Date.now', 'JSON.stringify', 'JSON.parse', 'String', 'Number', 'Boolean', 'Math.abs', 'Math.round', 'Math.floor', 'Math.ceil', 'Math.min', 'Math.max'])

function node(raw: unknown): SyntaxNode | null {
  return raw && typeof raw === 'object' && 'type' in raw && typeof raw.type === 'string' ? raw as SyntaxNode : null
}

function memberPath(raw: unknown): string | null {
  const expression = node(raw)
  if (expression?.type === 'Identifier')
    return typeof expression.name === 'string' ? expression.name : null
  if (expression?.type !== 'MemberExpression' || expression.computed)
    return null
  const base = memberPath(expression.object)
  const property = node(expression.property)
  return base && property?.type === 'Identifier' && typeof property.name === 'string' ? `${base}.${property.name}` : null
}

function numericConstant(raw: unknown, depth = 0): number | null {
  const expression = node(raw)
  if (!expression || depth > 16)
    return null
  if (expression.type === 'Literal' && typeof expression.value === 'number')
    return expression.value
  if (expression.type === 'BinaryExpression') {
    const left = numericConstant(expression.left, depth + 1)
    const right = numericConstant(expression.right, depth + 1)
    if (left == null || right == null)
      return null
    const value = expression.operator === '+' ? left + right : expression.operator === '-' ? left - right : expression.operator === '*' ? left * right : expression.operator === '/' ? left / right : Number.NaN
    return Number.isFinite(value) ? value : null
  }
  return null
}

// This admits only a small structural subset with console I/O. All other
// programs remain opaque and require approval; this is not a JS sandbox.
export function isBoundedConsoleScript(source: string) {
  if (source.length > 16_000)
    return false
  let tree: SyntaxNode
  try {
    const parsed = node(parse(source, { ecmaVersion: 'latest', sourceType: 'script' }))
    if (!parsed)
      return false
    tree = parsed
  }
  catch { return false }
  let remaining = 1000
  const locals = new Set<string>()
  function safe(raw: unknown, depth = 0): boolean {
    const expression = node(raw)
    if (!expression || --remaining < 0 || depth > 48)
      return false
    const nested = (value: unknown) => safe(value, depth + 1)
    const list = (value: unknown) => Array.isArray(value) && value.every(nested)
    switch (expression.type) {
      case 'Program':
      case 'BlockStatement': return list(expression.body)
      case 'EmptyStatement': return true
      case 'Literal': return typeof expression.value === 'string' || typeof expression.value === 'number' || typeof expression.value === 'boolean' || expression.value === null
      case 'Identifier': return typeof expression.name === 'string' && (['undefined', 'NaN', 'Infinity'].includes(expression.name) || locals.has(expression.name))
      case 'ExpressionStatement': return nested(expression.expression)
      case 'ReturnStatement': return expression.argument == null || nested(expression.argument)
      case 'ArrayExpression': return list(expression.elements)
      case 'ObjectExpression': return list(expression.properties)
      case 'Property': {
        const key = node(expression.key)
        const name = key?.type === 'Identifier' ? key.name : key?.type === 'Literal' ? key.value : null
        return expression.kind === 'init' && !expression.computed && !expression.method && typeof name === 'string' && !['__proto__', 'constructor', 'prototype'].includes(name) && nested(expression.value)
      }
      case 'ChainExpression': return nested(expression.expression)
      case 'TemplateLiteral': return list(expression.expressions)
      case 'UnaryExpression': return ['!', '+', '-', 'typeof', 'void'].includes(String(expression.operator)) && nested(expression.argument)
      case 'BinaryExpression':
      case 'LogicalExpression': return nested(expression.left) && nested(expression.right)
      case 'ConditionalExpression': return nested(expression.test) && nested(expression.consequent) && nested(expression.alternate)
      case 'SequenceExpression': return list(expression.expressions)
      case 'VariableDeclaration': return expression.kind === 'const' && list(expression.declarations)
      case 'VariableDeclarator': {
        const id = node(expression.id)
        if (id?.type !== 'Identifier' || typeof id.name !== 'string' || globals.has(id.name) || !nested(expression.init))
          return false
        locals.add(id.name)
        return true
      }
      case 'ArrowFunctionExpression': {
        if (!Array.isArray(expression.params) || expression.async)
          return false
        const names: string[] = []
        for (const raw of expression.params) {
          const parameter = node(raw)
          if (parameter?.type !== 'Identifier' || typeof parameter.name !== 'string' || globals.has(parameter.name))
            return false
          names.push(parameter.name)
          locals.add(parameter.name)
        }
        const valid = nested(expression.body)
        for (const name of names)
          locals.delete(name)
        return valid
      }
      case 'MemberExpression': {
        const path = memberPath(expression)
        if (path?.startsWith('process.env.'))
          return /^process\.env\.ALICIZATION_EXECUTION_[A-Z_]+$/u.test(path)
        if (path && ['process.argv', 'process.pid', 'process.version', 'process.platform'].includes(path))
          return true
        if (path?.startsWith('process.'))
          return false
        if (path === 'process.env' || path?.startsWith('process.mainModule') || path?.includes('constructor') || path?.includes('__proto__'))
          return false
        const property = node(expression.property)
        const safeProperty = expression.computed ? property?.type === 'Literal' && typeof property.value === 'number' && property.value >= 0 : property?.type === 'Identifier' && !['constructor', '__proto__', 'prototype'].includes(String(property.name))
        return Boolean(safeProperty) && nested(expression.object)
      }
      case 'CallExpression': {
        const path = memberPath(expression.callee)
        if (path && calls.has(path))
          return list(expression.arguments)
        if (path === 'setTimeout' || path === 'setInterval') {
          const args = expression.arguments
          const delay = Array.isArray(args) ? node(args[1]) : null
          return Array.isArray(args) && args.length === 2 && delay?.type === 'Literal' && typeof delay.value === 'number' && delay.value >= 10 && delay.value <= 30_000 && nested(args[0])
        }
        if (path === 'process.stdin.on') {
          const args = expression.arguments
          const event = Array.isArray(args) ? node(args[0]) : null
          return Array.isArray(args) && args.length === 2 && event?.type === 'Literal' && ['data', 'end'].includes(String(event.value)) && nested(args[1])
        }
        const callee = node(expression.callee)
        const receiver = callee?.type === 'MemberExpression' ? node(callee.object) : null
        const property = callee?.type === 'MemberExpression' ? node(callee.property) : null
        const args = expression.arguments
        if (receiver?.type === 'Literal' && typeof receiver.value === 'string' && property?.type === 'Identifier' && property.name === 'repeat' && Array.isArray(args) && args.length === 1) {
          const count = numericConstant(args[0])
          return count != null && Number.isSafeInteger(count) && count >= 0 && Buffer.byteLength(receiver.value, 'utf8') * count <= 8_000_000
        }
        return false
      }
      default: return false
    }
  }
  return safe(tree)
}

export function hasOnlyConsoleNodeEffect(args: string[]) {
  const boundary = args.indexOf('--')
  const options = boundary < 0 ? args : args.slice(0, boundary)
  if (options.length === 1 && ['-v', '--version', '-h', '--help'].includes(options[0]))
    return true
  if (options.some(option => /^(?:-r|--require|--import|--loader|--experimental-loader|--env-file|--inspect)(?:=|$)/u.test(option)))
    return false
  const index = options.findIndex(option => ['-e', '--eval', '-p', '--print'].includes(option))
  const harmless = new Set(['--no-warnings', '--trace-warnings', '--use-strict'])
  if (index < 0 || !options.slice(0, index).every(option => harmless.has(option)) || options.slice(index + 2).some(option => option.startsWith('-') && !harmless.has(option)))
    return false
  return typeof options[index + 1] === 'string' && isBoundedConsoleScript(options[index + 1])
}
