import { describe, expect, it } from 'vitest'

import { hasOnlyConsoleNodeEffect, isBoundedConsoleScript } from './console-script-policy'

describe('structural console program admission', () => {
  it.each([
    'console.log("require(\\\"fs\\\").rmSync is only text");',
    'process.stdout.write(process.argv[1] || "");',
    'setTimeout(() => console.log("hello"), 100);',
    'const context = JSON.parse(process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_JSON || "{}"); console.log({ id: context.cardId });',
  ])('admits console I/O without interpreting literal source-like text: %s', (source) => {
    expect(isBoundedConsoleScript(source)).toBe(true)
  })

  it.each([
    'require("fs").rmSync("important.txt");',
    'fetch("https://example.test", { body: "private" });',
    'console.log(process.env.API_KEY);',
    'console.log(process);',
    'JSON.stringify(process.env);',
    'console.log.constructor("return process")();',
    'globalThis["eval"]("code");',
    'const console = {}; console.log("shadowed");',
    'while (true) {}',
  ])('keeps opaque or sensitive programs behind explicit approval: %s', (source) => {
    expect(isBoundedConsoleScript(source)).toBe(false)
  })

  it('rejects a different actual entry point, duplicate eval flags and preloaded modules', () => {
    expect(hasOnlyConsoleNodeEffect(['program.js', '-e', 'console.log("safe")'])).toBe(false)
    expect(hasOnlyConsoleNodeEffect(['-e', 'console.log("safe")', '-e', 'require("fs")'])).toBe(false)
    expect(hasOnlyConsoleNodeEffect(['-r', 'preload.js', '-e', 'console.log("safe")'])).toBe(false)
    expect(hasOnlyConsoleNodeEffect(['-e', 'console.log(process.argv[1])', '--', '-r'])).toBe(true)
  })
})
