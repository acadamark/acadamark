/**
 * Compile grammar/enscribe.peggy → src/parser/generated/parser.js
 *
 * Run: node build/compile-grammar.js
 * Also runs automatically via the `pretest` npm script.
 *
 * The compiled parser.js is committed to git so downstream users don't need
 * peggy at runtime. The `pretest` npm script regenerates it before every test
 * run, so a stale committed parser is caught locally by the suite. (There is no
 * CI; automating it on push/PR is tracked in #49.)
 */

import peggy from 'peggy'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const grammarPath = join(root, 'grammar', 'enscribe.peggy')
const outputPath = join(root, 'src', 'parser', 'generated', 'parser.js')

const grammar = readFileSync(grammarPath, 'utf8')

const source = peggy.generate(grammar, {
  format: 'es',
  output: 'source',
  // Include source map for readable errors pointing at grammar lines
  grammarSource: 'grammar/enscribe.peggy',
})

writeFileSync(outputPath, source, 'utf8')
console.log(`Grammar compiled: grammar/enscribe.peggy → src/parser/generated/parser.js`)
